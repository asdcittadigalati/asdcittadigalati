import { describe, it, expect, vi } from "vitest";
import { riconosci, eCorto, risolvi, preparaPost } from "../src/lib/social";

const IG = "https://www.instagram.com/p/DAbc12_-xY/embed/captioned/";

describe("riconosci: Instagram", () => {
  it("post con parametro dell'app", () => {
    expect(riconosci("https://www.instagram.com/p/DAbc12_-xY/?igsh=MTZ4").src).toBe(IG);
  });
  it("reel diventa lo stesso riquadro /p/", () => {
    expect(riconosci("https://www.instagram.com/reel/DAbc12_-xY/").src).toBe(IG);
  });
  it("link col nome utente davanti", () => {
    expect(riconosci("https://instagram.com/longi1969/p/DAbc12_-xY/").src).toBe(IG);
  });
  it("profilo senza post: niente riquadro", () => {
    const p = riconosci("https://www.instagram.com/longi1969/");
    expect(p).toEqual({ piattaforma: "instagram", link: "https://www.instagram.com/longi1969/", src: null });
  });
});

describe("riconosci: TikTok", () => {
  it("video completo", () => {
    expect(riconosci("https://www.tiktok.com/@tifoso/video/7412345678901234567?lang=it").src)
      .toBe("https://www.tiktok.com/embed/v2/7412345678901234567");
  });
  it("link corto: piattaforma nota, riquadro no", () => {
    expect(riconosci("https://vm.tiktok.com/ZMabc123/")).toMatchObject({ piattaforma: "tiktok", src: null });
  });
});

describe("riconosci: Facebook", () => {
  const post = "https://www.facebook.com/longi1969/posts/pfbid02abc";
  it("post", () => {
    expect(riconosci(post).src).toBe(
      `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(post)}&show_text=true&width=350`
    );
  });
  it("permalink.php e' un post", () => {
    expect(riconosci("https://m.facebook.com/permalink.php?story_fbid=1&id=2").src)
      .toContain("/plugins/post.php?href=");
  });
  it.each([
    "https://www.facebook.com/longi1969/videos/123456/",
    "https://www.facebook.com/reel/123456",
    "https://www.facebook.com/watch/?v=123456",
  ])("video: %s", (link) => {
    expect(riconosci(link).src).toContain("/plugins/video.php?href=");
  });
  it("post nei gruppi: non incorporabile", () => {
    expect(riconosci("https://www.facebook.com/groups/99/posts/1/").src).toBeNull();
  });
  it("link di condivisione: si risolve prima, qui niente riquadro", () => {
    expect(riconosci("https://www.facebook.com/share/p/1AbCdE/")).toMatchObject({ piattaforma: "facebook", src: null });
  });
});

describe("riconosci: Twitch (clip)", () => {
  const DOMINI = ["asdcittadigalati.it", "www.asdcittadigalati.it", "localhost"];
  const SRC =
    "https://clips.twitch.tv/embed?clip=GoldenGrossBee-Ab12&parent=asdcittadigalati.it&parent=www.asdcittadigalati.it&parent=localhost&autoplay=false";
  it("clips.twitch.tv/NOME, con i domini del sito nel parametro parent", () => {
    expect(riconosci("https://clips.twitch.tv/GoldenGrossBee-Ab12?tt_medium=mobile", DOMINI)).toEqual({
      piattaforma: "twitch",
      link: "https://clips.twitch.tv/GoldenGrossBee-Ab12?tt_medium=mobile",
      src: SRC,
    });
  });
  it("twitch.tv/canale/clip/NOME, anche da telefono", () => {
    expect(riconosci("https://www.twitch.tv/cittadigalati/clip/GoldenGrossBee-Ab12", DOMINI).src).toBe(SRC);
    expect(riconosci("https://m.twitch.tv/cittadigalati/clip/GoldenGrossBee-Ab12?filter=clips", DOMINI).src).toBe(SRC);
  });
  it("l'indirizzo gia' pronto per incorporare funziona lo stesso", () => {
    expect(riconosci("https://clips.twitch.tv/embed?clip=GoldenGrossBee-Ab12&parent=altro.it", DOMINI).src).toBe(SRC);
  });
  it("un canale o un video intero non e' una clip: scheda-link", () => {
    expect(riconosci("https://www.twitch.tv/cittadigalati", DOMINI)).toMatchObject({ piattaforma: "twitch", src: null });
    expect(riconosci("https://www.twitch.tv/videos/2277656159", DOMINI)).toMatchObject({ piattaforma: "twitch", src: null });
    expect(riconosci("https://clips.twitch.tv/", DOMINI)).toMatchObject({ piattaforma: "twitch", src: null });
  });
});

describe("riconosci: il resto", () => {
  it("testo che non e' un indirizzo", () => {
    expect(riconosci("ciao")).toEqual({ piattaforma: "altro", link: "ciao", src: null });
  });
  it("piattaforma non gestita", () => {
    expect(riconosci("https://youtu.be/abc").piattaforma).toBe("altro");
  });
});

describe("eCorto", () => {
  it.each([
    ["https://vm.tiktok.com/ZMabc/", true],
    ["https://vt.tiktok.com/ZSabc/", true],
    ["https://fb.watch/abc/", true],
    ["https://www.facebook.com/share/p/1AbC/", true],
    ["https://www.facebook.com/share/r/1AbC/", true],
    ["https://www.facebook.com/longi1969/posts/1", false],
    ["https://www.instagram.com/p/X/", false],
    ["non un link", false],
  ])("%s -> %s", (link, atteso) => {
    expect(eCorto(link)).toBe(atteso);
  });
});

const redirect = (location: string | null) =>
  new Response(null, { status: location ? 301 : 200, headers: location ? { location } : {} });

describe("risolvi", () => {
  it("segue i redirect finche' il link non e' piu' corto", async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(redirect("https://www.tiktok.com/@a/video/7412345678901234567?x=1"));
    expect(await risolvi("https://vm.tiktok.com/ZMabc/", f as unknown as typeof fetch))
      .toBe("https://www.tiktok.com/@a/video/7412345678901234567?x=1");
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("location relativa", async () => {
    const f = vi.fn().mockResolvedValueOnce(redirect("/longi1969/posts/pfbid1"));
    expect(await risolvi("https://www.facebook.com/share/p/1Ab/", f as unknown as typeof fetch))
      .toBe("https://www.facebook.com/longi1969/posts/pfbid1");
  });
  it("link non corto: nessuna richiesta", async () => {
    const f = vi.fn();
    expect(await risolvi("https://www.instagram.com/p/X/", f as unknown as typeof fetch)).toBe("https://www.instagram.com/p/X/");
    expect(f).not.toHaveBeenCalled();
  });
  it("rete giu': resta il link originale", async () => {
    const f = vi.fn().mockRejectedValue(new Error("rete"));
    expect(await risolvi("https://vm.tiktok.com/ZMabc/", f as unknown as typeof fetch)).toBe("https://vm.tiktok.com/ZMabc/");
  });
  it("rimandato al login: resta il link originale", async () => {
    const f = vi.fn().mockResolvedValueOnce(redirect("https://www.facebook.com/login/?next=x"));
    expect(await risolvi("https://www.facebook.com/share/p/1Ab/", f as unknown as typeof fetch))
      .toBe("https://www.facebook.com/share/p/1Ab/");
  });
  it("si ferma dopo 4 salti", async () => {
    const f = vi.fn().mockResolvedValue(redirect("https://vm.tiktok.com/ZMancora/"));
    await risolvi("https://vm.tiktok.com/ZMabc/", f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledTimes(4);
  });
});

describe("preparaPost", () => {
  it("una clip Twitch non ha bisogno di risolvere nulla e porta i domini del sito", async () => {
    const f = vi.fn();
    const p = await preparaPost("https://clips.twitch.tv/ClipProva-Zz9", f as unknown as typeof fetch, ["sito.it", "localhost"]);
    expect(p).toEqual({
      piattaforma: "twitch",
      link: "https://clips.twitch.tv/ClipProva-Zz9",
      src: "https://clips.twitch.tv/embed?clip=ClipProva-Zz9&parent=sito.it&parent=localhost&autoplay=false",
    });
    expect(f).not.toHaveBeenCalled();
  });
  it("risolve e riconosce, tenendo il link incollato", async () => {
    const f = vi.fn().mockResolvedValueOnce(redirect("https://www.tiktok.com/@a/video/7400000000000000001"));
    expect(await preparaPost("https://vm.tiktok.com/ZMprep/", f as unknown as typeof fetch)).toEqual({
      piattaforma: "tiktok",
      link: "https://vm.tiktok.com/ZMprep/",
      src: "https://www.tiktok.com/embed/v2/7400000000000000001",
    });
  });
});
