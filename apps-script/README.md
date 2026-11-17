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
- A honeypot silently drops obvious automated submissions. Browser timing and frontend tokens are not trusted: visitors can forge both.
- One request per email per minute and a serialized global limit of 20 requests per 10-minute bucket are enforced server-side. This is basic abuse control, not a substitute for CAPTCHA/Turnstile and edge-level rate limiting.
- The global counter uses Script Properties and a script lock so concurrent submissions cannot all pass using the same stale count. Cache-based per-email cooldowns can still expire early and are not a durable identity control.
- The web app is publicly callable (required for a public static form). Do not treat a shared value embedded in JavaScript as authentication.
- Configure a server-verified CAPTCHA/Turnstile check and a rate-limiting proxy/WAF before relying on this endpoint for production traffic.
- The script only runs as you and can only touch the Doc it created and send mail to `NOTIFY_EMAIL`.
