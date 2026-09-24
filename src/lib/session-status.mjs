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
