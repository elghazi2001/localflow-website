/**
 * SmartRoutine Studio — Contact Form / Web3Forms
 * Each step is isolated to make troubleshooting straightforward.
 */
(function () {
  "use strict";

  const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
  const formConfig = window.SR_CONFIG || {};

  function getFormElements() {
    const form = document.getElementById("mainContactForm");
    if (!form) return null;

    return {
      form,
      submitButton: document.getElementById("submitBtn"),
      buttonText: form.querySelector(".btn-text"),
      spinner: form.querySelector(".btn-spinner")
    };
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function clearErrors(form) {
    form.querySelectorAll(".form-group").forEach(group => {
      group.classList.remove("has-error");
    });
    form.querySelectorAll(".field-error").forEach(error => {
      error.textContent = "";
      error.style.display = "none";
    });
  }

  function showFieldError(form, fieldId, errorId, message) {
    const field = form.elements.namedItem(fieldId);
    const error = document.getElementById(errorId);

    if (field && field.closest(".form-group")) {
      field.closest(".form-group").classList.add("has-error");
    }
    if (error) {
      error.textContent = message;
      error.style.display = "block";
    }
  }

  function validateForm(form) {
    const name = form.elements.namedItem("name").value.trim();
    const email = form.elements.namedItem("email").value.trim();
    const description = form.elements.namedItem("problem_description").value.trim();
    const consent = form.elements.namedItem("consent").checked;
    let valid = true;

    if (!name) {
      showFieldError(form, "name", "err-name", "Inserisci il tuo nome.");
      valid = false;
    }
    if (!email || !validateEmail(email)) {
      showFieldError(form, "email", "err-email", "Inserisci un indirizzo email valido.");
      valid = false;
    }
    if (!description) {
      showFieldError(
        form,
        "problem_description",
        "err-problem",
        "Descrivi brevemente il tuo problema o la tua esigenza."
      );
      valid = false;
    }
    if (!consent) {
      showFieldError(
        form,
        "consent",
        "err-consent",
        "È necessario prestare il consenso per inviare la richiesta."
      );
      valid = false;
    }

    return valid;
  }

  function setLoading(elements, isLoading) {
    if (!elements || !elements.submitButton) return;

    elements.submitButton.disabled = isLoading;
    if (elements.buttonText) {
      elements.buttonText.style.display = isLoading ? "none" : "inline";
    }
    if (elements.spinner) {
      elements.spinner.hidden = !isLoading;
    }
  }

  function buildEmailMessage(formData) {
    const value = field => formData.get(field) || "Non specificato";
    const timestamp = new Date().toLocaleString("it-IT");

    return [
      "--- NUOVA RICHIESTA DI PROGETTO - SMARTROUTINE STUDIO ---",
      `Data/Ora: ${timestamp}`,
      "",
      "[INFORMAZIONI DI CONTATTO]",
      `• Nome: ${value("name")}`,
      `• Email: ${value("email")}`,
      `• Telefono: ${value("phone")}`,
      `• Attività: ${value("business")}`,
      `• Tipo Attività: ${value("business_type")}`,
      "",
      "[DETTAGLI RICHIESTA]",
      `• Servizio di Interesse: ${value("service_interest")}`,
      `• Budget Orientativo: ${value("budget_range")}`,
      `• Contatto Preferito: ${value("contact_preference")}`,
      "",
      "[DESCRIZIONE DEL PROBLEMA / ESIGENZA]",
      value("problem_description"),
      "--------------------------------------------------------"
    ].join("\n");
  }

  function buildWeb3FormsPayload(form) {
    const payload = new FormData(form);
    const name = String(payload.get("name") || "").trim();
    const service = payload.get("service_interest") || "Inchiesta Generica";

    // Web3Forms requires access_key and accepts a message field.
    payload.set("access_key", payload.get("access_key") || "");
    payload.set("message", buildEmailMessage(payload));
    payload.set(
      "subject",
      `Nuovo Progetto SmartRoutine: ${name} (${service})`
    );

    return payload;
  }

  async function sendEmail(payload) {
    const response = await fetch(WEB3FORMS_ENDPOINT, {
      method: "POST",
      body: payload,
      headers: { Accept: "application/json" }
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success !== true) {
      throw new Error(result.message || `Invio non riuscito (HTTP ${response.status}).`);
    }
    return result;
  }

  function getWhatsAppURL() {
    const number = (formConfig.whatsappNumber || "").replace(/[^0-9]/g, "");
    const message = encodeURIComponent(
      formConfig.whatsappDefaultMessage || "Ciao SmartRoutine Studio!"
    );
    return `https://wa.me/${number}?text=${message}`;
  }

  function showModal(isSuccess, title, message, actionsHTML) {
    const modal = document.getElementById("statusModal");
    if (!modal) return;

    const icon = document.getElementById("modalIcon");
    const titleElement = document.getElementById("modalTitle");
    const body = document.getElementById("modalBody");
    const actions = document.getElementById("modalActions");

    if (icon) {
      icon.className = `modal-icon ${isSuccess ? "success" : "error"}`;
      icon.textContent = isSuccess ? "✓" : "✕";
    }
    if (titleElement) titleElement.textContent = title;
    if (body) body.textContent = message;
    if (actions) actions.innerHTML = actionsHTML || "";

    modal.hidden = false;
  }

  function showSuccess() {
    showModal(
      true,
      "Messaggio Inviato con Successo!",
      "Grazie per aver contattato SmartRoutine Studio. La tua richiesta è stata ricevuta correttamente. Ti risponderemo entro 24 ore lavorative.",
      '<button class="button button-primary" onclick="window.closeModal()">Chiudi</button>'
    );
  }

  function showFailure() {
    showModal(
      false,
      "Impossibile Inviare il Messaggio",
      "Si è verificato un problema durante l'invio. Le informazioni sono ancora nel modulo: puoi riprovare o contattarci direttamente su WhatsApp.",
      `<button class="button button-outline" onclick="window.closeModal()">Chiudi</button>
       <a href="${getWhatsAppURL()}" class="button button-whatsapp" target="_blank" rel="noopener noreferrer">Scrivi su WhatsApp</a>`
    );
  }

  async function handleSubmit(event, elements) {
    event.preventDefault();
    const { form } = elements;

    clearErrors(form);
    if (!validateForm(form)) return;

    setLoading(elements, true);
    try {
      await sendEmail(buildWeb3FormsPayload(form));
      form.reset();
      showSuccess();
    } catch (error) {
      console.error("Errore invio Web3Forms:", error);
      showFailure();
    } finally {
      setLoading(elements, false);
    }
  }

  function initializeContactForm() {
    const elements = getFormElements();
    if (!elements || !elements.submitButton) return;

    elements.form.addEventListener("submit", event => {
      handleSubmit(event, elements);
    });
  }

  window.closeModal = function () {
    const modal = document.getElementById("statusModal");
    if (modal) modal.hidden = true;
  };

  window.initContactFormLogic = initializeContactForm;
})();
