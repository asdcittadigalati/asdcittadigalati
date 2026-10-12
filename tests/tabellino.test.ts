import { describe, it, expect } from "vitest";
import { statoTabellino, datiTabellino, daAggiornare, ALTRA, SCUDETTO_GENERICO, type Squadra } from "../src/lib/tabellino";

const FISCHIO = new Date("2026-10-18T13:30:00.000Z"); // 15:30 a Roma
const MIN = 60_000;
const t = (min: number) => new Date(FISCHIO.getTime() + min * MIN).toISOString();
const a = (min: number) => new Date(FISCHIO.getTime() + min * MIN);

describe("statoTabellino: fasi e minuto", () => {
  it("senza inizio del 1° tempo niente fascia", () => {
    expect(statoTabellino({}, FISCHIO, a(10))).toBeNull();
    expect(statoTabellino({ inizio1: "" }, FISCHIO, a(10))).toBeNull();
  });
  it("1° tempo: il minuto parte da 1 e scorre", () => {
    expect(statoTabellino({ inizio1: t(2) }, FISCHIO, a(2))).toEqual({ fase: "1T", tempo: "1T", etichetta: "1'" });
    expect(statoTabellino({ inizio1: t(2) }, FISCHIO, a(2 + 22.5))?.etichetta).toBe("23'");
  });
  it("oltre il 45° il recupero si conta da solo", () => {
    expect(statoTabellino({ inizio1: t(0) }, FISCHIO, a(44.9))?.etichetta).toBe("45'");
    expect(statoTabellino({ inizio1: t(0) }, FISCHIO, a(45))?.etichetta).toBe("45+1'");
    expect(statoTabellino({ inizio1: t(0) }, FISCHIO, a(47.5))?.etichetta).toBe("45+3'");
  });
  it("fine 1° tempo: intervallo", () => {
    expect(statoTabellino({ inizio1: t(0), fine1: t(48) }, FISCHIO, a(55))).toEqual({ fase: "intervallo", tempo: "", etichetta: "Intervallo" });
  });
  it("2° tempo: riparte da 46 e il recupero da 90", () => {
    const tempi = { inizio1: t(0), fine1: t(48), inizio2: t(63) };
    expect(statoTabellino(tempi, FISCHIO, a(63))).toEqual({ fase: "2T", tempo: "2T", etichetta: "46'" });
    expect(statoTabellino(tempi, FISCHIO, a(63 + 44.5))?.etichetta).toBe("90'");
    expect(statoTabellino(tempi, FISCHIO, a(63 + 46))?.etichetta).toBe("90+2'");
  });
  it("fine 2° tempo: finale", () => {
    expect(statoTabellino({ inizio1: t(0), fine1: t(48), inizio2: t(63), fine2: t(112) }, FISCHIO, a(120))).toEqual({ fase: "finale", tempo: "", etichetta: "Finale" });
  });
  it("un tocco dimenticato in mezzo non blocca", () => {
    expect(statoTabellino({ inizio1: t(0), inizio2: t(63) }, FISCHIO, a(70))?.etichetta).toBe("53'");
    expect(statoTabellino({ inizio1: t(0), fine2: t(112) }, FISCHIO, a(115))?.fase).toBe("finale");
  });
  it("un orario precedente al tempo prima viene ignorato", () => {
    expect(statoTabellino({ inizio1: t(10), fine1: t(5) }, FISCHIO, a(20))?.fase).toBe("1T");
  });
  it("fine dimenticata: FINALE da solo", () => {
    expect(statoTabellino({ inizio1: t(0), fine1: t(48), inizio2: t(63) }, FISCHIO, a(63 + 76))?.fase).toBe("finale");
    expect(statoTabellino({ inizio1: t(0) }, FISCHIO, a(181))?.fase).toBe("finale");
    expect(statoTabellino({ inizio1: t(0), fine1: t(48) }, FISCHIO, a(181))?.fase).toBe("finale");
  });
  it("orologio del telefono avanti: mai minuto 0 o negativo", () => {
    expect(statoTabellino({ inizio1: t(5) }, FISCHIO, a(4))?.etichetta).toBe("1'");
  });
  it("orari con il fuso salvati dal pannello", () => {
    // "Now" salva l'ora di Roma col fuso, secondi a :00
    expect(statoTabellino({ inizio1: "2026-10-18T15:31:00+02:00" }, FISCHIO, new Date("2026-10-18T13:41:30Z"))?.etichetta).toBe("11'");
  });
});

describe("statoTabellino: orari della partita precedente", () => {
  it("con l'ora del fischio contano solo da 3 ore prima a 12 ore dopo", () => {
    const settimanaPrima = new Date(FISCHIO.getTime() - 7 * 86_400_000).toISOString();
    expect(statoTabellino({ inizio1: settimanaPrima, fine2: settimanaPrima }, FISCHIO, a(-60))).toBeNull();
    expect(statoTabellino({ inizio1: t(-170) }, FISCHIO, a(-160))?.fase).toBe("1T");
    expect(statoTabellino({ inizio1: t(-181) }, FISCHIO, a(-170))).toBeNull();
    expect(statoTabellino({ inizio1: t(12 * 60 + 1) }, FISCHIO, a(12 * 60 + 2))).toBeNull();
  });
  it("senza ora del fischio contano solo gli ultimi 7 giorni", () => {
    const ora = new Date("2026-10-18T14:00:00Z");
    expect(statoTabellino({ inizio1: "2026-10-18T13:30:00Z" }, null, ora)?.fase).toBe("1T");
    expect(statoTabellino({ inizio1: "2026-10-10T13:30:00Z", fine2: "2026-10-10T15:20:00Z" }, null, ora)).toBeNull();
    expect(statoTabellino({ inizio1: "2026-10-18T13:30:00Z" }, new Date("non valida"), ora)?.fase).toBe("1T");
  });
});

const ELENCO: Squadra[] = [
  { id: "916584", nome: "Città Di Galati", scudetto: "/img/logo.png", noi: true },
  { id: "740525", nome: "OR.SA.", scudetto: "/img/scudetti/740525.webp" },
];

describe("datiTabellino: squadre, nomi e gol", () => {
  it("in casa noi a sinistra, col nome di Tuttocampo", () => {
    const d = datiTabellino({ attiva: true, inizio: "2026-10-18T15:30:00+02:00", tabellino: { avversario: "740525", inCasa: true, golNostri: 2, golAvversari: 1 } }, ELENCO);
    expect(d.casa).toEqual({ nome: "Città Di Galati", scudetto: "/img/logo.png", gol: 2 });
    expect(d.ospiti).toEqual({ nome: "OR.SA.", scudetto: "/img/scudetti/740525.webp", gol: 1 });
    expect(d.attiva).toBe(true);
    expect(d.fischio).toBe("2026-10-18T15:30:00+02:00");
  });
  it("in trasferta l'avversario a sinistra", () => {
    const d = datiTabellino({ tabellino: { avversario: "740525", inCasa: false, golNostri: 0, golAvversari: 3 } }, ELENCO);
    expect(d.casa).toEqual({ nome: "OR.SA.", scudetto: "/img/scudetti/740525.webp", gol: 3 });
    expect(d.ospiti.nome).toBe("Città Di Galati");
  });
  it("il nome corto, se scritto, vince sul nome di Tuttocampo", () => {
    const d = datiTabellino({ tabellino: { avversario: "740525", nomeCortoNostro: " Galati ", nomeCortoAvversario: "Orsa" } }, ELENCO);
    expect(d.casa.nome).toBe("Galati");
    expect(d.ospiti.nome).toBe("Orsa");
  });
  it("squadra fuori elenco: nome e scudetto caricati nel pannello", () => {
    const d = datiTabellino({ tabellino: { avversario: ALTRA, fuoriElenco: { nome: "Nebrodi FC", scudetto: "/img/uploads/nebrodi.webp" } } }, ELENCO);
    expect(d.ospiti).toEqual({ nome: "Nebrodi FC", scudetto: "/img/uploads/nebrodi.webp", gol: 0 });
  });
  it("squadra del girone scelta: il gruppo fuori elenco non conta", () => {
    const d = datiTabellino({ tabellino: { avversario: "740525", fuoriElenco: { nome: "Nebrodi FC", scudetto: "/x.webp" } } }, ELENCO);
    expect(d.ospiti.nome).toBe("OR.SA.");
  });
  it("avversario mancante o sconosciuto: 'Avversari' e scudetto generico", () => {
    for (const avversario of [undefined, "", "999", ALTRA]) {
      const d = datiTabellino({ tabellino: { avversario } }, ELENCO);
      expect(d.ospiti).toEqual({ nome: "Avversari", scudetto: SCUDETTO_GENERICO, gol: 0 });
    }
  });
  it("gol vuoti, negativi o strani valgono 0", () => {
    const d = datiTabellino({ tabellino: { golNostri: null as unknown as number, golAvversari: -2 } }, ELENCO);
    expect([d.casa.gol, d.ospiti.gol]).toEqual([0, 0]);
  });
  it("vecchio diretta.json senza tabellino: nessun orario", () => {
    const d = datiTabellino({ attiva: true, inizio: "" }, ELENCO);
    expect(d.tempi).toEqual({ inizio1: "", fine1: "", inizio2: "", fine2: "" });
    expect(statoTabellino(d.tempi, null, new Date())).toBeNull();
  });
});

describe("daAggiornare: quando rileggere /tabellino.json", () => {
  it("senza ora del fischio sempre", () => {
    expect(daAggiornare(null, new Date())).toBe(true);
    expect(daAggiornare(new Date("non valida"), new Date())).toBe(true);
  });
  it("con l'ora: da 3 ore prima a 12 ore dopo il fischio", () => {
    expect(daAggiornare(FISCHIO, a(-181))).toBe(false);
    expect(daAggiornare(FISCHIO, a(-180))).toBe(true);
    expect(daAggiornare(FISCHIO, a(12 * 60))).toBe(true);
    expect(daAggiornare(FISCHIO, a(12 * 60 + 1))).toBe(false);
  });
});
