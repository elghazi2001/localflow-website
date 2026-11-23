# SmartRoutine Studio

Website of **SmartRoutine Studio**, an independent software developer in Pavia who builds websites, automations and practical AI tools for small businesses. Static site on GitHub Pages, with a Google Apps Script back end for the contact form.

## 📁 Project Structure

```text
SmartRoutine-Studio/
├── index.html              # Main semantic HTML5 file (Italian)
├── mockup.html             # Placeholder for the future mockup generator
├── apps-script/            # Google Apps Script: Sheet log, HTML email, AI drafts with approval
├── README.md               # Documentation & setup guide
├── sitemap.xml, robots.txt # SEO files
├── assets/
│   ├── logo.svg            # Logo
│   ├── favicon.svg         # Favicon
│   ├── og-image.png        # Social preview image
│   └── farouk-elghazi.jpg  # Portrait used in the "Chi sono" section
├── css/
│   └── style.css           # Design system, components, layout and responsive rules
└── js/
    ├── config.js           # Central editable configuration object
    ├── services.js         # Service list renderer
    ├── form.js             # Contact form validation & submission
    ├── demo.js             # Interactive booking demo
    ├── mockup.js           # Placeholder page script
    └── main.js             # UI interactions, mobile menu, GoatCounter loader, WhatsApp links
```

## ⚙️ Central Configuration (`js/config.js`)

You can edit business variables without modifying HTML or core code:

```javascript
window.SR_CONFIG = {
  contactEmail: "elghazifarouk112@gmail.com",
  whatsappNumber: "+393281016993",
  goatcounterCode: "smartroutine",                       // GoatCounter site code (free, cookieless stats)
  requestEndpoint: "https://script.google.com/macros/s/…/exec", // Apps Script Web App URL
  submitCooldownMs: 30000
};
```

## ✉️ Request Delivery

1. **Primary — Google Apps Script** (`apps-script/Code.gs`, deploy guide in `apps-script/README.md`):
   saves every request as a row in the Google Sheet *"Richieste SmartRoutine Studio"* (with ID and status)
   and sends you an HTML email with the details and reply/WhatsApp/Sheet buttons. If the email fails, the
   request is still saved and the visitor still sees a success message. Every 15 minutes the queue prepares an
   AI draft that is sent to you only; nothing reaches the client before you confirm.
2. **Fallback — Web3Forms**: if the Apps Script is not configured or unreachable, the form sends the
   plain-text email through Web3Forms so no request is lost. Reply-To is set to the customer's email.

## 🔒 Security

- Content-Security-Policy and Referrer-Policy meta tags (scripts only from this site; network calls only to Apps Script and Web3Forms).
- No inline event handlers; dynamic text is set with `textContent`.
- Client-side honeypot/cooldown are UX and low-confidence spam signals only. The Apps Script source includes server-side validation and serialized rate limits, but the web app is publicly callable.
- A public Web3Forms access key is visible in the browser by design; restrict allowed domains in the Web3Forms dashboard and monitor usage.
- When Apps Script is configured, a network timeout is not automatically retried through Web3Forms: the first provider may already have accepted the request. Check for the notification before resubmitting.
- CAPTCHA/Turnstile verification, edge-level rate limiting, and HTTP response security headers require external service configuration; see [SECURITY.md](SECURITY.md).
- Privacy notice under the consent checkbox (GDPR).

## 🚀 Deployment

Static site, no build step. Published with GitHub Pages from `main` (root): https://elghazi2001.github.io/localflow-website/
