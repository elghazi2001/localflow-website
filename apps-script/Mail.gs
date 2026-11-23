/**
 * Shared HTML email builder. One clean, table-based layout with inline CSS
 * so it renders the same in Gmail, Apple Mail and Outlook.
 */
const MAIL = {
  pink: "#FF3D8B", orange: "#FF9A3C", ink: "#14072B",
  text: "#1F1B2E", muted: "#6B6580", line: "#E8E3F2", bg: "#F5F2FA", soft: "#FAF8FD",
  font: "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif"
};

/** o: { preheader, title, subtitle, body (html), footer (html) } */
function mailShell_(o) {
  return '<!doctype html><html lang="it"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background:' + MAIL.bg + ';">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">' + esc_(o.preheader || "") + '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + MAIL.bg + ';">' +
    '<tr><td align="center" style="padding:24px 12px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ' +
    'style="max-width:620px;background:#FFFFFF;border:1px solid ' + MAIL.line + ';border-radius:16px;overflow:hidden;font-family:' + MAIL.font + ';color:' + MAIL.text + ';">' +
    '<tr><td bgcolor="' + MAIL.pink + '" style="background:' + MAIL.pink + ';background-image:linear-gradient(135deg,' + MAIL.pink + ',' + MAIL.orange + ');padding:24px 28px;">' +
    '<div style="font-size:13px;font-weight:700;letter-spacing:.04em;color:#FFFFFF;opacity:.9;">SmartRoutine Studio</div>' +
    '<div style="font-size:24px;line-height:1.25;font-weight:800;color:#FFFFFF;margin-top:6px;">' + esc_(o.title) + '</div>' +
    (o.subtitle ? '<div style="font-size:14px;color:#FFFFFF;opacity:.92;margin-top:6px;">' + esc_(o.subtitle) + '</div>' : '') +
    '</td></tr>' +
    '<tr><td style="padding:24px 28px 8px;font-size:15px;line-height:1.6;">' + o.body + '</td></tr>' +
    '<tr><td style="padding:16px 28px 24px;font-size:12px;line-height:1.5;color:' + MAIL.muted + ';border-top:1px solid ' + MAIL.line + ';">' +
    (o.footer || "SmartRoutine Studio") + '</td></tr>' +
    '</table></td></tr></table></body></html>';
}

function mailSection_(title, inner) {
  return '<div style="margin:0 0 22px;">' +
    '<div style="font-size:14px;font-weight:700;color:' + MAIL.ink + ';margin:0 0 8px;">' + esc_(title) + '</div>' + inner + '</div>';
}

/** rows: [[label, value]], empty values are skipped. */
function mailTable_(rows) {
  const body = rows.filter(function (r) { return r[1]; }).map(function (r) {
    return '<tr><td style="padding:9px 12px;width:150px;background:' + MAIL.soft + ';color:' + MAIL.muted + ';font-size:13px;border-bottom:1px solid ' + MAIL.line + ';vertical-align:top;">' + esc_(r[0]) + '</td>' +
      '<td style="padding:9px 12px;font-size:14px;border-bottom:1px solid ' + MAIL.line + ';">' + r[1] + '</td></tr>';
  }).join("");
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ' + MAIL.line + ';border-radius:10px;border-collapse:separate;overflow:hidden;">' + body + '</table>';
}

function mailQuote_(text) {
  return '<div style="background:' + MAIL.soft + ';border-left:4px solid ' + MAIL.pink + ';border-radius:6px;padding:14px 16px;font-size:14px;line-height:1.6;white-space:pre-wrap;">' + esc_(text) + '</div>';
}

function mailList_(items) {
  if (!items || !items.length) return "";
  return '<ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.7;">' +
    items.map(function (i) { return '<li>' + esc_(i) + '</li>'; }).join("") + '</ul>';
}

function mailParagraphs_(text) {
  return String(text || "").split(/\n{2,}/).map(function (p) {
    const html = esc_(p).replace(/\n/g, "<br>").replace(/(https:\/\/[^\s<]+)/g, '<a href="$1" style="color:' + MAIL.pink + ';">$1</a>');
    return '<p style="margin:0 0 14px;">' + html + '</p>';
  }).join("");
}

/** kind: "primary" | "secondary" */
function mailButton_(href, label, kind) {
  const primary = kind !== "secondary";
  return '<a href="' + esc_(href) + '" style="display:inline-block;margin:0 8px 8px 0;padding:12px 20px;border-radius:999px;' +
    'font-size:14px;font-weight:700;text-decoration:none;' +
    (primary ? 'background:' + MAIL.pink + ';color:#FFFFFF;' : 'background:#FFFFFF;color:' + MAIL.ink + ';border:1.5px solid ' + MAIL.ink + ';') +
    '">' + esc_(label) + '</a>';
}
