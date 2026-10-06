import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Decap CMS scrive "" (o null) quando un volontario svuota un campo
// opzionale dal pannello, non omette la chiave. Zod rifiuta "" per number e
// url, e questo manda in errore l'intera build di produzione senza un modo
// per la societa' di capire cosa e' successo. Questo helper normalizza ""
// e null a undefined prima della validazione, cosi' un campo opzionale
// svuotato torna semplicemente assente.
const empty = <T extends z.ZodTypeAny>(s: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), s);

const giocatori = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/giocatori" }),
  schema: z.object({
    nome: z.string(),
    ruolo: z.enum(["Portiere", "Difensore", "Centrocampista", "Attaccante"]),
    numero: empty(z.number().int().optional()),
    foto: empty(z.string().optional()),
  }),
});
const staff = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/staff" }),
  schema: z.object({
    nome: z.string(),
    incarico: z.string(),
    // Società -> pagina Club (presidente, dirigenti), Staff tecnico -> pagina Squadra.
    sezione: empty(z.enum(["Società", "Staff tecnico"]).default("Staff tecnico")),
    foto: empty(z.string().optional()),
    ordine: empty(z.number().int().default(99)),
  }),
});
const sponsor = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/sponsor" }),
  schema: z.object({
    nome: z.string(),
    livello: empty(z.enum(["main", "tecnico", "partner"]).default("partner")),
    logo: z.string(),
    // Il pannello non controlla piu' il formato (vedi config.yml): "www.sito.it"
    // diventa "https://www.sito.it" invece di far fallire la build.
    url: empty(z.string().optional()).transform((u) => u && (/^https?:\/\//i.test(u) ? u : `https://${u}`)),
  }),
});
// Post dei social incollati come link dal pannello (vedi src/lib/social.ts).
const social = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/social" }),
  schema: z.object({
    link: z.string().url(),
    date: z.coerce.date(),
  }),
});
export const collections = { giocatori, staff, sponsor, social };
