import { describe, it, expect } from "vitest";
import { componiFormazione } from "../src/lib/formazione";

const rosa = [
  { nome: "Roberto Arangio", numero: 1, foto: "/img/uploads/roberto-arangio.webp" },
  { nome: "Ivan Pidalà" },
  { nome: "Diego Pidalà" },
  { nome: "Matias De Gregorio", numero: 9 },
  { nome: "Paolo Faranda" },
];

const quattroQuattroDue = {
  portiere: "Roberto Arangio",
  difensori: ["D1 Uno", "D2 Due", "D3 Tre", "Ivan Pidalà"],
  centrocampisti: ["C1 Cinque", "C2 Sei", "Diego Pidalà", "C4 Sette"],
  attaccanti: ["Matias De Gregorio", "A2 Otto"],
};

describe("componiFormazione", () => {
  it("ricava il modulo dai reparti compilati", () => {
    expect(componiFormazione(quattroQuattroDue, rosa)?.modulo).toBe("4-4-2");
  });

  it("i trequartisti aggiungono una linea: 4-2-3-1", () => {
    const f = componiFormazione(
      {
        portiere: "Roberto Arangio",
        difensori: ["a A", "b B", "c C", "d D"],
        centrocampisti: ["e E", "f F"],
        trequartisti: ["g G", "h H", "i I"],
        attaccanti: ["l L"],
      },
      rosa
    );
    expect(f?.modulo).toBe("4-2-3-1");
    expect(f?.linee.map((l) => l.length)).toEqual([1, 4, 2, 3, 1]);
  });

  it("la prima linea e' il portiere, poi dalla difesa all'attacco", () => {
    const f = componiFormazione(quattroQuattroDue, rosa)!;
    expect(f.linee[0].map((m) => m.nome)).toEqual(["Roberto Arangio"]);
    expect(f.linee.at(-1)!.map((m) => m.nome)).toEqual(["Matias De Gregorio", "A2 Otto"]);
  });

  it("numero e foto arrivano dalla rosa", () => {
    const portiere = componiFormazione(quattroQuattroDue, rosa)!.linee[0][0];
    expect(portiere.numero).toBe(1);
    expect(portiere.foto).toBe("/img/uploads/roberto-arangio.webp");
  });

  it("mostra il cognome, con l'iniziale del nome dopo se il cognome e' condiviso in rosa", () => {
    const f = componiFormazione(quattroQuattroDue, rosa)!;
    const etichette = f.linee.flat().map((m) => m.etichetta);
    expect(etichette).toContain("Arangio");
    expect(etichette).toContain("De Gregorio");
    expect(etichette).toContain("Pidalà I.");
    expect(etichette).toContain("Pidalà D.");
  });

  it("un nome che non e' in rosa compare lo stesso, senza numero", () => {
    const m = componiFormazione(quattroQuattroDue, rosa)!.linee[1][0];
    expect(m.etichetta).toBe("Uno");
    expect(m.numero).toBeUndefined();
  });

  it("titolo predefinito quando il campo e' vuoto", () => {
    expect(componiFormazione({ ...quattroQuattroDue, titolo: "" }, rosa)?.titolo).toBe("Formazione titolare");
    expect(componiFormazione({ ...quattroQuattroDue, titolo: "Contro la Pro Tonnarella" }, rosa)?.titolo).toBe(
      "Contro la Pro Tonnarella"
    );
  });

  it("ignora le righe lasciate vuote dal pannello", () => {
    const f = componiFormazione({ ...quattroQuattroDue, trequartisti: ["", ""] }, rosa);
    expect(f?.modulo).toBe("4-4-2");
  });

  it("in dieci la formazione resta, col modulo dai reparti", () => {
    const f = componiFormazione({ ...quattroQuattroDue, modulo: "4-4-2", attaccanti: ["Matias De Gregorio"] }, rosa);
    expect(f?.modulo).toBe("4-4-1");
    expect(f?.linee.flat()).toHaveLength(10);
  });

  it("solo un pannello del tutto vuoto non ha formazione", () => {
    expect(componiFormazione({}, rosa)).toBeNull();
    expect(componiFormazione({ portiere: "", difensori: ["", ""] }, rosa)).toBeNull();
  });

  it("senza portiere il campo mostra gli altri", () => {
    const { portiere: _, ...senza } = quattroQuattroDue;
    const f = componiFormazione(senza, rosa)!;
    expect(f.linee[0]).toEqual([]);
    expect(f.modulo).toBe("4-4-2");
  });

  it("la panchina segue l'ordine del pannello, senza righe vuote ne' titolari", () => {
    const f = componiFormazione(
      { ...quattroQuattroDue, panchina: ["Paolo Faranda", "", "Roberto Arangio", "Riserva Nuova"] },
      rosa
    );
    expect(f?.panchina.map((m) => m.nome)).toEqual(["Paolo Faranda", "Riserva Nuova"]);
    expect(f?.panchina[0].etichetta).toBe("Faranda");
  });

  it("senza panchina la formazione resta valida", () => {
    expect(componiFormazione(quattroQuattroDue, rosa)?.panchina).toEqual([]);
  });

  it("il modulo scelto nel pannello decide la disposizione, nell'ordine dei reparti", () => {
    const f = componiFormazione({ ...quattroQuattroDue, modulo: "4-3-3" }, rosa)!;
    expect(f.modulo).toBe("4-3-3");
    expect(f.linee.map((l) => l.length)).toEqual([1, 4, 3, 3]);
    // il quarto centrocampista passa in attacco
    expect(f.linee[3].map((m) => m.nome)).toEqual(["C4 Sette", "Matias De Gregorio", "A2 Otto"]);
  });

  it("modulo automatico o non valido: si ricava dai reparti", () => {
    expect(componiFormazione({ ...quattroQuattroDue, modulo: "auto" }, rosa)?.modulo).toBe("4-4-2");
    expect(componiFormazione({ ...quattroQuattroDue, modulo: "4-4-3" }, rosa)?.modulo).toBe("4-4-2");
  });

  it("lo stesso giocatore due volte compare una volta sola", () => {
    const f = componiFormazione({ ...quattroQuattroDue, attaccanti: ["Matias De Gregorio", "Matias De Gregorio"] }, rosa)!;
    expect(f.linee.flat().filter((m) => m.nome === "Matias De Gregorio")).toHaveLength(1);
    expect(f.modulo).toBe("4-4-1");
  });
});
