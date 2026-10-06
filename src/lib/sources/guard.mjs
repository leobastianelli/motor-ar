import { belongsToEvent } from "./plausible.mjs";
import { brokenActcResults, isProvisional, reconcileSession } from "../provisorio.mjs";

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
    if (!before.results?.length || brokenActcResults(before)) continue;
    // Si el id del evento cambió de significado, los resultados de otra fecha no se le pegan.
    if (!belongsToEvent(event, before)) continue;
    const now = byId.get(before.id) ?? byKey.get(sessionKey(before));
    if (!now) {
      sessions.push(before);
      restored++;
    } else if (!now.results?.length) {
      const target = sessions.find((s) => s.id === now.id);
      target.results = before.results;
      if (before.resultsSource) target.resultsSource = before.resultsSource;
      restored++;
    } else if (isProvisional(now) && reconcileSession(now, before) === before && !sameResults(now, before)) {
      // Si la fuente no se consultó (el Rally sólo se publica desde la PC), `now` es la misma sesión guardada: no hay nada que conservar.
      // Un resultado provisorio nunca pisa uno oficial (ni a un provisorio más completo): vale lo que ya se tenía.
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

const sameResults = (a, b) => a === b || (JSON.stringify(a.results) === JSON.stringify(b.results) && JSON.stringify(a.resultsSource) === JSON.stringify(b.resultsSource));

const TZ = "America/Argentina/Buenos_Aires";
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/**
 * Una sesión de un día que todavía no empezó no puede tener resultados: si los tiene, son de otra fecha (un id que cambió de significado,
 * una fuente que mezcla eventos). Se descartan. Devuelve los eventos corregidos y cuántas sesiones se limpiaron.
 */
export function stripFutureResults(events, now = Date.now()) {
  let stripped = 0;
  const out = events.map((e) => {
    let changed = false;
    const sessions = e.sessions.map((s) => {
      if (!s.results?.length) return s;
      const dayStart = Date.parse(`${dayFmt.format(new Date(s.start))}T00:00:00-03:00`);
      if (dayStart <= now) return s;
      changed = true;
      stripped++;
      const { results, resultsSource, ...rest } = s;
      return rest;
    });
    return changed ? { ...e, sessions } : e;
  });
  return { events: out, stripped };
}

/**
 * Cierra la temporada armada: ninguna categoría queda con menos fechas que antes y ninguna fecha pierde resultados.
 * Devuelve los eventos y las advertencias para `failures`.
 */
export function protectSeason(events, previous, now = Date.now()) {
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
  const clean = stripFutureResults(kept, now);
  if (clean.stripped) warnings.push(`Se descartaron resultados de ${clean.stripped} sesiones que todavía no se corrieron (eran de otra fecha)`);
  return { events: clean.events, warnings };
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
