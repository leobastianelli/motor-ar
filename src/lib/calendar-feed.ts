// Arma las sesiones de un calendario suscribible (.ics) a partir de la temporada. No recalcula nada: reutiliza
// `season.getMomentoEvento()` para el ganador y los argentinos de cada sesión (misma fuente que usa el sitio para
// mostrarlos), y `nombreVisibleSesion` para el título, igual que la página del evento.
import type { Season } from "./data";
import { nombreVisibleSesion } from "./momento.mjs";
import type { RaceEvent, Series } from "./types";

/** Dominio público fijo: un calendario suscribible tiene que valer siempre, sin importar en qué entorno se generó. */
export const CALENDAR_BASE_URL = "https://www.somosfierros.ar";

/** Ver `CalendarSession` en `src/lib/ics.mjs`. */
export interface CalendarSessionInput {
  uid: string;
  category: string;
  sessionName: string;
  city: string;
  location: string;
  start: string;
  durationMin: number;
  timeKnown: boolean;
  timeStatus?: "confirmed" | "tentative";
  eventUrl: string;
  dondeVerlo?: string[];
  hasResults?: boolean;
  ganador?: { name: string };
  /** Resultado provisorio (planilla de la ACTC antes de la revisión de los comisarios). */
  provisorio?: boolean;
  argentinos?: { name: string; pos: number; noTermino?: string; clase?: { pos: number; class: string } }[];
}

/** Las sesiones de una fecha, listas para `buildCalendar`. */
export function calendarSessionsForEvent(season: Season, event: RaceEvent, series: Series, now: string): CalendarSessionInput[] {
  const momento = season.getMomentoEvento(event, now);
  const porId = new Map(momento.sesiones.map((s) => [s.id, s]));
  const eventUrl = `${CALENDAR_BASE_URL}/eventos/${event.id}`;
  const location = `${event.circuit.name}, ${event.circuit.city}`;
  // El cronometraje en vivo no es "dónde ver la sesión": queda afuera de la descripción del calendario.
  const dondeVerlo = event.broadcasts.filter((b) => b.kind !== "timing").map((b) => b.name);
  return event.sessions.map((raw) => {
    const s = porId.get(raw.id);
    return {
      uid: raw.id,
      category: series.short,
      sessionName: nombreVisibleSesion(raw, event.sessions),
      city: event.circuit.city,
      location,
      start: raw.start,
      durationMin: raw.durationMin,
      timeKnown: raw.timeKnown !== false,
      timeStatus: raw.timeStatus,
      eventUrl,
      dondeVerlo: dondeVerlo.length ? dondeVerlo : undefined,
      hasResults: s?.hasResults,
      ganador: s?.ganador,
      ...(s?.provisorio ? { provisorio: true } : {}),
      argentinos: s?.argentinos,
    };
  });
}

/** Todas las sesiones de la temporada de una categoría, en orden cronológico. */
export function calendarSessionsForSeries(season: Season, seriesId: string, series: Series, now: string): CalendarSessionInput[] {
  return season
    .getEventsForSeries(seriesId)
    .flatMap((event) => calendarSessionsForEvent(season, event, series, now))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
