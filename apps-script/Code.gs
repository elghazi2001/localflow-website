/**
 * SmartRoutine Studio: request receiver (Google Apps Script Web App)
 *
 * For every contact-form submission it:
 *   1. validates and sanitises the data (length limits, honeypot, rate limit)
 *   2. saves the request as a new row in the Google Sheet "Richieste SmartRoutine Studio"
 *   3. sends an HTML notification email to NOTIFY_EMAIL
 *
 * Deploy: see apps-script/README.md
 */

// ---------- Settings ----------
const NOTIFY_EMAIL = "elghazifarouk112@gmail.com";
// Placeholder page for the future "Genera mockup del servizio" feature.
const MOCKUP_BASE_URL = "https://elghazi2001.github.io/localflow-website/mockup.html";
const SITE_URL = "https://elghazi2001.github.io/localflow-website/";

const LIMITS = {
  name: 100, business: 120, email: 254, phone: 30, website: 300,
  service_interest: 80, preferred_time: 40,
  problem_description: 3000
};
const PER_EMAIL_COOLDOWN_S = 60;    // one request per email per minute
const GLOBAL_MAX_PER_10MIN = 20;    // flood protection

// ---------- Entry points ----------
function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    // The browser cannot authenticate itself: public frontend tokens and client
    // timing values are forgeable. Treat the honeypot as a low-confidence signal only.
    if (data.botcheck) {
      return json_({ success: true });
    }

    const req = clean_(data);
    const error = validate_(req);
    if (error) return json_({ success: false, message: error });

    const limited = rateLimit_(req.email);
    if (limited) return json_({ success: false, message: limited });

    // saveRequest_ takes the script lock itself (short, non-reentrant).
    const id = saveRequest_(req, "form");
    console.log("[form] request " + id + " saved");

    // The request is already stored. If the draft or the notification fails, the visitor
    // must not see an error (they would send it twice); the row stays in the Sheet.
    try {
      createBaseDraft_(req);
      console.log("[draft] base reply saved for " + id);
    } catch (draftErr) {
      console.error("[draft] failed for " + id + ": " + draftErr);
    }
    try {
      sendEmail_(id, req, sheetUrl_());
      console.log("[mail] notification sent for " + id);
    } catch (mailErr) {
      console.error("[mail] notification failed for " + id + ": " + mailErr);
    }

    return json_({ success: true, id: id });
  } catch (err) {
    console.error("[form] failed: " + err + (err && err.stack ? "\n" + err.stack : ""));
    return json_({ success: false, message: "Errore interno." });
  }
}

function doGet() {
  return json_({ ok: true, service: "SmartRoutine request receiver" });
}

/** Editor test: runs the form path with a fake request and prints the answer or the error. */
function testForm() {
  const fake = {
    name: "Test Modulo", business: "Prova", email: "test.modulo@example.com", phone: "", website: "",
    service_interest: "Automazione o pipeline", preferred_time: "",
    problem_description: "Prova tecnica del modulo di contatto, serve solo a controllare che salvataggio ed email funzionino. ".repeat(3),
    consent: true
  };
  console.log(doPost({ postData: { contents: JSON.stringify(fake) } }).getContent());
}

// ---------- Validation ----------
function clean_(data) {
  const out = {};
  Object.keys(LIMITS).forEach(function (k) {
    let v = String(data[k] == null ? "" : data[k]);
    // strip control chars except newline/tab, trim, cap length
    v = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
    out[k] = v.slice(0, LIMITS[k]);
  });
  out.email = out.email.toLowerCase();
  out.phone = out.phone.replace(/[^0-9+()\s.-]/g, "");
  out.consent = data.consent === true || data.consent === "on" || data.consent === "true";
  return out;
}

function validate_(r) {
  if (!r.name) return "Nome mancante.";
  if (!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(r.email)) return "Email non valida.";
  if (!r.problem_description) return "Descrizione mancante.";
  if (!r.consent) return "Consenso mancante.";
  return null;
}

function rateLimit_(email) {
  // Cache get/put and PropertiesService updates must be serialized; otherwise
  // simultaneous requests can all read the same count and exceed the limit.
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const cache = CacheService.getScriptCache();
    const emailKey = "e:" + Utilities.base64EncodeWebSafe(email);
    if (cache.get(emailKey)) {
      return "Hai già inviato una richiesta. Riprova tra un minuto.";
    }

    // Keep the global counter in Script Properties rather than cache so cache
    // eviction cannot silently reset the flood-control bucket.
    const props = PropertiesService.getScriptProperties();
    const bucket = String(Math.floor(Date.now() / 600000));
    const storedBucket = props.getProperty("RATE_LIMIT_BUCKET");
    const count = storedBucket === bucket
      ? Number(props.getProperty("RATE_LIMIT_COUNT") || 0)
      : 0;

    if (count >= GLOBAL_MAX_PER_10MIN) {
      return "Troppe richieste in questo momento. Riprova più tardi.";
    }

    cache.put(emailKey, "1", PER_EMAIL_COOLDOWN_S);
    props.setProperties({
      RATE_LIMIT_BUCKET: bucket,
      RATE_LIMIT_COUNT: String(count + 1)
    });
    return null;
  } catch (err) {
    console.error("Rate limiter unavailable", err);
    return "Servizio temporaneamente non disponibile. Riprova più tardi.";
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

// ---------- Request ids ----------
function nextId_() {
  const props = PropertiesService.getScriptProperties();
  const n = Number(props.getProperty("LAST_ID") || 0) + 1;
  props.setProperty("LAST_ID", String(n));
  return "R-" + ("0000" + n).slice(-4);
}

// ---------- Email ----------
function esc_(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Emails this account can still send today (Google enforces a daily cap).
 * Returns the number left after the one being sent now, or null if unknown,
 * in which case nothing is printed.
 */
function remainingEmails_() {
  try {
    const left = MailApp.getRemainingDailyQuota();
    return typeof left === "number" && isFinite(left) ? Math.max(left - 1, 0) : null;
  } catch (err) {
    return null;
  }
}

// ---------- Base reply (no AI) ----------
const DRAFT_SUBJECT = "La tua richiesta a SmartRoutine Studio";

function firstName_(r) { return String(r.name).split(" ")[0]; }

/** Plain reply used until a tailored one is written by the Claude Code skill /controlla-richieste. */
function baseReply_(r) {
  const slot = /^(mattina|pomeriggio|sera)$/i.test(r.preferred_time) ? ", meglio di " + r.preferred_time.toLowerCase() : "";
  return "Ciao " + firstName_(r) + ",\n\n" +
    "ho letto la tua richiesta e ti preparo una proposta concreta, che ti mando entro un giorno lavorativo. " +
    "Nel frattempo, se hai un sito o la scheda Google Maps della tua attività, mandami il link: mi aiuta a capire meglio come lavorate.\n\n" +
    "Se preferisci parlarne a voce, dimmi quando ti è comodo" + slot + ".\n\n" +
    "Farouk Elghazi\nSmartRoutine Studio";
}

function baseWhatsApp_(r) {
  return "Ciao " + firstName_(r) + ", sono Farouk di SmartRoutine Studio. Ho letto la tua richiesta e ti preparo una proposta concreta. " +
    "Nel frattempo, hai un sito o la scheda Google Maps da mandarmi? Se preferisci, ne parliamo con una breve chiamata.";
}

/** Saves the base reply in the Gmail drafts of the owner. Nothing is sent. */
function createBaseDraft_(r) {
  GmailApp.createDraft(r.email, DRAFT_SUBJECT, baseReply_(r));
}

function sendEmail_(id, r, sheetUrl) {
  const left = remainingEmails_();
  const when = Utilities.formatDate(new Date(), "Europe/Rome", "dd/MM/yyyy 'alle' HH:mm");
  let phoneDigits = r.phone.replace(/[^0-9]/g, "");
  if (/^3\d{8,9}$/.test(phoneDigits)) phoneDigits = "39" + phoneDigits; // Italian mobile without country code

  let body = mailSection_("Cliente", mailTable_([
    ["Nome", esc_(r.name)], ["Email", esc_(r.email)], ["Telefono", esc_(r.phone)],
    ["Servizio", esc_(r.service_interest)], ["Quando ricontattarlo", esc_(r.preferred_time)], ["Sito / Maps", esc_(r.website)]
  ]));
  body += mailSection_("Cosa ha scritto", mailQuote_(r.problem_description));
  const mailto = "mailto:" + r.email + "?subject=" + encodeURIComponent(DRAFT_SUBJECT) + "&body=" + encodeURIComponent(baseReply_(r));
  let buttons = mailButton_(mailto, "Rispondi con la bozza", "primary");
  if (phoneDigits.length >= 8) buttons += mailButton_("https://wa.me/" + phoneDigits + "?text=" + encodeURIComponent(baseWhatsApp_(r)), "WhatsApp con messaggio pronto", "secondary");
  buttons += mailButton_("https://mail.google.com/mail/?authuser=" + encodeURIComponent(NOTIFY_EMAIL) + "#drafts", "Apri le bozze", "secondary");
  buttons += mailButton_(sheetUrl, "Registro richieste", "secondary");
  body += '<div style="margin:6px 0 10px;">' + buttons + '</div>' +
    '<p style="margin:0 0 16px;font-size:13px;color:' + MAIL.muted + ';">La bozza base è già nelle bozze di Gmail. Per una risposta su misura con pagina proposta lancia /controlla-richieste in Claude Code.</p>';

  const text = ["Nuova richiesta " + id + " — " + when, "Nome: " + r.name, "Email: " + r.email, "Telefono: " + (r.phone || "-"),
    "Servizio: " + (r.service_interest || "-"), "Sito/Maps: " + (r.website || "-"), "", r.problem_description, "", "Registro: " + sheetUrl
  ].concat(left === null ? [] : ["", "Email rimaste oggi: " + left]).join("\n");

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: "Nuova richiesta " + id + ": " + r.name + " · " + (r.service_interest || "Richiesta generica"),
    body: text,
    htmlBody: mailShell_({ preheader: r.name + ": " + r.problem_description.slice(0, 90), title: "Nuova richiesta " + id,
      subtitle: r.name + " · " + when, body: body,
      footer: left === null ? "SmartRoutine Studio" : "<strong>Email rimaste oggi: " + esc_(left) + "</strong> (limite giornaliero di Google)" }),
    replyTo: r.email,
    name: "SmartRoutine Studio · Sito"
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
