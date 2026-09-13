import { drivers } from "@/data/drivers";
import { events } from "@/data/events";
import { series, seriesById } from "@/data/series";
import { standings } from "@/data/standings";
import { dayKey, fmtTime, sessionStatus, surname, type SessionStatus, type StateKind } from "./format";
import type { Driver, RaceEvent, ResultRow, Series, Session } from "./types";

// Capa de acceso a datos. Hoy lee archivos locales; mañana consulta Postgres
// sin que cambien las páginas.

/** "Ahora" fijo para que el prototipo muestre siempre un fin de semana con vivo. */
export const NOW = "2026-09-13T09:30:00-03:00";
export const WEEKEND_FROM = "2026-09-11T00:00:00-03:00";
export const WEEKEND_TO = "2026-09-14T00:00:00-03:00";

export interface FeedItem {
  session: Session;
  event: RaceEvent;
  series: Series;
  status: SessionStatus;
}

export const ms = (iso: string) => new Date(iso).getTime();
export const eventStart = (e: RaceEvent) => e.sessions[0].start;
export const eventEnd = (e: RaceEvent) => {
  const last = e.sessions.at(-1)!;
  return new Date(ms(last.start) + last.durationMin * 60000).toISOString();
};

const allItems: FeedItem[] = events
  .flatMap((event) =>
    event.sessions.map((session) => ({
      session,
      event,
      series: seriesById[event.seriesId],
      status: sessionStatus(session, NOW),
    })),
  )
  .sort((a, b) => ms(a.session.start) - ms(b.session.start));

const RACE_KINDS = ["carrera", "final", "sprint"];

export const getSeries = (id: string): Series | undefined => seriesById[id];
export const getAllSeries = () => series;
export const getEvent = (id: string) => events.find((e) => e.id === id);
export const getAllEvents = () => events;
export const getStandings = (seriesId: string) => standings[seriesId] ?? [];
export const getDriver = (slug: string) => drivers.find((d) => d.slug === slug);
export const getAllDrivers = () => drivers;

/** Argentinos que corren afuera: los que aparecen en "Los nuestros". */
export const getDriversAbroad = () => drivers.filter((d) => seriesById[d.seriesId]?.scope === "internacional");
export const ARG_SLUGS = new Set(drivers.map((d) => d.slug));

export function getEventsForSeries(seriesId: string) {
  return events.filter((e) => e.seriesId === seriesId).sort((a, b) => ms(eventStart(a)) - ms(eventStart(b)));
}

export function getWeekendItems() {
  return allItems.filter((i) => ms(i.session.start) >= ms(WEEKEND_FROM) && ms(i.session.start) < ms(WEEKEND_TO));
}

export function getWeekendDays() {
  const keys = [...new Set(getWeekendItems().map((i) => dayKey(i.session.start)))];
  return keys.map((key) => ({ key, iso: `${key}T12:00:00-03:00` }));
}

export const getLiveItems = () => allItems.filter((i) => i.status === "live");

export function getUpcomingEvents() {
  return events.filter((e) => ms(eventEnd(e)) >= ms(NOW)).sort((a, b) => ms(eventStart(a)) - ms(eventStart(b)));
}

export function getNextSession(event: RaceEvent) {
  return event.sessions.find((s) => sessionStatus(s, NOW) !== "done");
}

export function getNextRace(seriesId: string) {
  return allItems.find(
    (i) => i.event.seriesId === seriesId && i.status !== "done" && ["carrera", "final"].includes(i.session.kind),
  );
}

export function getRecentResults(scope?: Series["scope"]) {
  return allItems
    .filter((i) => i.status === "done" && i.session.results?.length && RACE_KINDS.includes(i.session.kind))
    .filter((i) => !scope || i.series.scope === scope)
    .sort((a, b) => ms(b.session.start) - ms(a.session.start));
}

export function getDriverResults(slug: string) {
  return allItems
    .filter((i) => i.status === "done" && i.session.results?.some((r) => r.driverSlug === slug))
    .map((i) => ({ ...i, row: i.session.results!.find((r) => r.driverSlug === slug)! }))
    .sort((a, b) => ms(b.session.start) - ms(a.session.start));
}

/** Mejores resultados recientes de argentinos que corren afuera, del mejor al peor. */
export function getArgentineHighlights(days = 8) {
  const abroad = new Set(getDriversAbroad().map((d) => d.slug));
  return getRecentResults("internacional")
    .filter((i) => ms(NOW) - ms(i.session.start) < days * 86400000)
    .flatMap((i) =>
      i.session.results!.filter((r) => r.driverSlug && abroad.has(r.driverSlug)).map((row) => ({ ...i, row })),
    )
    .sort((a, b) => a.row.pos - b.row.pos || ms(b.session.start) - ms(a.session.start));
}

export function getNextArgentineSession() {
  const seriesIds = new Set(getDriversAbroad().map((d) => d.seriesId));
  return allItems.find((i) => seriesIds.has(i.event.seriesId) && i.status === "upcoming");
}

export function getStandingPosition(driver: Driver) {
  const table = getStandings(driver.seriesId);
  const index = table.findIndex((r) => r.driverSlug === driver.slug);
  return index === -1 ? null : { position: index + 1, points: table[index].points };
}

const VERB: Record<Session["kind"], string> = {
  practica: "Practica",
  clasificacion: "Clasifica",
  sprint: "Corre la sprint",
  serie: "Corre la serie",
  final: "Corre la final",
  carrera: "Corre",
};

export interface RunnerStatus {
  state: StateKind;
  stateLabel: string;
  headline: string;
  detail: string;
  href: string;
}

/** Qué pasa hoy con un piloto, en una línea. */
export function getRunnerStatus(driver: Driver): RunnerStatus {
  const items = allItems.filter((i) => i.event.seriesId === driver.seriesId);
  const live = items.find((i) => i.status === "live");
  if (live) {
    return { state: "live", stateLabel: "En pista", headline: `${live.session.name} en curso`, detail: live.event.circuit.city, href: `/eventos/${live.event.id}` };
  }
  const next = items.find((i) => i.status === "upcoming");
  const today = next && dayKey(next.session.start) === dayKey(NOW);
  const last = getDriverResults(driver.slug)[0];
  if (last && !today && ms(NOW) - ms(last.session.start) < 36 * 3600000) {
    return { state: "finished", stateLabel: "Final", headline: `Terminó ${last.row.pos}.º`, detail: `${last.session.name} · ${last.event.circuit.city}`, href: `/eventos/${last.event.id}` };
  }
  if (next) {
    return {
      state: "upcoming",
      stateLabel: "Próxima",
      headline: today ? `${VERB[next.session.kind]} hoy, ${fmtTime(next.session.start)}` : `${next.session.name}, ${next.event.circuit.city}`,
      detail: `${next.session.name} · ${next.event.circuit.city}`,
      href: `/eventos/${next.event.id}`,
    };
  }
  return { state: "no-data", stateLabel: "Sin datos", headline: "Sin actividad cargada", detail: "", href: `/pilotos/${driver.slug}` };
}

export const rowLabel = (row: ResultRow) => `${surname(row.driver)} ${row.pos}.º`;
