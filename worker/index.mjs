// Cloudflare Workers: il sito sono i file statici di dist/ (serviti da
// Cloudflare, con _headers e _redirects). Il Worker passa prima di tutto per
// le pagine (redirect da http a https), per /auth e /callback (accesso al
// pannello) e per /api/classifica; immagini e script vanno dritti (vedi
// run_worker_first in wrangler.jsonc). La logica OAuth e' in oauth/.
import { avvia } from "../oauth/auth.mjs";
import { completa } from "../oauth/callback.mjs";
import { leggiClassifica } from "../src/lib/classifica.ts";
import { WIDGET_URLS } from "../src/lib/tuttocampo.ts";

// La classifica si chiede a Tuttocampo al massimo ogni 10 minuti: la risposta
// resta nella cache di Cloudflare e nel browser. Il visitatore parla solo con
// questo sito, mai con Tuttocampo: niente consenso da chiedere.
const DURATA = 600;

async function classifica(request, ctx) {
  const cache = caches.default;
  const chiave = new Request(new URL("/api/classifica", request.url));
  const inCache = await cache.match(chiave);
  if (inCache) return inCache;

  let squadre = [];
  try {
    const r = await fetch(WIDGET_URLS.classifica, { signal: AbortSignal.timeout(8000) });
    if (r.ok) squadre = leggiClassifica(await r.text());
  } catch {
    // Tuttocampo irraggiungibile: sotto si risponde 502, il tabellone resta com'e'.
  }
  if (squadre.length === 0) {
    return Response.json({ errore: "classifica non disponibile" }, { status: 502, headers: { "cache-control": "no-store" } });
  }

  const risposta = Response.json(
    { aggiornata: new Date().toISOString(), squadre },
    { headers: { "cache-control": `public, max-age=${DURATA}` } }
  );
  ctx.waitUntil(cache.put(chiave, risposta.clone()));
  return risposta;
}

export default {
  fetch(request, env, ctx) {
    const url = new URL(request.url);
    // www.asdcittadigalati.it e' un doppione: si passa all'indirizzo senza www.
    if (url.hostname === "www.asdcittadigalati.it") {
      url.hostname = "asdcittadigalati.it";
      url.protocol = "https:";
      return Response.redirect(url.href, 301);
    }
    // Chi arriva in http:// passa a https:// (in locale no: li' c'e' solo http).
    if (url.protocol === "http:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      url.protocol = "https:";
      return Response.redirect(url.href, 301);
    }
    const { pathname } = url;
    if (request.method === "GET" && pathname === "/auth") return avvia(request, env);
    if (request.method === "GET" && pathname === "/callback") return completa(request, env);
    if (request.method === "GET" && pathname === "/api/classifica") return classifica(request, ctx);
    return env.ASSETS.fetch(request);
  },
};
