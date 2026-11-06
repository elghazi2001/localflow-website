/**
 * SmartRoutine Studio — Services & Pricing Data Renderer
 */
(function() {
  const config = window.SR_CONFIG || {};
  const prices = config.pricing || {};

  const servicesData = [
    {
      title: "Siti e Web App Personalizzate",
      desc: "Siti web e applicazioni su misura studiati attorno alla tua attività, privi di modelli generici o complicazioni inutili.",
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6D4AFF" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
      outcome: "Presenta la tua attività con uno stile unico ed impeccabile da smartphone."
    },
    {
      title: "Sistemi di Prenotazione e Calendari",
      desc: "Gestione di appuntamenti, prenotazioni di tavoli o servizi e calendari sincronizzati in tempo reale 24/7.",
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6D4AFF" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
      outcome: "Azzera le chiamate perse e riempi l'agenda anche mentre stai lavorando."
    },
    {
      title: "Automazione Processi Aziendali",
      desc: "Elimina le attività amministrative noiose, il copia-incolla sequenziale ed i passaggi manuali ripetitivi.",
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6D4AFF" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>',
      outcome: "Risparmia ore di lavoro settimanali evitando sviste umane."
    },
    {
      title: "Elaborazione File (CSV, Excel, PDF)",
      desc: "Script personalizzati per leggere, convertire, estrarre e riordinare dati da fogli di calcolo o documenti PDF.",
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6D4AFF" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
      outcome: "Ottieni report immediati senza dover riorganizzare le tabelle a mano."
    },
    {
      title: "Automazione ed Organizzazione Email",
      desc: "Strumenti per smistare i messaggi in arrivo, estrarre informazioni chiave ed inviare risposte o avvisi automatici.",
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6D4AFF" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>',
      outcome: "Mantieta la casella zero-stress senza perdere richieste di clienti importanti."
    },
    {
      title: "Integrazioni IA Pratiche",
      desc: "Funzionalità IA mirate per la classificazione dei testi, la generazione di risposte e la sintetizzazione di documenti.",
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6D4AFF" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>',
      outcome: "Sfrutta l'Intelligenza Artificiale dove porta vantaggi reali senza complicanze."
    },
    {
      title: "Hosting, Cloud e Manutenzione",
      desc: "Configurazione domini, deployment sicuro sul web e supporto costante per mantenere il sito attivo e veloce.",
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6D4AFF" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>',
      outcome: "Nessuna preoccupazione tecnica: ci occupiamo noi dell'affidabilità online."
    },
    {
      title: "Integrazioni API e Tools Interni",
      desc: "Connessione sicura tra i software che utilizzi per creare una dashboard interna o un flusso di lavoro unico.",
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6D4AFF" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
      outcome: "Smetti di inserire due volte gli stessi dati su piattaforme differenti."
    }
  ];

  const packagesData = [
    {
      title: "Sistema di Prenotazione",
      price: `€${prices.bookingSystem || 400}`,
      desc: "Soluzione di prenotazione progettata sulla tua attività per gestire appuntamenti senza caos di messaggi.",
      featured: true,
      inclusions: [
        "Interfaccia di prenotazione clienti",
        "Calendario e gestione disponibilità",
        "Pannello amministrativo base",
        "Design mobile responsive",
        "Configurazione ed invio notifiche",
        "Collaudo e supporto iniziale"
      ],
      ctaText: "Richiedi Sistema Prenotazioni"
    },
    {
      title: "Automazione Aziendale",
      price: `€${prices.automation || 150}`,
      desc: "Automatizza un compito ripetitivo per dedicare meno tempo alle operazioni manuali quotidiane.",
      featured: false,
      inclusions: [
        "Un flusso di lavoro concordato",
        "Script o integrazione per operazione definita",
        "Elaborazione CSV, Excel, PDF o Email",
        "Gestione errori e test completi",
        "Documentazione di utilizzo"
      ],
      ctaText: "Automatizza un Processo"
    },
    {
      title: "Integrazione IA Pratica",
      price: `€${prices.aiIntegration || 250}`,
      desc: "Introduce l'IA in un flusso specifico senza rendere complesse le tue operazioni abituali.",
      featured: false,
      inclusions: [
        "Un flusso assistito da IA concordato",
        "Integrazione con servizio IA idoneo",
        "Configurazione prompt ed output",
        "Test su casi reali rappresentativi",
        "Guida pratica all'uso"
      ],
      ctaText: "Integra l'IA nel Lavoro"
    },
    {
      title: "Sito Web Professionale",
      price: `€${prices.website || 350}`,
      desc: "Un sito web chiaro e moderno che spiega i tuoi servizi e facilita il contatto da parte dei clienti.",
      featured: false,
      inclusions: [
        "Sito web per piccola attività",
        "Layout totalmente responsive",
        "Sezione e modulo di contatto",
        "Ottimizzazione SEO fondamentale",
        "Assistenza al deployment online"
      ],
      ctaText: "Crea il Tuo Sito Web"
    },
    {
      title: "Soluzione Personalizzata",
      price: prices.custom || "Su Preventivo",
      desc: "Hai un problema articolato? Progettiamo uno strumento digitale su misura per la tua operatività.",
      featured: false,
      inclusions: [
        "Dashboard o tools interni",
        "Automazioni multi-step avanzate",
        "Integrazione API personalizzate",
        "Combinazione di più servizi",
        "Assistenza ed affiancamento dedicato"
      ],
      ctaText: "Discuti Progetto Su Misura"
    }
  ];

  window.renderServicesAndPackages = function() {
    const servicesGrid = document.getElementById("servicesGrid");
    if (servicesGrid) {
      servicesGrid.innerHTML = servicesData.map(s => `
        <div class="service-card">
          <div class="service-icon">${s.icon}</div>
          <h3>${s.title}</h3>
          <p>${s.desc}</p>
          <div class="service-outcome">${s.outcome}</div>
        </div>
      `).join('');
    }

    const pricingGrid = document.getElementById("pricingGrid");
    if (pricingGrid) {
      pricingGrid.innerHTML = packagesData.map(p => `
        <div class="pricing-card ${p.featured ? 'featured' : ''}">
          ${p.featured ? '<div class="featured-badge">Consigliato per Attività Locali</div>' : ''}
          <h3>${p.title}</h3>
          <p class="pricing-desc">${p.desc}</p>
          <div class="price-tag">
            ${p.price === 'Su Preventivo' ? p.price : `<small>A partire da</small> ${p.price}`}
          </div>
          <ul class="pricing-inclusions">
            ${p.inclusions.map(inc => `<li>${inc}</li>`).join('')}
          </ul>
          <a href="#contact" class="button ${p.featured ? 'button-primary' : 'button-outline'} button-full">
            ${p.ctaText}
          </a>
        </div>
      `).join('');
    }
  };
})();
