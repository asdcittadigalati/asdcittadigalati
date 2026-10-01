// Cloudflare Workers: il sito sono i file statici di dist/ (serviti da
// Cloudflare, con _headers e _redirects). Il Worker passa prima di tutto per
// le pagine (redirect da http a https) e per /auth e /callback (accesso al
// pannello); immagini e script vanno dritti (vedi run_worker_first in
// wrangler.jsonc). La logica OAuth e' in oauth/.
import { avvia } from "../oauth/auth.mjs";
import { completa } from "../oauth/callback.mjs";

export default {
  fetch(request, env) {
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
    return env.ASSETS.fetch(request);
  },
};
