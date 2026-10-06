import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import { componiFormazione, MODULI } from "../src/lib/formazione";

const rosa = [
  { nome: "Roberto Arangio", numero: 1, foto: "/img/uploads/roberto-arangio.webp" },
  { nome: "Ivan Pidalà" },
  { nome: "Diego Pidalà" },
  { nome: "Matias De Gregorio", numero: 9 },
  { nome: "Paolo Faranda" },
];

const quattroQuattroDue = {
  schieramento: {
    modulo: "4-4-2",
    portiere: "Roberto Arangio",
    terzino_sx: "D1 Uno",
    centrale_sx: "D2 Due",
    centrale_dx: "D3 Tre",
    terzino_dx: "Ivan Pidalà",
    esterno_sx: "C1 Cinque",
    centrocampista_sx: "C2 Sei",
    centrocampista_dx: "Diego Pidalà",
    esterno_dx: "C4 Sette",
    attaccante_sx: "Matias De Gregorio",
    attaccante_dx: "A2 Otto",
  },
};
const con = (caselle: Record<string, string>) => ({
  schieramento: { ...quattroQuattroDue.schieramento, ...caselle },
});

describe("componiFormazione", () => {
  it("il modulo scelto dispone le caselle linea per linea", () => {
    const f = componiFormazione(quattroQuattroDue, rosa)!;
    expect(f.modulo).toBe("4-4-2");
    expect(f.linee.map((l) => l.length)).toEqual([1, 4, 4, 2]);
  });

  it("4-2-3-1: mediani, trequartisti e punta su quattro linee", () => {
    const f = componiFormazione(
      {
        schieramento: {
          modulo: "4-2-3-1",
          portiere: "Roberto Arangio",
          terzino_sx: "a A", centrale_sx: "b B", centrale_dx: "c C", terzino_dx: "d D",
          mediano_sx: "e E", mediano_dx: "f F",
          trequartista_sx: "g G", trequartista: "h H", trequartista_dx: "i I",
          punta: "l L",
        },
      },
      rosa
    )!;
    expect(f.modulo).toBe("4-2-3-1");
    expect(f.linee.map((l) => l.length)).toEqual([1, 4, 2, 3, 1]);
  });

  it("dentro la linea l'ordine e' da sinistra a destra", () => {
    const f = componiFormazione(quattroQuattroDue, rosa)!;
    expect(f.linee[0].map((m) => m.nome)).toEqual(["Roberto Arangio"]);
    expect(f.linee[1].map((m) => m.nome)).toEqual(["D1 Uno", "D2 Due", "D3 Tre", "Ivan Pidalà"]);
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

  it("in dieci la formazione resta, la casella vuota si salta", () => {
    const f = componiFormazione(con({ attaccante_dx: "" }), rosa)!;
    expect(f.modulo).toBe("4-4-1");
    expect(f.linee.flat()).toHaveLength(10);
  });

  it("una linea tutta vuota sparisce, le altre restano", () => {
    const f = componiFormazione(con({ attaccante_sx: "", attaccante_dx: " " }), rosa)!;
    expect(f.modulo).toBe("4-4");
  });

  it("solo un pannello del tutto vuoto non ha formazione", () => {
    expect(componiFormazione({}, rosa)).toBeNull();
    expect(componiFormazione({ schieramento: { modulo: "4-3-3", portiere: "", punta: "" } }, rosa)).toBeNull();
  });

  it("senza portiere il campo mostra gli altri", () => {
    const f = componiFormazione(con({ portiere: "" }), rosa)!;
    expect(f.linee[0]).toEqual([]);
    expect(f.modulo).toBe("4-4-2");
  });

  it("caselle di un altro modulo rimaste nel file non entrano in campo", () => {
    const f = componiFormazione(con({ regista: "Fuori Posto" }), rosa)!;
    expect(f.linee.flat().map((m) => m.nome)).not.toContain("Fuori Posto");
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

  it("lo stesso giocatore due volte compare una volta sola", () => {
    const f = componiFormazione(con({ attaccante_dx: "Matias De Gregorio" }), rosa)!;
    expect(f.linee.flat().filter((m) => m.nome === "Matias De Gregorio")).toHaveLength(1);
    expect(f.modulo).toBe("4-4-1");
  });
});

describe("pannello e sito hanno le stesse caselle", () => {
  type Campo = { name: string; widget?: string; fields?: Campo[]; types?: Campo[]; typeKey?: string };
  const config = yaml.load(readFileSync("public/admin/config.yml", "utf8")) as { collections: { name: string; files: { fields: Campo[] }[] }[] };
  const voce = config.collections.find((c) => c.name === "formazione")!.files[0];
  const schieramento = voce.fields.find((f) => f.name === "schieramento")!;

  it("il modulo si salva come 'modulo'", () => {
    expect(schieramento.typeKey).toBe("modulo");
  });

  it("stessi moduli, stesse caselle, stesso ordine", () => {
    const dalPannello = Object.fromEntries(schieramento.types!.map((t) => [t.name, t.fields!.map((f) => f.name)]));
    const dalSito = Object.fromEntries(Object.entries(MODULI).map(([m, linee]) => [m, ["portiere", ...linee.flat()]]));
    expect(dalPannello).toEqual(dalSito);
  });

  it("ogni modulo ha 11 caselle e il nome dice i numeri delle linee", () => {
    for (const [modulo, linee] of Object.entries(MODULI)) {
      expect(linee.flat().length + 1).toBe(11);
      expect(linee.map((l) => l.length).join("-")).toBe(modulo);
    }
  });
});
