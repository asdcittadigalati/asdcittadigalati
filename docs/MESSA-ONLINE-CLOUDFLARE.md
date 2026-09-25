# Giorno del dominio: trasloco su Cloudflare Pages

Il codice è già pronto: accesso al pannello in `functions/` (logica in
`oauth/`, la stessa usata oggi da Netlify), header e redirect in
`public/_headers` e `public/_redirects`, versione di Node in `.node-version`.
Restano questi passi.

Perché si trasloca: sul piano gratuito Netlify i 300 crediti al mese sono
condivisi da tutti i siti dell'account e ogni aggiornamento costa 15 crediti;
finiti i crediti tutti i siti vanno in pausa. Cloudflare Pages è gratuito con
traffico illimitato e 500 build al mese.

## Chi fa cosa

| # | Passo | Chi |
|---|---|---|
| 1 | Account Cloudflare gratuito con l'email di servizio del club | Utente (Claude non crea account) |
| 2 | Workers & Pages → Create → Pages → Connect to Git → repo del sito, branch `main`. Build command `npm run build`, output `dist`, root vuota | Utente, o Claude sulla sessione dell'utente |
| 3 | Settings → Variables and secrets: `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` (gli stessi di Netlify), tipo "Secret" | Utente (il segreto non passa da Claude) |
| 4 | Primo deploy su `<progetto>.pages.dev`: controllo home, `/social`, `/news` → `/social`, header `X-Robots-Tag`. Se il build fallisce per la versione di Node, in `.node-version` mettere la versione completa (es. `22.12.0`) | Claude |
| 5 | Custom domains → aggiungi il dominio. Se è comprato altrove: nameserver su Cloudflare (gratis) oppure CNAME verso `<progetto>.pages.dev` | Utente + Claude |
| 6 | Nel codice: `site: "https://<dominio>"` in `astro.config.mjs`, `base_url: https://<dominio>` in `public/admin/config.yml`, via il blocco `X-Robots-Tag` da `public/_headers`, in `public/robots.txt` `Disallow: /` → `Allow: /` (e commento aggiornato) | Claude |
| 6b | **Modulo contatti**: oggi usa Netlify Forms (`data-netlify="true"` in `src/pages/contatti.astro`), che su Cloudflare non esiste. Prima del passo 9 va scelta e fatta la sostituzione (vedi sotto) | Utente sceglie, Claude fa |
| 7 | App OAuth su GitHub (Settings → Developer settings → OAuth Apps): Homepage `https://<dominio>`, callback `https://<dominio>/callback` | Utente, o Claude sulla sessione dell'utente |
| 8 | Collaudo: login su `/admin`, modifica di prova (per esempio un post Social), il sito si aggiorna da solo | Utente + Claude |
| 9 | Netlify: scollegare il repo dal sito vecchio (niente build doppie), cancellarlo dopo qualche giorno | Utente |

## Da sapere

- **Modulo contatti senza Netlify Forms**: due strade gratuite. (a) Web3Forms:
  si cambia l'`action` del modulo e si aggiunge una chiave pubblica, 250 invii
  al mese, i messaggi passano da un servizio esterno (da citare
  nell'informativa). (b) Una funzione in `functions/` che manda la mail con
  Cloudflare Email Routing: nessun servizio in più, ma richiede il dominio
  gestito da Cloudflare e un indirizzo di destinazione verificato.

- Il widget Tuttocampo risponde 403 ai server anche da Cloudflare (come da
  Netlify): nessun cambiamento, a campionato iniziato i widget si riempiono.
- I link corti di TikTok si risolvono al build; quelli `facebook.com/share/`
  no (Facebook non risponde ai server): quei post escono come scheda-link.
