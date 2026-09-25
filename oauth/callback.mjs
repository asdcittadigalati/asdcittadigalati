// Secondo passo dell'accesso: GitHub rimanda qui con un codice usa e getta,
// che viene scambiato con il vero permesso di scrittura. Il segreto
// dell'applicazione resta sul server e non passa mai dal browser.
//
// Logica condivisa: la usano sia netlify/functions/callback.mjs sia
// functions/callback.js (Cloudflare Pages), che passano le variabili d'ambiente.

const pagina = (messaggio, origine) => `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><title>Accesso</title>
<style>
  body { font-family: system-ui, sans-serif; background:#12203f; color:#f5f5f8;
         display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
  p { max-width: 32rem; text-align:center; line-height:1.6; padding:0 1.5rem; }
</style></head>
<body>
  <p id="messaggio">Accesso in corso...</p>
  <script>
    (function () {
      var messaggio = ${JSON.stringify(messaggio)};
      var origine = ${JSON.stringify(origine)};
      // Il pannello ascolta questo messaggio nella finestra che ha aperto
      // questa. L'origine e' indicata esplicitamente: cosi' il permesso non
      // puo' finire a una pagina diversa dal nostro sito.
      if (window.opener) {
        window.opener.postMessage(messaggio, origine);
        setTimeout(function () { window.close(); }, 400);
      } else {
        document.getElementById("messaggio").textContent =
          "Questa pagina va aperta dal pannello di gestione, non da sola.";
      }
    })();
  </script>
</body></html>`;

const errore = (testo) =>
  new Response(
    `<!doctype html><html lang="it"><head><meta charset="utf-8"></head><body style="font-family:system-ui;padding:2rem">
     <h1>Accesso non riuscito</h1><p>${testo}</p></body></html>`,
    { status: 400, headers: { "content-type": "text/html; charset=utf-8" } }
  );

export async function completa(request, env, fetchFn = fetch) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return errore("Il sito non ha le credenziali dell'applicazione GitHub configurate.");
  }
  if (!code) {
    return errore("GitHub non ha restituito nessun codice. Riprova dall'inizio.");
  }

  // Confronto con il valore lasciato all'andata: se non combacia, la richiesta
  // non e' partita da qui.
  const cookie = request.headers.get("cookie") ?? "";
  const atteso = cookie.match(/(?:^|;\s*)cms_state=([^;]+)/)?.[1];
  if (!atteso || atteso !== state) {
    return errore("Controllo di sicurezza non superato. Chiudi la finestra e riprova.");
  }

  let token;
  try {
    const risposta = await fetchFn("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${url.origin}/callback`,
      }),
    });
    const dati = await risposta.json();
    if (dati.error || !dati.access_token) {
      return errore(`GitHub ha rifiutato la richiesta (${dati.error ?? "risposta senza permesso"}).`);
    }
    token = dati.access_token;
  } catch {
    return errore("Non è stato possibile contattare GitHub. Riprova fra poco.");
  }

  // Formato atteso dal pannello: prefisso, provider, esito e dati in JSON.
  const messaggio = `authorization:github:success:${JSON.stringify({
    token,
    provider: "github",
  })}`;

  return new Response(pagina(messaggio, url.origin), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Il cookie ha esaurito il suo scopo.
      "set-cookie": "cms_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
    },
  });
}
