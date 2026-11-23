# Request receiver — deploy guide (≈5 minutes)

This Google Apps Script receives contact-form submissions, logs each one in the Google Doc
**"Richieste SmartRoutine Studio"** (created automatically in your Drive) and emails you a formatted HTML notification.

1. Open <https://script.google.com> (signed in as the Gmail account that should receive requests) → **New project**.
2. Delete the sample code and paste the whole content of **`dist/SmartRoutine.gs`** (one file, everything included; rebuilt with `./build.sh` from the module files). Rename the project "SmartRoutine Requests", save (Ctrl+S).
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

## AI drafts with your approval (free)

Every 15 minutes the script reads new requests (from the form, and from the Web3Forms emails in your Gmail), checks that the
description is detailed enough (200+ characters, real content), looks up the client's public website or Maps link, asks Google Gemini
for a plan that uses only free tools, and emails **you** a draft (email + WhatsApp + a small demo page). Nothing reaches a client until you
open the review page and confirm. Email and WhatsApp are approved separately, and each link works only after you press the button on the page.

One-time setup:
1. Get a free key at <https://aistudio.google.com/apikey>. In the Apps Script editor: **Project Settings → Script properties** → add `GEMINI_API_KEY`.
2. Run **`installTrigger`** once (creates the Sheet "Richieste SmartRoutine Studio", a signing secret and the 15-minute trigger). Authorize Gmail, Sheets and external requests when asked.
3. **Deploy → Manage deployments → New version** so the review and demo pages are served. Optionally add property `WEBAPP_URL` with the `/exec` URL.
4. Test with **`testPipeline`** then **`processQueue`**: you should get one "Servono dettagli" email (short text, no AI) and one "Bozza pronta" email.
5. Optional visit stats: create a free account at <https://www.goatcounter.com>, put its code in `goatcounterCode` in `js/config.js`, then add Script properties `GOATCOUNTER_CODE` and `GOATCOUNTER_TOKEN` (read-only API token).

Notes: the daily AI call cap is 40 (`AI_DAILY_CAP`). The free Gemini tier may use inputs to improve Google products; the form's privacy text says so.
Client text is treated as untrusted in the prompt, the AI only fills text fields in a fixed demo template, and drafts are never sent automatically.
