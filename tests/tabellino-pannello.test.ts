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
