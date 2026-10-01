// Primo passo dell'accesso al pannello: manda l'utente su GitHub a dare il
// consenso.
//
// Perche' esiste: il pannello non puo' parlare direttamente con GitHub, perche'
// lo scambio finale richiede un segreto che non puo' stare dentro una pagina
// web (chiunque lo leggerebbe). Serve quindi un pezzo lato server. Invece di
// installare un servizio esterno lo ospitiamo qui: stesso dominio, nessun
// account in piu', niente da rinnovare.
//
// Logica condivisa: la usano sia netlify/functions/auth.mjs sia
// functions/auth.js (Cloudflare Pages), che passano le variabili d'ambiente.

export function avvia(request, env) {
  const url = new URL(request.url);
  const clientId = env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return new Response(
      "Accesso non configurato: manca GITHUB_CLIENT_ID fra le variabili d'ambiente del sito.",
      { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }

  // Valore casuale legato alla sessione: al ritorno da GitHub verifichiamo che
  // sia lo stesso. Senza, un altro sito potrebbe far completare l'accesso a
  // un utente ignaro (CSRF).
  const state = crypto.randomUUID();

  const destinazione = new URL("https://github.com/login/oauth/authorize");
  destinazione.searchParams.set("client_id", clientId);
  destinazione.searchParams.set("redirect_uri", `${url.origin}/callback`);
  // Il repository e' pubblico, quindi basta "public_repo": il permesso vale
  // solo per i repository pubblici. Con "repo" il pannello riceverebbe la
  // chiave di TUTTI i repository privati di chi entra, che non serve a nulla.
  destinazione.searchParams.set("scope", "public_repo,user");
  destinazione.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      location: destinazione.toString(),
      "set-cookie": `cms_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    },
  });
}
