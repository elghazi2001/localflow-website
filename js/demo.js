/** Interactive booking demo shown on the home page (static, no data leaves the browser). */
(function () {
  "use strict";
  const app = document.getElementById("demoApp");
  if (!app) return;

  app.querySelectorAll(".opts").forEach(group => {
    group.addEventListener("click", event => {
      const btn = event.target.closest(".opt");
      if (!btn) return;
      group.querySelectorAll(".opt").forEach(b => b.classList.remove("on"));
      btn.classList.add("on");
    });
  });

  const go = document.getElementById("demoGo");
  const ok = document.getElementById("demoOk");
  go.addEventListener("click", () => {
    const svc = app.querySelector('[data-group="svc"] .on');
    const slot = app.querySelector('[data-group="slot"] .on');
    ok.textContent = `Prenotazione ricevuta: ${svc ? svc.textContent : "servizio"} alle ${slot ? slot.textContent : ""}. Il cliente riceve subito la conferma e un promemoria prima dell'appuntamento.`;
    ok.hidden = false;
  });
})();
