// Formazione titolare della home (src/data/formazione.json). Nel pannello si
// sceglie il modulo e compaiono le caselle dei ruoli ("Terzino sinistro",
// "Punta"...): qui ogni casella ha il suo posto in campo.
// La formazione non sparisce mai (regola del club): con 10 uomini, senza
// portiere o con un nome ripetuto il campo mostra quello che c'e'. Solo un
// pannello del tutto vuoto restituisce null, e la home salta la sezione.

// Caselle di ogni modulo, linea per linea dalla difesa all'attacco e da
// sinistra a destra (come la squadra attacca, verso l'alto). Il portiere e'
// a parte. Devono coincidere con i "types" della voce Formazione in
// public/admin/config.yml: lo controlla tests/formazione.test.ts.
export const MODULI: Record<string, string[][]> = {
  "4-4-2": [
    ["terzino_sx", "centrale_sx", "centrale_dx", "terzino_dx"],
    ["esterno_sx", "centrocampista_sx", "centrocampista_dx", "esterno_dx"],
    ["attaccante_sx", "attaccante_dx"],
  ],
  "4-3-3": [
    ["terzino_sx", "centrale_sx", "centrale_dx", "terzino_dx"],
    ["mezzala_sx", "regista", "mezzala_dx"],
    ["ala_sx", "punta", "ala_dx"],
  ],
  "4-2-3-1": [
    ["terzino_sx", "centrale_sx", "centrale_dx", "terzino_dx"],
    ["mediano_sx", "mediano_dx"],
    ["trequartista_sx", "trequartista", "trequartista_dx"],
    ["punta"],
  ],
  "4-3-1-2": [
    ["terzino_sx", "centrale_sx", "centrale_dx", "terzino_dx"],
    ["mezzala_sx", "regista", "mezzala_dx"],
    ["trequartista"],
    ["attaccante_sx", "attaccante_dx"],
  ],
  "4-5-1": [
    ["terzino_sx", "centrale_sx", "centrale_dx", "terzino_dx"],
    ["esterno_sx", "mezzala_sx", "regista", "mezzala_dx", "esterno_dx"],
    ["punta"],
  ],
  "3-5-2": [
    ["centrale_sx", "centrale", "centrale_dx"],
    ["esterno_sx", "mezzala_sx", "regista", "mezzala_dx", "esterno_dx"],
    ["attaccante_sx", "attaccante_dx"],
  ],
  "3-4-3": [
    ["centrale_sx", "centrale", "centrale_dx"],
    ["esterno_sx", "centrocampista_sx", "centrocampista_dx", "esterno_dx"],
    ["ala_sx", "punta", "ala_dx"],
  ],
  "5-3-2": [
    ["terzino_sx", "centrale_sx", "centrale", "centrale_dx", "terzino_dx"],
    ["mezzala_sx", "regista", "mezzala_dx"],
    ["attaccante_sx", "attaccante_dx"],
  ],
  "5-4-1": [
    ["terzino_sx", "centrale_sx", "centrale", "centrale_dx", "terzino_dx"],
    ["esterno_sx", "centrocampista_sx", "centrocampista_dx", "esterno_dx"],
    ["punta"],
  ],
};

export interface DatiFormazione {
  titolo?: string;
  // { modulo: "4-3-3", portiere: "...", terzino_sx: "...", ... }
  schieramento?: { modulo?: string; [casella: string]: string | undefined };
  panchina?: string[];
}

export interface GiocatoreRosa {
  nome: string;
  ruolo?: string;
  numero?: number;
  foto?: string;
}

export interface Maglia {
  nome: string;
  etichetta: string; // quello che si legge sotto la maglia
  ruolo?: string;
  numero?: number;
  foto?: string;
}

export interface Formazione {
  titolo: string;
  modulo: string; // es. "4-4-2", portiere escluso
  linee: Maglia[][]; // linee[0] e' il portiere, poi dalla difesa all'attacco
  panchina: Maglia[]; // riserve, nell'ordine del pannello
}

const pulisci = (nomi?: string[]) => (nomi ?? []).map((n) => n.trim()).filter(Boolean);

// "Emanuele Lo Presti" -> "Lo Presti": il nome e' la prima parola.
const cognome = (nome: string) => nome.split(/\s+/).slice(1).join(" ") || nome;

export function componiFormazione(dati: DatiFormazione, rosa: GiocatoreRosa[]): Formazione | null {
  const s = dati.schieramento ?? {};
  const portiere = s.portiere?.trim();

  // Un nome ripetuto conta una volta sola, al primo posto in cui compare.
  // Le caselle vuote si saltano: la linea mostra chi c'e'.
  const visti = new Set(portiere ? [portiere] : []);
  const reparti = (MODULI[s.modulo ?? ""] ?? [])
    .map((linea) => pulisci(linea.map((casella) => s[casella] ?? "")).filter((n) => !visti.has(n) && visti.add(n)))
    .filter((r) => r.length > 0);
  const nomi = [...visti];
  if (nomi.length === 0) return null;

  // Due giocatori con lo stesso cognome: il solo cognome non basta a distinguerli,
  // si aggiunge l'iniziale del nome come nelle app di fantacalcio ("Rossi M.").
  const conteggio = new Map<string, number>();
  const panchina = [...new Set(pulisci(dati.panchina))].filter((n) => !nomi.includes(n));
  for (const nome of new Set([...rosa.map((g) => g.nome), ...nomi, ...panchina])) {
    const c = cognome(nome);
    conteggio.set(c, (conteggio.get(c) ?? 0) + 1);
  }

  const maglia = (nome: string): Maglia => {
    const g = rosa.find((x) => x.nome === nome);
    const c = cognome(nome);
    const etichetta = (conteggio.get(c) ?? 0) > 1 && c !== nome ? `${c} ${nome[0]}.` : c;
    return { nome, etichetta, ruolo: g?.ruolo, numero: g?.numero, foto: g?.foto };
  };

  // Il modulo mostrato e' quello del campo: in 10 un 4-4-2 diventa 4-4-1.
  return {
    titolo: dati.titolo?.trim() || "Formazione titolare",
    modulo: reparti.map((r) => r.length).join("-"),
    linee: [portiere ? [maglia(portiere)] : [], ...reparti.map((r) => r.map(maglia))],
    panchina: panchina.map(maglia),
  };
}
