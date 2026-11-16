/**
 * SmartRoutine Studio — Central Configuration Object
 * All basic business details, prices, and contact details can be managed here.
 */
window.SR_CONFIG = {
  brandName: "SmartRoutine Studio",
  tagline: "Strumenti digitali su misura, automazioni di processi e integrazioni IA pratiche per attività locali.",
  contactEmail: "elghazifarouk112@gmail.com",
  whatsappNumber: "+393281016993", // Update with recipient WhatsApp number in international format
  whatsappDefaultMessage: "Ciao SmartRoutine Studio! Vorrei discutere un problema nella mia attività e valutare una soluzione praticabile.",

  pricing: {
    website: 372,
    bookingSystem: 450,
    automation: 150,
    aiIntegration: 400,
    custom: "Su Preventivo"
  },

  /**
   * Contact-form delivery.
   * requestEndpoint: Google Apps Script Web App URL (see apps-script/README.md).
   *   It logs the request in the Google Doc and sends the HTML email.
   *   If empty or unreachable, the form falls back to Web3Forms (plain-text email).
   * requestToken: must match FORM_TOKEN in apps-script/Code.gs.
   */
  requestEndpoint: "",
  requestToken: "srs-2026-form",
  submitCooldownMs: 30000
};
