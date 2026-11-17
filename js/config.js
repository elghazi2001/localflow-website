/**
 * SmartRoutine Studio — Central Configuration Object
 * All basic business details, prices, and contact details can be managed here.
 */
window.SR_CONFIG = {
  brandName: "SmartRoutine Studio",
  tagline: "Strumenti digitali su misura, automazioni di processi e integrazioni IA pratiche per attività locali.",
  contactEmail: "elghazifarouk112@gmail.com",
  whatsappNumber: "+393281016993",
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
   * requestEndpoint: optional Google Apps Script Web App URL.
   * When empty, the form uses Web3Forms directly.
   */
  requestEndpoint: "",
  submitCooldownMs: 30000
};
