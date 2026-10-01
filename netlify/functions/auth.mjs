// Contenitore Netlify dell'accesso al pannello: la logica sta in oauth/auth.mjs,
// condivisa con Cloudflare Pages (functions/auth.js).
import { avvia } from "../../oauth/auth.mjs";

export default async (request) => avvia(request, process.env);

export const config = { path: "/auth" };
