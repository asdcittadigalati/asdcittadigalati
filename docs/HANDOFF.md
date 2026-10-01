# Documento di consegna — Sito ASD Città di Galati

Questo documento serve a due lettori diversi. La prima parte è per la **società**
(chi aggiorna il sito da `/admin` e chi deve fornire i materiali mancanti). La
seconda è per lo **sviluppatore** che fa il deploy e la manutenzione tecnica.

Stato del progetto a questa consegna: 7 pagine (`/`, `/squadra`, `/stagione`,
`/social`, `/club`, `/contatti`, `/privacy`), pannello di
gestione contenuti su `/admin`, `npm run build` e `npm test` verdi. Il sito
**non è ancora online**: manca il collegamento a Netlify (vedi parte
sviluppatore) e mancano alcuni contenuti reali (vedi sotto).

---

## Parte 1 — Per la società

### 1.1 Materiali che mancano ancora

Il sito è tecnicamente pronto ma alcuni contenuti sono segnaposto in attesa dei
dati veri. Finché non arrivano, il sito resta pubblicabile così com'è (nessuna
sezione è rotta o vuota in modo evidente), ma questi punti vanno chiusi appena
possibile:

| Cosa manca | Dove appare nel sito (per lo sviluppatore) | Note |
|---|---|---|
| Ragione sociale, sede legale, P.IVA/codice fiscale, PEC, telefono, email | `src/pages/privacy.astro` (riga 17), `src/pages/contatti.astro` (riga 44), `src/components/Footer.astro` (riga 21) — cercare il commento `<!-- DATI-SOCIETA -->` | Obbligatorio per una privacy policy valida (GDPR) e per la sezione "La società" in Contatti/Footer |
| Testo della storia del club | `src/pages/club.astro` (riga 23) — commento `<!-- TESTO-STORIA -->` | Oggi la pagina Club mostra un paragrafo segnaposto onesto ("i contenuti definitivi arriveranno...") |
| Loghi sponsor e livello (main / tecnico / partner) | Si caricano da `/admin`, collezione "Sponsor" | Oggi c'è solo uno sponsor di esempio; senza sponsor reali la fascia sponsor in home resta vuota (si nasconde da sola, non mostra un buco) |
| Rosa completa con foto e liberatorie per l'uso immagine (obbligatorie per i minori) | Si carica da `/admin`, collezione "Rosa" | **Prima di caricare foto di minorenni**, la società deve avere le liberatorie firmate dai genitori. Senza foto, il sito mostra una sagoma segnaposto (non un errore) |
| Foto reali (squadra, campo, tifo) | Da caricare via `/admin` sulle rispettive collezioni, o da consegnare allo sviluppatore per l'hero | Il principio del progetto è "vivo o assente": meglio nessuna foto che uno stock generico |
| Logo vettoriale | Oggi si usa `assets/logo-original.jpeg` (raster, da social); serve per ristampe/materiali grandi | Se la società non lo possiede, va fatto rivettorializzare da un grafico |
| Dominio del sito (es. `cittadigalati.it`) | — | **Va registrato a nome della società**, non dello sviluppatore. Vedi punto 2.2 |

Nessuno di questi punti blocca il primo deploy: il sito è pensato per restare
onesto e pulito anche senza questi contenuti (placeholder dichiarati, mai
sezioni finte o "in costruzione").

### 1.2 Come si usa `/admin`

Il sito ha un pannello di gestione contenuti (Sveltia CMS) all'indirizzo
`https://<dominio-del-sito>/admin`. Serve per aggiungere i post social, aggiornare rosa, staff,
sponsor **e i testi delle pagine** senza toccare codice.

> **Per chi userà il pannello c'è una guida dedicata e più semplice:
> [GUIDA-PANNELLO.md](GUIDA-PANNELLO.md).** È scritta per il volontario, non
> per lo sviluppatore: stampala o mandagliela.

**Primo accesso**: serve un account GitHub gratuito, e lo sviluppatore deve
invitare quel nome utente come collaboratore del repository (punto 2.1).
Poi si entra da `/admin` con *Sign In with GitHub*.

**Cosa si può gestire, e come**:

- **Social**: link di un post pubblico di Instagram, Facebook o TikTok e
  data (si compila da sola). Il post appare da solo in home (gli ultimi 3) e
  in `/social`; senza consenso privacy al suo posto c'è un segnaposto.
- **Rosa**: nome, ruolo (Portiere / Difensore / Centrocampista / Attaccante),
  numero di maglia, foto. I giocatori compaiono in `/squadra` raggruppati per
  ruolo e ordinati per numero.
- **Staff**: nome, incarico (es. "Allenatore", "Dirigente accompagnatore"),
  foto, ordine di visualizzazione (numero più basso = più in alto nella
  lista).
- **Sponsor**: nome, livello (`main` = logo grande, `tecnico` = medio,
  `partner` = piccolo), logo (obbligatorio), sito web (opzionale, se presente
  il logo diventa cliccabile).
- **Dati della società**: indirizzo, telefono, email, PEC, social, nome del
  campo e la frase grande in home. Alimentano footer, pagina Contatti e
  informativa privacy. I campi vuoti spariscono dal sito invece di lasciare
  righe a metà.
- **Pagina Club**: la storia della società (un riquadro per paragrafo) e le
  tappe della linea del tempo. Prima erano scritte nel codice: ora la società
  può correggere la propria storia da sola.

**Voci di esempio da sostituire**: ogni collezione ha oggi una voce
segnaposto ("Nome Cognome", "Sponsor Esempio"...) usata per collaudare il
sito. Vanno **modificate con i dati veri o cancellate** dal pannello non
appena si inserisce il primo contenuto reale, altrimenti restano visibili sul
sito pubblico.

**Caricamento immagini**: dal pannello si caricano direttamente (bottone
"Choose an image" nei campi Foto/Logo/Copertina); finiscono in
`public/img/uploads/` e vengono pubblicate al prossimo deploy automatico
(Netlify ricostruisce il sito a ogni salvataggio dal CMS, in genere entro 1-2
minuti).

**Regola sulle dimensioni delle immagini (importante)**: le foto caricate dal
pannello vengono pubblicate **così come sono**, senza ridimensionamento
automatico. Una foto scattata col telefono pesa in genere 3-5 MB: venti foto
così sulla pagina Squadra rendono il sito lentissimo per chi lo apre in 4G,
che è il caso normale dei tifosi. Prima di caricare, ridimensionare ogni
immagine a **massimo 1200 pixel di lato lungo** e **sotto i 300 KB**. Va bene
qualunque strumento gratuito (su telefono l'app Foto in "Modifica → Ridimensiona",
su computer un sito come squoosh.app). Nel dubbio, meglio una foto più
piccola: sullo schermo di un telefono la differenza non si vede, sul tempo di
caricamento sì.

---

## Parte 2 — Per lo sviluppatore

### 2.1 Deploy su Netlify e accesso al pannello

**Perché GitHub è obbligatorio e non un dettaglio**: il pannello `/admin` salva
i contenuti facendo commit sul repository. Senza repository il pannello non
funziona e la società non è autonoma.

#### Com'è messo oggi (28/07/2026)

| Pezzo | Valore |
|---|---|
| Repository | `tanocalandi96-ciccio/asdcittadigalati`, branch `main`, **pubblico** |
| Sito | `citta-di-galati-anteprima.netlify.app` (account Netlify `elevadigitalgc`) |
| Build | automatica a ogni push; comando e cartella li legge da `netlify.toml` |
| Accesso al pannello | applicazione OAuth GitHub + due funzioni del sito (`netlify/functions/auth.mjs`, `callback.mjs`) |
| Variabili sul sito | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (quest'ultima marcata come segreta; entrambe devono avere lo scope *functions*) |

Resta da fare solo il punto 4 qui sotto.

#### Perché il repository è pubblico e non deve tornare privato

Sul piano gratuito Netlify **rifiuta di compilare un repository privato se
l'autore del commit non è un membro verificato dell'account**
(*"Build blocked: Unrecognized Git contributor"*). Il pannello firma i commit
con l'account GitHub di chi sta scrivendo: con il repository privato, ogni
articolo pubblicato dalla società bloccherebbe la pubblicazione del sito.
Succede davvero, verificato il 28/07/2026 sul deploy `0f0c2d5`.

Le alternative sono: piano Netlify a pagamento (~19 $/mese a postazione) oppure
compilare su GitHub Actions e caricare su Netlify il sito già pronto. Per un ASD
non hanno senso: il repository non contiene segreti (le chiavi stanno solo fra
le variabili d'ambiente di Netlify) e il sito è pubblico comunque.

Effetto collaterale positivo: il permesso chiesto a chi entra nel pannello è
`public_repo` invece di `repo`, cioè **non** dà accesso agli altri repository
privati di quell'account GitHub.

#### Quel che resta da fare

1. **Invitare il redattore.** Sul repository GitHub: Settings → Collaborators
   → Add people. Serve il suo nome utente GitHub. Deve accettare l'invito che
   riceve via email. Con repository pubblico l'invito serve comunque: senza,
   può leggere ma non salvare.

2. **Consegnare la guida**: `docs/Guida-pannello-Citta-di-Galati.pdf` è scritta
   per il volontario, non per chi sviluppa. Stampala o mandagliela.

3. **Al dominio definitivo**: aggiornare `base_url` in `public/admin/config.yml`
   e l'*Authorization callback URL* dell'applicazione OAuth su GitHub. Se
   restano puntati a `netlify.app`, l'accesso al pannello smette di funzionare.

#### Provare il pannello senza repository (modalità locale)

Sveltia sa lavorare direttamente sui file del computer, senza GitHub e senza
servizi: utile per provare il pannello prima di pubblicare il repository, o per
sistemare contenuti in locale.

1. Avviare il sito: `npm run dev`
2. Aprire **`http://localhost:4321/admin/index.html`**
   (in sviluppo `/admin/` da solo restituisce 404: il server di Astro non
   genera l'indice delle cartelle per i file statici. Online funziona
   normalmente `/admin/`.)
3. Premere **Work with Local Repository** e selezionare la cartella del
   progetto quando il browser la chiede.

Le modifiche vengono scritte subito sui file del progetto e si vedono nel sito
in tempo reale. Non finiscono online finché non si ricompila e si pubblica.

Serve Chrome o Edge: Firefox e Safari non supportano ancora l'accesso alle
cartelle richiesto da questa modalità.

Se qualcosa va storto, `git checkout .` riporta i contenuti all'ultimo commit.

#### Perché non Netlify Identity

La versione precedente del pannello usava Decap CMS con Netlify Identity e Git
Gateway. **Netlify li ha deprecati**: non corregge più i bug di Git Gateway e
ne sconsiglia l'uso sui siti nuovi. Il pannello è stato quindi portato su
Sveltia CMS, che riusa la stessa configurazione ma parla direttamente con
GitHub.

**Limite noto**: l'interfaccia di Sveltia è in inglese (o giapponese),
l'italiano non è ancora supportato. I nomi delle sezioni e delle voci sono
comunque in italiano, perché li abbiamo scritti noi nella configurazione: in
inglese restano solo i pulsanti *Save*, *Publish*, *Delete*, spiegati nella
guida.

### 2.2 Dominio e `site` in `astro.config.mjs`

Il dominio di produzione **non è ancora stato scelto** e **deve essere
registrato a nome della società**, non dello sviluppatore (intestazione,
rinnovi e controllo del dominio devono restare in mano al club).

Finché non c'è un dominio, `astro.config.mjs` non imposta `site`, e i tag
`og:url` / `og:image` in `src/layouts/Base.astro` risolvono automaticamente
contro l'origine corrente (in pratica il dominio `*.netlify.app` assegnato al
deploy) — non contro un dominio inventato.

**Quando il dominio è pronto**, l'unica modifica necessaria è in
`astro.config.mjs`:

```js
export default defineConfig({
  site: "https://il-dominio-scelto.it",
});
```

Poi collegare il dominio in Netlify: Site settings → Domain management → Add
custom domain, seguendo le istruzioni Netlify per puntare i DNS.

**Una cosa va fatta insieme al dominio**, perché dipende da `site` e prima
genererebbe indirizzi su `localhost`: la sitemap (`@astrojs/sitemap`). Feed
RSS e anteprima per singolo articolo non servono più: le news sono state
sostituite dalla pagina Social (25/09/2026). Per la sitemap: `npm i @astrojs/sitemap`, poi in
`astro.config.mjs` `integrations: [sitemap({ filter: (p) => !p.includes('/admin') })]`.

### 2.3 Widget Tuttocampo: attivazione widget

Il girone è noto: la squadra gioca il campionato di **Prima Categoria Girone
D Sicilia**, stagione 2026-27 (verificato il 27/07/2026 seguendo il redirect
della scheda squadra). La stagione però non è ancora iniziata (zero partite
giocate a questa consegna), quindi `src/lib/tuttocampo.ts` ha `WIDGET_URLS`
vuoto e le tre sezioni di `/stagione` (Classifica, Risultati, Calendario)
mostrano un testo di fallback onesto ("non ancora disponibile perché la
stagione non è iniziata") con link alla scheda squadra su Tuttocampo. Il
codice del fallback e dei widget è già pronto: **non va toccato nulla oltre
al file sotto**.

`TEAM_PAGE` in `src/lib/tuttocampo.ts` punta già all'URL corretto:
`https://www.tuttocampo.it/Sicilia/PrimaCategoria/GironeD/Squadra/CittaDiGalati/916584/Scheda`.

**Generare gli URL widget richiede l'accesso all'account Tuttocampo della
società**: lo sviluppatore non può farlo da solo senza quelle credenziali.
Passo-passo per chi ha l'accesso (tipicamente all'inizio del campionato):

1. Accedere all'account Tuttocampo della società (o all'area riservata
   Tuttocampo per le società affiliate, se disponibile).

2. Dalla scheda squadra (l'URL sopra) cercare la funzione "Widget" o
   "Inserisci nel tuo sito": Tuttocampo genera per ogni squadra un codice
   `<iframe>` con un URL sorgente specifico per tre contenuti distinti —
   classifica del girone, risultati del campionato, calendario delle
   partite. Serve l'URL dentro `src="..."` di ciascun iframe generato, non
   il codice HTML completo.

3. Aprire `src/lib/tuttocampo.ts` e valorizzare `WIDGET_URLS` con i tre URL
   trovati:
   ```ts
   export const WIDGET_URLS: Partial<Record<"classifica" | "risultati" | "calendario", string>> = {
     classifica: "https://...",   // URL iframe "classifica" da Tuttocampo
     risultati: "https://...",    // URL iframe "risultati" da Tuttocampo
     calendario: "https://...",   // URL iframe "calendario" da Tuttocampo
   };
   ```
   Si possono valorizzare anche solo una o due chiavi: ogni sezione passa dal
   fallback al widget vero in modo indipendente (`TuttocampoWidget.astro`
   controlla `WIDGET_URLS[type]` per singolo tipo).

4. Salvare, fare commit, e lasciare che Netlify rifaccia il build (o
   eseguire `npm run build` in locale per verificare prima).

5. **Verifica visiva** (equivalente di uno screenshot, in parole): aprire
   `/stagione`. Ogni sezione che ha un URL configurato deve mostrare l'iframe
   di Tuttocampo dentro un riquadro con intestazione della sezione (non più
   il testo "non ancora disponibile"); le sezioni senza URL restano nel loro
   fallback. Se un iframe non carica entro 10 secondi, il codice esistente
   nasconde l'iframe e torna a mostrare il testo di fallback con link alla
   scheda squadra; se poi il widget carica comunque (rete lenta ma
   funzionante), il riquadro riappare da solo e il fallback torna nascosto
   (comportamento già implementato, nessuna azione necessaria).

6. La stessa configurazione alimenta anche il box "Prossima partita" in
   home (`NextMatch.astro`, usa il widget `calendario`): si attiva da sola
   appena `WIDGET_URLS.calendario` è valorizzato.

### 2.4 Rigenerare i frame dell'hero

L'hero scroll-driven in home legge sequenze di immagini WebP da
`public/hero-frames/desktop/` (70 frame, 1280×720, ~3,4 MB) e
`public/hero-frames/mobile/` (40 frame, 720×1280, ~1,6 MB), più
`public/hero-frames/manifest.json` con conteggio e peso di ciascun set.

Per rigenerarli (es. dopo un nuovo video hero, o per ridurre ulteriormente il
peso):

```bash
npm run frames
```

Esegue `scripts/extract-hero-frames.mjs`, che richiede **ffmpeg e ffprobe
installati e nel PATH** e i due video sorgente in `assets/`:
`hero-video-master-16x9.mp4` (16:9, desktop) e `hero-video-mobile-9x16.mp4`
(9:16, mobile). Lo script prova automaticamente qualità WebP decrescenti
(72 → 65 → 55) finché non rientra nel budget di peso (6000 KB desktop,
3000 KB mobile) o segnala un avviso se non ci riesce nemmeno alla qualità più
bassa.

**Per cambiare il numero di frame** (es. per alleggerire ulteriormente il
mobile), modificare `frames: 40` (o `70` per il desktop) nell'array `jobs` in
cima a `scripts/extract-hero-frames.mjs`, poi rieseguire `npm run frames`.
Dopo ogni rigenerazione:
- verificare che `public/hero-frames/manifest.json` rifletta i nuovi numeri;
- rifare `npm run build && npm run preview` e controllare a occhio che lo
  scroll dell'hero in home sia fluido e senza scatti, sia su viewport
  desktop che mobile (< 720px di larghezza);
- ripetere l'audit Lighthouse mobile sulla home (vedi punto 2.6) se l'obiettivo
  è recuperare punteggio Performance.

### 2.5 Comandi e struttura

```bash
npm install       # dipendenze (Node >= 22.12.0)
npm run dev        # sviluppo, http://localhost:4321
npm run build       # build di produzione in dist/
npm run preview     # serve dist/ per test locali pre-deploy
npm test           # vitest, suite su src/lib/scrub.ts
npm run frames       # rigenera i frame hero (vedi 2.4)
```

Struttura principale:
- `src/pages/` — le 7 pagine del sito.
- `src/components/` — Hero, Header, Footer, card post social/
  giocatore, fascia sponsor, widget Tuttocampo.
- `src/content/` + `src/content.config.ts` — le 4 collezioni CMS (social,
  giocatori, staff, sponsor), lette da Astro Content Collections.
- `src/lib/tuttocampo.ts` — costanti e URL widget Tuttocampo (punto 2.3).
- `src/lib/scrub.ts` — logica di mappatura scroll → frame dell'hero, coperta
  da `tests/scrub.test.ts`.
- `public/admin/` — pannello Decap CMS (`config.yml` definisce le
  collezioni, deve restare coerente con `src/content.config.ts`).
- `public/hero-frames/` — frame WebP generati (punto 2.4), non editare a
  mano.

### 2.6 Verifica prima di ogni deploy

Prima di ogni deploy importante, ripetere in locale:

```bash
npm test
npm run build
npm run preview
```

poi lanciare Lighthouse (mobile) sulla home servita da `npm run preview`
(non da `npm run dev`, che include strumenti di sviluppo e falsa i numeri):

```bash
npx lighthouse http://localhost:<porta-di-preview> \
  --only-categories=performance,accessibility,best-practices,seo \
  --form-factor=mobile --screenEmulation.mobile \
  --throttling-method=simulate \
  --chrome-flags="--headless=new"
```

Target: Performance ≥ 90, Accessibility ≥ 95 sulla home. Se Performance
scende sotto 90, il primo sospetto è il peso dei frame hero: ridurre il
numero di frame mobile o la qualità WebP (punto 2.4) e ripetere la misura.

Punteggi misurati alla consegna (27/07/2026, home mobile su build di
produzione): **Performance 99, Accessibility 100, Best Practices 100,
SEO 100**. LCP 1,7 s, CLS 0. Sono il riferimento: uno scostamento in
basso dopo una modifica indica una regressione, non una fluttuazione.

### 2.7 Checklist prima di andare online

Da completare tutta prima di puntare il dominio pubblico sul sito. Ogni voce
è bloccante: il sito funziona senza, ma va online incompleto.

- [ ] Dominio registrato **a nome della società**, non dello sviluppatore
- [ ] `site` valorizzato in `astro.config.mjs` col dominio reale (punto 2.2).
      Senza, i link canonici mancano e l'anteprima social che Facebook mette
      in cache al primo giro punta all'indirizzo provvisorio `.netlify.app`
- [ ] Segnaposto `<!-- DATI-SOCIETA -->` sostituiti con i dati legali reali
      in `src/components/Footer.astro`, `src/pages/contatti.astro` e
      `src/pages/privacy.astro` (ragione sociale completa, sede, CF/P.IVA,
      email, PEC, telefono)
- [ ] Segnaposto `<!-- TESTO-STORIA -->` sostituito con la storia vera della
      società in `src/pages/club.astro`
- [ ] Loghi sponsor caricati con il livello corretto (main, tecnico, partner)
- [ ] Rosa e staff inseriti, con liberatorie raccolte per le foto (per i
      minori la liberatoria è obbligatoria: senza, niente foto)
- [ ] URL widget Tuttocampo generati e inseriti (punto 2.3), a campionato
      iniziato
- [ ] Editor della società invitato su Netlify Identity e messo alla prova
      su `/admin`: deve riuscire ad aggiungere un post social da solo
- [ ] `npm test` e `npm run build` verdi, Lighthouse rimisurato (punto 2.6)

Migliorie note, non bloccanti, da valutare dopo il primo deploy: pagina 404
personalizzata, pagina di ringraziamento dopo l'invio del form contatti,
`robots.txt` e sitemap, paginazione della pagina Social quando i post
supereranno il centinaio, `favicon.ico` rigenerato dallo stemma (oggi i browser
moderni usano `favicon.svg`, che è già lo stemma corretto).
