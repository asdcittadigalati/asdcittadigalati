import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { leggiClassifica } from "../src/lib/classifica";

// Copia reale del widget Classifica di Tuttocampo (Seconda Categoria girone C,
// quello del sito gemello Longi, 29/09/2026, dopo la prima giornata). Il
// formato del widget e' lo stesso per tutti i gironi.
const html = readFileSync(new URL("./fixtures/classifica-tuttocampo.html", import.meta.url), "utf-8");

describe("leggiClassifica", () => {
  const squadre = leggiClassifica(html);

  it("legge tutte le squadre nell'ordine della classifica", () => {
    expect(squadre).toHaveLength(13);
    expect(squadre.map((s) => s.pos)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(squadre[0].nome).toBe("Città Di Petralia Soprana");
  });

  it("legge punti, partite, vittorie, pareggi, sconfitte e gol", () => {
    const longi = squadre.find((s) => s.nome === "Longi")!;
    expect(longi).toMatchObject({ id: "1043634", pt: 3, g: 1, v: 1, n: 0, p: 0, gf: 3, gs: 0, dr: 3 });
  });

  it("gli apostrofi nei nomi restano apostrofi", () => {
    expect(squadre.map((s) => s.nome)).toContain("Sant'Antonino");
  });

  it("una pagina senza classifica da' un elenco vuoto", () => {
    expect(leggiClassifica("<html><body>Classifica non ancora disponibile</body></html>")).toEqual([]);
  });

  it("decodifica le entita' HTML nei nomi", () => {
    const riga = `<table class="table_ranking"><tbody><tr><td class="team"><a href="https://www.tuttocampo.it/2026-27/Squadra/42?x">Sant&#039;Agata &amp; C.</a></td><td class="points pt">1</td><td class="pg">1</td><td class="vt">0</td><td class="pa">1</td><td class="sc">0</td><td class="gf">2</td><td class="gs">2</td><td class="dr">0</td></tr></tbody></table>`;
    expect(leggiClassifica(riga)[0]).toMatchObject({ id: "42", nome: "Sant'Agata & C.", pt: 1, n: 1 });
  });
});
