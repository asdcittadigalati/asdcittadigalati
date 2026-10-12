// Tabellino stile Serie A nel riquadro della diretta (DirettaLive.astro):
// scudetti, nomi, punteggio e minuto di gioco. Logica pura, testata in
// tests/tabellino.test.ts.
//
// Il dirigente lo aggiorna dal pannello, nella schermata della diretta: gol e
// quattro orari (inizio e fine di ogni tempo, col pulsante "Now"). Il minuto
// non si scrive mai: il browser lo conta dall'orario salvato, quindi resta
// giusto anche se il sito si aggiorna un paio di minuti dopo il salvataggio.
// Il recupero esce da solo (45+2') finche' non si salva la fine del tempo.
import { inizioDa } from "./diretta";

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
  // vicino al fischio, senza ora solo se delle ultime 48 ore (meno dei giorni
  // fra due partite, anche con un turno infrasettimanale). Cosi' non finiscono
  // sulla nuova; il prezzo e' che senza ora la scritta Finale sparisce dalla
  // replica dopo due giorni.
  if (valida(fischio)) {
    const f = fischio.getTime();
    if (i1 < f - 3 * ORA || i1 > f + 12 * ORA) return null;
  } else if (i1 < adesso - 48 * ORA) return null;

  // Conta l'ultimo orario compilato nell'ordine: un tocco dimenticato in mezzo
  // non blocca; un orario prima di quello che lo precede e' un errore e si ignora.
  // Una fine nello stesso minuto del suo inizio pure (Now toccato sul campo
  // sbagliato); l'inizio del 2° tempo invece puo' cadere nel minuto della fine del 1°.
  let fase: FaseTabellino = "1T";
  let ultimo = i1;
  let i2: number | null = null;
  for (const [chiave, dopo] of [["fine1", "intervallo"], ["inizio2", "2T"], ["fine2", "finale"]] as const) {
    const t = istante(tempi[chiave]);
    if (t === null || t < ultimo || (chiave !== "inizio2" && t === ultimo)) continue;
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
