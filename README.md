# SmartRoutine Studio — Complete Frontend Redesign

Official production-ready frontend for **SmartRoutine Studio**, an independent custom software, automation, and practical AI studio for small business owners.

## 📁 Project Structure

```text
SmartRoutine-Studio/
├── index.html              # Main semantic HTML5 file (Italian)
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
  brandName: "SmartRoutine Studio",
  tagline: "Strumenti digitali su misura, automazioni e integrazioni IA pratiche per attività locali.",
  contactEmail: "info@smartroutinestudio.com",
  whatsappNumber: "393000000000",
  whatsappDefaultMessage: "Ciao SmartRoutine Studio! Vorrei discutere un problema...",
  pricing: {
    bookingSystem: 400,
    automation: 150,
    aiIntegration: 250,
    website: 350,
    custom: "Su Preventivo"
  }
};
```

## ✉️ Email Delivery (Web3Forms)

The contact form submits to `https://api.web3forms.com/submit` using the Web3Forms access key stored in the form's hidden `access_key` field.

- Existing form fields and their names are preserved.
- The submitted email includes the original contact and project details in a structured Italian message.
- Client-side validation checks the required fields and consent.
- The submit button displays its existing loading indicator and is disabled while the request is in progress.
- Success and failure are reported through the existing status modal.

The browser-side access key is visible to visitors by design. If it is ever exposed to unwanted traffic, rotate it in your Web3Forms dashboard.

## 🚀 Deployment

Simply upload all files in this archive to any web server, GitHub Pages, Netlify, or Vercel. No build step or backend node server required.
