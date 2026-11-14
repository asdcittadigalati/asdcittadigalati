# Sito ASD Città di Galati — istruzioni per Codex

## Per chi lavori

Lavori per un **amico di Gaetano**, il proprietario e sviluppatore del sito,
che fa **piccole modifiche**. Non è uno sviluppatore:

- rispondi **sempre in italiano**, semplice, spiegando i termini tecnici;
- prima di modificare, ripeti in una riga cosa hai capito e cosa toccherai;
- se la richiesta è grande (pagina nuova, ridisegno, funzione nuova, modifiche
  al server o al pannello) **fermati e suggerisci di sentire Gaetano** prima;
- se la richiesta è ambigua, chiedi invece di indovinare.

**Non puoi pubblicare niente.** Il sito va online da GitHub e solo Gaetano ha
i permessi. Le modifiche arrivano online quando Gaetano applica il file
`.patch` che prepari tu (vedi "Consegna delle modifiche"). Mai `git push`,
mai `wrangler` o deploy.

## Nota su Codex e OpenRouter

Le istruzioni più sotto su `openrouter/free`, `/status`, `/clear` e `/model`
descrivono la configurazione di **Claude Code** in `.claude/settings.local.json`;
non configurano Codex e non vengono applicate automaticamente dall'app Codex.
Non leggere, mostrare o copiare la chiave che si trova in quel file. Per Codex
usa il modello e il provider configurati nell'app. Su OpenRouter, il router
gratuito ha un limite di 50 richieste al giorno e 20 al minuto; dopo aver
acquistato almeno 10 $ di crediti il limite giornaliero sale a 1.000. Il
versamento non è un abbonamento e i modelli gratuiti non consumano crediti,
ma i crediti si possono spendere usando modelli a pagamento. La commissione
e l'importo totale vanno controllati nella schermata d'acquisto. I termini
OpenRouter indicano che i crediti non utilizzati possono scadere dopo 365
giorni.

## Giri su modelli gratuiti: risparmia richieste

Nel setup di Claude Code descritto qui, le richieste non usano Claude:
passano dal router gratuito di OpenRouter (`openrouter/free`), che sceglie un
modello gratuito disponibile e prova un altro modello se il primo non
risponde. Per questo router valgono i limiti OpenRouter descritti sopra;
Codex non usa questa configurazione automaticamente.

- leggi solo i file che servono: usa la mappa qui sotto invece di esplorare
  il progetto. Raggruppa le letture e non lanciare subagenti;
- fai modifiche piccole e committale subito: il modello può cambiare da una
  richiesta all'altra, e ciò che è salvato in git non si perde;
- `npm test` e `npm run build` girano in locale e non consumano richieste:
  falli sempre, sono la tua rete di sicurezza;
- se uno strumento fallisce o il risultato è strano, riprova una volta, poi
  fermati e spiega all'amico cosa è successo;
- se arriva un errore di limite (429, "rate limit"), dillo chiaramente
  all'amico: ha finito le richieste del momento o della giornata.

## Il sito in breve

- Sito ufficiale della squadra di calcio ASD Città di Galati (Galati Mamertino,
  Messina), Prima Categoria Sicilia girone C. Online su
  **https://asdcittadigalati.it** e indicizzato su Google: tutto ciò che
  scrivi è pubblico e vero.
- Chi lo usa: tifosi e paesani, **quasi sempre dal telefono in 4G**. Il mobile
  è la versione principale, il desktop viene dopo.
- Stack: **Astro 7** (sito statico) + **Sveltia CMS** (pannello su `/admin`,
  configurazione in formato Decap) + **Cloudflare Workers** (ricompila e
  pubblica da solo a ogni commit su `main` del repo
  `asdcittadigalati/asdcittadigalati`). Node >= 22.12. Test con vitest.
- Font self-hosted con @fontsource: **Anton SC** per i titoli, **Hanken
  Grotesk** per il testo.

## Comandi

```bash
npm install        # la prima volta (crea node_modules)
npm run dev        # sito in locale su http://localhost:4321
npm test           # test (vitest), devono passare tutti
npm run build      # build di produzione in dist/: se fallisce qui, online non si aggiorna
npm run preview    # serve dist/ come sarà online
```

Non usare `npm run frames` (rigenera i frame dell'hero, serve ffmpeg e i video
sorgente, che qui non ci sono).

In sviluppo il pannello si apre da `http://localhost:4321/admin/index.html`
(`/admin/` da solo dà 404 solo in locale): con "Work with Local Repository"
scrive sui file di questa cartella. Serve Chrome o Edge.

## Mappa del codice

| Percorso | Cosa contiene |
|---|---|
| `src/pages/` | Le pagine: `index` (home), `squadra`, `stagione`, `social`, `club`, `ringraziamenti`, `contatti`, `privacy`, `404`, più `tabellino.json.ts` (dati letti dalla diretta) |
| `src/components/` | Header (menu), Footer, Hero (animazione allo scroll), DirettaLive + Tabellino (diretta Twitch), NextMatch, ClassificaHome, Scoreboard, Formazione, CurvaRosa/PlayerCard/PlayerDialog (rosa), StaffList, SponsorStrip (nastro "Ringraziamenti"), SocialPost, TuttocampoWidget, EmbedConsenso + CookieNotice (privacy), AppBanner |
| `src/layouts/Base.astro` | `<head>`, meta, canonical, struttura comune |
| `src/styles/` | `tokens.css` (colori e font), `global.css`, `atmosphere.css` |
| `src/lib/` | Logica in TypeScript con test in `tests/`: `tuttocampo.ts` (widget del girone), `social.ts` (link→iframe), `diretta.ts`, `tabellino.ts`, `formazione.ts`, `classifica.ts`, `consenso.ts`, `scrub.ts` (hero) |
| `src/content/` + `src/content.config.ts` | Collezioni del pannello (rosa, staff, sponsor, social) e i loro schemi Zod |
| `src/data/` | File JSON del pannello: `societa.json`, `pagina-club.json`, `formazione.json`, `diretta.json`, `squadre.json` |
| `public/` | File serviti così come sono: `img/`, `hero-frames/` (generati, non toccare), `admin/config.yml` (pannello), `_headers`, `_redirects`, `robots.txt`, icone |
| `worker/`, `wrangler.jsonc`, `oauth/` | Server Cloudflare: redirect http→https e www, login del pannello, `/api/classifica`, `/api/twitch`, `/diretta` |
| `netlify.toml`, `netlify/` | Residui del vecchio hosting, inutilizzati. Non toccarli e non cancellarli: decide Gaetano |
| `docs/` | `GUIDA-PANNELLO.md` (per i volontari), spec e piani. `HANDOFF.md` è in parte **superato** (vedi sotto) |
| `DESIGN.md`, `PRODUCT.md` | Visione, pubblico, palette. Valgono, con le eccezioni elencate sotto |

La cartella `assets/` (foto e video sorgente, 138 MB) **non è stata scaricata
di proposito** (sparse checkout): il sito non la usa. Non provare a
ripristinarla.

## Contenuti gestiti dal pannello: di norma NON si toccano qui

La società aggiorna questi file dal pannello `https://asdcittadigalati.it/admin`
(i commit "Update ..." nella cronologia sono loro). Cambiarli anche qui crea
conflitti e rischia di sovrascrivere quello che la società ha salvato.

| Nel pannello | File |
|---|---|
| Rosa | `src/content/giocatori/*.md` |
| Staff e dirigenza | `src/content/staff/*.md` |
| Sponsor (sul sito si chiamano "Ringraziamenti") | `src/content/sponsor/*.md` |
| Social | `src/content/social/*.md` |
| Formazione | `src/data/formazione.json` |
| Dati della società / Pagina Club / Diretta | `src/data/societa.json`, `pagina-club.json`, `diretta.json` |
| Foto e loghi caricati | `public/img/uploads/` |

Se la richiesta riguarda uno di questi (giocatore, numero di maglia, sponsor,
formazione, diretta, post, recapiti), rispondi che **si fa dal pannello** e
che l'accesso lo dà Gaetano. Tocca questi file solo se l'amico insiste, e
avvisalo del rischio di conflitto.

Se cambi uno schema in `src/content.config.ts`, `public/admin/config.yml` deve
restare coerente. I campi facoltativi sono avvolti in `empty()` perché il
pannello scrive `""` quando un campo viene svuotato.

## Regole del sito (non negoziabili)

1. **Mobile prima di tutto.** Ogni modifica va pensata per un telefono largo
   375 px: niente scorrimento orizzontale (`global.css` ha già
   `main { overflow-x: clip }`), testi leggibili, tocchi comodi.
2. **Solo i colori del logo**, dalle variabili di `src/styles/tokens.css`:
   `--bg` (blu notte), `--surface`, `--text`, `--giallo`, `--blu`, `--rosso`,
   `--oro`. Niente colori nuovi, niente bianco o nero puri. Il rosso solo per
   i momenti forti, mai rosso su blu saturo.
3. **Niente bianco e nero da nessuna parte**: loghi e foto sempre a colori,
   mai `grayscale`. È una regola esplicita di Gaetano.
4. **Mai la parola "sponsor" sul sito pubblico**: si dice
   **"Ringraziamenti"** (richiesta della società). Nel codice e nel pannello
   la collezione resta `sponsor`.
5. **Privacy (GDPR)**: qualsiasi contenuto di altri siti (iframe, script,
   immagini esterne: Instagram, Facebook, TikTok, Twitch, YouTube, Tuttocampo,
   Google Maps...) passa da `EmbedConsenso` (`src/components/EmbedConsenso.astro`
   + `src/lib/consenso.ts`): **zero richieste a terzi senza consenso**. Niente
   Google Fonts o CDN (tutto self-hosted), niente analytics o tracker.
6. **Dati personali**: mai pubblicare codice fiscale, date di nascita,
   matricole o tessere dei giocatori. Foto di minorenni solo con liberatoria
   firmata (la gestisce Gaetano).
7. **Niente dati inventati**: il sito è vero. Se manca un dato (nome, numero,
   testo, foto) chiedi, e non mettere segnaposto finti. In `club.astro` ci
   sono due foto marcate `FOTO FITTIZIA` da un commento: si sostituiscono
   solo con foto vere fornite dalla società.
8. **Tono dei testi**: italiano diretto e orgoglioso, mai aziendale, mai
   infantile.
9. **Accessibilità**: `alt` descrittivi sulle immagini, focus visibili,
   rispetto di `prefers-reduced-motion`, contrasto AA.
10. **Diretta Twitch**: nessun elemento sopra il player (lo vietano le regole
    di Twitch). Il tabellino sta fuori dall'iframe.

## Cose superate nei documenti (non farti ingannare)

- `DESIGN.md`: il cursore-pallone è stato **eliminato**. I loghi sponsor
  **non** vanno in scala di grigi. Le "card news" non esistono più: le news
  sono state sostituite dalla pagina Social (`/news` porta a `/social`).
- `docs/HANDOFF.md`: l'hosting oggi è **Cloudflare**, non Netlify. I widget
  Tuttocampo sono già attivi (girone C, `src/lib/tuttocampo.ts`), mentre
  dominio, sitemap e apertura a Google sono già fatti.

## Zone delicate

Tocca queste parti solo se l'amico lo chiede espressamente, dopo avergli
spiegato il rischio: Hero (`Hero.astro`, `scrub.ts`, `public/hero-frames/`),
diretta (`DirettaLive.astro`, `Tabellino.astro`, `diretta.ts`, `tabellino.ts`),
`worker/`, `wrangler.jsonc`, `oauth/`, `public/admin/config.yml`,
`public/_headers`, `public/_redirects`, `astro.config.mjs`, `package.json`.
Niente dipendenze npm nuove senza un motivo forte (e chiedi prima).

## Trappole note

- Astro inserisce lo `<script>` di un componente dentro il contenitore che lo
  include: un selettore `:nth-child` può contare anche lo script. Usa
  `:nth-of-type`.
- Immagini: niente foto da telefono da 3-5 MB. Massimo circa 1200 px sul lato
  lungo, sotto i 300 KB, meglio in `.webp`, in `public/img/`.
- Un errore di schema (Zod) in un contenuto fa fallire la build, e allora il
  sito online non si aggiorna. Dopo ogni modifica: `npm run build`.
- Link interni senza barra finale: `/social`, non `/social/`.
- Commenti nel codice in italiano, come nel resto del progetto. Rispetta lo
  stile esistente e cambia solo il necessario.

## Come si lavora (ogni sessione)

1. **Inizio**: `git status`. Se ci sono modifiche non committate, chiedi cosa
   farne. Poi allinea al sito live: `git fetch origin` e
   `git rebase origin/main`. Se manca `node_modules`, esegui `npm install`.
2. Capisci la richiesta e falla nel modo più piccolo possibile.
3. **Verifica**: esegui `npm test` o `npm run build` solo quando l'utente
   chiede esplicitamente di testare o verificare la modifica. Per vedere il
   sito in locale usa `npm run dev` su `http://localhost:4321`; il controllo
   mobile si apre dal browser con F12 e l'icona del telefono.
4. **Commit** per ogni modifica, con un messaggio chiaro in italiano (es.
   `fix: orario della partita nel riquadro diretta`). Se git chiede
   l'identità, chiedi all'amico nome ed email e impostali solo in questo repo
   (`git config user.name ...`, `git config user.email ...`).
5. Mai comandi distruttivi (`git reset --hard`, `git clean -f`,
   `git checkout -- .`) senza chiedere.

## Consegna delle modifiche a Gaetano (file .patch)

Quando l'amico dice "ho finito" o "prepara il file per Gaetano":

1. Controlla che sia tutto committato (`git status` pulito).
2. `git fetch origin` e `git rebase origin/main`. Se ci sono conflitti,
   spiegali e risolvili insieme all'amico, oppure fermati.
3. `npm test` e `npm run build`: devono passare.
4. Mostra cosa parte: `git log --oneline origin/main..HEAD`. Se è vuoto, non
   c'è niente da consegnare: dillo e non creare file vuoti.
5. Crea il file nella cartella principale, con la data di oggi nel nome:
   `git format-patch origin/main --stdout > modifiche-AAAA-MM-GG.patch`
   (i file `.patch` sono esclusi da git).
6. Di' all'amico di mandare quel file a Gaetano (WhatsApp, Telegram o email),
   con due righe su cosa cambia. Gaetano lo applica con `git am`, controlla e
   pubblica.

Dopo che Gaetano ha pubblicato, alla sessione successiva il passo 1 di "Come
si lavora" (`fetch` + `rebase`) toglie da solo i commit già pubblicati.

Il file `.claude/settings.local.json` contiene la chiave OpenRouter
dell'amico: **non va mai letto ad alta voce, copiato in un patch o inviato**.
È già escluso da git.
