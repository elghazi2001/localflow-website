/**
 * SmartRoutine Studio — Contact Form
 * Google Apps Script is used when configured; otherwise Web3Forms is used.
 * Transport failures are never retried through a second provider because the
 * first provider may already have accepted the submission.
 */
(function () {
  "use strict";

  const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
  const formConfig = window.SR_CONFIG || {};
  const COOLDOWN_MS = Number(formConfig.submitCooldownMs) || 30000;
  const MIN_FILL_MS = 3000;
  const REQUEST_TIMEOUT_MS = 20000;
  const FIELDS = [
    "name", "business", "email", "phone", "service_interest", "preferred_time", "problem_description"
  ];

  let formShownAt = Date.now();
  let lastSubmitAt = 0;

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
    return email.length <= 254 && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email);
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

    // Enforce maxlength even if someone edits the DOM.
    FIELDS.forEach(field => {
      const el = form.elements.namedItem(field);
      if (el && el.maxLength > 0 && el.value.length > el.maxLength) {
        el.value = el.value.slice(0, el.maxLength);
      }
    });

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

  function collectData(form) {
    const data = {};
    FIELDS.forEach(field => {
      const el = form.elements.namedItem(field);
      data[field] = el ? String(el.value || "").trim() : "";
    });
    data.consent = form.elements.namedItem("consent").checked;
    const honeypot = form.elements.namedItem("botcheck");
    data.botcheck = honeypot ? honeypot.value : "";
    return data;
  }

  async function fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  // --- Primary: Google Apps Script (Doc log + HTML email) ---
  async function sendToAppsScript(data) {
    const body = JSON.stringify({
      ...data,
      elapsed_ms: Date.now() - formShownAt,
      page: window.location.origin + window.location.pathname
    });
    // text/plain keeps this a "simple" CORS request (no preflight), which Apps Script requires.
    const response = await fetchWithTimeout(formConfig.requestEndpoint, {
      method: "POST",
      body,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      redirect: "follow",
      credentials: "omit"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success !== true) {
      const error = new Error(result.message || `Invio non riuscito (HTTP ${response.status}).`);
      // A validation/rate-limit answer from the server should be shown, not retried elsewhere.
      error.fromServer = Boolean(result.message);
      throw error;
    }
    return result;
  }

  // --- Fallback: Web3Forms (plain text) ---
  function buildEmailMessage(data) {
    const digits = (data.phone || "").replace(/[^0-9]/g, "");
    const subject = encodeURIComponent("Re: la tua richiesta a SmartRoutine Studio");
    const lines = [data.problem_description, "", "RISPONDI SUBITO"];
    lines.push(`Email: mailto:${data.email}?subject=${subject}`);
    if (digits.length >= 8) lines.push(`WhatsApp: https://wa.me/${digits}`);
    return lines.join("\n");
  }

  async function sendToWeb3Forms(form, data) {
    const payload = new FormData();
    const accessKey = form.elements.namedItem("access_key");
    payload.set("access_key", accessKey ? accessKey.value : "");
    // Readable labels, empty fields skipped: they become the rows of the email.
    const LABELS = {
      name: "Nome", email: "Email", phone: "Telefono", business: "Attività",
      service_interest: "Servizio", preferred_time: "Quando ricontattarlo"
    };
    Object.keys(LABELS).forEach(field => {
      if (data[field]) payload.set(LABELS[field], data[field]);
    });
    payload.set("botcheck", data.botcheck ? "true" : "");
    payload.set("message", buildEmailMessage(data));
    payload.set("replyto", data.email);
    payload.set("from_name", "SmartRoutine Studio · Sito");
    payload.set(
      "subject",
      `Nuova richiesta da ${data.name} · ${data.service_interest || "Richiesta generica"}`
    );

    const response = await fetchWithTimeout(WEB3FORMS_ENDPOINT, {
      method: "POST",
      body: payload,
      headers: { Accept: "application/json" },
      credentials: "omit"
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success !== true) {
      throw new Error(result.message || `Invio non riuscito (HTTP ${response.status}).`);
    }
    return result;
  }

  async function deliver(form, data) {
    // Do not automatically retry an uncertain Apps Script result via Web3Forms:
    // the first provider may have stored the request before the connection failed.
    if (formConfig.requestEndpoint) {
      return sendToAppsScript(data);
    }
    return sendToWeb3Forms(form, data);
  }

  function getWhatsAppURL() {
    const number = (formConfig.whatsappNumber || "").replace(/[^0-9]/g, "");
    const message = encodeURIComponent(
      formConfig.whatsappDefaultMessage || "Ciao SmartRoutine Studio!"
    );
    return `https://wa.me/${number}?text=${message}`;
  }

  function makeButton(label, className) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", () => window.closeModal());
    return button;
  }

  function showModal(isSuccess, title, message, actionNodes) {
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
    if (actions) actions.replaceChildren(...(actionNodes || []));

    modal.hidden = false;
  }

  function showSuccess() {
    showModal(
      true,
      "Messaggio Inviato con Successo!",
      "Grazie per aver contattato SmartRoutine Studio. La tua richiesta è stata ricevuta correttamente. Ti risponderemo entro 24 ore lavorative.",
      [makeButton("Chiudi", "button button-primary")]
    );
  }

  function showFailure(message) {
    const whatsapp = document.createElement("a");
    whatsapp.href = getWhatsAppURL();
    whatsapp.className = "button button-whatsapp";
    whatsapp.target = "_blank";
    whatsapp.rel = "noopener noreferrer";
    whatsapp.textContent = "Scrivi su WhatsApp";

    showModal(
      false,
      "Impossibile Inviare il Messaggio",
      message ||
        "Non è stato possibile confermare l'invio. Per evitare richieste duplicate, controlla prima la posta in arrivo e poi contattaci su WhatsApp se non hai ricevuto conferma. I dati restano nel modulo.",
      [makeButton("Chiudi", "button button-outline"), whatsapp]
    );
  }

  async function handleSubmit(event, elements) {
    event.preventDefault();
    const { form } = elements;
    if (elements.submitButton.disabled) return;

    clearErrors(form);
    if (!validateForm(form)) return;

    const data = collectData(form);
    const now = Date.now();

    // Bots: filled honeypot or inhumanly fast. Pretend success, send nothing.
    if (data.botcheck || now - formShownAt < MIN_FILL_MS) {
      form.reset();
      showSuccess();
      return;
    }
    if (now - lastSubmitAt < COOLDOWN_MS) {
      showFailure("Hai appena inviato una richiesta. Attendi qualche secondo prima di inviarne un'altra.");
      return;
    }

    setLoading(elements, true);
    try {
      await deliver(form, data);
      lastSubmitAt = Date.now();
      form.reset();
      formShownAt = Date.now();
      showSuccess();
    } catch (error) {
      console.error("Errore invio modulo:", error);
      showFailure(error.fromServer ? error.message : "");
    } finally {
      setLoading(elements, false);
    }
  }

  function initializeContactForm() {
    const elements = getFormElements();
    if (!elements || !elements.submitButton) return;

    formShownAt = Date.now();
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
