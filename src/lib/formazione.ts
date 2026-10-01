// Formazione titolare della home, compilata dal pannello per reparti
// (src/data/formazione.json). Il modulo non si sceglie: si ricava da quanti
// giocatori ci sono in ogni reparto, cosi' non puo' mai contraddire i nomi.
// La formazione non sparisce mai (regola del club): con 10 uomini, senza
// portiere o con un nome ripetuto il campo mostra quello che c'e'. Solo un
// pannello del tutto vuoto restituisce null, e la home salta la sezione.

export interface DatiFormazione {
  titolo?: string;
  modulo?: string; // "4-3-3", "4-2-3-1"...; "auto" o vuoto = dai reparti
  portiere?: string;
  difensori?: string[];
  centrocampisti?: string[];
  trequartisti?: string[];
  attaccanti?: string[];
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
  const portiere = dati.portiere?.trim();

  // Un nome ripetuto conta una volta sola, al primo posto in cui compare.
  const visti = new Set(portiere ? [portiere] : []);
  const reparti = [dati.difensori, dati.centrocampisti, dati.trequartisti, dati.attaccanti]
    .map((r) => pulisci(r).filter((n) => !visti.has(n) && visti.add(n)))
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

  // Modulo scelto nel pannello: decide lui quante maglie per linea, prendendo
  // i giocatori nell'ordine dei reparti (difesa, centrocampo, trequarti,
  // attacco). Cosi' passare da 4-4-2 a 4-3-3 non obbliga a spostare nomi.
  // Se i giocatori non bastano (o avanzano) per quel modulo, valgono i reparti.
  const scelto = /^\d(-\d)+$/.test(dati.modulo ?? "") ? dati.modulo!.split("-").map(Number) : null;
  const fila = reparti.flat();
  let linee = reparti;
  if (scelto && scelto.reduce((a, b) => a + b, 0) === fila.length) {
    let k = 0;
    linee = scelto.map((n) => fila.slice(k, (k += n)));
  }

  return {
    titolo: dati.titolo?.trim() || "Formazione titolare",
    modulo: linee.map((r) => r.length).join("-"),
    linee: [portiere ? [maglia(portiere)] : [], ...linee.map((r) => r.map(maglia))],
    panchina: panchina.map(maglia),
  };
}
