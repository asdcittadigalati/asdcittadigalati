# Tabellino stile Serie A nella diretta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fascia-tabellino (scudetti, nomi, punteggio, minuto) attaccata sopra il player Twitch nel riquadro della diretta, aggiornata dal pannello, con schermo intero proprio; prima Galati, poi Longi.

**Architecture:** Logica pura in `src/lib/tabellino.ts` (fasi, minuto, recupero, squadre). Il pannello Sveltia scrive un oggetto `tabellino` in `src/data/diretta.json`; la build produce l'HTML e un file statico `/tabellino.json` che il browser rilegge ogni 20 s. Il componente `Tabellino.astro` sta in un contenitore `[data-tv]` insieme al riquadro video, fuori dall'iframe; il pulsante mette a schermo intero il contenitore (o lo stende sulla pagina dove lo schermo intero non esiste: iPhone).

**Tech Stack:** Astro 7 (statico), TypeScript, vitest 4, js-yaml (via astro), sharp (già in node_modules, solo per lo script locale), Sveltia CMS 0.129.0, Cloudflare Workers static assets.

**Spec:** `docs/superpowers/specs/2026-10-12-tabellino-diretta-design.md`

## Global Constraints

- Nessun elemento sopra il rettangolo dell'iframe Twitch (requisito 1.3 Twitch embed, DSA Schedule 1 D.1): la fascia sta accanto, mai sovrapposta.
- Nessuna schermata o collezione nuova nel pannello: tutto nella voce "Diretta della partita" (collezione `impostazioni`, file `diretta`).
- I quattro campi esistenti di `diretta.json` (`attiva`, `titolo`, `inizio`, `urlVideo`) restano al primo livello: li legge `worker/twitch.mjs`.
- Sveltia 0.129.0: per i datetime usare solo `format: "YYYY-MM-DDTHH:mm:ssZ"`; NON usare `date_format`, `time_format`, `picker_utc` (in 0.129.0 bloccano il caricamento del pannello). I number sono obbligatori di default: valore iniziale 0 nel JSON.
- Nomi squadre: nome esatto di Tuttocampo, oppure il "nome corto" scritto dalla società. Mai sigle inventate.
- Si collauda solo Twitch. YouTube e Facebook restano come oggi (nessuna modifica al loro comportamento).
- Nessuna nuova dipendenza npm nel `package.json`.
- Stile del codice: commenti in italiano senza lettere accentate (`e'`, `perche'`), come nel resto del repo; testi visibili con gli accenti.
- Prima di ogni push: `git pull --rebase` (il pannello salva spesso `diretta.json`). Push solo con l'ok dell'utente.

## Review Focus

1. Orari salvati dal pannello col fuso (`"2026-10-18T15:31:00+02:00"`, secondi a :00) → minuto giusto in qualunque fuso del browser. Test in Task 1 ("orari con il fuso salvati dal pannello").
2. Orari della partita precedente rimasti nel pannello → nessuna fascia sulla nuova partita (con e senza ora del fischio). Test in Task 1 ("orari della partita precedente").
3. Tocchi dimenticati o fuori ordine (Inizio 2° tempo senza Fine 1°, fine prima dell'inizio, Fine 2° mai toccata) → il tabellino non si blocca e arriva da solo a FINALE. Test in Task 1.
4. Avversario vuoto, sconosciuto o "altra" senza nome → "Avversari" con scudetto generico, mai un riquadro rotto. Test in Task 1 ("avversario mancante o sconosciuto").
5. `diretta.json` senza `tabellino` (formato vecchio) o gol `null`/negativi → nessun errore, nessuna fascia, gol 0. Test in Task 1 ("vecchio diretta.json", "gol vuoti").

---

## File Structure (Galati; Longi identica salvo dove indicato nel Task 7)

- Create `src/lib/tabellino.ts` — logica pura: `statoTabellino`, `datiTabellino`, `daAggiornare`, tipi.
- Create `tests/tabellino.test.ts` — test della logica.
- Create `scripts/scudetti.mjs` — genera `src/data/squadre.json` e `public/img/scudetti/<id>.webp` dalla classifica Tuttocampo (una volta per stagione).
- Create `src/data/squadre.json` — elenco squadre del girone (generato).
- Create `public/img/scudetti/generico.svg` + `public/img/scudetti/<id>.webp` (generati).
- Modify `public/admin/config.yml` — gruppo "Tabellino" nella voce diretta, suggerimenti "4-5 minuti" → "1-2 minuti".
- Modify `src/data/diretta.json` — oggetto `tabellino` iniziale.
- Create `tests/tabellino-pannello.test.ts` — coincidenza pannello ↔ sito.
- Create `src/pages/tabellino.json.ts` — file statico `/tabellino.json`.
- Modify `wrangler.jsonc` — `/tabellino.json` fuori dal Worker.
- Create `src/components/Tabellino.astro` — fascia + script (disegno, aggiornamento, schermo intero).
- Modify `src/components/DirettaLive.astro` — contenitore `[data-tv]`, fascia, CSS schermo intero.
- Modify `src/components/EmbedConsenso.astro` — prop `schermoIntero` (Twitch senza schermo intero interno).

---

### Task 1: Logica del tabellino

**Files:**
- Create: `src/lib/tabellino.ts`
- Test: `tests/tabellino.test.ts`

**Interfaces:**
- Consumes: `inizioDa(valore: string): Date` e `GIORNI_REPLICA` da `src/lib/diretta.ts` (esistenti).
- Produces:
  - `interface Tempi { inizio1?: string; fine1?: string; inizio2?: string; fine2?: string }`
  - `interface TabellinoPannello extends Tempi { avversario?: string; inCasa?: boolean; nomeCortoNostro?: string; nomeCortoAvversario?: string; fuoriElenco?: { nome?: string; scudetto?: string }; golNostri?: number; golAvversari?: number }`
  - `interface Squadra { id: string; nome: string; scudetto: string; noi?: boolean }`
  - `interface Lato { nome: string; scudetto: string; gol: number }`
  - `interface DatiTabellino { attiva: boolean; fischio: string; casa: Lato; ospiti: Lato; tempi: Required<Tempi> }`
  - `type FaseTabellino = "1T" | "intervallo" | "2T" | "finale"`
  - `interface StatoTabellino { fase: FaseTabellino; tempo: "1T" | "2T" | ""; etichetta: string }`
  - `const ALTRA = "altra"`, `const SCUDETTO_GENERICO = "/img/scudetti/generico.svg"`
  - `statoTabellino(tempi: Tempi, fischio: Date | null, ora: Date): StatoTabellino | null`
  - `datiTabellino(diretta: { attiva?: boolean; inizio?: string; tabellino?: TabellinoPannello }, elenco: Squadra[]): DatiTabellino`
  - `daAggiornare(fischio: Date | null, ora: Date): boolean`

- [ ] **Step 1: Write the failing test** — `tests/tabellino.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { statoTabellino, datiTabellino, daAggiornare, ALTRA, SCUDETTO_GENERICO, type Squadra } from "../src/lib/tabellino";

const FISCHIO = new Date("2026-10-18T13:30:00.000Z"); // 15:30 a Roma
const MIN = 60_000;
const t = (min: number) => new Date(FISCHIO.getTime() + min * MIN).toISOString();
const a = (min: number) => new Date(FISCHIO.getTime() + min * MIN);

describe("statoTabellino: fasi e minuto", () => {
  it("senza inizio del 1° tempo niente fascia", () => {
    expect(statoTabellino({}, FISCHIO, a(10))).toBeNull();
    expect(statoTabellino({ inizio1: "" }, FISCHIO, a(10))).toBeNull();
  });
  it("1° tempo: il minuto parte da 1 e scorre", () => {
    expect(statoTabellino({ inizio1: t(2) }, FISCHIO, a(2))).toEqual({ fase: "1T", tempo: "1T", etichetta: "1'" });
    expect(statoTabellino({ inizio1: t(2) }, FISCHIO, a(2 + 22.5))?.etichetta).toBe("23'");
  });
  it("oltre il 45° il recupero si conta da solo", () => {
    expect(statoTabellino({ inizio1: t(0) }, FISCHIO, a(44.9))?.etichetta).toBe("45'");
    expect(statoTabellino({ inizio1: t(0) }, FISCHIO, a(45))?.etichetta).toBe("45+1'");
    expect(statoTabellino({ inizio1: t(0) }, FISCHIO, a(47.5))?.etichetta).toBe("45+3'");
  });
  it("fine 1° tempo: intervallo", () => {
    expect(statoTabellino({ inizio1: t(0), fine1: t(48) }, FISCHIO, a(55))).toEqual({ fase: "intervallo", tempo: "", etichetta: "Intervallo" });
  });
  it("2° tempo: riparte da 46 e il recupero da 90", () => {
    const tempi = { inizio1: t(0), fine1: t(48), inizio2: t(63) };
    expect(statoTabellino(tempi, FISCHIO, a(63))).toEqual({ fase: "2T", tempo: "2T", etichetta: "46'" });
    expect(statoTabellino(tempi, FISCHIO, a(63 + 44.5))?.etichetta).toBe("90'");
    expect(statoTabellino(tempi, FISCHIO, a(63 + 46))?.etichetta).toBe("90+2'");
  });
  it("fine 2° tempo: finale", () => {
    expect(statoTabellino({ inizio1: t(0), fine1: t(48), inizio2: t(63), fine2: t(112) }, FISCHIO, a(120))).toEqual({ fase: "finale", tempo: "", etichetta: "Finale" });
  });
  it("un tocco dimenticato in mezzo non blocca", () => {
    expect(statoTabellino({ inizio1: t(0), inizio2: t(63) }, FISCHIO, a(70))?.etichetta).toBe("53'");
    expect(statoTabellino({ inizio1: t(0), fine2: t(112) }, FISCHIO, a(115))?.fase).toBe("finale");
  });
  it("un orario precedente al tempo prima viene ignorato", () => {
    expect(statoTabellino({ inizio1: t(10), fine1: t(5) }, FISCHIO, a(20))?.fase).toBe("1T");
  });
  it("fine dimenticata: FINALE da solo", () => {
    expect(statoTabellino({ inizio1: t(0), fine1: t(48), inizio2: t(63) }, FISCHIO, a(63 + 76))?.fase).toBe("finale");
    expect(statoTabellino({ inizio1: t(0) }, FISCHIO, a(181))?.fase).toBe("finale");
    expect(statoTabellino({ inizio1: t(0), fine1: t(48) }, FISCHIO, a(181))?.fase).toBe("finale");
  });
  it("orologio del telefono avanti: mai minuto 0 o negativo", () => {
    expect(statoTabellino({ inizio1: t(5) }, FISCHIO, a(4))?.etichetta).toBe("1'");
  });
  it("orari con il fuso salvati dal pannello", () => {
    // "Now" salva l'ora di Roma col fuso, secondi a :00
    expect(statoTabellino({ inizio1: "2026-10-18T15:31:00+02:00" }, FISCHIO, new Date("2026-10-18T13:41:30Z"))?.etichetta).toBe("11'");
  });
});

describe("statoTabellino: orari della partita precedente", () => {
  it("con l'ora del fischio contano solo da 3 ore prima a 12 ore dopo", () => {
    const settimanaPrima = new Date(FISCHIO.getTime() - 7 * 86_400_000).toISOString();
    expect(statoTabellino({ inizio1: settimanaPrima, fine2: settimanaPrima }, FISCHIO, a(-60))).toBeNull();
    expect(statoTabellino({ inizio1: t(-170) }, FISCHIO, a(-160))?.fase).toBe("1T");
    expect(statoTabellino({ inizio1: t(-181) }, FISCHIO, a(-170))).toBeNull();
    expect(statoTabellino({ inizio1: t(12 * 60 + 1) }, FISCHIO, a(12 * 60 + 2))).toBeNull();
  });
  it("senza ora del fischio contano solo gli ultimi 7 giorni", () => {
    const ora = new Date("2026-10-18T14:00:00Z");
    expect(statoTabellino({ inizio1: "2026-10-18T13:30:00Z" }, null, ora)?.fase).toBe("1T");
    expect(statoTabellino({ inizio1: "2026-10-10T13:30:00Z", fine2: "2026-10-10T15:20:00Z" }, null, ora)).toBeNull();
    expect(statoTabellino({ inizio1: "2026-10-18T13:30:00Z" }, new Date("non valida"), ora)?.fase).toBe("1T");
  });
});

const ELENCO: Squadra[] = [
  { id: "916584", nome: "Città Di Galati", scudetto: "/img/logo.png", noi: true },
  { id: "740525", nome: "OR.SA.", scudetto: "/img/scudetti/740525.webp" },
];

describe("datiTabellino: squadre, nomi e gol", () => {
  it("in casa noi a sinistra, col nome di Tuttocampo", () => {
    const d = datiTabellino({ attiva: true, inizio: "2026-10-18T15:30:00+02:00", tabellino: { avversario: "740525", inCasa: true, golNostri: 2, golAvversari: 1 } }, ELENCO);
    expect(d.casa).toEqual({ nome: "Città Di Galati", scudetto: "/img/logo.png", gol: 2 });
    expect(d.ospiti).toEqual({ nome: "OR.SA.", scudetto: "/img/scudetti/740525.webp", gol: 1 });
    expect(d.attiva).toBe(true);
    expect(d.fischio).toBe("2026-10-18T15:30:00+02:00");
  });
  it("in trasferta l'avversario a sinistra", () => {
    const d = datiTabellino({ tabellino: { avversario: "740525", inCasa: false, golNostri: 0, golAvversari: 3 } }, ELENCO);
    expect(d.casa).toEqual({ nome: "OR.SA.", scudetto: "/img/scudetti/740525.webp", gol: 3 });
    expect(d.ospiti.nome).toBe("Città Di Galati");
  });
  it("il nome corto, se scritto, vince sul nome di Tuttocampo", () => {
    const d = datiTabellino({ tabellino: { avversario: "740525", nomeCortoNostro: " Galati ", nomeCortoAvversario: "Orsa" } }, ELENCO);
    expect(d.casa.nome).toBe("Galati");
    expect(d.ospiti.nome).toBe("Orsa");
  });
  it("squadra fuori elenco: nome e scudetto caricati nel pannello", () => {
    const d = datiTabellino({ tabellino: { avversario: ALTRA, fuoriElenco: { nome: "Nebrodi FC", scudetto: "/img/uploads/nebrodi.webp" } } }, ELENCO);
    expect(d.ospiti).toEqual({ nome: "Nebrodi FC", scudetto: "/img/uploads/nebrodi.webp", gol: 0 });
  });
  it("squadra del girone scelta: il gruppo fuori elenco non conta", () => {
    const d = datiTabellino({ tabellino: { avversario: "740525", fuoriElenco: { nome: "Nebrodi FC", scudetto: "/x.webp" } } }, ELENCO);
    expect(d.ospiti.nome).toBe("OR.SA.");
  });
  it("avversario mancante o sconosciuto: 'Avversari' e scudetto generico", () => {
    for (const avversario of [undefined, "", "999", ALTRA]) {
      const d = datiTabellino({ tabellino: { avversario } }, ELENCO);
      expect(d.ospiti).toEqual({ nome: "Avversari", scudetto: SCUDETTO_GENERICO, gol: 0 });
    }
  });
  it("gol vuoti, negativi o strani valgono 0", () => {
    const d = datiTabellino({ tabellino: { golNostri: null as unknown as number, golAvversari: -2 } }, ELENCO);
    expect([d.casa.gol, d.ospiti.gol]).toEqual([0, 0]);
  });
  it("vecchio diretta.json senza tabellino: nessun orario", () => {
    const d = datiTabellino({ attiva: true, inizio: "" }, ELENCO);
    expect(d.tempi).toEqual({ inizio1: "", fine1: "", inizio2: "", fine2: "" });
    expect(statoTabellino(d.tempi, null, new Date())).toBeNull();
  });
});

describe("daAggiornare: quando rileggere /tabellino.json", () => {
  it("senza ora del fischio sempre", () => {
    expect(daAggiornare(null, new Date())).toBe(true);
    expect(daAggiornare(new Date("non valida"), new Date())).toBe(true);
  });
  it("con l'ora: da 3 ore prima a 12 ore dopo il fischio", () => {
    expect(daAggiornare(FISCHIO, a(-181))).toBe(false);
    expect(daAggiornare(FISCHIO, a(-180))).toBe(true);
    expect(daAggiornare(FISCHIO, a(12 * 60))).toBe(true);
    expect(daAggiornare(FISCHIO, a(12 * 60 + 1))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tabellino.test.ts`
Expected: FAIL, "Failed to resolve import ../src/lib/tabellino".

- [ ] **Step 3: Write minimal implementation** — `src/lib/tabellino.ts`:

```ts
// Tabellino stile Serie A nel riquadro della diretta (DirettaLive.astro):
// scudetti, nomi, punteggio e minuto di gioco. Logica pura, testata in
// tests/tabellino.test.ts.
//
// Il dirigente lo aggiorna dal pannello, nella schermata della diretta: gol e
// quattro orari (inizio e fine di ogni tempo, col pulsante "Now"). Il minuto
// non si scrive mai: il browser lo conta dall'orario salvato, quindi resta
// giusto anche se il sito si aggiorna un paio di minuti dopo il salvataggio.
// Il recupero esce da solo (45+2') finche' non si salva la fine del tempo.
import { inizioDa, GIORNI_REPLICA } from "./diretta";

export interface Tempi {
  inizio1?: string;
  fine1?: string;
  inizio2?: string;
  fine2?: string;
}

// Il gruppo "Tabellino" del pannello (src/data/diretta.json).
export interface TabellinoPannello extends Tempi {
  avversario?: string; // id Tuttocampo, oppure ALTRA
  inCasa?: boolean;
  nomeCortoNostro?: string;
  nomeCortoAvversario?: string;
  fuoriElenco?: { nome?: string; scudetto?: string };
  golNostri?: number;
  golAvversari?: number;
}

// Una squadra del girone (src/data/squadre.json, scripts/scudetti.mjs).
export interface Squadra {
  id: string;
  nome: string;
  scudetto: string;
  noi?: boolean;
}

export interface Lato {
  nome: string;
  scudetto: string;
  gol: number;
}

// Quello che serve al browser per disegnare la fascia (anche /tabellino.json).
export interface DatiTabellino {
  attiva: boolean;
  fischio: string;
  casa: Lato;
  ospiti: Lato;
  tempi: Required<Tempi>;
}

export type FaseTabellino = "1T" | "intervallo" | "2T" | "finale";
export interface StatoTabellino {
  fase: FaseTabellino;
  tempo: "1T" | "2T" | "";
  etichetta: string;
}

// Valore del menu Avversario per una squadra fuori dal girone (coppa, amichevole).
export const ALTRA = "altra";
export const SCUDETTO_GENERICO = "/img/scudetti/generico.svg";

const MINUTO = 60_000;
const ORA = 3_600_000;
const GIORNO = 86_400_000;

const istante = (valore?: string): number | null => {
  const t = inizioDa(valore ?? "").getTime();
  return Number.isNaN(t) ? null : t;
};

const valida = (d: Date | null): d is Date => d !== null && !Number.isNaN(d.getTime());

// Fase e minuto adesso, o null se la fascia non va mostrata.
export function statoTabellino(tempi: Tempi, fischio: Date | null, ora: Date): StatoTabellino | null {
  const i1 = istante(tempi.inizio1);
  if (i1 === null) return null;
  const adesso = ora.getTime();

  // Orari rimasti dalla partita precedente: con l'ora del fischio contano solo
  // vicino al fischio, senza ora solo se recenti. Cosi' non finiscono sulla nuova.
  if (valida(fischio)) {
    const f = fischio.getTime();
    if (i1 < f - 3 * ORA || i1 > f + 12 * ORA) return null;
  } else if (i1 < adesso - GIORNI_REPLICA * GIORNO) return null;

  // Conta l'ultimo orario compilato nell'ordine: un tocco dimenticato in mezzo
  // non blocca; un orario prima di quello che lo precede e' un errore e si ignora.
  let fase: FaseTabellino = "1T";
  let ultimo = i1;
  let i2: number | null = null;
  for (const [chiave, dopo] of [["fine1", "intervallo"], ["inizio2", "2T"], ["fine2", "finale"]] as const) {
    const t = istante(tempi[chiave]);
    if (t === null || t < ultimo) continue;
    ultimo = t;
    fase = dopo;
    if (chiave === "inizio2") i2 = t;
  }

  // Fine dimenticata: il tabellino non resta a "90+40'" per sempre.
  if (fase === "2T" && i2 !== null && adesso - i2 > 75 * MINUTO) fase = "finale";
  if ((fase === "1T" || fase === "intervallo") && adesso - i1 > 3 * ORA) fase = "finale";

  if (fase === "intervallo") return { fase, tempo: "", etichetta: "Intervallo" };
  if (fase === "finale") return { fase, tempo: "", etichetta: "Finale" };

  const da = fase === "1T" ? i1 : (i2 as number);
  const base = fase === "1T" ? 0 : 45;
  const minuto = base + Math.max(0, Math.floor((adesso - da) / MINUTO)) + 1;
  const limite = base + 45;
  return { fase, tempo: fase, etichetta: minuto > limite ? `${limite}+${minuto - limite}'` : `${minuto}'` };
}

const testo = (s: unknown) => (typeof s === "string" ? s.trim() : "");
const gol = (n: unknown) => {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v > 0 ? v : 0;
};

// Dal pannello ai due lati della fascia: chi gioca in casa sta a sinistra.
export function datiTabellino(
  diretta: { attiva?: boolean; inizio?: string; tabellino?: TabellinoPannello },
  elenco: Squadra[]
): DatiTabellino {
  const t = diretta.tabellino ?? {};
  const nostra = elenco.find((s) => s.noi);
  const noi: Lato = {
    nome: testo(t.nomeCortoNostro) || nostra?.nome || "",
    scudetto: nostra?.scudetto ?? SCUDETTO_GENERICO,
    gol: gol(t.golNostri),
  };
  const altra = t.avversario === ALTRA;
  const delGirone = altra ? undefined : elenco.find((s) => !s.noi && s.id === t.avversario);
  const fuori = altra ? t.fuoriElenco ?? {} : {};
  const loro: Lato = {
    nome: testo(t.nomeCortoAvversario) || delGirone?.nome || testo(fuori.nome) || "Avversari",
    scudetto: delGirone?.scudetto || testo(fuori.scudetto) || SCUDETTO_GENERICO,
    gol: gol(t.golAvversari),
  };
  const inCasa = t.inCasa !== false;
  return {
    attiva: Boolean(diretta.attiva),
    fischio: testo(diretta.inizio),
    casa: inCasa ? noi : loro,
    ospiti: inCasa ? loro : noi,
    tempi: { inizio1: testo(t.inizio1), fine1: testo(t.fine1), inizio2: testo(t.inizio2), fine2: testo(t.fine2) },
  };
}

// Il browser rilegge /tabellino.json solo intorno alla partita: da 3 ore prima
// a 12 ore dopo il fischio (senza ora: sempre, finche' la diretta e' accesa).
export function daAggiornare(fischio: Date | null, ora: Date): boolean {
  if (!valida(fischio)) return true;
  const t = ora.getTime();
  const f = fischio.getTime();
  return t >= f - 3 * ORA && t <= f + 12 * ORA;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/tabellino.test.ts`
Expected: PASS (tutti). Poi `npm test`: tutti i test del repo verdi.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tabellino.ts tests/tabellino.test.ts
git commit -m "feat: logica del tabellino della diretta (fasi, minuto, recupero, squadre)"
```

---

### Task 2: Squadre del girone e scudetti

**Files:**
- Create: `scripts/scudetti.mjs`
- Create: `public/img/scudetti/generico.svg`
- Create (generati): `src/data/squadre.json`, `public/img/scudetti/<id>.webp`

**Interfaces:**
- Consumes: `GET https://asdcittadigalati.it/api/classifica` → `{ squadre: { id: string; nome: string }[] }` (Worker esistente); stemmi `https://b2-content.tuttocampo.it/Teams/Original/<id>.png`.
- Produces: `src/data/squadre.json` come `Squadra[]` (vedi Task 1): prima la nostra con `noi: true` e `scudetto: "/img/logo.png"`, poi le altre in ordine alfabetico con `scudetto: "/img/scudetti/<id>.webp"`.

- [ ] **Step 1: Scudetto generico** — `public/img/scudetti/generico.svg`:

```svg
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Scudetto non disponibile">
  <path d="M32 4 L56 12 V30 C56 46 45 56 32 60 C19 56 8 46 8 30 V12 Z" fill="oklch(0.3 0.03 265)" stroke="oklch(0.75 0.02 265)" stroke-width="3" />
</svg>
```

- [ ] **Step 2: Script** — `scripts/scudetti.mjs`:

```js
// Elenco delle squadre del girone con gli stemmi, per il tabellino della
// diretta (src/lib/tabellino.ts). Si lancia a mano una volta per stagione,
// quando cambia il girone:
//
//   node scripts/scudetti.mjs
//
// Legge la classifica dal sito pubblicato (/api/classifica, che la prende da
// Tuttocampo), scarica gli stemmi da Tuttocampo e li salva rimpiccioliti in
// public/img/scudetti/: cosi' i visitatori non si collegano a Tuttocampo.
// Scrive src/data/squadre.json e stampa le righe del menu "Avversario" da
// incollare in public/admin/config.yml (il test tabellino-pannello controlla
// che coincidano).
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const SITO = "https://asdcittadigalati.it";
const NOI = { id: "916584", scudetto: "/img/logo.png" };
const CARTELLA = "public/img/scudetti";

const r = await fetch(`${SITO}/api/classifica`);
if (!r.ok) throw new Error(`classifica non disponibile: ${r.status}`);
const { squadre } = await r.json();
await mkdir(CARTELLA, { recursive: true });

const altre = [];
let nostra = null;
for (const s of squadre) {
  if (s.id === NOI.id) {
    nostra = { id: s.id, nome: s.nome, scudetto: NOI.scudetto, noi: true };
    continue;
  }
  const png = await fetch(`https://b2-content.tuttocampo.it/Teams/Original/${s.id}.png`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!png.ok) {
    console.warn(`stemma mancante per ${s.nome} (${png.status}): scudetto generico`);
    altre.push({ id: s.id, nome: s.nome, scudetto: "/img/scudetti/generico.svg" });
    continue;
  }
  await sharp(Buffer.from(await png.arrayBuffer()))
    .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90 })
    .toFile(`${CARTELLA}/${s.id}.webp`);
  altre.push({ id: s.id, nome: s.nome, scudetto: `/img/scudetti/${s.id}.webp` });
}
if (!nostra) throw new Error(`la nostra squadra (${NOI.id}) non e' nella classifica`);

altre.sort((x, y) => x.nome.localeCompare(y.nome, "it"));
await writeFile("src/data/squadre.json", JSON.stringify([nostra, ...altre], null, 2) + "\n");

console.log("Menu Avversario per public/admin/config.yml:");
for (const s of altre) console.log(`                  - { label: ${JSON.stringify(s.nome)}, value: "${s.id}" }`);
```

- [ ] **Step 3: Run it**

Run: `node scripts/scudetti.mjs`
Expected: nessun avviso; 12 file `public/img/scudetti/<id>.webp`; `src/data/squadre.json` con 13 voci (la prima `"noi": true`, nome "Città Di Galati"); stampa 12 righe nell'ordine: Città Di Sant'Angelo (1207601), Club Sportivo Oliveri (1170703), Ludica Lipari (1043806), Mazzarrà Calcio (920357), Melas (933619), OR.SA. (740525), Patti Calcio (1282009), Polisportiva Torrenovese 1971 (1170704), Rocca 2023 (1207603), San Benedetto Calcio San Fratello (1207604), San Pier Niceto (1209760), Tortorici (1026407). Controllare a occhio 2-3 webp (trasparenza, non tagliati). Tenere l'output per il Task 3.

- [ ] **Step 4: Commit**

```bash
git add scripts/scudetti.mjs src/data/squadre.json public/img/scudetti
git commit -m "feat: squadre del girone con gli stemmi per il tabellino"
```

---

### Task 3: Pannello e dati iniziali

**Files:**
- Modify: `public/admin/config.yml` (voce `diretta`, righe ~324-350)
- Modify: `src/data/diretta.json`
- Test: `tests/tabellino-pannello.test.ts`

**Interfaces:**
- Consumes: `ALTRA`, `Squadra` (Task 1); `src/data/squadre.json` (Task 2).
- Produces: `diretta.json` con `tabellino` (forma `TabellinoPannello`), letto dai Task 4 e 5.

- [ ] **Step 1: Write the failing test** — `tests/tabellino-pannello.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import yaml from "js-yaml";
import { ALTRA, type Squadra } from "../src/lib/tabellino";
import squadre from "../src/data/squadre.json";
import diretta from "../src/data/diretta.json";

type Campo = { name: string; widget?: string; format?: string; fields?: Campo[]; options?: { label: string; value: string }[] };
const config = yaml.load(readFileSync("public/admin/config.yml", "utf8")) as { collections: { name: string; files?: { name: string; fields: Campo[] }[] }[] };
const voce = config.collections.find((c) => c.name === "impostazioni")!.files!.find((f) => f.name === "diretta")!;
const tabellino = voce.fields.find((f) => f.name === "tabellino")!;
const campo = (nome: string) => tabellino.fields!.find((f) => f.name === nome)!;
const elenco = squadre as Squadra[];

describe("pannello e sito: tabellino", () => {
  it("i campi del pannello sono quelli che legge il sito, in quest'ordine", () => {
    expect(tabellino.fields!.map((f) => f.name)).toEqual([
      "avversario", "inCasa", "nomeCortoNostro", "nomeCortoAvversario", "fuoriElenco",
      "golNostri", "golAvversari", "inizio1", "fine1", "inizio2", "fine2",
    ]);
  });
  it("il menu Avversario e' l'elenco delle squadre del girone, piu' 'altra squadra'", () => {
    const menu = campo("avversario").options!;
    expect(menu.slice(0, -1)).toEqual(elenco.filter((s) => !s.noi).map((s) => ({ label: s.nome, value: s.id })));
    expect(menu.at(-1)!.value).toBe(ALTRA);
  });
  it("gli orari si salvano col fuso, come l'ora del fischio", () => {
    for (const nome of ["inizio1", "fine1", "inizio2", "fine2"]) {
      expect(campo(nome).widget).toBe("datetime");
      expect(campo(nome).format).toBe("YYYY-MM-DDTHH:mm:ssZ");
    }
  });
  it("squadre.json: una sola squadra nostra e ogni scudetto esiste", () => {
    expect(elenco.filter((s) => s.noi)).toHaveLength(1);
    for (const s of elenco) expect(existsSync(`public${s.scudetto}`), s.scudetto).toBe(true);
  });
  it("diretta.json parte con i gol a zero (numeri) e i campi di oggi al primo livello", () => {
    expect(diretta.tabellino.golNostri).toBe(0);
    expect(diretta.tabellino.golAvversari).toBe(0);
    expect(Object.keys(diretta)).toEqual(expect.arrayContaining(["attiva", "titolo", "inizio", "urlVideo", "tabellino"]));
  });
  it("niente opzioni dei datetime che bloccano Sveltia 0.129", () => {
    const testo = readFileSync("public/admin/config.yml", "utf8");
    expect(testo).not.toMatch(/date_format|time_format|picker_utc/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tabellino-pannello.test.ts`
Expected: FAIL (`tabellino` non trovato nel config; `diretta.tabellino` undefined).

- [ ] **Step 3: Pannello** — in `public/admin/config.yml`, voce `diretta`:
  1. Nei due `hint` che dicono "4-5 minuti" (campo `attiva` e campo `inizio`) sostituire "4-5 minuti" con "1-2 minuti".
  2. Aggiungere `tabellino` come ultimo campo della voce (dopo `urlVideo`), indentato come gli altri campi. Le righe delle opzioni sono quelle stampate dallo script nel Task 2:

```yaml
          - label: "Tabellino (risultato e tempi)"
            name: "tabellino"
            widget: "object"
            collapsed: false
            hint: "La fascia col risultato sopra il video, come in Serie A. Compare quando salvi l'Inizio del 1° tempo. Il sito si aggiorna in circa 1-2 minuti; il minuto di gioco scorre da solo. PRIMA DI OGNI PARTITA: avversario, gol a 0 e i quattro orari svuotati con Clear."
            fields:
              - label: "Avversario"
                name: "avversario"
                widget: "select"
                required: false
                hint: "Nome e scudetto arrivano da soli. Se non e' in elenco (coppa, amichevole) scegli l'ultima voce e compila 'Squadra fuori elenco'."
                options:
                  - { label: "Città Di Sant'Angelo", value: "1207601" }
                  - { label: "Club Sportivo Oliveri", value: "1170703" }
                  - { label: "Ludica Lipari", value: "1043806" }
                  - { label: "Mazzarrà Calcio", value: "920357" }
                  - { label: "Melas", value: "933619" }
                  - { label: "OR.SA.", value: "740525" }
                  - { label: "Patti Calcio", value: "1282009" }
                  - { label: "Polisportiva Torrenovese 1971", value: "1170704" }
                  - { label: "Rocca 2023", value: "1207603" }
                  - { label: "San Benedetto Calcio San Fratello", value: "1207604" }
                  - { label: "San Pier Niceto", value: "1209760" }
                  - { label: "Tortorici", value: "1026407" }
                  - { label: "Altra squadra (compila 'Squadra fuori elenco')", value: "altra" }
              - label: "Giochiamo in casa"
                name: "inCasa"
                widget: "boolean"
                default: true
                hint: "Acceso: noi a sinistra, come la squadra di casa. Spento: in trasferta, noi a destra."
              - label: "Nome corto nostro (facoltativo)"
                name: "nomeCortoNostro"
                widget: "string"
                required: false
                hint: "Vuoto: il nome di Tuttocampo. Scrivilo se lo vuoi piu' breve nel tabellino."
              - label: "Nome corto avversario (facoltativo)"
                name: "nomeCortoAvversario"
                widget: "string"
                required: false
                hint: "Vuoto: il nome di Tuttocampo."
              - label: "Squadra fuori elenco (coppa, amichevoli)"
                name: "fuoriElenco"
                widget: "object"
                collapsed: true
                fields:
                  - { label: "Nome", name: "nome", widget: "string", required: false }
                  - { label: "Scudetto", name: "scudetto", widget: "image", required: false, hint: "Carica lo stemma dal telefono. Si usa solo se in Avversario hai scelto 'Altra squadra'." }
              - label: "Gol nostri"
                name: "golNostri"
                widget: "number"
                value_type: "int"
                min: 0
                max: 99
                default: 0
              - label: "Gol avversari"
                name: "golAvversari"
                widget: "number"
                value_type: "int"
                min: 0
                max: 99
                default: 0
              - label: "Inizio 1° tempo"
                name: "inizio1"
                widget: "datetime"
                format: "YYYY-MM-DDTHH:mm:ssZ"
                required: false
                hint: "Al fischio d'inizio tocca Now, poi Save. Fa comparire il tabellino."
              - label: "Fine 1° tempo"
                name: "fine1"
                widget: "datetime"
                format: "YYYY-MM-DDTHH:mm:ssZ"
                required: false
                hint: "Now, poi Save: mostra Intervallo. Il recupero (45+2') si conta da solo fino a qui."
              - label: "Inizio 2° tempo"
                name: "inizio2"
                widget: "datetime"
                format: "YYYY-MM-DDTHH:mm:ssZ"
                required: false
                hint: "Now, poi Save: il minuto riparte da 46."
              - label: "Fine 2° tempo"
                name: "fine2"
                widget: "datetime"
                format: "YYYY-MM-DDTHH:mm:ssZ"
                required: false
                hint: "Now, poi Save: mostra Finale, che resta anche sotto la replica. Se te lo dimentichi compare da solo dopo 75 minuti dall'inizio del 2° tempo."
```

- [ ] **Step 4: Dati iniziali** — `src/data/diretta.json` diventa (i quattro campi restano con i loro valori attuali, si aggiunge solo `tabellino`; se il pannello li ha cambiati nel frattempo, dopo `git pull --rebase` tenere quelli):

```json
{
  "attiva": false,
  "titolo": "Or.Sa. vs Città di Galati",
  "inizio": "2026-10-10T15:30:00+02:00",
  "urlVideo": "https://www.twitch.tv/cittadigalati?sr=a",
  "tabellino": {
    "avversario": "",
    "inCasa": true,
    "nomeCortoNostro": "",
    "nomeCortoAvversario": "",
    "fuoriElenco": { "nome": "", "scudetto": "" },
    "golNostri": 0,
    "golAvversari": 0,
    "inizio1": "",
    "fine1": "",
    "inizio2": "",
    "fine2": ""
  }
}
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS tutti (compresi `tabellino-pannello` e i test esistenti di `twitch`/`diretta`).

- [ ] **Step 6: Commit**

```bash
git add public/admin/config.yml src/data/diretta.json tests/tabellino-pannello.test.ts
git commit -m "feat: gruppo Tabellino nella schermata della diretta del pannello"
```

---

### Task 4: File statico /tabellino.json fuori dal Worker

**Files:**
- Create: `src/pages/tabellino.json.ts`
- Modify: `wrangler.jsonc` (`assets.run_worker_first`)

**Interfaces:**
- Consumes: `datiTabellino` (Task 1), `diretta.json` (Task 3), `squadre.json` (Task 2).
- Produces: `dist/tabellino.json` = `DatiTabellino` serializzato, servito a `/tabellino.json`.

- [ ] **Step 1: Endpoint** — `src/pages/tabellino.json.ts`:

```ts
// /tabellino.json: i dati del tabellino della diretta (src/lib/tabellino.ts),
// rigenerati a ogni salvataggio del pannello. Il riquadro in home lo rilegge
// ogni 20 secondi intorno alla partita (Tabellino.astro). E' un file statico,
// escluso dal Worker in wrangler.jsonc: i controlli dei tifosi non consumano
// le richieste del piano gratuito.
import diretta from "../data/diretta.json";
import squadre from "../data/squadre.json";
import { datiTabellino } from "../lib/tabellino";

export function GET() {
  return new Response(JSON.stringify(datiTabellino(diretta, squadre)), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
```

- [ ] **Step 2: Worker** — in `wrangler.jsonc` aggiungere `"!/tabellino.json"` in fondo a `run_worker_first` e aggiornare il commento sopra:

```jsonc
    // Pagine attraverso il Worker (redirect http -> https, pannello); immagini,
    // script, frame dell'hero e /tabellino.json (riletto ogni 20 s durante la
    // diretta) no, cosi' non consumano richieste del piano gratuito.
    "run_worker_first": ["/*", "!/_astro/*", "!/img/*", "!/hero-frames/*", "!/tabellino.json"]
```

- [ ] **Step 3: Build**

Run: `npm run build` poi `node -e "console.log(JSON.parse(require('fs').readFileSync('dist/tabellino.json','utf8')))"`
Expected: build ok; stampa `{ attiva: false, fischio: '2026-10-10T15:30:00+02:00', casa: { nome: 'Città Di Galati', scudetto: '/img/logo.png', gol: 0 }, ospiti: { nome: 'Avversari', scudetto: '/img/scudetti/generico.svg', gol: 0 }, tempi: { inizio1: '', ... } }`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/tabellino.json.ts wrangler.jsonc
git commit -m "feat: /tabellino.json statico per aggiornare il tabellino a pagina aperta"
```

---

### Task 5: Fascia, contenitore e schermo intero

**Files:**
- Create: `src/components/Tabellino.astro`
- Modify: `src/components/DirettaLive.astro` (frontmatter, blocco `data-live`, `<style>`)
- Modify: `src/components/EmbedConsenso.astro` (Props + attributi iframe)

**Interfaces:**
- Consumes: `datiTabellino`, `statoTabellino`, `daAggiornare`, `DatiTabellino` (Task 1); `inizioDa` (diretta.ts); `/tabellino.json` (Task 4).
- Produces: markup `[data-tv]` > `.tabellino[data-tabellino]` + `[data-video]`; classi `.steso` sul contenitore e `html.tv-stesa` durante lo schermo intero simulato.

- [ ] **Step 1: EmbedConsenso** — nuova prop, default invariato. In `interface Props` dopo `video?: boolean;`:

```ts
  // false: niente schermo intero interno al riproduttore (Twitch: lo schermo
  // intero lo fa il riquadro della diretta, che tiene visibile il tabellino).
  schermoIntero?: boolean;
```

destrutturazione: `const { src, title, servizio, altezza = "100%", nota, apri, scorre = true, video = false, schermoIntero = true } = Astro.props;`
e nell'iframe del template:

```astro
      allow={video ? (schermoIntero ? "autoplay; fullscreen; picture-in-picture; encrypted-media" : "autoplay; picture-in-picture; encrypted-media") : undefined}
      allowfullscreen={(video && schermoIntero) || undefined}
```

- [ ] **Step 2: Componente** — `src/components/Tabellino.astro`:

```astro
---
// Fascia del tabellino stile Serie A attaccata sopra il video della diretta
// (DirettaLive.astro): scudetti, nomi, punteggio, minuto di gioco e pulsante
// "Schermo intero". Sta FUORI dal riquadro del video, mai sopra: Twitch vieta
// elementi sopra il player (requisito 1.3 della documentazione embed).
//
// I dati arrivano dal pannello (gruppo "Tabellino" di src/data/diretta.json)
// gia' risolti da datiTabellino(). Il browser decide se e cosa mostrare
// (statoTabellino, il minuto scorre da solo) e intorno alla partita rilegge
// /tabellino.json ogni 20 secondi: chi ha la pagina aperta vede gol e tempi
// senza ricaricare.
//
// Schermo intero: va a tutto schermo il contenitore [data-tv] (fascia + video).
// Dove il browser non lo permette (iPhone: solo i <video> nudi) il contenitore
// si stende su tutta la pagina.
import type { DatiTabellino } from "../lib/tabellino";

interface Props {
  dati: DatiTabellino;
}
const { dati } = Astro.props;
---
<div class="tabellino" data-tabellino={JSON.stringify(dati)} hidden>
  <div class="squadra casa">
    <img data-scudetto="casa" src={dati.casa.scudetto} alt="" width="36" height="36" decoding="async" />
    <span class="nome" data-nome="casa">{dati.casa.nome}</span>
  </div>
  <p class="punteggio font-display" aria-live="polite">
    <span data-gol="casa">{dati.casa.gol}</span><span class="sep" aria-hidden="true">-</span><span data-gol="ospiti">{dati.ospiti.gol}</span>
  </p>
  <div class="squadra ospiti">
    <span class="nome" data-nome="ospiti">{dati.ospiti.nome}</span>
    <img data-scudetto="ospiti" src={dati.ospiti.scudetto} alt="" width="36" height="36" decoding="async" />
  </div>
  <p class="tempo font-display"><span class="periodo" data-periodo></span><span data-etichetta></span></p>
  <button type="button" class="pieno" data-pieno aria-pressed="false" aria-label="Schermo intero con il risultato">
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" /></svg>
  </button>
</div>

<style>
  .tabellino {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 0.5rem clamp(0.5rem, 2vw, 1rem);
    padding: 0.55rem clamp(0.6rem, 2vw, 1rem);
    background: var(--bg);
    border-top: 3px solid var(--rosso);
    color: var(--text);
    text-align: left;
  }
  .tabellino[hidden] { display: none; }
  .squadra { display: flex; align-items: center; gap: 0.5rem; min-width: 0; }
  .ospiti { justify-content: flex-end; text-align: right; }
  .squadra img {
    width: clamp(26px, 6vw, 36px);
    height: clamp(26px, 6vw, 36px);
    object-fit: contain;
    flex: none;
  }
  .nome {
    font-size: clamp(0.72rem, 2.4vw, 0.95rem);
    font-weight: 600;
    line-height: 1.15;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .punteggio {
    margin: 0;
    display: flex;
    gap: 0.35rem;
    font-size: clamp(1.4rem, 5vw, 2rem);
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .sep { color: color-mix(in oklch, var(--text) 55%, transparent); }
  .tempo {
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.2rem 0.5rem;
    background: var(--giallo);
    color: var(--bg);
    font-size: clamp(0.8rem, 2.6vw, 1rem);
    text-transform: uppercase;
    white-space: nowrap;
  }
  .periodo { font-size: 0.75em; }
  .periodo:empty { display: none; }
  .pieno {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    padding: 0;
    background: none;
    border: 1px solid color-mix(in oklch, var(--text) 35%, transparent);
    color: var(--text);
    cursor: pointer;
  }
  .pieno:hover, .pieno:focus-visible { border-color: var(--giallo); color: var(--giallo); }

  /* Telefono stretto: squadre e punteggio sopra, minuto e pulsante sotto. */
  @media (max-width: 420px) {
    .tabellino { grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); }
    .tempo { grid-column: 2; justify-self: center; }
    .pieno { grid-column: 3; justify-self: end; }
  }

  /* Schermo intero su uno schermo molto piu' largo del 16:9 (telefono in
     orizzontale): la fascia diventa una colonna nella banda laterale, fuori
     dal video. Solo scudetti, punteggio e minuto: i nomi non ci stanno. */
  @media (min-aspect-ratio: 2/1) {
    :global(.tv:fullscreen) .tabellino,
    :global(.tv.steso) .tabellino {
      grid-template-columns: 1fr;
      justify-items: center;
      align-content: center;
      width: clamp(88px, 13vw, 150px);
      padding: 0.75rem 0.5rem;
      gap: 0.6rem;
      border-top: 0;
      border-right: 3px solid var(--rosso);
    }
    :global(.tv:fullscreen) .nome,
    :global(.tv.steso) .nome { display: none; }
    :global(.tv:fullscreen) .tempo,
    :global(.tv.steso) .tempo,
    :global(.tv:fullscreen) .pieno,
    :global(.tv.steso) .pieno { grid-column: auto; justify-self: center; }
  }
</style>

<script>
  import { statoTabellino, daAggiornare, type DatiTabellino } from "../lib/tabellino";
  import { inizioDa } from "../lib/diretta";

  const el = document.querySelector<HTMLElement>("[data-tabellino]");
  if (el) {
    let dati: DatiTabellino | null = null;
    try { dati = JSON.parse(el.dataset.tabellino ?? "null"); } catch { dati = null; }

    // Cambia il testo solo se diverso: niente annunci inutili ai lettori di schermo.
    const metti = (selettore: string, testo: string) => {
      const n = el.querySelector<HTMLElement>(selettore);
      if (n && n.textContent !== testo) n.textContent = testo;
    };

    const disegna = () => {
      const stato = dati?.attiva ? statoTabellino(dati.tempi, inizioDa(dati.fischio), new Date()) : null;
      el.hidden = !stato;
      if (!dati || !stato) return;
      for (const lato of ["casa", "ospiti"] as const) {
        metti(`[data-nome="${lato}"]`, dati[lato].nome);
        metti(`[data-gol="${lato}"]`, String(dati[lato].gol));
        const img = el.querySelector<HTMLImageElement>(`[data-scudetto="${lato}"]`);
        if (img && img.getAttribute("src") !== dati[lato].scudetto) img.setAttribute("src", dati[lato].scudetto);
      }
      metti("[data-periodo]", stato.tempo);
      metti("[data-etichetta]", stato.etichetta);
    };

    disegna();
    setInterval(disegna, 5000);

    // Gol e tempi nuovi dal pannello: /tabellino.json si rigenera a ogni
    // salvataggio. "no-cache" = il browser chiede se e' cambiato (304 se no).
    const aggiorna = async () => {
      if (document.hidden || !dati || !daAggiornare(inizioDa(dati.fischio), new Date())) return;
      try {
        const r = await fetch("/tabellino.json", { cache: "no-cache" });
        if (r.ok) { dati = await r.json(); disegna(); }
      } catch {
        // rete assente: si riprova al prossimo giro
      }
    };
    setInterval(aggiorna, 20_000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) { disegna(); void aggiorna(); }
    });

    // Schermo intero del contenitore (fascia + video).
    const tv = el.closest<HTMLElement>("[data-tv]");
    const pieno = el.querySelector<HTMLButtonElement>("[data-pieno]");
    if (tv && pieno) {
      const segna = (acceso: boolean) => {
        pieno.setAttribute("aria-pressed", String(acceso));
        pieno.setAttribute("aria-label", acceso ? "Esci dallo schermo intero" : "Schermo intero con il risultato");
      };
      const stendi = (si: boolean) => {
        tv.classList.toggle("steso", si);
        document.documentElement.classList.toggle("tv-stesa", si);
        segna(si);
      };
      pieno.addEventListener("click", () => {
        if (document.fullscreenElement) { void document.exitFullscreen(); return; }
        if (tv.classList.contains("steso")) { stendi(false); return; }
        if (document.fullscreenEnabled && typeof tv.requestFullscreen === "function") {
          tv.requestFullscreen().catch(() => stendi(true));
        } else {
          stendi(true);
        }
      });
      document.addEventListener("fullscreenchange", () => segna(document.fullscreenElement === tv));
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && tv.classList.contains("steso")) stendi(false);
      });
    }
  }
</script>
```

- [ ] **Step 3: DirettaLive** — frontmatter, dopo gli import esistenti:

```ts
import Tabellino from "./Tabellino.astro";
import squadre from "../data/squadre.json";
import { datiTabellino } from "../lib/tabellino";
```

e dopo `const video = ...`:

```ts
// Tabellino (fascia sopra il video): dati del pannello gia' risolti.
const tabellino = datiTabellino(diretta, squadre);
```

Nel markup, dentro `<div class="live" data-live hidden={!senzaOra}>`, il blocco a tre rami (`{video ? ( ... ) : urlVideo ? ( ... ) : ( ... )}`) va avvolto nel contenitore, con la fascia prima; il paragrafo `data-replica-twitch` resta fuori, sotto:

```astro
      <div class="live" data-live hidden={!senzaOra}>
        <div class="tv" data-tv>
          <Tabellino dati={tabellino} />
          {video ? (
            <div data-video>
              <EmbedConsenso
                src={video.src}
                title={`Diretta: ${diretta.titolo || "partita"}`}
                servizio={video.servizio}
                altezza={video.altezza}
                nota={video.nota}
                apri={urlVideo}
                video
                schermoIntero={video.servizio !== "Twitch"}
              />
            </div>
          ) : urlVideo ? (
            <p class="senza-video">
              <a href={urlVideo} target="_blank" rel="noopener noreferrer">Guarda la diretta ↗</a>
            </p>
          ) : (
            <p class="senza-video">
              La diretta è in partenza sui canali della società.
            </p>
          )}
        </div>
        {/* (commento esistente sul canale Twitch, invariato) */}
        {video?.replicaTwitch && ( ...invariato... )}
      </div>
```

Nel `<style>` di DirettaLive, prima di `@media (prefers-reduced-motion: reduce)`:

```css
  /* Schermo intero del riquadro (pulsante nella fascia del tabellino): video
     16:9 il piu' grande possibile, fascia sopra o, su schermi molto larghi,
     di lato. .steso = schermo intero simulato dove il browser non lo permette
     (iPhone). */
  .tv:fullscreen,
  .tv.steso {
    display: flex;
    flex-direction: column;
    background: #000;
  }
  .tv.steso {
    position: fixed;
    inset: 0;
    z-index: 1000;
    height: 100dvh;
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  }
  .tv:fullscreen [data-video],
  .tv.steso [data-video] {
    flex: 1;
    min-width: 0;
    min-height: 0;
    container-type: size;
    display: grid;
    place-items: center;
  }
  .tv:fullscreen :global(.embed),
  .tv.steso :global(.embed) {
    width: min(100cqw, 100cqh * 16 / 9);
    height: auto;
    min-height: 0;
    aspect-ratio: 16 / 9;
  }
  .tv:fullscreen :global(.embed iframe),
  .tv.steso :global(.embed iframe) {
    height: 100%;
    min-height: 0;
  }
  @media (min-aspect-ratio: 2/1) {
    .tv:fullscreen,
    .tv.steso { flex-direction: row; }
  }
  :global(html.tv-stesa) { overflow: hidden; }
```

- [ ] **Step 4: Build e test**

Run: `npm run build && npm test`
Expected: build ok, test verdi. `grep -c "data-tabellino" dist/index.html` = 0 (diretta spenta: il riquadro non c'e').

- [ ] **Step 5: Commit**

```bash
git add src/components/Tabellino.astro src/components/DirettaLive.astro src/components/EmbedConsenso.astro
git commit -m "feat: fascia del tabellino sopra il video e schermo intero col risultato"
```

---

### Task 6: Prova nel browser (dati finti, non committati)

**Files:** solo `src/data/diretta.json` temporaneo, ripristinato alla fine.

- [ ] **Step 1: Dati finti** — in `src/data/diretta.json` (NON committare): `"attiva": true`, `"inizio": ""`, `"urlVideo": "https://www.twitch.tv/cittadigalati"`, `tabellino.avversario: "740525"`, `inCasa: false`, `golNostri: 2`, `golAvversari: 1`, `inizio1` = adesso meno 23 minuti in ISO con fuso (es. `node -e "console.log(new Date(Date.now()-23*60000).toISOString())"`).
- [ ] **Step 2: Dev server** — `preview_start` con `astro-dev`; aprire `/`; `read_page` sul riquadro: fascia visibile con "OR.SA." a sinistra, "Città Di Galati" a destra, `1 - 2`, `1T 24'` (o 23'); console senza errori; `fetch('/tabellino.json')` dalla pagina restituisce i dati.
- [ ] **Step 3: Fasi** — aggiungere `fine1` (adesso − 1 min) → "Intervallo"; poi `inizio2` (adesso − 10 min) → "2T 56'"; poi `fine2` → "Finale". Ricarica dopo ogni modifica (o attendere l'aggiornamento automatico).
- [ ] **Step 4: Telefono** — `resize_window` preset mobile: fascia su due righe, nomi leggibili (al massimo 2 righe), niente scorrimento orizzontale; screenshot.
- [ ] **Step 5: Schermo intero** — clic sul pulsante: con fullscreen disponibile `document.fullscreenElement` è il contenitore; altrimenti il contenitore ha la classe `steso` e copre la pagina; video 16:9 non tagliato, fascia visibile, Esc/pulsante esce. Simulare il telefono in orizzontale (`resize_window` 844x390) con classe `steso`: fascia nella banda laterale, video 16:9 accanto. Screenshot. Verificare che l'iframe Twitch (dopo "Carica Twitch") NON abbia `allowfullscreen`.
- [ ] **Step 6: Ripristino** — `git restore src/data/diretta.json`; `resize_window` preset desktop; `git status` pulito (salvo i file non tracciati dell'utente `staff-*.png`).

---

### Task 7: Porting su Longi (`C:\Users\tigno\Desktop\longi-1969`)

Stesso lavoro dei Task 1-6 nel repo Longi, con queste differenze:

- [ ] **Step 1: File identici** — copiare da Galati: `src/lib/tabellino.ts`, `tests/tabellino.test.ts`, `tests/tabellino-pannello.test.ts`, `public/img/scudetti/generico.svg`, `src/pages/tabellino.json.ts`, `src/components/Tabellino.astro`. Nel test `tests/tabellino.test.ts` sostituire l'`ELENCO` di prova con `{ id: "1043634", nome: "Longi", scudetto: "/img/stemma.png", noi: true }` e un avversario del girone Longi (es. `{ id: "1007488", nome: "Tusa", scudetto: "/img/scudetti/1007488.webp" }`), aggiornando i valori attesi dei test `datiTabellino` (nomi "Longi"/"Tusa", id "1007488").
- [ ] **Step 2: Colori** — in `Tabellino.astro` di Longi `var(--giallo)` → `var(--oro)` (tre punti: `.tempo` background, `.pieno:hover` border e color). `--rosso`, `--bg`, `--text` esistono anche su Longi.
- [ ] **Step 3: Script** — `scripts/scudetti.mjs` con `SITO = "https://asdlongi.it"` e `NOI = { id: "1043634", scudetto: "/img/stemma.png" }`; lanciarlo; atteso: 12 avversari (Academy Sant'Agata, Città Di Petralia Soprana, F.C. Castelbuono, Ficarra, Fitalese 1981, Fondachelli, Furnari, Mirto, Pro Tonnarella, Sant'Antonino, Sfarandina, Tusa — ordine come stampato).
- [ ] **Step 4: Pannello e dati** — stesso blocco YAML del Task 3 con le opzioni stampate dallo script Longi e hint con "Vuoto: il nome di Tuttocampo."; verificare prima il `name` della collezione che contiene la voce `diretta` in `public/admin/config.yml` di Longi e, se non è `impostazioni`, adeguare il test `tabellino-pannello`. Correggere gli eventuali "4-5 minuti". `diretta.json`: aggiungere lo stesso oggetto `tabellino`.
- [ ] **Step 5: Worker** — `wrangler.jsonc` di Longi: `"!/tabellino.json"` in fondo a `run_worker_first` (che ha anche `"!/audio/*"`).
- [ ] **Step 6: DirettaLive ed EmbedConsenso** — stesse modifiche del Task 5 (Step 1 e 3); il CSS di Longi differisce solo nei colori già esistenti, non toccarli.
- [ ] **Step 7: Verifica** — `npm test`, `npm run build`, prova nel browser come nel Task 6 (dati finti non committati, poi `git restore`).
- [ ] **Step 8: Commit** (uno per blocco logico, come su Galati).

---

## Dopo i task

- Revisione avversariale dell'intero lavoro (workflow) e correzioni.
- Push di entrambi i repo SOLO con l'ok dell'utente (`git pull --rebase` prima).
- Collaudo dell'utente su telefono vero con una diretta di prova: tempi di arrivo dei salvataggi, minuto, schermo intero, pulsante interno Twitch su iPhone. Se su iPhone il player Twitch va comunque a schermo intero nativo: provare il parametro `allowfullscreen=false` nell'URL del player (vedi spec, sezione 6).
