// Classifica del girone letta dal widget di Tuttocampo e rimessa nello stile
// del sito (tabellone a palette in home). Logica pura, senza DOM: la usano
// sia il Worker (worker/index.mjs, indirizzo /api/classifica) sia i test.
//
// Il widget e' una tabella HTML: una riga <tr> per squadra, gia' in ordine di
// classifica, con celle marcate da classi (pt, pg, vt, pa, sc, gf, gs, dr).
// Se Tuttocampo cambiasse il markup la funzione restituirebbe un elenco
// vuoto e il tabellone resterebbe con i soli nomi: nessun errore a schermo.

export interface RigaClassifica {
  pos: number;
  id: string; // id squadra su Tuttocampo (916584 = Città di Galati)
  nome: string;
  pt: number;
  g: number;
  v: number;
  n: number;
  p: number;
  gf: number;
  gs: number;
  dr: number;
}

const CELLE = { pt: "pt", pg: "g", vt: "v", pa: "n", sc: "p", gf: "gf", gs: "gs", dr: "dr" } as const;

const decodifica = (s: string) =>
  s
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();

export function leggiClassifica(html: string): RigaClassifica[] {
  const tabella = html.match(/<table[^>]*table_ranking[\s\S]*?<\/table>/)?.[0];
  if (!tabella) return [];
  const corpo = tabella.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";

  const righe: RigaClassifica[] = [];
  for (const [, tr] of corpo.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const squadra = tr.match(/\/Squadra\/(\d+)[^>]*>([^<]+)<\/a>/);
    if (!squadra) continue;
    const riga: RigaClassifica = {
      pos: righe.length + 1,
      id: squadra[1],
      nome: decodifica(squadra[2]),
      pt: 0, g: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, dr: 0,
    };
    for (const [, classe, valore] of tr.matchAll(/class="(?:points )?(pt|pg|vt|pa|sc|gf|gs|dr)"\s*>\s*(-?\d+)\s*</g)) {
      riga[CELLE[classe as keyof typeof CELLE]] = Number(valore);
    }
    righe.push(riga);
  }
  return righe;
}
