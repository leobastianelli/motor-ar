// Protección contra pérdida de datos: una fuente que hoy responde vacía, a medias o con otro HTML no puede borrar lo que ya teníamos.
// Se aplica a cada categoría, no sólo a una: lo que estaba en la versión anterior de la temporada nunca desaparece por un mal día de una fuente.

const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const sessionKey = (s) => `${s.kind}|${norm(s.name)}`;

/**
 * Fechas que la versión anterior tenía y la nueva no. Se devuelven las anteriores para volver a sumarlas.
 * `seriesIds` limita la comparación a las categorías de la fuente.
 */
export function missingEvents(nextEvents, previousEvents, seriesIds) {
  const have = new Set(nextEvents.map((e) => e.id));
  return (previousEvents ?? []).filter((e) => seriesIds.includes(e.seriesId) && !have.has(e.id));
}

/**
 * Una fecha ya cargada no puede perder sesiones con resultados ni resultados de una sesión: si la fuente de hoy no los trae
 * (página caída, HTML distinto, publicación en curso), se conservan los de antes.
 * Devuelve la fecha corregida y cuántas sesiones se recuperaron.
 */
export function keepSessionData(event, old) {
  if (!old) return { event, restored: 0 };
  let restored = 0;
  const byId = new Map(event.sessions.map((s) => [s.id, s]));
  const byKey = new Map(event.sessions.map((s) => [sessionKey(s), s]));
  const sessions = event.sessions.map((s) => ({ ...s }));
  for (const before of old.sessions ?? []) {
    if (!before.results?.length) continue;
    const now = byId.get(before.id) ?? byKey.get(sessionKey(before));
    if (!now) {
      sessions.push(before);
      restored++;
    } else if (!now.results?.length) {
      const target = sessions.find((s) => s.id === now.id);
      target.results = before.results;
      if (before.resultsSource) target.resultsSource = before.resultsSource;
      restored++;
    }
  }
  if (!restored) return { event, restored: 0 };
  sessions.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  return { event: { ...event, sessions }, restored };
}

/**
 * Cierra la temporada armada: ninguna categoría queda con menos fechas que antes y ninguna fecha pierde resultados.
 * Devuelve los eventos y las advertencias para `failures`.
 */
export function protectSeason(events, previous) {
  const warnings = [];
  const before = new Map((previous.events ?? []).map((e) => [e.id, e]));
  const seriesIds = [...new Set((previous.events ?? []).map((e) => e.seriesId))];

  const lost = missingEvents(events, previous.events, seriesIds);
  if (lost.length) {
    const bySeries = {};
    for (const e of lost) bySeries[e.seriesId] = (bySeries[e.seriesId] ?? 0) + 1;
    warnings.push(`Se conservaron fechas que las fuentes dejaron de traer: ${Object.entries(bySeries).map(([id, n]) => `${id} ${n}`).join(", ")}`);
  }

  let restored = 0;
  const kept = [...events, ...lost].map((e) => {
    const fixed = keepSessionData(e, before.get(e.id));
    restored += fixed.restored;
    return fixed.event;
  });
  if (restored) warnings.push(`Se conservaron resultados de ${restored} sesiones que las fuentes dejaron de traer`);
  return { events: kept, warnings };
}

/** Campeonatos: una tabla que antes tenía filas no puede quedar vacía por una fuente caída. */
export function protectStandings(standings, meta, previous) {
  const warnings = [];
  for (const [id, rows] of Object.entries(previous.standings ?? {})) {
    if (rows?.length && !standings[id]?.length && !previous.meta?.[id]?.standingsHidden) {
      standings[id] = rows;
      if (previous.meta?.[id]) meta[id] = previous.meta[id];
      warnings.push(`Campeonato ${id}: la fuente no trajo la tabla, se conservó la anterior`);
    }
  }
  return warnings;
}
