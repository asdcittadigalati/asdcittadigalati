# Trasloco su Cloudflare Workers

Stesso percorso fatto per Longi (online su asdlongi.it dal 29/09/2026).
Scelte confermate il 30/09/2026: dominio **asdcittadigalati.it**, account
Cloudflare **separato** da Longi, repo spostato sull'**account GitHub della
squadra**, modulo contatti **tolto** (usava Netlify Forms, che su Cloudflare
dà 405).

Il codice è pronto su `feat/social`: il sito è un Cloudflare _Worker_ (non
Pages) con build automatica da GitHub. Configurazione in `wrangler.jsonc`
(file statici da `dist/`, `_headers` e `_redirects` compresi, pagina 404),
accesso al pannello in `worker/index.mjs` (logica in `oauth/`, la stessa usata
da Netlify), redirect http → https e www → dominio senza www.

Perché si trasloca: sul piano gratuito Netlify i 300 crediti al mese sono
condivisi da tutti i siti dell'account e ogni aggiornamento costa 15 crediti;
finiti i crediti tutti i siti vanno in pausa. Cloudflare è gratuito con
traffico illimitato e 500 build al mese per account.

## Chi fa cosa

| # | Passo | Chi |
|---|---|---|
| 1 | Comprare `asdcittadigalati.it` (Seeoux come per Longi), DNSSEC spento | Utente |
| 2 | Email di servizio di Galati, poi con quella: account GitHub della squadra e account Cloudflare gratuito | Utente (Claude non crea account) |
| 3 | Repo pubblico nuovo sull'account della squadra; da locale push di tutti i branch, `feat/social` unito in `main`. Nel codice: `repo:` in `public/admin/config.yml`, remote e identità dei commit del repo locale | Utente crea il repo, Claude fa il resto |
| 4 | Cloudflare → Add a domain → `asdcittadigalati.it` (piano Free). I due nameserver assegnati vanno messi su Seeoux | Utente |
| 5 | Workers & Pages → Create → Import a repository → repo della squadra, branch `main`. Nome del Worker **`asdcittadigalati`** (deve coincidere con `name` in `wrangler.jsonc`, altrimenti la build fallisce). Build command `npm run build`, deploy command lasciato com'è (`npx wrangler deploy`) | Utente, o Claude sulla sessione dell'utente |
| 6 | Zona attiva (nameserver propagati) → Worker → Settings → Domains & Routes: `asdcittadigalati.it` e `www.asdcittadigalati.it` | Utente + Claude |
| 7 | App OAuth sull'account GitHub della squadra (Settings → Developer settings → OAuth Apps): Homepage `https://asdcittadigalati.it`, callback `https://asdcittadigalati.it/callback`. Poi nel Worker → Settings → Variables and Secrets: `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET`, tipo Secret | Utente (il segreto non passa da Claude) |
| 8 | Collaudo: home, `/social`, `/news` → `/social`, indirizzo inesistente → pagina 404 del sito, http → https, www → senza www, header `X-Robots-Tag` e `Strict-Transport-Security`; login su `/admin` e modifica di prova (un post Social), il sito si aggiorna da solo in 4-5 minuti | Claude + utente per il login |
| 9 | Netlify: cancellare il sito `citta-di-galati-anteprima`. Vecchio repo `tanocalandi96-ciccio/asdcittadigalati`: archiviarlo o cancellarlo. Poi dal codice via `netlify.toml` e `netlify/` | Utente, poi Claude |

## Dopo: apertura a Google

Il blocco `X-Robots-Tag: noindex` in `public/_headers` **resta** finché la
rosa è fittizia (22 giocatori segnati "DATO FITTIZIO"): altrimenti Google
associa nomi inventati al nome vero del club. Quando arriva la rosa vera, come
su Longi: via la riga `X-Robots-Tag`, `robots.txt` con `Allow: /` e
`Disallow: /admin`, `site: "https://asdcittadigalati.it"` in
`astro.config.mjs` con sitemap e canonical senza barra finale,
`"workers_dev": false` in `wrangler.jsonc`, proprietà Dominio su Search Console
con la sitemap.

## Da sapere

- **Build che non partono**: il 30/09 Cloudflare ha avuto ritardi e un push
  non ha avviato nessuna build. Controllo: check-run del commit su GitHub.
  Rimedio: `npm run build` e `npx wrangler deploy` da locale (wrangler collegato
  all'account Cloudflare di Galati, `npx wrangler logout` a fine lavori).
- **Tuttocampo da Cloudflare risponde** (a differenza di Netlify, che riceveva
  403): il controllo al build di `TuttocampoWidget` funziona davvero, quindi un
  widget ancora vuoto mostra il testo d'attesa del sito fino alla prima build
  dopo che si è riempito.
- **Modulo contatti**: se la società lo rivuole, la strada senza servizi esterni
  è Email Routing di Cloudflare (`info@asdcittadigalati.it` inoltrata a una
  casella della società) più un invio dal Worker. Richiede un indirizzo di
  destinazione verificato.
- I link corti di TikTok si risolvono al build; quelli `facebook.com/share/`
  no (Facebook non risponde ai server): quei post escono come scheda-link.
