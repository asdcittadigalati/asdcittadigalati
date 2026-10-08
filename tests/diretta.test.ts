import { describe, it, expect } from "vitest";
import { fase, riproduttore, inizioDa, normalizzaLink, ORE_IN_ONDA, GIORNI_REPLICA } from "../src/lib/diretta";

const DOMINI = ["asdcittadigalati.it", "www.asdcittadigalati.it", "localhost"];
const PARENT = "parent=asdcittadigalati.it&parent=www.asdcittadigalati.it&parent=localhost";

describe("fase del riquadro", () => {
  const inizio = new Date("2026-10-11T13:30:00.000Z");
  const dopo = (ms: number) => new Date(inizio.getTime() + ms);
  const ORA = 3600_000;
  const GIORNO = 86_400_000;

  it("prima del fischio d'inizio: attesa", () => {
    expect(fase(inizio, dopo(-1))).toBe("attesa");
    expect(fase(inizio, dopo(-3 * GIORNO))).toBe("attesa");
  });
  it(`dal fischio d'inizio per ${ORE_IN_ONDA} ore: in onda`, () => {
    expect(fase(inizio, dopo(0))).toBe("in-onda");
    expect(fase(inizio, dopo(ORE_IN_ONDA * ORA - 1))).toBe("in-onda");
  });
  it(`poi replica fino a ${GIORNI_REPLICA} giorni dal fischio d'inizio`, () => {
    expect(fase(inizio, dopo(ORE_IN_ONDA * ORA))).toBe("replica");
    expect(fase(inizio, dopo(GIORNI_REPLICA * GIORNO - 1))).toBe("replica");
  });
  it("dopo una settimana sparisce", () => {
    expect(fase(inizio, dopo(GIORNI_REPLICA * GIORNO))).toBe("scaduta");
    expect(fase(inizio, dopo(30 * GIORNO))).toBe("scaduta");
  });
  it("data non valida: nessuna fase", () => {
    expect(fase(new Date("non una data"), new Date())).toBeNull();
  });
});

describe("riproduttore: YouTube", () => {
  const nocookie = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ";
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ&feature=share",
    "https://youtu.be/dQw4w9WgXcQ?si=abc",
    "https://www.youtube.com/live/dQw4w9WgXcQ?si=x",
    "https://youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
  ])("%s", (link) => {
    const r = riproduttore(link, DOMINI)!;
    expect(r.servizio).toBe("YouTube");
    expect(r.src).toBe(nocookie);
    expect(r.replicaTwitch).toBeUndefined();
  });
  it("link live del canale con ID", () => {
    expect(riproduttore("https://www.youtube.com/channel/UC1234567890abcdefghijkl/live", DOMINI)!.src).toBe(
      "https://www.youtube.com/embed/live_stream?channel=UC1234567890abcdefghijkl"
    );
  });
  it("link /@nome/live non incorporabile", () => {
    expect(riproduttore("https://www.youtube.com/@cittadigalati/live", DOMINI)).toBeNull();
  });
});

describe("riproduttore: Twitch", () => {
  it("canale in diretta: player del canale, con i domini e la replica ai video salvati", () => {
    const r = riproduttore("https://www.twitch.tv/CittaDiGalati", DOMINI)!;
    expect(r.servizio).toBe("Twitch");
    expect(r.src).toBe(`https://player.twitch.tv/?channel=cittadigalati&${PARENT}&autoplay=true&muted=true`);
    expect(r.replicaTwitch).toBe("https://www.twitch.tv/cittadigalati/videos?filter=archives");
  });
  it("canale dal telefono (m.twitch.tv) e con parametri", () => {
    expect(riproduttore("https://m.twitch.tv/cittadigalati?sr=a", DOMINI)!.src).toContain("?channel=cittadigalati&");
  });
  it("video salvato: player del video, niente replica a parte", () => {
    const r = riproduttore("https://www.twitch.tv/videos/2253948771", DOMINI)!;
    expect(r.src).toBe(`https://player.twitch.tv/?video=v2253948771&${PARENT}&autoplay=false`);
    expect(r.replicaTwitch).toBeUndefined();
  });
  it("clip nei due formati", () => {
    const atteso = `https://clips.twitch.tv/embed?clip=GoalBellissimo-abc123&${PARENT}&autoplay=false`;
    expect(riproduttore("https://clips.twitch.tv/GoalBellissimo-abc123", DOMINI)!.src).toBe(atteso);
    expect(riproduttore("https://www.twitch.tv/cittadigalati/clip/GoalBellissimo-abc123", DOMINI)!.src).toBe(atteso);
  });
  it("pagine di Twitch che non sono un canale", () => {
    expect(riproduttore("https://www.twitch.tv/directory", DOMINI)).toBeNull();
    expect(riproduttore("https://www.twitch.tv/", DOMINI)).toBeNull();
    expect(riproduttore("https://www.twitch.tv/videos", DOMINI)).toBeNull();
  });
});

describe("riproduttore: Facebook e altro", () => {
  it("video Facebook", () => {
    const r = riproduttore("https://www.facebook.com/c1ttad1galat1/videos/123456789/", DOMINI)!;
    expect(r.servizio).toBe("Facebook");
    expect(r.src).toContain("facebook.com/plugins/video.php?href=");
  });
  it("link non riconosciuto o non valido", () => {
    expect(riproduttore("https://www.instagram.com/p/abc/", DOMINI)).toBeNull();
    expect(riproduttore("non un link", DOMINI)).toBeNull();
  });
});

describe("ora del fischio d'inizio dal pannello", () => {
  it("con il fuso salvato da Sveltia", () => {
    expect(inizioDa("2026-10-11T15:30:00+02:00").toISOString()).toBe("2026-10-11T13:30:00.000Z");
    expect(inizioDa("2026-10-11T13:30:00.000Z").toISOString()).toBe("2026-10-11T13:30:00.000Z");
  });
  it("senza fuso: ora italiana, legale d'estate e solare d'inverno", () => {
    expect(inizioDa("2026-10-11T15:30:00").toISOString()).toBe("2026-10-11T13:30:00.000Z");
    expect(inizioDa("2026-10-11T15:30").toISOString()).toBe("2026-10-11T13:30:00.000Z");
    // il 25 ottobre 2026 alle 3 si torna all'ora solare
    expect(inizioDa("2026-10-25T15:30:00").toISOString()).toBe("2026-10-25T14:30:00.000Z");
    expect(inizioDa("2026-12-20T14:30:00").toISOString()).toBe("2026-12-20T13:30:00.000Z");
    expect(inizioDa("2027-03-28T15:00:00").toISOString()).toBe("2027-03-28T13:00:00.000Z");
  });
  it("valore vuoto o sbagliato: data non valida", () => {
    expect(Number.isNaN(inizioDa("").getTime())).toBe(true);
    expect(Number.isNaN(inizioDa("domenica").getTime())).toBe(true);
  });
});

describe("link scritto a mano", () => {
  it("senza https:// lo aggiunge", () => {
    expect(normalizzaLink(" twitch.tv/nomecanale ")).toBe("https://twitch.tv/nomecanale");
    expect(normalizzaLink("www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(normalizzaLink("https://youtu.be/x")).toBe("https://youtu.be/x");
    expect(normalizzaLink("")).toBe("");
  });
  it("il riproduttore riconosce anche il link senza https://", () => {
    expect(riproduttore("twitch.tv/nomecanale", DOMINI)!.src).toContain("player.twitch.tv/?channel=nomecanale&");
    expect(riproduttore("youtu.be/dQw4w9WgXcQ", DOMINI)!.servizio).toBe("YouTube");
  });
});
