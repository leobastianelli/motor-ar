// Lógica pura de /api/pulso: qué hace falta según lo que el sitio ya tiene en memoria (sin red ni base), para que npm test la cubra directo.
import { sessionResultsMissing } from "./monitor/checks.mjs";
import { AUTOMATIC_SERIES } from "./salud-core.mjs";

/** Minutos mínimos entre dos disparos de la sincronización completa por API (evita golpear la API de GitHub en cada pedido de 5 min). */
export const DISPATCH_LOCK_MINUTES = 45;
/** Ventana en la que una sesión sin resultados justifica una sincronización completa: recién a partir de esto (no molesta a la fuente en
 * caliente) y hasta esto (después ya lo toma el reintento horario de GitHub Actions o el guardián). */
export const DISPATCH_AFTER_MIN = 10;
export const DISPATCH_BEFORE_HOURS = 6;

/**
 * Sesiones de categorías con fuente automática que terminaron hace más de 10 min y menos de 6 h sin resultados: mismo criterio que
 * `sessionResultsMissing` (el guardián y la compuerta horaria de GitHub Actions), pero con la ventana propia de /api/pulso.
 */
export const pendingForDispatch = (events, now) =>
  sessionResultsMissing(events, now, { seriesIds: AUTOMATIC_SERIES, after: DISPATCH_AFTER_MIN / 60, before: DISPATCH_BEFORE_HOURS });
