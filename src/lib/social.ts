// Dal link di un post social al riquadro ufficiale da incorporare.
//
// Perche' esiste: chi gestisce il sito incolla nel pannello il link di un
// post fatto da chiunque (club, giocatori, tifosi). Il sito deve capire da
// solo di che piattaforma si tratta e quale indirizzo di incorporamento
// usare, senza chiavi o account sviluppatore. Un link che non si riesce a
// trasformare non rompe nulla: diventa una semplice scheda "Apri il post".

export type Piattaforma = "instagram" | "facebook" | "tiktok";
export type Post = { piattaforma: Piattaforma | "altro"; link: string; src: string | null };

// Altezze fisse dei riquadri: gli iframe non si adattano da soli al
// contenuto. Tarate sui riquadri reali a larghezza colonna (~370px).
export const ALTEZZA: Record<Piattaforma, number> = { instagram: 720, facebook: 620, tiktok: 760 };

export const NOME: Record<Piattaforma | "altro", string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  altro: "social",
};

const dominio = (u: URL) => u.hostname.replace(/^(www|m|mobile|web)\./, "");

// 350 e' la larghezza minima del plugin post: con 500 il riquadro usciva a
// destra da una colonna di ~365px (verificato il 25/09/2026).
const plugin = (tipo: "post" | "video", link: string) =>
  `https://www.facebook.com/plugins/${tipo}.php?href=${encodeURIComponent(link)}&show_text=true&width=350`;

export function riconosci(link: string): Post {
  let u: URL;
  try {
    u = new URL(link.trim());
  } catch {
    return { piattaforma: "altro", link, src: null };
  }
  const h = dominio(u);

  if (h === "instagram.com") {
    // /p/, /reel/, /tv/ usano lo stesso codice: il riquadro /p/ li mostra tutti.
    const m = u.pathname.match(/\/(?:p|reels?|tv)\/([A-Za-z0-9_-]+)/);
    return { piattaforma: "instagram", link, src: m ? `https://www.instagram.com/p/${m[1]}/embed/captioned/` : null };
  }

  if (h === "tiktok.com") {
    const m = u.pathname.match(/\/video\/(\d+)/);
    return { piattaforma: "tiktok", link, src: m ? `https://www.tiktok.com/embed/v2/${m[1]}` : null };
  }
  if (h === "vm.tiktok.com" || h === "vt.tiktok.com") return { piattaforma: "tiktok", link, src: null };

  if (h === "fb.watch") return { piattaforma: "facebook", link, src: null };
  if (h === "facebook.com") {
    const p = u.pathname;
    // Gruppi: Facebook non permette di incorporarli. Share: vanno risolti prima.
    if (p.startsWith("/groups/") || p.startsWith("/share/")) return { piattaforma: "facebook", link, src: null };
    const video = /\/videos\/|\/reel\/|^\/watch/.test(p);
    return { piattaforma: "facebook", link, src: plugin(video ? "video" : "post", link) };
  }

  return { piattaforma: "altro", link, src: null };
}

export function eCorto(link: string): boolean {
  try {
    const u = new URL(link);
    const h = dominio(u);
    return (
      h === "vm.tiktok.com" ||
      h === "vt.tiktok.com" ||
      h === "fb.watch" ||
      (h === "facebook.com" && u.pathname.startsWith("/share/"))
    );
  } catch {
    return false;
  }
}

// I link corti (quelli che le app danno con "Condividi") non contengono
// l'identificativo del post: si segue il redirect al momento del build.
// Se la piattaforma blocca il server o manda al login, resta il link
// originale e il post diventa una scheda-link.
export async function risolvi(link: string, fetchFn: typeof fetch = fetch): Promise<string> {
  let attuale = link;
  for (let salto = 0; salto < 4 && eCorto(attuale); salto++) {
    try {
      const r = await fetchFn(attuale, {
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
        headers: { "user-agent": "Mozilla/5.0 (compatible; sito-squadra/1.0)" },
      });
      const dove = r.headers.get("location");
      if (!dove) return attuale;
      const prossimo = new URL(dove, attuale).toString();
      if (/\/login/.test(new URL(prossimo).pathname)) return link;
      attuale = prossimo;
    } catch {
      return link;
    }
  }
  return attuale;
}

// Home e /social mostrano gli stessi post: la cache evita di risolvere due
// volte lo stesso link nello stesso build.
const cache = new Map<string, Promise<Post>>();

export function preparaPost(link: string, fetchFn: typeof fetch = fetch): Promise<Post> {
  let p = cache.get(link);
  if (!p) {
    p = risolvi(link, fetchFn).then((finale) => ({ ...riconosci(finale), link }));
    cache.set(link, p);
  }
  return p;
}
