/**
 * SmartRoutine Studio — Main Interactive JavaScript
 */
document.addEventListener("DOMContentLoaded", function () {
  const config = window.SR_CONFIG || {};

  // 1. Dynamic Business Info Injection
  const copyrightYear = document.getElementById("copyrightYear");
  if (copyrightYear) copyrightYear.textContent = new Date().getFullYear();

  const configEmailDisplay = document.getElementById("configEmailDisplay");
  if (configEmailDisplay && config.contactEmail) {
    configEmailDisplay.textContent = config.contactEmail;
    configEmailDisplay.href = `mailto:${config.contactEmail}`;
  }

  const footerEmailLink = document.getElementById("footerEmailLink");
  if (footerEmailLink && config.contactEmail) {
    footerEmailLink.textContent = config.contactEmail;
    footerEmailLink.href = `mailto:${config.contactEmail}`;
  }

  // 2. WhatsApp Channels Generation
  const waNum = (config.whatsappNumber || "393000000000").replace(/[^0-9]/g, '');
  const waMsg = encodeURIComponent(config.whatsappDefaultMessage || "Ciao SmartRoutine Studio!");
  const waURL = `https://wa.me/${waNum}?text=${waMsg}`;

  ["contactWhatsappBtn", "finalWhatsappBtn", "footerWhatsappLink", "floatingWhatsapp"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.href = waURL;
  });

  // 3. Dynamic Service Cards & Pricing Cards Render
  if (typeof window.renderServicesAndPackages === "function") {
    window.renderServicesAndPackages();
  }

  // 4. Contact Form Initialization
  if (typeof window.initContactFormLogic === "function") {
    window.initContactFormLogic();
  }

  // 5. Responsive Mobile Drawer Navigation
  const toggleBtn = document.getElementById("mobileMenuToggle");
  const drawer = document.getElementById("mobileDrawer");

  if (toggleBtn && drawer) {
    toggleBtn.addEventListener("click", function () {
      const isOpen = drawer.classList.contains("open");
      if (isOpen) {
        drawer.classList.remove("open");
        drawer.setAttribute("aria-hidden", "true");
        toggleBtn.setAttribute("aria-expanded", "false");
      } else {
        drawer.classList.add("open");
        drawer.setAttribute("aria-hidden", "false");
        toggleBtn.setAttribute("aria-expanded", "true");
      }
    });

    drawer.querySelectorAll(".mobile-link").forEach(link => {
      link.addEventListener("click", function () {
        drawer.classList.remove("open");
        drawer.setAttribute("aria-hidden", "true");
        toggleBtn.setAttribute("aria-expanded", "false");
      });
    });
  }

  // 6. Header Scroll Blur Shadow
  const navbar = document.getElementById("navbar");
  window.addEventListener("scroll", function () {
    if (!navbar) return;
    if (window.scrollY > 20) {
      navbar.style.boxShadow = "0 10px 30px rgba(25, 24, 39, 0.08)";
    } else {
      navbar.style.boxShadow = "none";
    }
  });

  // 7. Modal Overlay Background Click to Dismiss
  const modalBackdrop = document.getElementById("statusModal");
  const modalCloseBtn = document.getElementById("modalCloseBtn");

  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", function (e) {
      if (e.target === modalBackdrop) {
        window.closeModal();
      }
    });
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", function () {
      window.closeModal();
    });
  }
});
