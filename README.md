# SmartRoutine Studio — Complete Frontend Redesign

Official production-ready frontend for **SmartRoutine Studio**, an independent custom software, automation, and practical AI studio for small business owners.

## 📁 Project Structure

```text
SmartRoutine-Studio/
├── index.html              # Main semantic HTML5 file (Italian)
├── mockup.html             # Placeholder for the future mockup generator
├── apps-script/            # Google Apps Script: Doc log + HTML email
├── README.md               # Documentation & setup guide
├── assets/
│   ├── logo.svg            # Custom SVG logo with purple workflow node icon
│   ├── favicon.svg         # Derived favicon SVG
│   ├── images/             # Visual graphic assets
│   └── icons/              # Local UI vector icon assets
├── css/
│   ├── style.css           # Primary design system, typography, components, desktop layout
│   └── responsive.css      # Responsive media queries for tablet & mobile viewports
└── js/
    ├── config.js           # Central editable configuration object (prices, contact details)
    ├── services.js         # Service cards and pricing packages renderer
    ├── form.js             # Contact form validation & email submission integration
    └── main.js             # UI interactions, mobile navigation, scroll behavior
```

## ⚙️ Central Configuration (`js/config.js`)

You can edit business variables without modifying HTML or core code:

```javascript
window.SR_CONFIG = {
  contactEmail: "elghazifarouk112@gmail.com",
  whatsappNumber: "+393281016993",
  pricing: { website: 372, bookingSystem: 450, automation: 150, aiIntegration: 400, custom: "Su Preventivo" },
  requestEndpoint: "https://script.google.com/macros/s/…/exec", // Apps Script Web App URL
  requestToken: "srs-2026-form",                               // must match FORM_TOKEN in Code.gs
  submitCooldownMs: 30000
};
```

## ✉️ Request Delivery

1. **Primary — Google Apps Script** (`apps-script/Code.gs`, deploy guide in `apps-script/README.md`):
   logs every request in the Google Doc *"Richieste SmartRoutine Studio"* (newest on top, with ID and status)
   and sends an HTML email with the details, reply/WhatsApp/Doc buttons and a **"Genera mockup del servizio"**
   button (links to the `mockup.html` placeholder, to be developed).
2. **Fallback — Web3Forms**: if the Apps Script is not configured or unreachable, the form sends the
   plain-text email through Web3Forms so no request is lost. Reply-To is set to the customer's email.

## 🔒 Security

- Content-Security-Policy and Referrer-Policy meta tags (scripts only from this site; network calls only to Apps Script and Web3Forms).
- No inline event handlers; dynamic text is set with `textContent`.
- Honeypot field, minimum fill time and a 30 s client cooldown; server-side length limits, HTML escaping and rate limiting.
- The Web3Forms access key is public by design: restrict it to your domain in the Web3Forms dashboard.
- Privacy notice under the consent checkbox (GDPR).

## 🚀 Deployment

Static site, no build step. Published with GitHub Pages from `main` (root): https://elghazi2001.github.io/localflow-website/
