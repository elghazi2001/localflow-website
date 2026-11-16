# Request receiver — deploy guide (≈5 minutes)

This Google Apps Script receives contact-form submissions, logs each one in the Google Doc
**"Richieste SmartRoutine Studio"** (created automatically in your Drive) and emails you a formatted HTML notification.

1. Open <https://script.google.com> (signed in as the Gmail account that should receive requests) → **New project**.
2. Delete the sample code, paste the whole content of `Code.gs`, rename the project "SmartRoutine Requests", save (Ctrl+S).
3. In the function dropdown pick **`setup`** → **Run** → **Review permissions** → choose your account → *Advanced* → *Go to SmartRoutine Requests* → **Allow**.
   (Permissions requested: create/edit the Doc, send email as you, temporary cache.) The log shows the Doc link.
4. **Deploy → New deployment** → type **Web app** → *Execute as*: **Me** → *Who has access*: **Anyone** → **Deploy**.
5. Copy the **Web app URL** (`https://script.google.com/macros/s/…/exec`) into `requestEndpoint` in `js/config.js`.

Updating the code later: **Deploy → Manage deployments → ✏ → Version: New version → Deploy** (the URL stays the same).

## Security notes
- Every value is length-capped, control characters are stripped and everything is HTML-escaped before it goes into the email.
- Honeypot field + minimum fill time silently drop bots; one request per email per minute and max 20 per 10 minutes overall.
- `FORM_TOKEN` must match `requestToken` in `js/config.js`. It is visible in the site source, so it only filters random scanners — the limits above are the real protection.
- The script only runs as you and can only touch the Doc it created and send mail to `NOTIFY_EMAIL`.
