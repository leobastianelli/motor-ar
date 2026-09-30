// Decisión pura del refresco caliente: ¿hay algo de F1 que valga la pena ir a buscar? Sin red ni base, así el layout la evalúa en memoria y
// `npm test` la cubre.
import { F1_OFFICIAL_SESSION_NAMES, resultsWindow } from "./sources/f1-official.mjs";

const MIN = 60_000;
const HOUR = 60 * MIN;
// La ventana de resultados (desde cuándo y hasta cuándo se pide la página oficial) vive en f1-official.mjs (`resultsWindow`): arranca antes del
// fin programado según el tipo de sesión y termina 6 h después de él, cuando ya lo toma la sincronización.
/**
 * Los resúmenes de YouTube se buscan en caliente durante las 12 h siguientes a cada sesión (el canal oficial los publica en la primera hora o dos).
 * Más tarde los trae la sincronización completa (ventana de 21 días): así una sesión sin resumen no dispara el refresco cada 3 minutos por días.
 */
export const VIDEOS_WINDOW_MS = 12 * HOUR;

const endOf = (s) => Date.parse(s.start) + (s.durationMin ?? 60) * MIN;

/** → { results: ids de sesiones de F1 sin resultados dentro de su ventana (del fin más temprano posible a 6 h después del programado), videos: ids de las terminadas en las últimas 12 h sin video }. */
export function hotNeeds(events, nowMs) {
  const results = [];
  const videos = [];
  for (const e of events) {
    if (e.seriesId !== "f1") continue;
    for (const s of e.sessions ?? []) {
      if (s.timeKnown === false) continue;
      const age = nowMs - endOf(s);
      const w = F1_OFFICIAL_SESSION_NAMES.has(s.name) && !s.results?.length ? resultsWindow(s) : null;
      if (w && nowMs >= w.from && nowMs < w.until) results.push(s.id);
      if (!s.videos?.length && age >= 0 && age < VIDEOS_WINDOW_MS) videos.push(s.id);
    }
  }
  return { results, videos, needed: results.length > 0 || videos.length > 0 };
}
