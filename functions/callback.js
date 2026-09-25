// Cloudflare Pages: indirizzo /callback.
import { completa } from "../oauth/callback.mjs";

export const onRequestGet = ({ request, env }) => completa(request, env);
