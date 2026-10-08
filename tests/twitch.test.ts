import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { twitch, canaleDelPannello } from "../worker/twitch.mjs";

const env = { TWITCH_CLIENT_ID: "id-app", TWITCH_CLIENT_SECRET: "segreto" };
const ctx = { waitUntil: () => {} };
const chiedi = (canale: string, atteso: string | null = "tigno9696") =>
  twitch(new Request(`https://sito.it/api/twitch?canale=${canale}`), env, ctx, atteso);

// Twitch finto: token, streams, users, videos.
function twitchFinto({ live = false, utente = true, video = [] as object[], token = 200 } = {}) {
  const chiamate: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    chiamate.push(url);
    if (url.startsWith("https://id.twitch.tv/oauth2/token")) {
      expect(String(init?.body)).toContain("grant_type=client_credentials");
      return token === 200
        ? Response.json({ access_token: "tok", expires_in: 3600 })
        : new Response("no", { status: token });
    }
    expect((init?.headers as Record<string, string>)["Client-Id"]).toBe("id-app");
    if (url.includes("/helix/streams")) return Response.json({ data: live ? [{ id: "1", type: "live" }] : [] });
    if (url.includes("/helix/users")) return Response.json({ data: utente ? [{ id: "42", login: "tigno9696" }] : [] });
    if (url.includes("/helix/videos")) {
      expect(url).toContain("user_id=42");
      expect(url).toContain("type=archive");
      return Response.json({ data: video });
    }
    return new Response("?", { status: 404 });
  }));
  return chiamate;
}

describe("/api/twitch", () => {
  beforeEach(() => vi.stubGlobal("caches", undefined));
  afterEach(() => vi.unstubAllGlobals());

  it("senza credenziali: 503 e nessuna chiamata a Twitch", async () => {
    const chiamate = twitchFinto();
    const r = await twitch(new Request("https://sito.it/api/twitch?canale=tigno9696"), {}, ctx, "tigno9696");
    expect(r.status).toBe(503);
    expect(chiamate).toHaveLength(0);
  });
  it("canale non valido: 400", async () => {
    twitchFinto();
    expect((await chiedi("a")).status).toBe(400);
    expect((await chiedi("nome%20con%20spazi")).status).toBe(400);
  });
  it("in diretta: live true", async () => {
    twitchFinto({ live: true });
    const r = await chiedi("Tigno9696");
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("public, max-age=60");
    expect(await r.json()).toEqual({ live: true, video: [] });
  });
  it("finita: live false e i video salvati", async () => {
    twitchFinto({ video: [{ id: 2277656159, created_at: "2026-10-11T13:20:00Z", title: "x" }] });
    expect(await (await chiedi("tigno9696")).json()).toEqual({
      live: false,
      video: [{ id: "2277656159", creato: "2026-10-11T13:20:00Z" }],
    });
  });
  it("canale inesistente: 404", async () => {
    twitchFinto({ utente: false });
    expect((await chiedi("nessuno123", "nessuno123")).status).toBe(404);
  });
  it("Twitch rifiuta le credenziali: 502, il riquadro resta com'era", async () => {
    vi.resetModules();
    const { twitch: nuovo } = await import("../worker/twitch.mjs");
    twitchFinto({ token: 400 });
    const r = await nuovo(new Request("https://sito.it/api/twitch?canale=tigno9696"), env, ctx, "tigno9696");
    expect(r.status).toBe(502);
    expect(r.headers.get("cache-control")).toBe("no-store");
  });
});

describe("/api/twitch risponde solo per il canale del pannello", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("un altro canale: 404 senza chiamare Twitch", async () => {
    vi.stubGlobal("caches", undefined);
    const chiamate = twitchFinto({ live: true });
    expect((await chiedi("altrocanale", "tigno9696")).status).toBe(404);
    expect(chiamate).toHaveLength(0);
  });
  it("interruttore spento o nessun canale Twitch nel pannello: 404", async () => {
    vi.stubGlobal("caches", undefined);
    const chiamate = twitchFinto({ live: true });
    expect((await chiedi("tigno9696", null)).status).toBe(404);
    expect(chiamate).toHaveLength(0);
  });
  it("canale del pannello letto dal file della diretta", () => {
    expect(canaleDelPannello({ attiva: true, urlVideo: "https://www.twitch.tv/Tigno9696" })).toBe("tigno9696");
    expect(canaleDelPannello({ attiva: false, urlVideo: "https://www.twitch.tv/tigno9696" })).toBeNull();
    expect(canaleDelPannello({ attiva: true, urlVideo: "https://youtu.be/dQw4w9WgXcQ" })).toBeNull();
    expect(canaleDelPannello({ attiva: true, urlVideo: "https://www.twitch.tv/videos/123" })).toBeNull();
  });
});
