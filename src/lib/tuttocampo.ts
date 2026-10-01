export const TEAM_ID = "916584";
export const TEAM_PAGE = "https://www.tuttocampo.it/Sicilia/PrimaCategoria/GironeC/Squadra/CittaDiGalati/916584/Scheda";

// Codice del girone rilasciato dal generatore di Tuttocampo (WidgetApi) per
// Sicilia / Prima Categoria / Girone C. I widget sono gratuiti per i siti
// delle societa' sportive.
//
// IMPORTANTE, e diverso da quanto si potrebbe pensare: questo codice
// identifica il GIRONE, non la singola stagione. Senza parametri il widget
// mostra sempre la STAGIONE IN CORSO, quindi a settembre 2027 si aggiornera'
// da solo senza che nessuno tocchi niente. Per bloccare una stagione passata
// esiste il parametro "?y=2025-26", che qui non usiamo di proposito: mostrare
// la classifica dell'anno scorso sotto il titolo di quest'anno confonde.
const GIRONE = "fd57dc48-3674-40a8-917b-561783852051";

// Tipi che Tuttocampo offre davvero (verificati uno per uno: un tipo
// "Calendario" NON esiste, quell'URL risponde 404).
type TipoWidget = "classifica" | "risultati" | "marcatori" | "partita" | "prossimaPartita";

const PERCORSO: Record<TipoWidget, string> = {
  classifica: "Classifica",
  risultati: "Risultati",
  marcatori: "Marcatori",
  partita: "Partita",
  prossimaPartita: "ProssimaPartita",
};

const url = (tipo: TipoWidget) => `https://www.tuttocampo.it/WidgetV2/${PERCORSO[tipo]}/${GIRONE}`;

// Se una chiave viene tolta da qui, la sezione corrispondente torna da sola al
// testo di attesa: e' la via piu' rapida per spegnere un widget che desse
// problemi, senza toccare i componenti.
export const WIDGET_URLS: Partial<Record<TipoWidget, string>> = {
  classifica: url("classifica"),
  risultati: url("risultati"),
  marcatori: url("marcatori"),
  partita: url("partita"),
  prossimaPartita: url("prossimaPartita"),
};
