import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import worker from "../worker/index.mjs";
import { testoCondivisione, linkWhatsApp } from "../src/lib/diretta";

const env = { ASSETS: { fetch: async () => new Response("pagina") } };
const ctx = { waitUntil: () => {} };
const chiedi = (url: string) => worker.fetch(new Request(url), env, ctx);

describe("link corto /diretta", () => {
  it("porta al riquadro della diretta in home", async () => {
    const r = await chiedi("https://asdcittadigalati.it/diretta");
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toBe("https://asdcittadigalati.it/#diretta");
  });
  it("anche con la barra finale", async () => {
    const r = await chiedi("https://asdcittadigalati.it/diretta/");
    expect(r.headers.get("location")).toBe("https://asdcittadigalati.it/#diretta");
  });
  it("anche scritto con la maiuscola e per le richieste HEAD", async () => {
    expect((await chiedi("https://asdcittadigalati.it/Diretta")).headers.get("location")).toBe("https://asdcittadigalati.it/#diretta");
    const head = await worker.fetch(new Request("https://asdcittadigalati.it/diretta", { method: "HEAD" }), env, ctx);
    expect(head.status).toBe(302);
  });
  it("il riquadro della diretta ha l'ancora #diretta", () => {
    expect(readFileSync("src/components/DirettaLive.astro", "utf8")).toMatch(/id="diretta"/);
  });
});

describe("Condividi la diretta", () => {
  const URL_DIRETTA = "https://asdcittadigalati.it/diretta";
  it("in onda: partita in diretta, col titolo", () => {
    expect(testoCondivisione("Galati - Or.Sa.", "in-onda")).toBe("Partita in diretta: Galati - Or.Sa.");
    expect(testoCondivisione("Galati - Or.Sa.", "libera")).toBe("Partita in diretta: Galati - Or.Sa.");
  });
  it("prima del fischio e in replica il testo dice la verita'", () => {
    expect(testoCondivisione("Galati - Or.Sa.", "attesa")).toBe("Prossima diretta: Galati - Or.Sa.");
    expect(testoCondivisione("Galati - Or.Sa.", "replica")).toBe("Rivedi la partita: Galati - Or.Sa.");
  });
  it("senza titolo resta un testo sensato", () => {
    expect(testoCondivisione("  ", "in-onda")).toBe("Partita in diretta");
  });
  it("link di WhatsApp col testo e il link, codificati", () => {
    expect(linkWhatsApp("a b & c", URL_DIRETTA)).toBe(`https://wa.me/?text=${encodeURIComponent("a b & c 👉 https://asdcittadigalati.it/diretta")}`);
  });
});
