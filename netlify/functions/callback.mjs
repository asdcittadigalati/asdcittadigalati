// Contenitore Netlify: la logica sta in oauth/callback.mjs.
import { completa } from "../../oauth/callback.mjs";

export default async (request) => completa(request, process.env);

export const config = { path: "/callback" };
