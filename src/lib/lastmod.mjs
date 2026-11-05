import { sessionEnd, sessionStatus } from "./session-status.mjs";

// Fechas de última modificación para el mapa del sitio (src/app/sitemap.ts): cuándo terminó la última sesión de lo que muestra cada página.
// JavaScript puro (sin alias `@/`) para poder probarlo con `node --test`.

/** @typedef {{ start: string, durationMin: number, timeKnown?: boolean, results?: unknown[] }} SessionLike */
/** @typedef {{ sessions: SessionLike[] }} EventLike */

/**
 * Cuándo terminó la última sesión ya terminada de una fecha (ms), o `null` si todavía no terminó ninguna.
 * @param {EventLike} event
 * @param {string} now
 */
export function lastDoneEnd(event, now) {
  const done = event.sessions.filter((s) => sessionStatus(s, now) === "done").map(sessionEnd);
  return done.length ? Math.max(...done) : null;
}

/**
 * La más reciente de varias fechas (ms), con tope en `cap` (la versión vigente de los datos); `null` si ninguna terminó nada.
 * @param {Iterable<EventLike>} events
 * @param {string} now
 * @param {number} cap
 */
export function latestDone(events, now, cap) {
  let best = null;
  for (const e of events) {
    const end = lastDoneEnd(e, now);
    if (end !== null && (best === null || end > best)) best = end;
  }
  return best === null ? null : new Date(Math.min(best, cap));
}

/**
 * Última modificación de la ficha de un piloto: cuándo terminó la última sesión de las fechas en que tiene resultados.
 * @param {{ results: { event: EventLike }[] }} season  lo que devuelve `getDriverSeason`
 * @param {string} now
 * @param {number} cap
 */
export const driverModified = (season, now, cap) => latestDone(new Set(season.results.map((r) => r.event)), now, cap);
