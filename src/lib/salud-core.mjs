// Lógica pura de "qué versión sirve el sitio y qué tan al día está" (sin Next ni Neon), para que `npm test` la cubra.
// La usan el <meta> del layout, los avisos visibles, /api/salud y el vigilante.
const MIN = 60_000;

/** Categorías con fuente automática (ver SOURCES en src/lib/sources/season.mjs). TC2000 y GT3 se cargan a mano y no cuentan. */
export const AUTOMATIC_SERIES = new Set(["f1", "f2", "tc", "tc-pista", "tc-mouras", "tc-pista-mouras", "tc-pick-up", "tc-pista-pick-up", "tn", "cordoba-pista", "tcr-sa", "rally-argentino"]);

// Cómo empieza el texto de una falla (`failures[]`) de cada fuente de resultados, por categoría. Los videos y cronogramas no son resultados.
const ACTC = /^(ACTC|Tiempos ACTC|Campeonato ACTC)\b/;
const FAILURE_OF = { f1: /^(F1|OpenF1|F1 oficial)\b/, f2: /^(F2|FIA F2)\b/, tn: /^(TN APAT|Speedhive TN)/, "rally-argentino": /^Rally Argentino/,"cordoba-pista": /^Córdoba Pista/ };
for (const id of ["tc", "tc-pista", "tc-mouras", "tc-pista-mouras", "tc-pick-up", "tc-pista-pick-up"]) FAILURE_OF[id] = ACTC;

/** Contenido de `<meta name="fierros-datos">`: `v=<id>;origen=<origen>;generado=<ISO>;servido=<de dónde>`. */
export function dataMetaContent(source) {
  return `v=${source.versionId ?? "snapshot"};origen=${source.origin};generado=${source.generatedAt};servido=${source.servedFrom}`;
}

/** Lo contrario, para la prueba de humo y para comparar páginas: `null` si no es un contenido válido. */
export function parseDataMeta(content) {
  const parts = Object.fromEntries(
    String(content ?? "")
      .split(";")
      .map((p) => p.split("="))
      .filter((p) => p.length >= 2)
      .map(([k, ...v]) => [k, v.join("=")]),
  );
  return parts.v ? { v: parts.v, origen: parts.origen, generado: parts.generado, servido: parts.servido } : null;
}

/** ¿Hay que avisar que los datos pueden estar viejos? Sólo si no se leyó la versión vigente del almacén. */
export const isFallback = (source) => source?.servedFrom !== "store";

/** Minutos desde que se publicó la versión que se sirve (o desde que se generó, si no hay fecha de publicación). */
export function ageMin(source, now) {
  const at = Date.parse(source.createdAt ?? source.generatedAt);
  return Number.isNaN(at) ? null : Math.max(0, Math.round((Date.parse(now) - at) / MIN));
}

/** ¿Alguna falla de la versión toca la fuente de resultados de esta categoría? */
export const sourceFailed = (seriesId, failures = []) => {
  const re = FAILURE_OF[seriesId];
  return re ? failures.some((f) => re.test(String(f))) : false;
};

/**
 * Por qué una sesión terminada hace más de 30 min no tiene resultados, o `null` si todavía es pronto o sí los tiene.
 * - la fuente de la categoría falló en la última sincronización → "No pudimos consultar la fuente"
 * - la categoría no tiene fuente automática → "Resultados sin cargar todavía"
 * - la fuente publicó la clasificación pero no la pudimos leer (`resultsUnread`, p. ej. sólo salió en PDF) → "La fuente los publicó, pero no pudimos leerlos"
 * - la fuente respondió pero no publicó nada → "La fuente todavía no los publicó"
 */
export function noResultsReason(session, seriesId, failures, now) {
  if (session.results?.length || session.timeKnown === false) return null;
  const endedMin = (Date.parse(now) - (Date.parse(session.start) + (session.durationMin ?? 60) * MIN)) / MIN;
  if (!(endedMin > 30)) return null;
  if (!AUTOMATIC_SERIES.has(seriesId)) return "Resultados sin cargar todavía";
  if (sourceFailed(seriesId, failures)) return "No pudimos consultar la fuente";
  return session.resultsUnread ? "La fuente los publicó, pero no pudimos leerlos" : "La fuente todavía no los publicó";
}

/**
 * Sesiones de categorías con fuente automática que terminaron hace más de `after` min (y menos de `before` h) sin resultados.
 * Mismo criterio que `sessionResultsMissing` (guardián), pero una fila por sesión: [{ categoria, sesion, terminoHaceMin }].
 */
export function pendingSessions(events, now, { after = 15, before = 48 } = {}) {
  const nowMs = Date.parse(now);
  const out = [];
  for (const e of events) {
    if (!AUTOMATIC_SERIES.has(e.seriesId)) continue;
    for (const s of e.sessions) {
      if (s.timeKnown === false || s.results?.length) continue;
      const min = Math.round((nowMs - (Date.parse(s.start) + (s.durationMin ?? 60) * MIN)) / MIN);
      if (min >= after && min < before * 60) {
        out.push({ categoria: e.seriesId, sesion: `${e.circuit?.city ?? e.name} · ${s.name}`, terminoHaceMin: min, ...(s.resultsUnread ? { publicadosSinLeer: true } : {}), ...(s.resultsGap ? { tablaIncompleta: { url: s.resultsGap.url, filas: s.resultsGap.rows } } : {}) });
      }
    }
  }
  return out.sort((a, b) => b.terminoHaceMin - a.terminoHaceMin);
}

/**
 * Sesiones de categorías con fuente automática que terminaron en los últimos `days` días y tienen resultados, con su ganador (posición 1,
 * igual que la página del evento). La prueba de humo verifica que la página de cada evento nombre a ese ganador.
 * [{ evento, categoria, sesion, ganador, terminoHaceMin }]
 */
export function recentWinners(events, now, { days = 3 } = {}) {
  const nowMs = Date.parse(now);
  const out = [];
  for (const e of events) {
    if (!AUTOMATIC_SERIES.has(e.seriesId)) continue;
    for (const s of e.sessions) {
      const winner = s.results?.find((r) => r.pos === 1)?.driver;
      if (!winner) continue;
      const min = Math.round((nowMs - (Date.parse(s.start) + (s.durationMin ?? 60) * MIN)) / MIN);
      if (min >= 0 && min <= days * 24 * 60) out.push({ evento: e.id, categoria: e.seriesId, sesion: s.name, ganador: winner, terminoHaceMin: min });
    }
  }
  return out.sort((a, b) => a.terminoHaceMin - b.terminoHaceMin);
}

/** Id de la fecha con la sesión con resultados más reciente (de cualquier categoría), o null si ninguna tiene resultados. */
export function latestEventWithResults(events) {
  let best = null;
  for (const e of events) {
    for (const s of e.sessions) {
      const at = Date.parse(s.start);
      if (s.results?.length && (!best || at > best.at)) best = { id: e.id, at };
    }
  }
  return best?.id ?? null;
}

/** Cuántas notas muestra el menú (ver getMenu en menu.ts): una crónica más abajo no está en el menú y no se le exige. */
export const MENU_NOTES = 4;

/**
 * Cuerpo de /api/salud. `stored` es la última fila del almacén leída sin caché ({ id, origin, createdAt }) o null si no se pudo.
 * `notes` son todas las notas en el orden del menú y de /notas ([{ slug, title, auto }]).
 * @param {{ source: any, stored: any, storeError?: string, failures?: string[], events?: any[], notes?: { slug: string, title: string, auto?: unknown }[], now: string }} args
 */
export function healthReport({ source, stored, storeError, failures = [], events = [], notes = [], now }) {
  return {
    sirviendo: { versionId: source.versionId, origin: source.origin, generatedAt: source.generatedAt, createdAt: source.createdAt, servedFrom: source.servedFrom },
    almacen: stored ? { ultimaVersion: stored.id, createdAt: stored.createdAt, origin: stored.origin } : { ultimaVersion: null, createdAt: null, origin: null, error: storeError ?? "sin datos" },
    edadMin: ageMin(source, now),
    fallas: failures,
    pendientes: pendingSessions(events, now),
    ganadoresRecientes: recentWinners(events, now),
    eventoReciente: latestEventWithResults(events),
    cronicas: notes.flatMap((n, i) => (n.auto ? [{ slug: n.slug, title: n.title, enMenu: i < MENU_NOTES }] : [])),
  };
}
