// ¿APAT ya publicó sesiones del TN que la temporada guardada no tiene? Es evidencia, no reloj: funciona aunque las sesiones no tengan hora y aunque
// GitHub atrase sus corridas. La usan /api/pulso (pide la sincronización) y /api/salud (el vigilante avisa si la sincronización no alcanzó).
import { parseResultSessions, resultsUrl } from "./apat.mjs";

const DAY = 86400000;
const AR_OFFSET_MS = 3 * 3600000;
/** La página de resultados de APAT se pide con esta caché: como mucho una vez cada 2 min. */
export const APAT_REVALIDATE = 120;

const addDays = (day, n) => new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const lastDay = (event) => event.sessions.map((s) => s.start.slice(0, 10)).sort().at(-1);

/** Fechas del TN de este fin de semana: desde el viernes hasta el lunes (horario argentino), porque APAT suele rectificar después del domingo. */
export function apatWeekendEvents(events, now) {
  const today = new Date(Date.parse(now) - AR_OFFSET_MS).toISOString().slice(0, 10);
  return events.filter((e) => {
    if (e.seriesId !== "tn" || !e.sessions?.length) return false;
    const last = lastDay(e);
    return today >= addDays(last, -2) && today <= addDays(last, 1);
  });
}

/**
 * Sesiones publicadas en APAT que la temporada guardada todavía no tiene con resultados, con la forma de los documentos de la ACTC en
 * pulso-sync.mjs. `fetchText(url)` trae el HTML; si falla, el error sube a quien llama (no se sabe qué hay publicado).
 */
export async function apatUnread(events, now, fetchText) {
  const out = [];
  for (const event of apatWeekendEvents(events, now)) {
    const isoDay = lastDay(event);
    const have = new Set(event.sessions.filter((s) => s.results?.length).map((s) => s.name));
    for (const klass of ["c2", "c3"]) {
      for (const { name } of parseResultSessions(await fetchText(resultsUrl(klass, isoDay)), klass, isoDay)) {
        if (!have.has(name)) out.push({ key: `tn:${event.id}:${name}`, id: event.id, seriesId: "tn", title: `${event.name} · ${name}`, session: name });
      }
    }
  }
  return out;
}
