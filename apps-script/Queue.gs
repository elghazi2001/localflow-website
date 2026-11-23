/**
 * Scheduled pipeline: read new requests (Gmail + form), gate on enough detail,
 * research the client, draft with AI, email the draft to the owner.
 * Nothing reaches a client until the owner approves each channel separately.
 */
const SHEET_NAME = "Richieste SmartRoutine Studio";
const COLS = ["id", "creato", "nome", "email", "telefono", "attivita", "sito", "servizio", "orario", "descrizione",
  "stato", "ricerca", "bozza", "email_inviata", "whatsapp_inviato", "fonte", "msg_id"];
const MAX_PER_RUN = 3;
const LINK_TTL_DAYS = 14;
const GMAIL_LABEL = "SR-processed";

// ---------- Sheet storage ----------
function getSheet_() {
  const props = PropertiesService.getScriptProperties();
  let ss = null;
  const id = props.getProperty("SHEET_ID");
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create(SHEET_NAME);
    props.setProperty("SHEET_ID", ss.getId());
    ss.getSheets()[0].setName("Richieste").appendRow(COLS);
    ss.getSheets()[0].setFrozenRows(1);
  }
  return ss.getSheets()[0];
}

function sheetUrl_() {
  return getSheet_().getParent().getUrl();
}

function readRows_() {
  const sh = getSheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, COLS.length).getValues().map(function (v, i) {
    const o = { _row: i + 2 };
    COLS.forEach(function (c, k) { o[c] = v[k] == null ? "" : String(v[k]); });
    return o;
  });
}

function findRequest_(id) {
  const rows = readRows_();
  for (let i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i];
  return null;
}

function updateRequest_(id, patch) {
  const r = findRequest_(id);
  if (!r) return;
  const sh = getSheet_();
  Object.keys(patch).forEach(function (k) {
    const idx = COLS.indexOf(k);
    if (idx >= 0) sh.getRange(r._row, idx + 1).setValue(String(patch[k]).slice(0, 45000));
  });
}

/** req: cleaned request fields; returns the new id, or "" when msg_id already stored. */
function saveRequest_(req, source, msgId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    if (msgId && readRows_().some(function (r) { return r.msg_id === msgId; })) return "";
    const id = nextId_();
    getSheet_().appendRow([id, new Date(), req.name, req.email, req.phone || "", req.business || "", req.website || "",
      req.service_interest || "", req.preferred_time || "", req.problem_description, "Nuova", "", "", "", "", source, msgId || ""]);
    return id;
  } finally { lock.releaseLock(); }
}

// ---------- Gmail intake (Web3Forms notifications) ----------
const W3F_LABELS = { "Nome": "name", "Email": "email", "Telefono": "phone", "Attività": "business", "Sito o Maps": "website",
  "Servizio": "service_interest", "Quando ricontattarlo": "preferred_time", "Message": "problem_description" };

function parseWeb3Forms_(body) {
  const out = {};
  let current = null;
  String(body).replace(/\r/g, "").split("\n").forEach(function (line) {
    const t = line.trim();
    if (current === "problem_description") {
      if (/^RISPONDI SUBITO/i.test(t)) { current = "_end"; return; }
      out.problem_description = (out.problem_description ? out.problem_description + "\n" : "") + line;
      return;
    }
    if (current === "_end") return;
    if (/^(Powered by|You received this|Sent via)/i.test(t)) { current = "_end"; return; }
    if (W3F_LABELS[t] && !(W3F_LABELS[t] in out)) { current = W3F_LABELS[t]; out[current] = ""; return; }
    if (current && t) out[current] = out[current] ? out[current] + " " + t : t;
  });
  return out;
}

function ingestGmail_() {
  const label = GmailApp.getUserLabelByName(GMAIL_LABEL) || GmailApp.createLabel(GMAIL_LABEL);
  GmailApp.search('from:web3forms subject:"Nuova richiesta" newer_than:7d -label:' + GMAIL_LABEL, 0, 10).forEach(function (thread) {
    thread.getMessages().forEach(function (m) {
      const raw = parseWeb3Forms_(m.getPlainBody());
      if (!raw.name || !raw.email || !raw.problem_description) return;
      const req = clean_({
        name: raw.name, email: raw.email, phone: raw.phone, business: raw.business, website: raw.website,
        service_interest: raw.service_interest, preferred_time: raw.preferred_time,
        problem_description: raw.problem_description.trim(), consent: true
      });
      if (validate_(req)) return;
      saveRequest_(req, "gmail", m.getId());
    });
    thread.addLabel(label);
  });
}

// ---------- Scheduled entry point ----------
function processQueue() {
  // A cache flag (not the script lock) so approvals are never blocked by a long run.
  const cache = CacheService.getScriptCache();
  if (cache.get("QUEUE_RUNNING")) return;
  cache.put("QUEUE_RUNNING", "1", 300);
  try {
    ingestGmail_();
    const stats = getSiteStats_();
    readRows_().filter(function (r) { return r.stato === "Nuova"; }).slice(0, MAX_PER_RUN).forEach(function (r) {
      prepareDraft_(r, stats);
    });
  } finally { cache.remove("QUEUE_RUNNING"); }
}

function prepareDraft_(r, stats) {
  const props = PropertiesService.getScriptProperties();
  const key = "ATT:" + r.id;
  const attempts = Number(props.getProperty(key) || 0) + 1;
  props.setProperty(key, String(attempts));
  try {
    let draft, research = null;
    if (!hasEnoughInfo_(r.descrizione)) {
      draft = lowInfoDraft_(r);
      updateRequest_(r.id, { stato: "Servono dettagli", bozza: JSON.stringify(draft) });
    } else {
      research = researchClient_(r);
      draft = buildDraft_(r, research, stats);
      updateRequest_(r.id, { stato: "Bozza pronta", ricerca: JSON.stringify(research), bozza: JSON.stringify(draft) });
    }
    sendReviewEmail_(r, draft, research, stats);
  } catch (err) {
    console.error(err);
    if (attempts >= 3) {
      updateRequest_(r.id, { stato: "Errore AI" });
      MailApp.sendEmail({ to: NOTIFY_EMAIL, subject: "Bozza non riuscita per " + r.id,
        body: "Non sono riuscito a preparare la bozza per " + r.id + " (" + r.nome + "): " + String(err.message || err) });
    }
  }
}

// ---------- Signed links ----------
function secret_() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty("SR_SECRET");
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props.setProperty("SR_SECRET", s); }
  return s;
}
function sign_(msg) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(msg, secret_())).replace(/=+$/, "");
}
function appUrl_() {
  // The editor returns the private /dev address, which clients cannot open. Always use /exec.
  const url = PropertiesService.getScriptProperties().getProperty("WEBAPP_URL") || ScriptApp.getService().getUrl();
  return String(url).replace(/\/dev$/, "/exec");
}
function reviewLink_(id, ch) {
  const exp = Date.now() + LINK_TTL_DAYS * 86400000;
  return appUrl_() + "?action=review&id=" + id + "&ch=" + ch + "&exp=" + exp + "&sig=" + sign_(id + "|" + ch + "|" + exp);
}
function demoLink_(id) { return appUrl_() + "?action=demo&id=" + id + "&sig=" + sign_(id + "|demo|0"); }
function validSig_(id, ch, exp, sig) {
  if (!sig || sign_(id + "|" + ch + "|" + exp) !== sig) return false;
  return ch === "demo" || Number(exp) > Date.now();
}

// ---------- Owner review email ----------
function phoneCandidates_(r, research) {
  const set = {};
  [normalizePhone_(r.telefono)].concat(research ? research.phones : []).forEach(function (p) { if (p) set[p] = true; });
  return Object.keys(set);
}

function sendReviewEmail_(r, draft, research, stats) {
  const demoUrl = draft.demo ? demoLink_(r.id) : "";
  const phones = phoneCandidates_(r, research);
  const left = remainingEmails_();
  const web = research && research.site ? research.site : null;

  let body = mailSection_("Cliente", mailTable_([
    ["Nome", esc_(r.nome)], ["Email", esc_(r.email)], ["Telefono inserito", esc_(r.telefono)],
    ["Attività", esc_(r.attivita)], ["Servizio", esc_(r.servizio)], ["Quando ricontattarlo", esc_(r.orario)]
  ]));
  body += mailSection_("Cosa ha scritto", mailQuote_(r.descrizione));

  if (research) {
    const found = mailTable_([
      ["Sito", web ? esc_(web.title || web.url) : ""], ["Descrizione sito", web ? esc_(web.description) : ""],
      ["Google Maps", research.maps ? esc_(research.maps.name || research.maps.url) : ""],
      ["Telefoni trovati", esc_(phones.join(", "))], ["Email trovate", esc_(research.emails.join(", "))],
      ["Social", esc_(research.socials.join(", "))]
    ]);
    if (found) body += mailSection_("Cosa ho trovato", found);
  }
  if (draft.lowInfo) {
    body += mailSection_("Descrizione troppo breve", '<p style="margin:0;">Sotto 200 caratteri o poco concreta: non ho chiamato l\'IA. Ti propongo un messaggio per chiedere dettagli.</p>');
  } else {
    body += mailSection_("Problema", mailParagraphs_(draft.summary));
    body += mailSection_("Soluzione proposta", mailParagraphs_(draft.solution));
    body += mailSection_("Piano a costo zero", mailList_(draft.steps) + (draft.stack.length ? '<p style="margin:10px 0 0;color:' + MAIL.muted + ';font-size:13px;">Strumenti: ' + esc_(draft.stack.join(", ")) + '</p>' : ""));
    if (draft.missing.length) body += mailSection_("Domande aperte", mailList_(draft.missing));
  }
  body += mailSection_("Bozza email", '<div style="font-size:13px;color:' + MAIL.muted + ';margin-bottom:6px;">Oggetto: ' + esc_(draft.email.subject) + '</div>' + mailQuote_(draft.email.body.replace(/\{\{DEMO_URL\}\}/g, demoUrl || "")));
  body += mailSection_("Bozza WhatsApp", mailQuote_(draft.whatsapp.replace(/\{\{DEMO_URL\}\}/g, demoUrl || "")));
  if (demoUrl) body += mailSection_("Demo", '<p style="margin:0;">' + mailButton_(demoUrl, "Guarda la demo", "secondary") + '</p>');

  body += '<div style="margin:6px 0 10px;">' +
    mailButton_(reviewLink_(r.id, "email"), "Rivedi e invia email", "primary") +
    mailButton_(reviewLink_(r.id, "wa"), "Rivedi e apri WhatsApp", "primary") +
    mailButton_(reviewLink_(r.id, "discard"), "Scarta", "secondary") + '</div>' +
    '<p style="margin:0 0 16px;font-size:13px;color:' + MAIL.muted + ';">Ogni pulsante apre una pagina di conferma. Non parte nulla finché non confermi lì.</p>';

  const foot = [statsLine_(stats), left === null ? "" : "Email rimaste oggi: " + left].filter(Boolean).map(esc_).join("<br>");
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: (draft.lowInfo ? "Servono dettagli · " : "Bozza pronta · ") + r.id + " · " + r.nome,
    body: "Bozza per " + r.id + " (" + r.nome + "). Apri l'email in HTML per rivedere e approvare.\n\n" + draft.email.subject + "\n\n" + draft.email.body.replace(/\{\{DEMO_URL\}\}/g, demoUrl || ""),
    htmlBody: mailShell_({ preheader: "Rivedi e approva: " + r.nome, title: (draft.lowInfo ? "Servono più dettagli" : "Bozza pronta") + " · " + r.id,
      subtitle: r.nome + (r.attivita ? " · " + r.attivita : ""), body: body, footer: foot || "SmartRoutine Studio" }),
    name: "SmartRoutine Studio · Bozze"
  });
}

// ---------- Review page (GET only shows it; sending happens via approveAction) ----------
function reviewPage_(p) {
  const ok = validSig_(p.id, p.ch, p.exp, p.sig) && ["email", "wa", "discard"].indexOf(p.ch) >= 0;
  const r = ok ? findRequest_(p.id) : null;
  const page = function (inner) {
    return HtmlService.createHtmlOutput(
      '<!doctype html><html lang="it"><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<style>body{margin:0;background:#F5F2FA;font:16px/1.55 -apple-system,Segoe UI,Arial,sans-serif;color:#1F1B2E}main{max-width:640px;margin:0 auto;padding:24px 16px}' +
      'h1{font-size:22px;margin:0 0 6px}.card{background:#fff;border:1px solid #E8E3F2;border-radius:14px;padding:20px;margin-top:16px}label{display:block;font-weight:600;margin:14px 0 6px;font-size:14px}' +
      'input,textarea,select{width:100%;box-sizing:border-box;font:inherit;padding:10px 12px;border:1.5px solid #D9D2EA;border-radius:10px}textarea{min-height:240px}' +
      'button{margin-top:18px;padding:13px 22px;border:0;border-radius:999px;background:#FF3D8B;color:#fff;font:700 15px inherit;cursor:pointer}button[disabled]{opacity:.5}.muted{color:#6B6580;font-size:14px}#msg{margin-top:14px;font-weight:600}</style></head><body><main>' + inner + '</main></body></html>'
    ).setTitle("SmartRoutine Studio");
  };
  if (!r) return page('<h1>Link non valido o scaduto</h1><p class="muted">Apri di nuovo il link più recente nell\'email di bozza.</p>');

  let draft = {};
  try { draft = JSON.parse(r.bozza); } catch (e) {}
  const demoUrl = draft.demo ? demoLink_(r.id) : "";
  const fill = function (t) { return String(t || "").replace(/\{\{DEMO_URL\}\}/g, demoUrl); };
  const data = ' data-id="' + esc_(r.id) + '" data-ch="' + esc_(p.ch) + '" data-exp="' + esc_(p.exp) + '" data-sig="' + esc_(p.sig) + '"';

  let form;
  if (p.ch === "discard") {
    form = '<p>Vuoi scartare la richiesta ' + esc_(r.id) + ' di ' + esc_(r.nome) + '? Non verrà inviato nulla.</p><button id="go">Scarta richiesta</button>';
  } else if (p.ch === "email") {
    const done = r.email_inviata ? '<p class="muted">Già inviata il ' + esc_(r.email_inviata) + '. Puoi inviarne un\'altra solo da qui, dopo averla riletta.</p>' : "";
    form = done + '<p class="muted">Verrà inviata a <b>' + esc_(r.email) + '</b>, con te in risposta.</p>' +
      '<label for="subject">Oggetto</label><input id="subject" maxlength="120" value="' + esc_(draft.email && draft.email.subject) + '">' +
      '<label for="text">Messaggio</label><textarea id="text" maxlength="3000">' + esc_(fill(draft.email && draft.email.body)) + '</textarea>' +
      '<button id="go">Invia email a ' + esc_(r.nome) + '</button>';
  } else {
    const phones = phoneCandidates_(r, r.ricerca ? JSON.parse(r.ricerca) : null);
    const opts = phones.map(function (n) { return '<option value="' + esc_(n) + '">' + esc_(n) + '</option>'; }).join("") + '<option value="">Scelgo il contatto in WhatsApp</option>';
    form = '<label for="phone">Numero</label><select id="phone">' + opts + '</select>' +
      '<label for="text">Messaggio</label><textarea id="text" maxlength="1200">' + esc_(fill(draft.whatsapp)) + '</textarea>' +
      '<button id="go">Apri WhatsApp con questo messaggio</button>';
  }

  const script = '<script>(function(){var b=document.getElementById("go"),m=document.getElementById("msg"),root=document.getElementById("root");' +
    'b.onclick=function(){var v=function(i){var e=document.getElementById(i);return e?e.value:""};' +
    'var payload={id:root.dataset.id,ch:root.dataset.ch,exp:root.dataset.exp,sig:root.dataset.sig,subject:v("subject"),text:v("text"),phone:v("phone")};' +
    'if(payload.ch==="wa"){var d=payload.phone.replace(/\\D/g,"");window.open("https://wa.me/"+d+"?text="+encodeURIComponent(payload.text),"_blank");}' +
    'b.disabled=true;m.textContent="Un attimo...";' +
    'google.script.run.withSuccessHandler(function(r){m.textContent=r.message;if(!r.ok)b.disabled=false;}).withFailureHandler(function(e){m.textContent="Errore: "+e.message;b.disabled=false;}).approveAction(payload);};})();</script>';

  return page('<h1>' + (p.ch === "email" ? "Invia email" : p.ch === "wa" ? "Invia su WhatsApp" : "Scarta") + ' · ' + esc_(r.id) + '</h1>' +
    '<p class="muted">' + esc_(r.nome) + (r.attivita ? ' · ' + esc_(r.attivita) : '') + '</p><div class="card" id="root"' + data + '>' + form + '<div id="msg" role="status"></div></div>' + script);
}

/** Called from the review page. Re-verifies the signed link; sends to the stored client address only. */
function approveAction(p) {
  if (!p || !validSig_(p.id, p.ch, p.exp, p.sig)) return { ok: false, message: "Link non valido o scaduto." };
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const r = findRequest_(p.id);
    if (!r) return { ok: false, message: "Richiesta non trovata." };
    const stamp = Utilities.formatDate(new Date(), "Europe/Rome", "dd/MM/yyyy HH:mm");
    const text = String(p.text || "").slice(0, 3000).trim();

    if (p.ch === "discard") {
      updateRequest_(r.id, { stato: "Chiusa" });
      return { ok: true, message: "Richiesta scartata." };
    }
    if (!text) return { ok: false, message: "Il messaggio è vuoto." };

    if (p.ch === "wa") {
      updateRequest_(r.id, { whatsapp_inviato: stamp, stato: r.email_inviata ? "Completata" : "WhatsApp inviato" });
      return { ok: true, message: "Segnato come inviato su WhatsApp. Se la finestra non si è aperta, consenti i popup e riprova." };
    }

    const left = remainingEmails_();
    if (left !== null && left < 3) return { ok: false, message: "Quota email giornaliera quasi finita. Riprova domani." };
    const subject = String(p.subject || "La tua richiesta a SmartRoutine Studio").replace(/[\r\n]+/g, " ").slice(0, 120);
    const demo = demoLink_(r.id);
    const hasDemo = /\/exec\?action=demo/.test(text);
    const html = mailShell_({
      preheader: subject, title: subject, subtitle: "",
      body: mailParagraphs_(text) + (!hasDemo && r.bozza.indexOf('"demo":null') < 0 ? '<p style="margin:0 0 14px;">' + mailButton_(demo, "Guarda la demo", "primary") + '</p>' : ""),
      footer: "SmartRoutine Studio · Rispondi a questa email per scrivermi direttamente."
    });
    MailApp.sendEmail({ to: r.email, subject: subject, body: text, htmlBody: html, replyTo: NOTIFY_EMAIL, name: "SmartRoutine Studio" });
    updateRequest_(r.id, { email_inviata: stamp, stato: r.whatsapp_inviato ? "Completata" : "Email inviata" });
    return { ok: true, message: "Email inviata a " + r.email + "." };
  } catch (err) {
    console.error(err);
    return { ok: false, message: "Invio non riuscito. Riprova." };
  } finally { lock.releaseLock(); }
}

// ---------- Demo page shown to the client (fixed template, AI fills text only) ----------
function demoPage_(p) {
  const bad = function () { return HtmlService.createHtmlOutput("<p style='font-family:sans-serif;padding:24px'>Demo non disponibile.</p>").setTitle("Demo"); };
  if (!validSig_(p.id, "demo", "0", p.sig)) return bad();
  const r = findRequest_(p.id);
  let d = null;
  try { d = JSON.parse(r.bozza).demo; } catch (e) {}
  if (!r || !d) return bad();
  const services = (d.services && d.services.length ? d.services : [{ name: "Appuntamento", note: "" }]);
  const li = function (a, f) { return a.map(f).join(""); };
  const html = '<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">' +
    '<style>*{box-sizing:border-box}body{margin:0;background:#14072B;font:16px/1.5 -apple-system,Segoe UI,Arial,sans-serif;color:#1F1B2E}.wrap{max-width:420px;margin:0 auto;padding:20px 14px}' +
    '.badge{color:#FFB3D1;font-size:13px;text-align:center;margin-bottom:12px}.app{background:#fff;border-radius:22px;overflow:hidden}.top{padding:22px;background:linear-gradient(135deg,#FF3D8B,#FF9A3C);color:#fff}' +
    '.top h1{margin:0;font-size:22px}.top p{margin:4px 0 0;opacity:.92;font-size:14px}.body{padding:18px 22px 24px}h2{font-size:14px;margin:18px 0 8px;color:#6B6580}' +
    '.opt{display:block;width:100%;text-align:left;background:#FAF8FD;border:1.5px solid #E8E3F2;border-radius:12px;padding:12px 14px;margin-bottom:8px;font:inherit;cursor:pointer}.opt small{display:block;color:#6B6580}' +
    '.opt.on{border-color:#FF3D8B;background:#FFF0F6}.slots{display:flex;flex-wrap:wrap;gap:8px}.slots .opt{width:auto;margin:0;padding:9px 14px}' +
    '.go{width:100%;margin-top:20px;padding:14px;border:0;border-radius:999px;background:#FF3D8B;color:#fff;font:700 16px inherit}.ok{display:none;margin-top:14px;padding:12px;border-radius:12px;background:#E9F8EF;color:#1B7A44;font-weight:600}' +
    '.flow{margin:18px 0 0;padding-left:20px;font-size:14px;color:#6B6580}</style></head><body><div class="wrap"><div class="badge">Demo illustrativa, non è ancora attiva</div><div class="app">' +
    '<div class="top"><h1>' + esc_(d.business_name) + '</h1><p>' + esc_(d.tagline || "Prenota in pochi secondi") + '</p></div><div class="body">' +
    '<h2>Scegli il servizio</h2>' + li(services, function (s, i) { return '<button class="opt svc' + (i === 0 ? ' on' : '') + '">' + esc_(s.name) + (s.note ? '<small>' + esc_(s.note) + '</small>' : '') + '</button>'; }) +
    '<h2>Scegli l\'orario</h2><div class="slots">' + li(d.slots && d.slots.length ? d.slots : ["10:00", "15:00"], function (s, i) { return '<button class="opt slot' + (i === 0 ? ' on' : '') + '">' + esc_(s) + '</button>'; }) + '</div>' +
    '<button class="go" id="go">Conferma prenotazione</button><div class="ok" id="ok">Prenotazione ricevuta. Ti arriva subito la conferma, con un promemoria prima dell\'appuntamento.</div>' +
    (d.flow && d.flow.length ? '<ol class="flow">' + li(d.flow, function (f) { return '<li>' + esc_(f) + '</li>'; }) + '</ol>' : '') +
    '</div></div></div><script>document.querySelectorAll(".svc,.slot").forEach(function(b){b.onclick=function(){var c=b.classList.contains("svc")?".svc":".slot";document.querySelectorAll(c).forEach(function(x){x.classList.remove("on")});b.classList.add("on")}});' +
    'document.getElementById("go").onclick=function(){document.getElementById("ok").style.display="block"};</script></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle("Demo · " + d.business_name);
}

// ---------- One-time setup ----------
/** Run once from the editor: creates the Sheet, the secret and the 15-minute trigger. */
function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === "processQueue") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("processQueue").timeBased().everyMinutes(15).create();
  getSheet_(); secret_();
  console.log("Pronto. Foglio: " + SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty("SHEET_ID")).getUrl());
}

/** Editor test: one short and one detailed fake request, drafts go only to the owner. */
function testPipeline() {
  const base = { name: "Test Cliente", email: "test@example.com", business: "Salone Prova", consent: true };
  const short = saveRequest_(clean_(Object.assign({ problem_description: "Vorrei un sito." }, base)), "test", "");
  const long = saveRequest_(clean_(Object.assign({ problem_description:
    "Ho un salone con tre collaboratrici. Le prenotazioni arrivano da WhatsApp, Instagram e telefono, e ogni settimana perdiamo almeno due appuntamenti per sovrapposizioni. " +
    "Oggi usiamo un'agenda di carta e Google Calendar, ma nessuno aggiorna in tempo. Vorrei un posto unico dove i clienti prenotano da soli e ricevono un promemoria il giorno prima." }, base)), "test", "");
  console.log("Creati " + short + " (breve, niente IA) e " + long + " (dettagliata). Esegui processQueue.");
}
