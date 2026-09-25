// Estado de una sesión según la hora (JavaScript puro, sin Next ni alias `@/`): lo comparten `format.ts`, la lógica
// del momento de una categoría (`momento.mjs`) y el navegador, para que "en vivo", "próxima" y "terminada" se decidan
// en un solo lugar. `format.ts` lo reexporta; no se duplica en ningún otro archivo.

export const TZ = "America/Argentina/Buenos_Aires";

const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** YYYY-MM-DD en hora argentina, útil para agrupar por día. */
export const dayKey = (/** @type {string} */ iso) => keyFmt.format(new Date(iso));

/** Medianoche argentina (ms) del día de `iso`. */
export const dayStart = (/** @type {string} */ iso) => new Date(`${dayKey(iso)}T00:00:00-03:00`).getTime();

/**
 * @typedef {{ start: string, durationMin: number, timeKnown?: boolean, results?: unknown[], hasResults?: boolean }} SessionLike
 * `hasResults` permite pasar sólo el dato de si hay resultados (sin la tabla) cuando la sesión viaja al navegador.
 */

/**
 * @param {SessionLike} session
 * @param {string} nowIso
 * @returns {"live" | "upcoming" | "done"}
 */
export function sessionStatus(session, nowIso) {
  const now = new Date(nowIso).getTime();
  const hasResults = session.hasResults ?? Boolean(session.results?.length);
  if (session.timeKnown === false) {
    // Sin horario: nunca "en vivo". Se da por terminada con resultados o al terminar el día.
    const start = dayStart(session.start);
    if (now < start) return "upcoming";
    return hasResults || now >= start + 86400000 ? "done" : "upcoming";
  }
  const start = new Date(session.start).getTime();
  const end = start + session.durationMin * 60000;
  if (now < start) return "upcoming";
  if (now < end) return "live";
  return "done";
}

/** Cuándo termina la sesión (ms). Sin horario confirmado, al terminar el día. */
export const sessionEnd = (/** @type {SessionLike} */ s) => (s.timeKnown === false ? dayStart(s.start) + 86400000 : new Date(s.start).getTime() + s.durationMin * 60000);

/**
 * @typedef {
 *   | { kind: "minutes" | "hours", amount: number, future: boolean }
 *   | { kind: "today" }
 *   | { kind: "tomorrow" }
 *   | { kind: "day-after-tomorrow" }
 *   | { kind: "yesterday" }
 *   | { kind: "days", amount: number, future: boolean }
 * } RelativeDayInfo
 */

/**
 * Distancia entre `iso` y `nowIso` en días calendario de Argentina (no en bloques de 24 h), salvo que falten (o hayan
 * pasado) menos de 3 h, donde importa más el minuto/hora exacto que el día. `format.ts` lo traduce a texto.
 * @param {string} iso
 * @param {string} nowIso
 * @returns {RelativeDayInfo}
 */
export function relativeDayInfo(iso, nowIso) {
  const diffMin = Math.round((new Date(iso).getTime() - new Date(nowIso).getTime()) / 60000);
  const abs = Math.abs(diffMin);
  const future = diffMin > 0;
  if (abs <= 180) {
    if (abs < 60) return { kind: "minutes", amount: abs, future };
    return { kind: "hours", amount: Math.round(abs / 60), future };
  }
  const days = Math.round((dayStart(iso) - dayStart(nowIso)) / 86400000);
  if (days === 0) return { kind: "today" };
  if (days === 1) return { kind: "tomorrow" };
  if (days === 2) return { kind: "day-after-tomorrow" };
  if (days === -1) return { kind: "yesterday" };
  return { kind: "days", amount: Math.abs(days), future: days > 0 };
}
