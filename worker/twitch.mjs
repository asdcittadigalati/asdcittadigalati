// /api/twitch?canale=nome — il sito chiede a Twitch se il canale e' in
// diretta e quali sono gli ultimi video salvati, cosi' il riquadro della
// diretta in home passa da solo dalla diretta alla replica, dentro il sito.
//
// Lo fa il Worker, lato server, con le credenziali dell'applicazione Twitch
// (TWITCH_CLIENT_ID e TWITCH_CLIENT_SECRET, secret del Worker su Cloudflare):
// il segreto non arriva mai nel browser e il visitatore parla solo con questo
// sito. Senza credenziali risponde 503 e il riquadro resta com'era.
// La risposta resta nella cache di Cloudflare per un minuto (per ogni data
// center di Cloudflare). Risponde solo per il canale Twitch impostato nel
// pannello (src/data/diretta.json, interruttore acceso): non e' un ponte
// aperto verso Twitch con le credenziali della societa'.
import diretta from "../src/data/diretta.json";
import { riproduttore, normalizzaLink } from "../src/lib/diretta.ts";

const DURATA = 60;
const TEMPO_MASSIMO = 8000;

// Token dell'applicazione (client credentials): dura settimane, si tiene in
// memoria finche' il Worker resta acceso e si rinnova un minuto prima della scadenza.
let token = null;

const json = (corpo, status, cache) =>
  Response.json(corpo, { status, headers: { "cache-control": cache } });

async function tokenApp(env) {
  if (token && token.scade > Date.now() + 60_000) return token.valore;
  const r = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: env.TWITCH_CLIENT_ID,
      client_secret: env.TWITCH_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
    signal: AbortSignal.timeout(TEMPO_MASSIMO),
  });
  if (!r.ok) throw new Error(`token ${r.status}`);
  const j = await r.json();
  token = { valore: j.access_token, scade: Date.now() + Number(j.expires_in || 0) * 1000 };
  return token.valore;
}

async function helix(percorso, env, chiave) {
  const r = await fetch(`https://api.twitch.tv/helix/${percorso}`, {
    headers: { "Client-Id": env.TWITCH_CLIENT_ID, Authorization: `Bearer ${chiave}` },
    signal: AbortSignal.timeout(TEMPO_MASSIMO),
  });
  if (r.status === 401) token = null; // token revocato o scaduto: al prossimo giro se ne chiede uno nuovo
  if (!r.ok) throw new Error(`helix ${percorso.split("?")[0]} ${r.status}`);
  return (await r.json()).data ?? [];
}

// Canale Twitch della diretta impostata nel pannello, o null.
export function canaleDelPannello(dati = diretta) {
  if (!dati?.attiva) return null;
  return riproduttore(normalizzaLink(dati.urlVideo ?? ""), [])?.canaleTwitch ?? null;
}

export async function twitch(request, env, ctx, atteso = canaleDelPannello()) {
  const url = new URL(request.url);
  const canale = (url.searchParams.get("canale") ?? "").toLowerCase();
  if (!/^\w{3,25}$/.test(canale)) return json({ errore: "canale non valido" }, 400, "no-store");
  if (!atteso || canale !== atteso) {
    return json({ errore: "canale non attivo sul sito" }, 404, `public, max-age=${DURATA}`);
  }
  if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET) {
    return json({ errore: "Twitch non configurato" }, 503, "no-store");
  }

  const cache = globalThis.caches?.default;
  const chiaveCache = new Request(new URL(`/api/twitch?canale=${canale}`, url.origin));
  const inCache = await cache?.match(chiaveCache);
  if (inCache) return inCache;

  try {
    const chiave = await tokenApp(env);
    const [dirette, utenti] = await Promise.all([
      helix(`streams?user_login=${canale}`, env, chiave),
      helix(`users?login=${canale}`, env, chiave),
    ]);
    if (!utenti[0]) {
      const nessuno = json({ errore: "canale inesistente" }, 404, `public, max-age=${DURATA}`);
      if (cache) ctx.waitUntil(cache.put(chiaveCache, nessuno.clone()));
      return nessuno;
    }
    const video = await helix(`videos?user_id=${utenti[0].id}&type=archive&first=5`, env, chiave);
    const risposta = json(
      {
        live: dirette.length > 0,
        video: video.map((v) => ({ id: String(v.id), creato: v.created_at })),
      },
      200,
      `public, max-age=${DURATA}`
    );
    if (cache) ctx.waitUntil(cache.put(chiaveCache, risposta.clone()));
    return risposta;
  } catch {
    // Twitch irraggiungibile o credenziali sbagliate: il riquadro resta com'era.
    return json({ errore: "Twitch non raggiungibile" }, 502, "no-store");
  }
}
