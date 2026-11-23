/**
 * SmartRoutine Studio — Services list renderer (no prices shown)
 */
(function () {
  const services = [
    { title: "Automazioni di processo", tags: ["trigger", "Sheets", "Gmail"], desc: "Elimino copia-incolla e passaggi manuali: i compiti ripetitivi si svolgono da soli.", who: "Per tutti" },
    { title: "Pipeline di dati", tags: ["CSV", "PDF", "API"], desc: "Leggo, converto e riordino dati da CSV, Excel, PDF e API, e li consegno pronti all'uso.", who: "Aziende digitali" },
    { title: "Sistemi di prenotazione", tags: ["Calendar", "WhatsApp", "promemoria"], desc: "Appuntamenti e tavoli gestiti 24/7, con calendario sincronizzato e promemoria automatici.", who: "Attività locali" },
    { title: "Email e notifiche automatiche", tags: ["Gmail", "regole", "avvisi"], desc: "Smisto i messaggi in arrivo, estraggo le informazioni chiave e invio risposte e avvisi.", who: "Per tutti" },
    { title: "Integrazioni IA pratiche", tags: ["classifica", "riassume", "bozze"], desc: "Classificazione di testi, bozze di risposta e riassunti di documenti, solo dove servono.", who: "Per tutti" },
    { title: "Siti e web app su misura", tags: ["mobile", "hosting", "manutenzione"], desc: "Veloci, ottimi da smartphone, con hosting e manutenzione inclusi nel servizio.", who: "Per tutti" }
  ];

  window.renderServicesAndPackages = function () {
    const list = document.getElementById("servicesGrid");
    if (!list) return;
    list.innerHTML = services.map(s => `
      <li class="service-row">
        <h3>${s.title}</h3>
        <div><p>${s.desc}</p>
        <ul class="tech">${s.tags.map(t => `<li>${t}</li>`).join("")}</ul></div>
        <span class="service-who">${s.who}</span>
      </li>`).join("");
  };
})();
