# Spec — Tabellino stile Serie A nella diretta (Galati + Longi)

Data: 2026-10-12. Stato: in revisione utente.
Vale per entrambi i siti: `città di galati` (questo repo) e `longi-1969`. Il riquadro della diretta è lo stesso codice nei due repo (cambiano solo i colori), quindi si implementa su Galati e si porta su Longi.

## 1. Obiettivo

Nel riquadro della diretta in home, attaccato al video Twitch, un tabellino come in Serie A: scudetti, nomi, punteggio, minuto che scorre (1T / INTERVALLO / 2T / FINALE). Aggiornato a mano da un dirigente dal pannello, **nella stessa schermata "Diretta" di oggi** (nessuna schermata nuova). Resta visibile anche a schermo intero e sotto la replica.

Fuori scopo: YouTube e Facebook (restano come oggi, non si usano), cronaca eventi (marcatori, cartellini), aggiornamento automatico da fonti esterne (per Prima/Seconda Categoria non esiste: anche Tuttocampo e Play LND sono inseriti a mano).

## 2. Vincoli verificati (ricerca del 12/10/2026, fonti primarie)

- **Twitch vieta elementi sopra il player**: requisito 1.3 di dev.twitch.tv/docs/embed ("should not be obscured in any way by other page elements") e Developer Services Agreement, Schedule 1 D.1 ("Do not … cover, or obscure"). Quindi il tabellino sta **fuori dal rettangolo dell'iframe**: fascia sopra il video, o nelle bande ai lati quando lo schermo è più largo del 16:9. Le bande devono essere sfondo della pagina, non letterbox del player.
- **iPhone non ha lo schermo intero degli elementi** (solo del `<video>` nativo), né con iOS 18, 26 o 27 (caniuse, MDN BCD, bug WebKit 206854 aperto). Su iPad, desktop e Android sì.
- **Pannello Sveltia 0.129.0**: il campo datetime ha il pulsante **Now** (ora attuale, al minuto: secondi sempre :00) e **Clear** (se il campo è facoltativo; salva `""`). Niente campi condizionali. `object` con `collapsed`. Number: `value_type` int di default, obbligatorio di default (un vuoto blocca il salvataggio), quindi partire da 0. Interfaccia solo in inglese.
- **Tempi reali salvataggio → sito**: misurati 54 salvataggi del pannello Galati: mediana 58 s (51-87 s) a coda libera, 88 s (fino a 131 s) con coda. Le build in coda superate vengono saltate, l'ultimo salvataggio è sempre pubblicato. Galati e Longi sono su account Cloudflare diversi: le loro build non si accodano a vicenda.
- **Asset statici**: serviti con `Cache-Control: public, max-age=0, must-revalidate` + ETag (verificato su `/img/logo.png`): un controllo periodico riceve subito il dato nuovo e, se non è cambiato, un 304 leggero. Gli asset esclusi da `run_worker_first` non contano nelle 100.000 richieste/giorno del piano gratuito.
- **Tuttocampo non ha sigle** delle squadre (verificati widget e pagine squadra): solo nomi interi. Gli stemmi esistono per tutte le squadre dei due gironi (PNG trasparenti, 120-1000 px) su `b2-content.tuttocampo.it/Teams/Original/<id>.png`.

## 3. Dati (pannello → `src/data/diretta.json`)

I quattro campi di oggi (`attiva`, `titolo`, `inizio`, `urlVideo`) restano dove sono: li legge anche `worker/twitch.mjs`. Si aggiunge un oggetto `tabellino`:

```json
"tabellino": {
  "avversario": "740525",
  "inCasa": false,
  "nomeCortoNostro": "",
  "nomeCortoAvversario": "",
  "fuoriElenco": { "nome": "", "scudetto": "" },
  "golNostri": 0,
  "golAvversari": 0,
  "inizio1": "", "fine1": "", "inizio2": "", "fine2": ""
}
```

- `avversario`: id Tuttocampo della squadra del girone (menu), oppure `"altra"` per una squadra fuori elenco.
- `fuoriElenco`: nome e scudetto caricato dal telefono (`public/img/uploads`), usati solo con `"altra"`.
- Nomi mostrati: nome corto se compilato, altrimenti il nome esatto di Tuttocampo. Nessuna sigla inventata.
- Tempi: datetime facoltativi, formato con fuso come `inizio` (`YYYY-MM-DDTHH:mm:ssZ`), letti con `inizioDa()` già esistente.

**Pannello**, schermata "Diretta della partita", nell'ordine: i quattro campi di oggi, poi l'oggetto "Tabellino" aperto con: Avversario (menu), In casa (interruttore), Nome corto nostro, Nome corto avversario, gruppo chiuso "Squadra fuori elenco (coppa, amichevoli)", Gol nostri, Gol avversari, Inizio 1° tempo, Fine 1° tempo, Inizio 2° tempo, Fine 2° tempo. Suggerimenti brevi: "Now e poi Salva", "Prima di ogni partita: gol a 0 e orari svuotati con Clear", "il sito si aggiorna in circa 1-2 minuti". Anche il suggerimento esistente "4-5 minuti" dell'interruttore va corretto in "1-2 minuti" (misurato).

**Elenco squadre**: `src/data/squadre.json` con `{ id, nome, scudetto }` per le squadre del girone (compresa la nostra, segnata), generato da uno script (`scripts/scudetti.mjs`) dalla classifica Tuttocampo: scarica gli stemmi, li riduce a 128 px WebP in `public/img/scudetti/<id>.webp`. Lo stemma nostro è quello del sito (`/img/logo.png` Galati, `/img/stemma.png` Longi). Le opzioni del menu in `public/admin/config.yml` devono coincidere con `squadre.json` (test, come per la formazione). Una volta per stagione, al cambio di girone, si rilancia lo script.

## 4. Logica del tabellino (`src/lib/tabellino.ts`, pura, testata)

`statoTabellino(tempi, fischio, ora)` restituisce `null` (niente fascia) oppure `{ fase, etichetta }`:

| Tempi compilati | Fase | Etichetta |
|---|---|---|
| nessun `inizio1` valido | — | niente fascia |
| `inizio1` | 1T | `m'` con m = minuti trascorsi + 1; oltre 45: `45+x'` |
| + `fine1` | intervallo | `INTERVALLO` |
| + `inizio2` | 2T | `45 + m'`; oltre 90: `90+x'` |
| + `fine2` | finale | `FINALE` |

Regole:
- Conta l'ultimo orario compilato nell'ordine `inizio1 → fine1 → inizio2 → fine2`: un tocco dimenticato in mezzo non blocca (Inizio 2° tempo senza Fine 1° tempo → 2T; Fine 2° tempo senza Inizio 2° tempo → FINALE). Senza `inizio1` niente fascia. Un orario precedente all'ultimo valido che lo precede è ignorato, come se vuoto.
- **Dati vecchi ignorati**: con l'ora del fischio, `inizio1` conta solo tra fischio − 3 h e fischio + 12 h. Senza ora del fischio, solo se negli ultimi 7 giorni. Così gli orari della partita precedente non compaiono sulla nuova.
- **Fine dimenticata**: se manca `fine2` e da `inizio2` sono passati più di 75 minuti (o da `inizio1` più di 3 ore), si mostra `FINALE`.
- Il minuto si calcola nel browser dall'orario salvato, quindi è giusto anche se il sito si aggiorna 1-2 minuti dopo (scarto massimo un minuto, per i secondi a :00).
- Funzioni per i nomi e gli scudetti: `squadreDelTabellino(dati, elenco)` → `{ casa, ospiti }` con nome e scudetto, ordinati secondo `inCasa`. Avversario vuoto → nome "Avversari" e scudetto generico (silhouette).

## 5. Componente

In `DirettaLive.astro` il blocco video diventa un contenitore "tv" con due figli: la fascia `Tabellino` e il riquadro `EmbedConsenso` di oggi. La fascia:
- è disegnata in build dai dati del pannello (niente salto alla prima visualizzazione) ed è nascosta finché `statoTabellino` è `null`;
- si vede nelle fasi in onda, replica e senza ora; mai durante il conto alla rovescia;
- mostra: scudetto + nome casa, punteggio, nome + scudetto ospiti, fase/minuto, pulsante "Schermo intero";
- è nei colori del sito (Galati rosso/giallo, Longi rossoblù/oro), con caratteri del sito; non imita l'interfaccia di Twitch.

**Aggiornamento a pagina aperta**: in build si genera `/tabellino.json` (endpoint Astro prerenderizzato, solo i dati del tabellino già risolti: nomi, scudetti, gol, tempi). Il browser lo richiede ogni 20 s **solo** con la pagina visibile e intorno alla partita (da 3 ore prima a 12 ore dopo il fischio; senza ora del fischio sempre), poi ridisegna; il minuto scorre ogni secondo in locale. `"!/tabellino.json"` va aggiunto alle esclusioni di `run_worker_first` in `wrangler.jsonc`, così i controlli non passano dal Worker e non consumano richieste.

## 6. Schermo intero

- Pulsante nella fascia. Dove esiste (`document.fullscreenEnabled` e `requestFullscreen` sul contenitore: desktop, Android, iPad) mette a schermo intero il contenitore "tv" (fascia + iframe), senza spostare l'iframe nel DOM.
- Dove non esiste (iPhone): il contenitore passa a una classe che lo stende su tutta la pagina (`position: fixed; inset: 0; height: 100dvh`, fondo nero, margini `env(safe-area-inset-*)`), con pulsante "Esci" ed Esc. Le barre di Safari possono restare in parte; la rotazione la fa chi guarda.
- Disposizione a schermo intero: video 16:9 il più grande possibile; fascia sopra. Se lo schermo è abbastanza più largo del 16:9 (telefono in orizzontale), fascia verticale in una banda laterale, fuori dal video.
- **Pulsante schermo intero interno di Twitch**: per l'iframe Twitch si tolgono l'attributo `allowfullscreen` e `fullscreen` da `allow` (attributo documentato da Twitch come facoltativo): così l'unico schermo intero è il nostro, col tabellino. YouTube e Facebook restano come oggi.
- Da verificare su iPhone reale: se il player Twitch ripiega comunque sullo schermo intero nativo del video (che mostrerebbe solo il video). Se succede, prova successiva con il parametro `allowfullscreen=false` nell'URL del player (presente nel codice di Twitch ma non documentato); altrimenti si accetta e chi guarda usa il nostro pulsante.

## 7. Rischi accettati

- Il punteggio arriva 1-2 minuti dopo il salvataggio (fino a ~3 con raffiche): il gol si vede prima nel video. Accelerabile in seguito (lettura da GitHub con chiave in sola lettura come secret Cloudflare: ~20-30 s).
- Punteggio da riazzerare a mano a ogni partita (scritto nel pannello).
- iPhone: schermo intero "steso" invece che vero.
- Già oggi, indipendente dal tabellino: su telefono in verticale il player Twitch è sotto il minimo di 400x300 px chiesto da Twitch.
- Stemmi delle altre società: uso per indicare l'avversario; rimovibili su richiesta.

## 8. Verifica

- Test vitest: `statoTabellino` (fasi, minuto, recupero 45+/90+, ordine, dati vecchi con e senza fischio, fine dimenticata), `squadreDelTabellino` (casa/trasferta, nome corto, fuori elenco, avversario vuoto), coincidenza menu `config.yml` ↔ `squadre.json`.
- Anteprima nel browser con dati finti: fascia in 1T/intervallo/2T/finale, desktop e telefono, schermo intero (classe stesa), nessun errore in console, `/tabellino.json` servito.
- Collaudo dell'utente su telefono vero con diretta di prova: salvataggi dal pannello, tempi di arrivo, pulsante schermo intero, comportamento del pulsante interno Twitch su iPhone.
- Poi lo stesso su Longi.
