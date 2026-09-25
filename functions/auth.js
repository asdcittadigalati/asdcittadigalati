// Cloudflare Pages: la cartella functions/ diventa l'indirizzo /auth.
// Le variabili d'ambiente arrivano in context.env, non in process.env.
import { avvia } from "../oauth/auth.mjs";

export const onRequestGet = ({ request, env }) => avvia(request, env);
