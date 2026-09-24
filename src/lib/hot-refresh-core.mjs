// Decisión pura del refresco caliente: ¿hay algo de F1 que valga la pena ir a buscar? Sin red ni base, así el layout la evalúa en memoria y
// `npm test` la cubre.
import { F1_OFFICIAL_SESSION_NAMES } from "./sources/f1-official.mjs";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
/** Una sesión recién terminada no está en la página oficial hasta pasados unos minutos; después de 6 h ya lo toma la sincronización. */
export const RESULTS_AFTER_MS = 5 * MIN;
export const RESULTS_UNTIL_MS = 6 * HOUR;
/** Los resúmenes de YouTube se buscan durante los 3 días siguientes a cada sesión. */
export const VIDEOS_WINDOW_MS = 3 * DAY;

const endOf = (s) => Date.parse(s.start) + (s.durationMin ?? 60) * MIN;

/** → { results: ids de sesiones de F1 terminadas hace 5 min a 6 h sin resultados, videos: ids de las terminadas en los últimos 3 días sin video }. */
export function hotNeeds(events, nowMs) {
  const results = [];
  const videos = [];
  for (const e of events) {
    if (e.seriesId !== "f1") continue;
    for (const s of e.sessions ?? []) {
      if (s.timeKnown === false) continue;
      const age = nowMs - endOf(s);
      if (F1_OFFICIAL_SESSION_NAMES.has(s.name) && !s.results?.length && age >= RESULTS_AFTER_MS && age < RESULTS_UNTIL_MS) results.push(s.id);
      if (!s.videos?.length && age >= 0 && age < VIDEOS_WINDOW_MS) videos.push(s.id);
    }
  }
  return { results, videos, needed: results.length > 0 || videos.length > 0 };
}
