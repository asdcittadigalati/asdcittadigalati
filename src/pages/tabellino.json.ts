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
