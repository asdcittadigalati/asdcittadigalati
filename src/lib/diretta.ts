// Logica del riquadro della diretta in home (DirettaLive.astro), separata
// dal componente per poterla provare con i test.
//
// Due domande:
// 1. Quale riproduttore per il link incollato nel pannello? YouTube, Twitch
//    (canale in diretta, video salvato, clip) o Facebook.
// 2. In che fase e' il riquadro adesso? Prima del fischio d'inizio il conto
//    alla rovescia; per ORE_IN_ONDA ore "In diretta ora"; poi "Rivedi la
//    partita" fino a GIORNI_REPLICA giorni dal fischio d'inizio; dopo sparisce
//    da solo, senza che nessuno debba spegnerlo dal pannello.

export const ORE_IN_ONDA = 3;
export const GIORNI_REPLICA = 7;

export type Fase = "attesa" | "in-onda" | "replica" | "scaduta";

export function fase(inizio: Date, ora: Date): Fase | null {
  const t0 = inizio.getTime();
  if (Number.isNaN(t0)) return null;
  const t = ora.getTime();
  if (t < t0) return "attesa";
  if (t < t0 + ORE_IN_ONDA * 3600_000) return "in-onda";
  if (t < t0 + GIORNI_REPLICA * 86_400_000) return "replica";
  return "scaduta";
}

// Ora del fischio d'inizio dal pannello. Sveltia la salva con il fuso
// ("2026-10-11T15:30:00+02:00"), ma un valore senza fuso ("...T15:30:00",
// salvato prima o scritto a mano) va letto come ora italiana: altrimenti ogni
// browser lo leggerebbe nel proprio fuso e un tifoso all'estero vedrebbe il
// conto alla rovescia per tutta la partita.
export function inizioDa(valore: string): Date {
  const s = (valore ?? "").trim();
  if (/(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(s)) return new Date(s);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return new Date(NaN);
  const comeUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0));
  // Scarto di Roma in quel momento (+1 d'inverno, +2 d'estate). Calcolato
  // due volte: vicino al cambio d'ora il primo tentativo puo' cadere dall'altra parte.
  let t = comeUtc - scartoRoma(comeUtc);
  t = comeUtc - scartoRoma(t);
  return new Date(t);
}

function scartoRoma(t: number): number {
  const parti = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(t));
  const v = (tipo: string) => Number(parti.find((p) => p.type === tipo)?.value);
  return Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second")) - Math.floor(t / 1000) * 1000;
}

// Link incollato o scritto a mano: senza "https://" il browser lo
// tratterebbe come una pagina del sito (404).
export function normalizzaLink(link: string): string {
  const s = (link ?? "").trim();
  if (!s) return "";
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s.replace(/^\/+/, "")}`;
}

export interface Riproduttore {
  src: string;
  servizio: "YouTube" | "Twitch" | "Facebook";
  altezza: string;
  nota: string;
  // Solo per un canale Twitch: a diretta finita il riproduttore del canale
  // mostra "offline", quindi in replica si rimanda ai video salvati.
  replicaTwitch?: string;
}

const SEDICI_NONI = "min(506px, 56.25vw)";
const nota = (chi: string, server: string) =>
  `La diretta è trasmessa da ${chi}: per vederla qui il browser deve collegarsi ai server di ${server}, che possono impostare cookie propri.`;

// Percorsi di twitch.tv che non sono nomi di canale.
const NON_CANALI = new Set(["videos", "directory", "p", "settings", "subscriptions", "inventory", "wallet", "downloads", "search", "login", "signup", "jobs", "turbo", "prime"]);

// `domini`: dove sta il sito (Twitch li vuole tutti nel parametro "parent",
// altrimenti il riproduttore resta nero).
export function riproduttore(link: string, domini: string[]): Riproduttore | null {
  link = normalizzaLink(link);
  let u: URL;
  try { u = new URL(link); } catch { return null; }
  const host = u.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");

  // YouTube: watch?v=, youtu.be/, /live/, /shorts/, /embed/ e il link "live"
  // del canale (/channel/UC.../live), in modalita' privacy avanzata.
  const yt = (src: string): Riproduttore => ({ src, servizio: "YouTube", altezza: SEDICI_NONI, nota: nota("YouTube", "Google") });
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return id ? yt(`https://www.youtube-nocookie.com/embed/${id}`) : null;
  }
  if (host === "youtube.com" || host.endsWith(".youtube.com")) {
    const v = u.searchParams.get("v");
    if (v) return yt(`https://www.youtube-nocookie.com/embed/${v}`);
    const m = u.pathname.match(/^\/(?:live|shorts|embed)\/([\w-]{6,})/);
    if (m) return yt(`https://www.youtube-nocookie.com/embed/${m[1]}`);
    const canale = u.pathname.match(/^\/channel\/(UC[\w-]+)\/live/);
    if (canale) return yt(`https://www.youtube.com/embed/live_stream?channel=${canale[1]}`);
    return null; // /@nome/live: non incorporabile senza l'ID del canale
  }

  // Twitch: canale (twitch.tv/nome), video salvato (twitch.tv/videos/ID),
  // clip (clips.twitch.tv/SLUG o twitch.tv/nome/clip/SLUG).
  const parent = domini.map((d) => `parent=${encodeURIComponent(d)}`).join("&");
  const tw = (src: string, extra: Partial<Riproduttore> = {}): Riproduttore => ({
    src, servizio: "Twitch", altezza: SEDICI_NONI, nota: nota("Twitch", "Twitch"), ...extra,
  });
  if (host === "clips.twitch.tv") {
    const slug = u.pathname.slice(1).split("/")[0];
    return slug ? tw(`https://clips.twitch.tv/embed?clip=${encodeURIComponent(slug)}&${parent}&autoplay=false`) : null;
  }
  if (host === "twitch.tv" || host === "go.twitch.tv") {
    const parti = u.pathname.split("/").filter(Boolean);
    if (parti[0] === "videos" && /^\d+$/.test(parti[1] ?? "")) {
      // La documentazione di Twitch vuole l'ID del video con il prefisso "v".
      return tw(`https://player.twitch.tv/?video=v${parti[1]}&${parent}&autoplay=false`);
    }
    if (parti[1] === "clip" && parti[2]) {
      return tw(`https://clips.twitch.tv/embed?clip=${encodeURIComponent(parti[2])}&${parent}&autoplay=false`);
    }
    if (parti.length >= 1 && /^\w{3,25}$/.test(parti[0]) && !NON_CANALI.has(parti[0].toLowerCase())) {
      const canale = parti[0].toLowerCase();
      return tw(`https://player.twitch.tv/?channel=${canale}&${parent}&autoplay=true&muted=true`, {
        replicaTwitch: `https://www.twitch.tv/${canale}/videos?filter=archives`,
      });
    }
    return null;
  }

  if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.watch") {
    return {
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(link)}&show_text=false&width=800`,
      servizio: "Facebook",
      altezza: "460px",
      nota: nota("Facebook", "Facebook"),
    };
  }
  return null;
}
