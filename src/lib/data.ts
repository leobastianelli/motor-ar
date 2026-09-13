import { broadcastsBySeries } from "@/data/broadcasts";
import { drivers } from "@/data/drivers";
import history from "@/data/history.json";
import season from "@/data/season-2026.json";
import { series, seriesById } from "@/data/series";
import { dayKey, fmtDayShort, fmtTime, sessionStatus, surname, type SessionStatus, type StateKind } from "./format";
import type { CategoryHistory, Driver, RaceEvent, ResultRow, Series, Session, StandingRow } from "./types";

// Capa de acceso a datos. Lee las instantáneas que generan los scripts de sincronización
// (scripts/sync-season-2026.mjs, scripts/sync-history.mjs); mañana puede leer Postgres sin tocar las páginas.

export const getNow = () => new Date().toISOString();
export const seasonUpdatedAt = season.generatedAt;

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const SLUG_BY_NAME = new Map(drivers.flatMap((d) => [d.name, ...(d.aliases ?? [])].map((n) => [normalize(n), d.slug] as const)));
const slugFor = (name: string) => SLUG_BY_NAME.get(normalize(name));

type RawEvent = Omit<RaceEvent, "broadcasts" | "sessions"> & {
  sessions: (Omit<Session, "results"> & { results?: (Omit<ResultRow, "gap"> & { gap?: string })[] })[];
};

const events: RaceEvent[] = (season.events as unknown as RawEvent[])
  .filter((e) => seriesById[e.seriesId])
  .map((e) => ({
    ...e,
    broadcasts: broadcastsBySeries[e.seriesId]?.items ?? [],
    sessions: e.sessions.map((s) => ({
      ...s,
      results: s.results?.map((r) => ({ ...r, gap: r.gap ?? "", driverSlug: slugFor(r.driver) })),
    })),
  }));

const standings: Record<string, StandingRow[]> = Object.fromEntries(
  Object.entries(season.standings as unknown as Record<string, Omit<StandingRow, "driverSlug">[]>).map(([id, rows]) => [
    id,
    rows.map((r) => ({ ...r, driverSlug: slugFor(r.driver) })),
  ]),
);

export interface FeedItem {
  session: Session;
  event: RaceEvent;
  series: Series;
  status: SessionStatus;
}

export const ms = (iso: string) => new Date(iso).getTime();
export const eventStart = (e: RaceEvent) => e.sessions[0].start;
const sessionEnd = (s: Session) =>
  s.timeKnown === false ? ms(`${dayKey(s.start)}T00:00:00-03:00`) + 86400000 : ms(s.start) + s.durationMin * 60000;
const eventEnd = (e: RaceEvent) => Math.max(...e.sessions.map(sessionEnd));

const baseItems = events
  .flatMap((event) => event.sessions.map((session) => ({ session, event, series: seriesById[event.seriesId] })))
  .sort((a, b) => ms(a.session.start) - ms(b.session.start));

const itemsAt = (now: string): FeedItem[] => baseItems.map((i) => ({ ...i, status: sessionStatus(i.session, now) }));

const RACE_KINDS = ["carrera", "final", "sprint"];

export const getSeries = (id: string): Series | undefined => seriesById[id];
export const getAllSeries = () => series;
export const getEvent = (id: string) => events.find((e) => e.id === id);
export const getAllEvents = () => events;
export const getStandings = (seriesId: string) => standings[seriesId] ?? [];
export const getSeasonMeta = (seriesId: string) =>
  ((season.meta as Record<string, { standingsLabel?: string; incomplete?: boolean }>)[seriesId] ?? {});
export const getHistory = (seriesId: string) =>
  (history.series as unknown as Record<string, CategoryHistory>)[seriesId];
export const getDriver = (slug: string) => drivers.find((d) => d.slug === slug);
export const getAllDrivers = () => drivers;

/** Argentinos que corren afuera: los que aparecen en "Los nuestros". */
export const getDriversAbroad = () => drivers.filter((d) => seriesById[d.seriesId]?.scope === "internacional");

export function getEventsForSeries(seriesId: string) {
  return events.filter((e) => e.seriesId === seriesId).sort((a, b) => ms(eventStart(a)) - ms(eventStart(b)));
}

/** Fin de semana de carreras: el actual (viernes a domingo) o, de lunes a jueves, el próximo. */
export function weekendWindow(now: string) {
  const today = new Date(`${dayKey(now)}T12:00:00-03:00`);
  const weekday = today.getUTCDay();
  const shift = weekday === 0 ? -2 : weekday === 6 ? -1 : 5 - weekday;
  const friday = today.getTime() + shift * 86400000;
  const days = [0, 1, 2].map((k) => {
    const key = dayKey(new Date(friday + k * 86400000).toISOString());
    return { key, iso: `${key}T12:00:00-03:00` };
  });
  return { days, from: `${days[0].key}T00:00:00-03:00`, to: new Date(ms(`${days[2].key}T00:00:00-03:00`) + 86400000).toISOString() };
}

export function getWeekendItems(now: string) {
  const { from, to } = weekendWindow(now);
  return itemsAt(now).filter((i) => ms(i.session.start) >= ms(from) && ms(i.session.start) < ms(to));
}

export const getLiveItems = (now: string) => itemsAt(now).filter((i) => i.status === "live");

export function getUpcomingEvents(now: string) {
  return events.filter((e) => eventEnd(e) >= ms(now)).sort((a, b) => ms(eventStart(a)) - ms(eventStart(b)));
}

export function getNextSession(event: RaceEvent, now: string) {
  return event.sessions.find((s) => sessionStatus(s, now) !== "done");
}

export function getNextRace(seriesId: string, now: string) {
  return itemsAt(now).find((i) => i.event.seriesId === seriesId && i.status !== "done" && ["carrera", "final"].includes(i.session.kind));
}

export function getRecentResults(now: string, scope?: Series["scope"]) {
  return itemsAt(now)
    .filter((i) => i.status === "done" && i.session.results?.length && RACE_KINDS.includes(i.session.kind))
    .filter((i) => !scope || i.series.scope === scope)
    .sort((a, b) => ms(b.session.start) - ms(a.session.start));
}

export function getDriverResults(slug: string, now: string) {
  return itemsAt(now)
    .filter((i) => i.status === "done" && i.session.results?.some((r) => r.driverSlug === slug))
    .map((i) => ({ ...i, row: i.session.results!.find((r) => r.driverSlug === slug)! }))
    .sort((a, b) => ms(b.session.start) - ms(a.session.start));
}

/** Resultados recientes de argentinos que corren afuera, del mejor al peor. */
export function getArgentineHighlights(now: string, days = 8) {
  const abroad = new Set(getDriversAbroad().map((d) => d.slug));
  return getRecentResults(now, "internacional")
    .filter((i) => ms(now) - ms(i.session.start) < days * 86400000)
    .flatMap((i) => i.session.results!.filter((r) => r.driverSlug && abroad.has(r.driverSlug)).map((row) => ({ ...i, row })))
    .sort((a, b) => a.row.pos - b.row.pos || ms(b.session.start) - ms(a.session.start));
}

export function getNextArgentineSession(now: string) {
  const seriesIds = new Set(getDriversAbroad().map((d) => d.seriesId));
  return itemsAt(now).find((i) => seriesIds.has(i.event.seriesId) && i.status !== "done");
}

export function getStandingPosition(driver: Driver) {
  const row = getStandings(driver.seriesId).find((r) => r.driverSlug === driver.slug);
  return row ? { position: row.pos, points: row.points, wins: row.wins } : null;
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

/** Qué pasa con un piloto, en una línea. */
export function getRunnerStatus(driver: Driver, now: string): RunnerStatus {
  const items = itemsAt(now).filter((i) => i.event.seriesId === driver.seriesId);
  const live = items.find((i) => i.status === "live");
  if (live) {
    return { state: "live", stateLabel: "En pista", headline: `${live.session.name} en curso`, detail: live.event.circuit.city, href: `/eventos/${live.event.id}` };
  }
  const next = items.find((i) => i.status === "upcoming");
  const today = next && dayKey(next.session.start) === dayKey(now);
  const last = getDriverResults(driver.slug, now)[0];
  if (last && !today && ms(now) - ms(last.session.start) < 4 * 86400000) {
    const verb = last.session.kind === "clasificacion" ? "Clasificó" : last.session.kind === "practica" ? "Fue" : "Terminó";
    return { state: "finished", stateLabel: "Final", headline: `${verb} ${last.row.pos}.º`, detail: `${last.session.name} · ${last.event.circuit.city}`, href: `/eventos/${last.event.id}` };
  }
  if (next) {
    const when = next.session.timeKnown === false ? "" : `, ${fmtTime(next.session.start)}`;
    return {
      state: "upcoming",
      stateLabel: "Próxima",
      headline: today ? `${VERB[next.session.kind]} hoy${when}` : `${next.session.name} · ${fmtDayShort(next.session.start)}`,
      detail: `${next.session.name} · ${next.event.circuit.city}`,
      href: `/eventos/${next.event.id}`,
    };
  }
  return { state: "no-data", stateLabel: "Sin datos", headline: "Sin actividad próxima cargada", detail: "", href: `/pilotos/${driver.slug}` };
}

export const rowLabel = (row: ResultRow) => `${surname(row.driver)} ${row.pos}.º`;
