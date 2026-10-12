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
  it("il riquadro della diretta ha l'ancora #diretta", () => {
    expect(readFileSync("src/components/DirettaLive.astro", "utf8")).toMatch(/id="diretta"/);
  });
});

describe("Condividi la diretta", () => {
  const URL_DIRETTA = "https://asdcittadigalati.it/diretta";
  it("testo con il titolo della partita e il link", () => {
    expect(testoCondivisione("Galati - Or.Sa.", URL_DIRETTA)).toBe("Partita in diretta: Galati - Or.Sa. 👉 https://asdcittadigalati.it/diretta");
  });
  it("senza titolo resta un testo sensato", () => {
    expect(testoCondivisione("  ", URL_DIRETTA)).toBe("Partita in diretta 👉 https://asdcittadigalati.it/diretta");
  });
  it("link di WhatsApp col testo codificato", () => {
    expect(linkWhatsApp("a b & c 👉")).toBe("https://wa.me/?text=a%20b%20%26%20c%20%F0%9F%91%89");
  });
});
