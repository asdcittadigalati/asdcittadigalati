# Materiale da chiedere alla società — ASD Città di Galati

Il sito è completo e funzionante, ma oggi gira con **contenuti fittizi**
inventati per mostrare il risultato finale. Ogni dato inventato è marcato nel
codice con un commento `FITTIZIO`. Questo documento elenca, voce per voce,
cosa serve dalla società per sostituirli con la realtà.

Consegnare tutto a: sviluppatore (Gaetano). Formati preferiti indicati per
ogni voce.

---

## 1. Dati legali e contatti (bloccanti per andare online)

| Cosa | Dove finisce | Note |
|---|---|---|
| Ragione sociale esatta (es. "A.S.D. Città di Galati") | Footer, Contatti, Privacy | Come da statuto/affiliazione FIGC |
| Sede legale (via, civico, CAP) | Footer, Contatti, Privacy | Oggi c'è un indirizzo inventato |
| Codice fiscale / P.IVA | Footer, Privacy | Oggi c'è 00000000000 |
| Email ufficiale | Contatti, Footer | Oggi c'è un indirizzo finto |
| PEC | Contatti, Privacy | Se esiste |
| Telefono di riferimento | Contatti | Numero che la società vuole rendere pubblico |
| Nominativo del referente privacy | Privacy | Chi risponde alle richieste sui dati (di solito il presidente) |

## 2. Identità e storia

| Cosa | Dove finisce | Note |
|---|---|---|
| Logo in formato vettoriale (AI/EPS/SVG/PDF) | Tutto il sito | Se esiste solo l'immagine dei social va bene, ma il vettoriale rende meglio; in mancanza, valutare rivettorializzazione (a preventivo) |
| Storia vera del club | Pagina Club | Anche in forma di appunti o racconto a voce: anno di fondazione, momenti chiave, promozioni/retrocessioni, personaggi. Ci pensiamo noi a scriverla bene. Oggi c'è un testo generico inventato |
| Palmarès / albo d'oro | Pagina Club | Coppe, campionati vinti, se esistono |
| Anno di fondazione | Pagina Club, eventualmente stemma | |

## 3. Rosa e staff (oggi TUTTA inventata)

| Cosa | Dove finisce | Note |
|---|---|---|
| Elenco giocatori reale: nome, ruolo, numero di maglia | Pagina Squadra | Basta una lista scritta, anche su WhatsApp |
| Foto singole dei giocatori | Pagina Squadra | Ideale: mezzo busto su sfondo neutro, tutte uguali. Senza foto compare una sagoma (già prevista) |
| **Liberatorie firmate per le foto** | — | Obbligatorie per pubblicare i volti. Per i minorenni firma di ENTRAMBI i genitori. Senza liberatoria niente foto: la sagoma resta |
| Staff tecnico e dirigenza: nomi e incarichi | Pagina Squadra | Allenatore, vice, preparatori, dirigenti accompagnatori, presidente ecc. |

## 4. Sponsor (oggi 8 sponsor INVENTATI con loghi finti)

| Cosa | Dove finisce | Note |
|---|---|---|
| Elenco sponsor reali con livello | Barra scorrevole in home | Livelli: main (il più grande), tecnico, partner. Decide la società la gerarchia |
| Logo di ogni sponsor | Barra scorrevole | Meglio se vettoriale o PNG grande su sfondo trasparente; in mancanza, foto nitida dell'insegna e lo sistemiamo noi |
| Link al sito/pagina social di ogni sponsor | Barra scorrevole | Se esiste: il logo diventa cliccabile |
| Ok scritto degli sponsor alla pubblicazione | — | Basta un messaggio: evita discussioni dopo |

## 5. Foto e materiale visivo

| Cosa | Dove finisce | Note |
|---|---|---|
| 15-25 foto belle e recenti | Home, Club | Partite, tifosi, campo, spogliatoio, festeggiamenti. Più sono alte di risoluzione meglio è |
| Foto del campo Ducezio-Parafioriti | Pagina Club | Un paio, anche da drone se qualcuno ce l'ha |
| Foto della prima squadra (di gruppo) | Home / Club | Quella ufficiale di inizio stagione appena si fa |

## 6. Accessi e account (bloccanti per andare online)

| Cosa | Serve per | Note |
|---|---|---|
| Dominio (es. cittadigalati.it) | Indirizzo del sito | **Va registrato a nome della società**, non dello sviluppatore. ~10-15€/anno. Possiamo occuparci noi della procedura insieme al presidente |
| Chi gestirà i post social dal pannello | Aggiornamenti | Nome ed email della persona (una o due) che aggiungerà i post: riceverà l'invito al pannello di gestione |
| Account Tuttocampo | Classifica e risultati automatici | Registrazione gratuita; servono gli URL widget del girone (Prima Categoria Girone D). Procedura in docs/HANDOFF.md §2.3 — può farla lo sviluppatore, serve solo decidere con che account |

## 7. Decisioni da prendere insieme

- **Settore giovanile sul sito**: sì o no? Se sì, servono liberatorie per TUTTI i minori fotografati. In dubbio: si parte senza e si aggiunge dopo.
- **Chi appare nei contatti**: la società vuole un modulo di contatto generico (già pronto) o anche nomi/numeri di persone specifiche?

---

## Stato attuale dei segnaposto nel codice

Per lo sviluppatore: ogni contenuto inventato è marcato con un commento che
contiene la parola `FITTIZIO`. Per trovarli tutti:

```bash
grep -rn "FITTIZIO" src/ public/ --include="*.astro" --include="*.md" --include="*.svg"
```

| Area | File |
|---|---|
| Rosa (22 giocatori) | `src/content/giocatori/*.md` |
| Staff (5 persone) | `src/content/staff/*.md` |
| Sponsor (8) | `src/content/sponsor/*.md` + loghi in `public/img/sponsor/*.svg` |
| Storia del club | `src/pages/club.astro` (marker TESTO-STORIA) |
| Dati legali | `src/components/Footer.astro`, `src/pages/contatti.astro`, `src/pages/privacy.astro` (marker DATI-SOCIETA) |
