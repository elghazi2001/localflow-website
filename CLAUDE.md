# SmartRoutine Studio — note per Claude Code

Sito statico (HTML/CSS/JS vanilla, nessuna build) di un'attività individuale di automazioni a Pavia. Pubblicato su GitHub Pages.

## Regole
- Lingua dei testi del sito: italiano, tono diretto, senza gergo. Niente promesse non dimostrabili.
- Nessun framework né dipendenza. CSP rigida nel `<meta>`: se aggiungi un dominio esterno, aggiornala.
- Valori di business (contatti, P.IVA, WhatsApp) solo in `js/config.js`.
- Dopo modifiche a CSS/JS incrementa il parametro `?v=` in `index.html`.
- Testi dinamici con `textContent`, mai `innerHTML` con dati utente.
- `apps-script/dist/SmartRoutine.gs` è generato da `apps-script/build.sh`: non modificarlo a mano.

## Struttura
- `index.html` pagina unica; `privacy.html` informativa; `css/style.css` design system.
- `js/services.js` elenco servizi; i pacchetti e prezzi sono in HTML statico nella sezione `#prezzi`.
- `apps-script/` backend gratuito: registra le richieste, prepara bozze con Gemini, nulla parte al cliente senza approvazione.

## Risparmio token
- Un compito per sessione, `/clear` tra un compito e l'altro.
- Leggi solo i file necessari (usa Grep), non l'intero repo.
- Le automazioni consegnate ai clienti sono deterministiche: l'IA serve a costruirle, non a farle girare.

## Da completare a mano (fuori dal repo)
- Inserire `vatNumber` in `js/config.js` quando disponibile.
- Turnstile/CAPTCHA e header di sicurezza (vedi SECURITY.md).
- Google Business Profile e raccolta recensioni.
