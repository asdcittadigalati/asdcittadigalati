// Elenco delle squadre del girone con gli stemmi, per il tabellino della
// diretta (src/lib/tabellino.ts). Si lancia a mano una volta per stagione,
// quando cambia il girone:
//
//   node scripts/scudetti.mjs
//
// Legge la classifica dal sito pubblicato (/api/classifica, che la prende da
// Tuttocampo), scarica gli stemmi da Tuttocampo e li salva rimpiccioliti in
// public/img/scudetti/: cosi' i visitatori non si collegano a Tuttocampo.
// Scrive src/data/squadre.json e stampa le righe del menu "Avversario" da
// incollare in public/admin/config.yml (il test tabellino-pannello controlla
// che coincidano).
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const SITO = "https://asdcittadigalati.it";
const NOI = { id: "916584", scudetto: "/img/logo.png" };
const CARTELLA = "public/img/scudetti";

const r = await fetch(`${SITO}/api/classifica`);
if (!r.ok) throw new Error(`classifica non disponibile: ${r.status}`);
const { squadre } = await r.json();
await mkdir(CARTELLA, { recursive: true });

const altre = [];
let nostra = null;
for (const s of squadre) {
  if (s.id === NOI.id) {
    nostra = { id: s.id, nome: s.nome, scudetto: NOI.scudetto, noi: true };
    continue;
  }
  const png = await fetch(`https://b2-content.tuttocampo.it/Teams/Original/${s.id}.png`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!png.ok) {
    console.warn(`stemma mancante per ${s.nome} (${png.status}): scudetto generico`);
    altre.push({ id: s.id, nome: s.nome, scudetto: "/img/scudetti/generico.svg" });
    continue;
  }
  await sharp(Buffer.from(await png.arrayBuffer()))
    .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90 })
    .toFile(`${CARTELLA}/${s.id}.webp`);
  altre.push({ id: s.id, nome: s.nome, scudetto: `/img/scudetti/${s.id}.webp` });
}
if (!nostra) throw new Error(`la nostra squadra (${NOI.id}) non e' nella classifica`);

altre.sort((x, y) => x.nome.localeCompare(y.nome, "it"));
await writeFile("src/data/squadre.json", JSON.stringify([nostra, ...altre], null, 2) + "\n");

console.log("Menu Avversario per public/admin/config.yml:");
for (const s of altre) console.log(`                  - { label: ${JSON.stringify(s.nome)}, value: "${s.id}" }`);
