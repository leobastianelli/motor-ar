import { drivers } from "@/data/drivers";
import { events } from "@/data/events";
import { series, seriesById } from "@/data/series";
import { standings } from "@/data/standings";
import { dayKey, fmtTime, relative, sessionStatus, type SessionStatus } from "./format";
import type { Driver, RaceEvent, Series, Session } from "./types";

// Capa de acceso a datos. Hoy lee archivos locales; mañana consulta Postgres
// sin que cambien las páginas.

/** "Ahora" fijo para que el prototipo muestre siempre un fin de semana con vivo. */
export const NOW = "2026-09-13T09:30:00-03:00";
const WEEKEND_FROM = "2026-09-11T00:00:00-03:00";
const WEEKEND_TO = "2026-09-14T00:00:00-03:00";

export interface FeedItem {
  session: Session;
  event: RaceEvent;
  series: Series;
  status: SessionStatus;
}

const ms = (iso: string) => new Date(iso).getTime();
const eventStart = (e: RaceEvent) => e.sessions[0].start;
const eventEnd = (e: RaceEvent) => {
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

export const getSeries = (id: string): Series | undefined => seriesById[id];
export const getAllSeries = () => series;
export const getEvent = (id: string) => events.find((e) => e.id === id);
export const getAllEvents = () => events;
export const getStandings = (seriesId: string) => standings[seriesId] ?? [];
export const getDriver = (slug: string) => drivers.find((d) => d.slug === slug);
export const getAllDrivers = () => drivers;

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

export function getLatestResults(limit = 4) {
  return allItems
    .filter((i) => i.status === "done" && i.session.results && ["carrera", "final", "sprint"].includes(i.session.kind))
    .sort((a, b) => ms(b.session.start) - ms(a.session.start))
    .slice(0, limit);
}

export function getUpcomingEvents(limit?: number) {
  const list = events
    .filter((e) => ms(eventEnd(e)) >= ms(NOW))
    .sort((a, b) => ms(eventStart(a)) - ms(eventStart(b)));
  return limit ? list.slice(0, limit) : list;
}

export function getNextSession(event: RaceEvent) {
  return event.sessions.find((s) => sessionStatus(s, NOW) !== "done");
}

export function getDriverResults(slug: string) {
  return allItems
    .filter((i) => i.status === "done" && i.session.results?.some((r) => r.driverSlug === slug))
    .map((i) => ({ ...i, row: i.session.results!.find((r) => r.driverSlug === slug)! }))
    .sort((a, b) => ms(b.session.start) - ms(a.session.start));
}

export interface DriverPulse {
  driver: Driver;
  series: Series;
  headline: string;
  detail: string;
  href: string;
  tone: "live" | "result" | "next";
}

/** Qué está pasando con cada argentino que corre afuera, en una línea. */
export function getArgentinosPulse(): DriverPulse[] {
  return drivers.filter((d) => seriesById[d.seriesId]?.scope === "internacional").map((driver) => {
    const s = seriesById[driver.seriesId];
    const items = allItems.filter((i) => i.event.seriesId === driver.seriesId);
    const live = items.find((i) => i.status === "live");
    if (live) {
      return { driver, series: s, headline: "En pista", detail: `${live.session.name} · ${live.event.name}`, href: `/eventos/${live.event.id}`, tone: "live" };
    }
    const upcoming = items.find((i) => i.status === "upcoming" && ["carrera", "final"].includes(i.session.kind));
    const racesToday = upcoming && dayKey(upcoming.session.start) === dayKey(NOW);
    const lastResult = getDriverResults(driver.slug)[0];
    const recent = lastResult && ms(NOW) - ms(lastResult.session.start) < 1000 * 60 * 60 * 36;
    // Prioridad: en pista > corre hoy > resultado reciente > próxima carrera.
    if (recent && !racesToday) {
      return { driver, series: s, headline: `P${lastResult.row.pos}`, detail: `${lastResult.session.name} · ${lastResult.event.name}`, href: `/eventos/${lastResult.event.id}`, tone: "result" };
    }
    if (upcoming) {
      const today = racesToday;
      return {
        driver,
        series: s,
        headline: today ? `${fmtTime(upcoming.session.start)} hs` : relative(upcoming.session.start, NOW),
        detail: `${upcoming.session.name} · ${upcoming.event.name}`,
        href: `/eventos/${upcoming.event.id}`,
        tone: "next",
      };
    }
    return { driver, series: s, headline: "—", detail: "Sin actividad próxima", href: `/pilotos/${driver.slug}`, tone: "next" };
  });
}

export const ARG_SLUGS = new Set(drivers.map((d) => d.slug));
