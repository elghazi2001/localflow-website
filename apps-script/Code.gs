/**
 * SmartRoutine Studio — Request receiver (Google Apps Script Web App)
 *
 * For every contact-form submission it:
 *   1. validates and sanitises the data (length limits, honeypot, rate limit)
 *   2. logs the request in a Google Doc ("Richieste SmartRoutine Studio")
 *   3. sends an HTML notification email to NOTIFY_EMAIL
 *
 * Deploy: see apps-script/README.md
 */

// ---------- Settings ----------
const NOTIFY_EMAIL = "elghazifarouk112@gmail.com";
const DOC_NAME = "Richieste SmartRoutine Studio";
// Must match SR_CONFIG.requestToken in js/config.js. Not a real secret (it is
// visible in the site source) — it only filters random bots hitting the URL.
const FORM_TOKEN = "srs-2026-form";
// Placeholder page for the future "Genera mockup del servizio" feature.
const MOCKUP_BASE_URL = "https://elghazi2001.github.io/localflow-website/mockup.html";
const SITE_URL = "https://elghazi2001.github.io/localflow-website/";

const LIMITS = {
  name: 100, business: 120, email: 254, phone: 30, business_type: 60,
  service_interest: 80, budget_range: 60, contact_preference: 30,
  problem_description: 3000
};
const MIN_FILL_MS = 3000;           // faster than this = bot
const PER_EMAIL_COOLDOWN_S = 60;    // one request per email per minute
const GLOBAL_MAX_PER_10MIN = 20;    // flood protection

// ---------- Entry points ----------
function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (data.token !== FORM_TOKEN) return json_({ success: false, message: "Richiesta non valida." });

    // Honeypot / timing: pretend success so bots learn nothing.
    if (data.botcheck || (Number(data.elapsed_ms) > 0 && Number(data.elapsed_ms) < MIN_FILL_MS)) {
      return json_({ success: true });
    }

    const req = clean_(data);
    const error = validate_(req);
    if (error) return json_({ success: false, message: error });

    const limited = rateLimit_(req.email);
    if (limited) return json_({ success: false, message: limited });

    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    let id, docUrl;
    try {
      id = nextId_();
      docUrl = appendToDoc_(id, req);
    } finally {
      lock.releaseLock();
    }
    sendEmail_(id, req, docUrl);

    return json_({ success: true, id: id });
  } catch (err) {
    console.error(err);
    return json_({ success: false, message: "Errore interno." });
  }
}

function doGet() {
  return json_({ ok: true, service: "SmartRoutine request receiver" });
}

/** Run once from the editor to authorise and create the Doc. */
function setup() {
  const doc = getDoc_();
  console.log("Doc pronto: " + doc.getUrl());
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
  const cache = CacheService.getScriptCache();
  const emailKey = "e:" + Utilities.base64EncodeWebSafe(email);
  if (cache.get(emailKey)) return "Hai già inviato una richiesta. Riprova tra un minuto.";

  const bucket = "g:" + Math.floor(Date.now() / 600000);
  const count = Number(cache.get(bucket) || 0);
  if (count >= GLOBAL_MAX_PER_10MIN) return "Troppe richieste in questo momento. Riprova più tardi.";

  cache.put(emailKey, "1", PER_EMAIL_COOLDOWN_S);
  cache.put(bucket, String(count + 1), 600);
  return null;
}

// ---------- Google Doc ----------
function getDoc_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty("DOC_ID");
  if (id) {
    try { return DocumentApp.openById(id); } catch (e) { /* recreate below */ }
  }
  const doc = DocumentApp.create(DOC_NAME);
  const body = doc.getBody();
  body.clear();
  body.getParagraphs()[0].setText(DOC_NAME).setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph("Ogni nuova richiesta dal sito viene aggiunta qui sotto (la più recente in alto). " +
    "Aggiorna il campo \"Stato\" (Nuova → Contattato → Preventivo → Chiuso) man mano che procedi.")
    .setHeading(DocumentApp.ParagraphHeading.NORMAL).setItalic(true);
  body.appendParagraph("").appendHorizontalRule();
  props.setProperty("DOC_ID", doc.getId());
  return doc;
}

function nextId_() {
  const props = PropertiesService.getScriptProperties();
  const n = Number(props.getProperty("LAST_ID") || 0) + 1;
  props.setProperty("LAST_ID", String(n));
  return "R-" + ("0000" + n).slice(-4);
}

function appendToDoc_(id, r) {
  const doc = getDoc_();
  const body = doc.getBody();
  const when = Utilities.formatDate(new Date(), "Europe/Rome", "dd/MM/yyyy HH:mm");
  const dash = function (v) { return v || "—"; };

  // Insert after title, intro and rule (index 3) so newest is on top.
  let i = 3;
  const h = body.insertParagraph(i++, id + " · " + r.name + (r.business ? " — " + r.business : ""));
  h.setHeading(DocumentApp.ParagraphHeading.HEADING2).setItalic(false);
  body.insertParagraph(i++, "Ricevuta il " + when + "   |   Stato: Nuova")
    .setHeading(DocumentApp.ParagraphHeading.NORMAL).setItalic(true).setBold(false);

  const rows = [
    ["Email", r.email],
    ["Telefono", dash(r.phone)],
    ["Attività", dash(r.business)],
    ["Tipo attività", dash(r.business_type)],
    ["Servizio", dash(r.service_interest)],
    ["Budget", dash(r.budget_range)],
    ["Contatto preferito", dash(r.contact_preference)],
    ["Descrizione", r.problem_description]
  ];
  const table = body.insertTable(i++, rows);
  table.setBorderColor("#D9D4F5");
  for (let row = 0; row < table.getNumRows(); row++) {
    const label = table.getRow(row).getCell(0);
    label.setBackgroundColor("#F3F0FF").setWidth(140);
    label.editAsText().setBold(true).setItalic(false).setForegroundColor("#3B2A99");
    table.getRow(row).getCell(1).editAsText().setBold(false).setItalic(false);
  }
  body.insertParagraph(i++, "").appendHorizontalRule();
  doc.saveAndClose();
  return doc.getUrl();
}

// ---------- Email ----------
function esc_(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function sendEmail_(id, r, docUrl) {
  const when = Utilities.formatDate(new Date(), "Europe/Rome", "dd/MM/yyyy 'alle' HH:mm");
  const phoneDigits = r.phone.replace(/[^0-9]/g, "");
  const replySubject = encodeURIComponent("Re: la tua richiesta a SmartRoutine Studio (" + id + ")");
  const mockupUrl = MOCKUP_BASE_URL + "?id=" + encodeURIComponent(id) +
    "&service=" + encodeURIComponent(r.service_interest || "");

  const row = function (label, value) {
    return '<tr><td style="padding:10px 14px;background:#F6F4FF;color:#4B3BA8;font-weight:600;width:170px;' +
      'border-bottom:1px solid #ECE8FF;font-size:14px;">' + esc_(label) + '</td>' +
      '<td style="padding:10px 14px;border-bottom:1px solid #ECE8FF;font-size:14px;color:#1F1D2B;">' +
      (value ? esc_(value) : '<span style="color:#9A98A8;">Non specificato</span>') + '</td></tr>';
  };
  const button = function (href, text, bg, color) {
    return '<a href="' + esc_(href) + '" style="display:inline-block;margin:6px 6px 0 0;padding:11px 18px;' +
      'border-radius:8px;background:' + bg + ';color:' + color + ';font-weight:600;font-size:14px;' +
      'text-decoration:none;">' + esc_(text) + '</a>';
  };

  let buttons = button("mailto:" + r.email + "?subject=" + replySubject, "✉ Rispondi al cliente", "#6D4AFF", "#FFFFFF");
  if (phoneDigits.length >= 8) buttons += button("https://wa.me/" + phoneDigits, "WhatsApp", "#25D366", "#FFFFFF");
  buttons += button(docUrl, "📄 Apri registro richieste", "#FFFFFF", "#6D4AFF");

  const html =
    '<div style="background:#F4F3F8;padding:24px 0;font-family:Inter,Segoe UI,Arial,sans-serif;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;' +
    'background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #E6E3F2;">' +
    '<tr><td style="background:#6D4AFF;padding:22px 26px;color:#FFFFFF;">' +
    '<div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.85;">Nuova richiesta · ' + esc_(id) + '</div>' +
    '<div style="font-size:22px;font-weight:700;margin-top:4px;">' + esc_(r.name) +
    (r.business ? ' <span style="font-weight:400;opacity:.9;">— ' + esc_(r.business) + '</span>' : '') + '</div>' +
    '<div style="font-size:13px;opacity:.85;margin-top:6px;">Ricevuta il ' + esc_(when) + '</div></td></tr>' +
    '<tr><td style="padding:20px 26px 4px;">' +
    '<span style="display:inline-block;background:#EFEAFF;color:#4B3BA8;border-radius:999px;padding:5px 12px;font-size:13px;font-weight:600;margin:0 6px 6px 0;">' +
    esc_(r.service_interest || "Servizio non indicato") + '</span>' +
    '<span style="display:inline-block;background:#E9F8EF;color:#1B7A44;border-radius:999px;padding:5px 12px;font-size:13px;font-weight:600;margin:0 6px 6px 0;">Budget: ' +
    esc_(r.budget_range || "n.d.") + '</span>' +
    '<span style="display:inline-block;background:#FFF4E5;color:#9A5B00;border-radius:999px;padding:5px 12px;font-size:13px;font-weight:600;margin:0 6px 6px 0;">Preferisce: ' +
    esc_(r.contact_preference || "n.d.") + '</span></td></tr>' +
    '<tr><td style="padding:12px 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" ' +
    'style="border:1px solid #ECE8FF;border-radius:10px;overflow:hidden;">' +
    row("Email", r.email) + row("Telefono", r.phone) + row("Attività", r.business) +
    row("Tipo di attività", r.business_type) + '</table></td></tr>' +
    '<tr><td style="padding:8px 26px;"><div style="font-size:13px;font-weight:700;color:#4B3BA8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Descrizione del problema</div>' +
    '<div style="background:#FAFAFD;border-left:4px solid #6D4AFF;border-radius:6px;padding:14px 16px;font-size:14px;line-height:1.6;color:#1F1D2B;white-space:pre-wrap;">' +
    esc_(r.problem_description) + '</div></td></tr>' +
    '<tr><td style="padding:14px 26px 6px;">' + buttons + '</td></tr>' +
    '<tr><td style="padding:14px 26px 24px;"><div style="border:1px dashed #C9BDFF;border-radius:10px;padding:16px;background:#FBFAFF;">' +
    '<div style="font-size:14px;font-weight:700;color:#1F1D2B;">Prossimo passo</div>' +
    '<div style="font-size:13px;color:#5B5970;margin:4px 0 10px;">Prepara un mockup del servizio richiesto da mostrare al cliente.</div>' +
    button(mockupUrl, "✨ Genera mockup del servizio", "#1F1D2B", "#FFFFFF") + '</div></td></tr>' +
    '<tr><td style="padding:14px 26px;background:#FAF9FD;color:#8B899C;font-size:12px;border-top:1px solid #EEECF5;">' +
    'Inviata dal modulo di <a href="' + esc_(SITE_URL) + '" style="color:#6D4AFF;">SmartRoutine Studio</a>. ' +
    'Rispondendo a questa email scrivi direttamente al cliente.</td></tr>' +
    '</table></div>';

  const text = [
    "Nuova richiesta " + id + " — " + when,
    "Nome: " + r.name, "Email: " + r.email, "Telefono: " + (r.phone || "-"),
    "Attività: " + (r.business || "-") + " (" + (r.business_type || "-") + ")",
    "Servizio: " + (r.service_interest || "-"), "Budget: " + (r.budget_range || "-"),
    "Contatto preferito: " + (r.contact_preference || "-"), "", r.problem_description, "",
    "Registro: " + docUrl
  ].join("\n");

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: "Nuova richiesta " + id + ": " + r.name + " · " + (r.service_interest || "Richiesta generica"),
    body: text,
    htmlBody: html,
    replyTo: r.email,
    name: "SmartRoutine Studio · Sito"
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
