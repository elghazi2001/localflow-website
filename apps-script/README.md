# Request receiver: deploy guide (about 5 minutes)

This Google Apps Script receives contact-form submissions, saves each one as a row in the Google Sheet
**"Richieste SmartRoutine Studio"** (created automatically in your Drive) and emails you a formatted HTML notification.
For each request it also saves a plain base reply in the Gmail drafts and adds ready-made reply and WhatsApp buttons to the email. Tailored replies are written by the Claude Code skill `/controlla-richieste` (see below).

1. Open <https://script.google.com> (signed in as the Gmail account that should receive requests) → **New project**.
2. Delete the sample code and paste the whole content of **`dist/SmartRoutine.gs`** (one file, everything included; rebuilt with `sh build.sh` from `Code.gs`, `Mail.gs`, `Sheet.gs`). Rename the project "SmartRoutine Requests", save (Ctrl+S).
3. In the function dropdown pick **`setup`** → **Run** → **Review permissions** → choose your account → *Advanced* → *Go to SmartRoutine Requests* → **Allow**.
   (Permissions requested: Sheets, Gmail drafts, send email as you, temporary cache.) The log shows the Sheet link. `setup` also removes any old triggers.
   To check the form path without the website, run **`testForm`**: it saves a fake request and prints the result.
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
- The script only runs as you, touches only the Sheet it created, creates drafts in your Gmail and sends mail to `NOTIFY_EMAIL`. It never contacts the client.

## Replies with Claude Code (no API key, included in the Pro plan)

The Sheet columns are: id, creato, nome, email, telefono, attivita, sito, servizio, orario, descrizione, stato, …, plus
`riassunto`, `whatsapp`, `domande` filled by Claude.

When you type **`/controlla-richieste`** in Claude Code, it reads the rows with state `Nuova`, looks at the client's website or
Google Maps page, writes the email, a WhatsApp message, a short summary and the missing questions in natural Italian (using the
humanizer skill), replaces the base Gmail draft with a tailored one (and a proposal page with a preview and costs) and sets the state to `Bozza Claude`.
Nothing is sent: you review the draft and press Send yourself.

The skill lives in `~/.claude/skills/controlla-richieste/SKILL.md` on your PC (not in this repository). It needs the Gmail and
Google Sheets connectors enabled in Claude.
