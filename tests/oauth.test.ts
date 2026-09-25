import { describe, it, expect, vi } from "vitest";
import { avvia } from "../oauth/auth.mjs";
import { completa } from "../oauth/callback.mjs";

describe("avvia", () => {
  it("senza client id: errore leggibile", async () => {
    const r = avvia(new Request("https://sito.it/auth"), {});
    expect(r.status).toBe(500);
    expect(await r.text()).toContain("GITHUB_CLIENT_ID");
  });
  it("manda su GitHub con callback sullo stesso dominio e state nel cookie", () => {
    const r = avvia(new Request("https://sito.it/auth"), { GITHUB_CLIENT_ID: "abc" });
    expect(r.status).toBe(302);
    const dove = new URL(r.headers.get("location")!);
    expect(dove.origin + dove.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(dove.searchParams.get("client_id")).toBe("abc");
    expect(dove.searchParams.get("redirect_uri")).toBe("https://sito.it/callback");
    expect(dove.searchParams.get("scope")).toBe("public_repo,user");
    const state = dove.searchParams.get("state")!;
    expect(r.headers.get("set-cookie")).toContain(`cms_state=${state}`);
  });
});

const richiesta = (qs: string, cookie?: string) =>
  new Request(`https://sito.it/callback?${qs}`, { headers: cookie ? { cookie } : {} });
const env = { GITHUB_CLIENT_ID: "abc", GITHUB_CLIENT_SECRET: "segreto" };

describe("completa", () => {
  it("senza credenziali", async () => {
    expect((await completa(richiesta("code=1&state=s", "cms_state=s"), {})).status).toBe(400);
  });
  it("senza codice", async () => {
    expect((await completa(richiesta("state=s", "cms_state=s"), env)).status).toBe(400);
  });
  it("state diverso dal cookie: rifiutato senza chiamare GitHub", async () => {
    const f = vi.fn();
    const r = await completa(richiesta("code=1&state=s", "cms_state=altro"), env, f as unknown as typeof fetch);
    expect(r.status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });
  it("tutto ok: pagina che passa il permesso al pannello del sito", async () => {
    const f = vi.fn().mockResolvedValue(Response.json({ access_token: "tok123" }));
    const r = await completa(richiesta("code=1&state=s", "cms_state=s"), env, f as unknown as typeof fetch);
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html).toContain("authorization:github:success:");
    expect(html).toContain("tok123");
    expect(html).toContain('"https://sito.it"');
    expect(r.headers.get("set-cookie")).toContain("Max-Age=0");
  });
  it("GitHub rifiuta", async () => {
    const f = vi.fn().mockResolvedValue(Response.json({ error: "bad_verification_code" }));
    const r = await completa(richiesta("code=1&state=s", "cms_state=s"), env, f as unknown as typeof fetch);
    expect(r.status).toBe(400);
    expect(await r.text()).toContain("bad_verification_code");
  });
});
