import type { Broadcast } from "@/lib/types";

// Dónde ver cada categoría en Argentina (temporada 2026). Sólo datos con fuente; lo que no está
// verificado queda vacío y se muestra como "sin datos".
export const broadcastsBySeries: Record<string, { items: Broadcast[]; source?: string }> = {
  f1: {
    items: [
      { name: "Fox Sports", kind: "tv" },
      { name: "Disney+ Premium", kind: "streaming" },
      { name: "F1 TV Pro", kind: "streaming", url: "https://f1tv.formula1.com" },
    ],
    source: "https://www.eldestapeweb.com/motor/donde-ver-vivo-f1-argentina-2026-franco-colapinto-esta-forma-2026820153434",
  },
  f2: {
    items: [{ name: "F1 TV Pro", kind: "streaming", url: "https://f1tv.formula1.com" }],
    source: "https://f1tv.formula1.com",
  },
  tc: {
    items: [{ name: "Canal 9", kind: "tv" }],
    source: "https://www.solotc.com.ar/turismo-carretera-canal-9-tc-2026-actc/",
  },
  "tc-pista": {
    items: [{ name: "Canal 9", kind: "tv" }],
    source: "https://tavilatam.com/argentina-turismo-carretera-tc-pista-y-las-principales-categorias-automovilisticas-argentinas-pasan-de-la-tv-publica-a-canal-9/",
  },
  tn: {
    items: [
      { name: "Canal 9", kind: "tv" },
      // La transmisión sólo se ve por TV y por Motorplay: no hay un enlace público para mirarla (el de apat.org.ar no existe).
      { name: "Motorplay", kind: "streaming" },
      // Cronometraje oficial en vivo (siempre en la misma dirección).
      { name: "Tiempos en vivo (Speedhive)", kind: "timing", url: "https://speedhive.mylaps.com/livetiming/SODRNDLQ-2147484939/active" },
    ],
    source: "https://tavilatam.com/argentina-turismo-carretera-tc-pista-y-las-principales-categorias-automovilisticas-argentinas-pasan-de-la-tv-publica-a-canal-9/",
  },
  tc2000: {
    // TC2000 no es de la ACTC: no va por Motorplay.
    items: [
      { name: "TyC Sports", kind: "tv" },
      { name: "Carburando", kind: "streaming" },
    ],
  },
  "tc-pick-up": {
    items: [
      { name: "Canal 9", kind: "tv" },
      { name: "Motorplay", kind: "streaming" },
    ],
    source: "https://www.solotc.com.ar/horarios-tv-cronograma-fecha-6-tc-pick-up-la-plata-2026/",
  },
  "tc-pista-pick-up": {
    items: [
      { name: "Canal 9", kind: "tv" },
      { name: "Motorplay", kind: "streaming" },
    ],
    source: "https://www.solotc.com.ar/horarios-tv-cronograma-fecha-6-tc-pick-up-la-plata-2026/",
  },
  gt3: {
    items: [{ name: "GT World (YouTube, gratis)", kind: "youtube", url: "https://www.youtube.com/@GTWorld" }],
    source: "https://www.dailysportscar.com/2026/05/31/live-stream-gt-world-challenge-europe-monza.html",
  },
  "ligier-jfc": {
    // Las carreras se transmiten en YouTube y quedan incrustadas en la nota de cada fin de semana de la web de la serie.
    items: [{ name: "YouTube (desde la web de la serie)", kind: "youtube", url: "https://ligierjuniorformulachampionship.com/news/" }],
    source: "https://ligierjuniorformulachampionship.com/news/stream-race-2-from-vir/",
  },
  imsa: {
    items: [
      { name: "IMSA.tv", kind: "streaming", url: "https://www.imsa.com/watch/" },
      { name: "IMSA (YouTube, internacional)", kind: "youtube", url: "https://www.youtube.com/@IMSA" },
    ],
    source: "https://www.ellitoral.com/deportes/nicolasvarrone-petitlemans-imsa-corvette-roadatlanta-prattmillermotorsports_0_0RZxAFM9M9.html",
  },
  "zonal-bsas": { items: [] },
};
