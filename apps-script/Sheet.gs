/**
 * Request storage: one row per request in the Google Sheet "Richieste SmartRoutine Studio".
 * Columns R to T (riassunto, whatsapp, domande) are filled by the Claude Code skill
 * /controlla-richieste, which also writes the reply drafts in Gmail.
 */
const SHEET_NAME = "Richieste SmartRoutine Studio";
const COLS = ["id", "creato", "nome", "email", "telefono", "attivita", "sito", "servizio", "orario", "descrizione",
  "stato", "ricerca", "bozza", "email_inviata", "whatsapp_inviato", "fonte", "msg_id"];
const EXTRA_COLS = ["riassunto", "whatsapp", "domande"];

function getSheet_() {
  const props = PropertiesService.getScriptProperties();
  let ss = null;
  const id = props.getProperty("SHEET_ID");
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create(SHEET_NAME);
    props.setProperty("SHEET_ID", ss.getId());
    ss.getSheets()[0].setName("Richieste").appendRow(COLS.concat(EXTRA_COLS));
    ss.getSheets()[0].setFrozenRows(1);
  }
  return ss.getSheets()[0];
}

function sheetUrl_() {
  return getSheet_().getParent().getUrl();
}

/** req: cleaned request fields; returns the new request id. */
function saveRequest_(req, source) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const id = nextId_();
    getSheet_().appendRow([id, new Date(), req.name, req.email, req.phone || "", req.business || "", req.website || "",
      req.service_interest || "", req.preferred_time || "", req.problem_description, "Nuova", "", "", "", "", source, ""]);
    return id;
  } finally { lock.releaseLock(); }
}

// ---------- One-time setup ----------
/** Run once from the editor: creates the Sheet and removes the old 15-minute AI trigger. */
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  console.log("Pronto. Foglio: " + sheetUrl_());
}
