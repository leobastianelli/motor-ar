import { cache } from "react";
import { broadcastsBySeries } from "@/data/broadcasts";
import { drivers } from "@/data/drivers";
import history from "@/data/history.json";
import driverIndex from "@/data/drivers-2026.json";
import manualOverrides from "@/data/manual-overrides.json";
import { driverKey } from "./sources/driver-index.mjs";
import { mergeSessionPatches } from "./sources/overrides.mjs";
import { series, seriesById } from "@/data/series";
import { dayKey, fmtDayShort, fmtTime, sessionStatus, type SessionStatus, type StateKind } from "./format";
import { loadRawSeason, type RawSeason } from "./season-data";
import type { Broadcast, CategoryHistory, Driver, RaceEvent, ResultRow, Series, Session, StandingRow } from "./types";

// Capa de acceso a datos. Lo estático (categorías, pilotos, archivo) se lee directo; la temporada se carga con
// getSeason(), que en producción se mantiene al día desde las fuentes.

// FIERROS_NOW permite simular otro momento (por ejemplo, para revisar la home de un lunes). Sin la variable, es la hora real.
export const getNow = () => process.env.FIERROS_NOW ?? new Date().toISOString();
/** Con FIERROS_NOW definida la hora está congelada: el navegador no debe reemplazarla por la real. */
export const isSimulatedNow = () => Boolean(process.env.FIERROS_NOW);

/**
 * Qué busca la gente según el momento: en pista o de jueves a domingo antes de que termine lo del día, lo que pasa y lo que viene;
 * el domingo ya terminado, el lunes y el martes, los resultados; el miércoles es intermedio.
 */
export type HomeMode = "live" | "weekend" | "results" | "midweek";

export const getSeries = (id: string): Series | undefined => seriesById[id];
export const getAllSeries = () => series;
export const getHistory = (seriesId: string) => (history.series as unknown as Record<string, CategoryHistory>)[seriesId];
export const getDriver = (slug: string) => drivers.find((d) => d.slug === slug);
export const getAllDrivers = () => drivers;

/** Pilotos que aparecen en los resultados (índice guardado en el repo por el sincronizador). */
export interface IndexedDriver {
  key: string;
  /** Todas las formas en que las fuentes escribieron a este piloto (normalizadas). */
  keys?: string[];
  aliases?: string[];
  slug: string;
  name: string;
  series: string[];
  numbers: Record<string, string>;
  teams: Record<string, string>;
  firstSeen: string;
  lastSeen: string;
}
// Los pilotos con ficha completa (drivers.ts) no se repiten: se descartan por nombre o por cualquiera de sus alias.
const CURATED_KEYS = new Set(drivers.flatMap((d) => [d.name, ...(d.aliases ?? [])].map((n) => driverKey(n))));
const INDEXED = (driverIndex as unknown as { drivers: IndexedDriver[] }).drivers.filter((d) => !(d.keys ?? [d.key]).some((k) => CURATED_KEYS.has(k)));
export const getIndexedDrivers = () => INDEXED;
export const getIndexedDriver = (slug: string) => INDEXED.find((d) => d.slug === slug);

export interface DriverSeriesStats {
  races: number;
  wins: number;
  podiums: number;
  poles: number;
  best: number | null;
}
export interface DriverSeason {
  results: { event: RaceEvent; session: Session; row: ResultRow }[];
  bySeries: Record<string, DriverSeriesStats>;
}
/** Argentinos que corren afuera: los que aparecen en "Los nuestros". */
export const getDriversAbroad = () => drivers.filter((d) => seriesById[d.seriesId]?.scope === "internacional");

export const ms = (iso: string) => new Date(iso).getTime();

/**
 * Prioridad de una categoría cuando dos cosas pasan al mismo tiempo (el orden principal siempre es la hora):
 * 1 = categoría argentina, 2 = categoría internacional con argentinos corriendo, 3 = el resto.
 */
const WITH_ARGENTINES = new Set(drivers.map((d) => d.seriesId));
export const seriesTier = (s: Series): 1 | 2 | 3 => (s.scope !== "internacional" ? 1 : WITH_ARGENTINES.has(s.id) ? 2 : 3);
export const eventStart = (e: RaceEvent) => e.sessions[0].start;
const sessionEnd = (s: Session) =>
  s.timeKnown === false ? ms(`${dayKey(s.start)}T00:00:00-03:00`) + 86400000 : ms(s.start) + s.durationMin * 60000;
const eventEnd = (e: RaceEvent) => Math.max(...e.sessions.map(sessionEnd));

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

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const SLUG_BY_NAME = new Map(drivers.flatMap((d) => [d.name, ...(d.aliases ?? [])].map((n) => [normalize(n), d.slug] as const)));
// En las tripulaciones ("A / B / C", GT y resistencia) alcanza con que alguno de los pilotos sea uno de los nuestros.
const slugFor = (name: string) => SLUG_BY_NAME.get(normalize(name)) ?? name.split(" / ").map((n) => SLUG_BY_NAME.get(normalize(n))).find(Boolean);

const RACE_KINDS = ["carrera", "final", "sprint"];
// Para "lo último que pasó" cuentan también las series (TN), pero no para estadísticas: una serie no es una carrera ganada.
const RECENT_KINDS = [...RACE_KINDS, "serie"];
const KIND_WEIGHT: Record<string, number> = { final: 0, carrera: 0, sprint: 1, serie: 2 };

const VERB: Record<Session["kind"], string> = {
  practica: "Practica",
  clasificacion: "Clasifica",
  sprint: "Corre la sprint",
  serie: "Corre la serie",
  final: "Corre la final",
  carrera: "Corre",
};

export interface FeedItem {
  session: Session;
  event: RaceEvent;
  series: Series;
  status: SessionStatus;
}

export interface RunnerStatus {
  /** Cuándo vuelve a estar en pista (ms): sirve para ordenar por orden de aparición. Infinity si no hay nada cargado. */
  at: number;
  state: StateKind;
  stateLabel: string;
  headline: string;
  detail: string;
  href: string;
}

export interface SeasonMeta {
  standingsLabel?: string;
  incomplete?: boolean;
  /** El campeonato publicado quedó atrás de las fechas corridas y no se muestra. */
  standingsHidden?: boolean;
  standingsAsOfRound?: number;
  standingsSource?: string;
  /** Un segundo campeonato de la misma categoría (p. ej. Clase 2 del TN, que corre junto a la Clase 3). */
  secondaryStandings?: { label: string; rows: StandingRow[] };
  progression?: { round: number; standings: { driver: string; pos: number; points: number }[] }[];
}

type RawEvent = Omit<RaceEvent, "broadcasts" | "sessions"> & {
  sessions: (Omit<Session, "results"> & { results?: (Omit<ResultRow, "gap"> & { gap?: string })[] })[];
};

type SessionPatch = Partial<RawEvent["sessions"][number]> & Pick<Session, "kind" | "name">;
interface ManualOverride {
  name?: string;
  broadcasts?: Broadcast[];
  sessions?: SessionPatch[];
}
const OVERRIDES = ((manualOverrides as unknown as { events?: Record<string, ManualOverride> }).events ?? {}) as Record<string, ManualOverride>;
/** Fechas enteras cargadas a mano, para cuando ninguna fuente las publica todavía. Si una fuente trae el mismo id, gana la fuente. */
const EXTRA_EVENTS = ((manualOverrides as unknown as { newEvents?: RawEvent[] }).newEvents ?? []) as RawEvent[];
/** Campeonatos cargados a mano (p. ej. la tabla oficial publicada en redes cuando ninguna fuente abierta está al día). */
const MANUAL_STANDINGS = ((manualOverrides as unknown as { standings?: Record<string, { asOfRound: number; source: string; rows: Omit<StandingRow, "driverSlug">[] }> }).standings ?? {});

/** Carga manual (src/data/manual-overrides.json): completa o corrige una fecha sin tocar las fuentes. */
function applyOverride(e: RawEvent): RawEvent {
  const o = OVERRIDES[e.id];
  if (!o) return e;
  const sessions = mergeSessionPatches(e.id, e.sessions, o.sessions, dayKey) as RawEvent["sessions"];
  return { ...e, name: o.name ?? e.name, sessions };
}

export function createSeason(raw: RawSeason) {
  const fromSources = raw.events as RawEvent[];
  const known = new Set(fromSources.map((e) => e.id));
  const events: RaceEvent[] = [...fromSources, ...EXTRA_EVENTS.filter((e) => !known.has(e.id))]
    .filter((e) => seriesById[e.seriesId])
    .map(applyOverride)
    .map((e) => ({
      ...e,
      broadcasts: OVERRIDES[e.id]?.broadcasts ?? broadcastsBySeries[e.seriesId]?.items ?? [],
      sessions: e.sessions.map((s) => ({
        ...s,
        results: s.results?.map((r) => ({ ...r, gap: r.gap ?? "", driverSlug: slugFor(r.driver) })),
      })),
    }));

  const standings: Record<string, StandingRow[]> = Object.fromEntries(
    Object.entries(raw.standings as Record<string, Omit<StandingRow, "driverSlug">[]>).map(([id, rows]) => [id, rows.map((r) => ({ ...r, driverSlug: slugFor(r.driver) }))]),
  );
  const meta = { ...(raw.meta as Record<string, SeasonMeta>) };

  // Un segundo campeonato de la misma categoría, cargado por la fuente bajo una clave propia (hoy sólo clase2 del TN).
  for (const [id, m] of Object.entries(meta)) {
    const rows = (m as unknown as { clase2?: Omit<StandingRow, "driverSlug">[] })?.clase2;
    if (rows?.length) meta[id] = { ...meta[id], secondaryStandings: { label: "Clase 2", rows: rows.map((r) => ({ ...r, driverSlug: slugFor(r.driver) })) } };
  }

  // Fechas de una categoría con resultado de carrera cargado: mide hasta dónde llegó la temporada de verdad,
  // para comparar contra lo que cada tabla (automática o manual) dice que cubre.
  const racedRounds = (id: string) => events.filter((e) => e.seriesId === id && e.sessions.some((s) => (s.kind === "final" || s.kind === "carrera") && s.results?.length)).length;

  // Tabla atrasada: si la fuente dice hasta qué fecha llega y ya se corrieron más, no se muestra como actual.
  for (const [id, m] of Object.entries(meta)) {
    if (m?.standingsAsOfRound === undefined || !standings[id]?.length) continue;
    if (racedRounds(id) > m.standingsAsOfRound) {
      standings[id] = [];
      meta[id] = { ...m, standingsHidden: true };
    }
  }

  // Campeonato cargado a mano: vale mientras la fuente automática no cubra más fechas, y sólo si tampoco quedó
  // atrás de las fechas ya corridas (la misma regla se aplica a la carga manual que a cualquier fuente automática).
  for (const [id, manual] of Object.entries(MANUAL_STANDINGS)) {
    const fromSource = meta[id]?.standingsHidden ? 0 : (meta[id]?.standingsAsOfRound ?? 0);
    if (manual.asOfRound < fromSource && standings[id]?.length) continue;
    const stale = racedRounds(id) > manual.asOfRound;
    standings[id] = stale ? [] : manual.rows.map((r) => ({ ...r, driverSlug: slugFor(r.driver) }));
    meta[id] = {
      ...meta[id],
      standingsHidden: stale,
      standingsAsOfRound: manual.asOfRound,
      standingsLabel: [raw.meta && (raw.meta as Record<string, SeasonMeta>)[id]?.standingsLabel, `tras la fecha ${manual.asOfRound}`].filter(Boolean).join(" · "),
      standingsSource: manual.source,
    };
  }

  const baseItems = events
    .flatMap((event) => event.sessions.map((session) => ({ session, event, series: seriesById[event.seriesId] })))
    .sort((a, b) => ms(a.session.start) - ms(b.session.start) || seriesTier(a.series) - seriesTier(b.series));
  const itemsAt = (now: string): FeedItem[] => baseItems.map((i) => ({ ...i, status: sessionStatus(i.session, now) }));

  const getStandings = (seriesId: string) => standings[seriesId] ?? [];

  // Temporada de cada piloto (por nombre normalizado), calculada una sola vez: resultados y estadísticas por categoría.
  let driverSeasons: Map<string, DriverSeason> | null = null;
  function getDriverSeasons() {
    if (driverSeasons) return driverSeasons;
    const map = new Map<string, DriverSeason>();
    const ordered = [...events].sort((a, b) => ms(eventStart(a)) - ms(eventStart(b)));
    for (const event of ordered) {
      for (const session of event.sessions) {
        for (const row of session.results ?? []) {
          for (const part of row.driver.split(" / ")) {
            const key = driverKey(part);
            if (!map.has(key)) map.set(key, { results: [], bySeries: {} });
            const d = map.get(key)!;
            d.results.push({ event, session, row });
            const s = (d.bySeries[event.seriesId] ??= { races: 0, wins: 0, podiums: 0, poles: 0, best: null });
            const classified = !row.positionText || /^\d+$/.test(row.positionText);
            if (RACE_KINDS.includes(session.kind)) {
              s.races++;
              if (classified && row.pos === 1) s.wins++;
              if (classified && row.pos <= 3) s.podiums++;
              if (classified && (s.best === null || row.pos < s.best)) s.best = row.pos;
            }
            if (session.kind === "clasificacion" && classified && row.pos === 1) s.poles++;
          }
        }
      }
    }
    driverSeasons = map;
    return map;
  }
  const standingFor = (seriesId: string, keys: string | string[]) => {
    const wanted = new Set(Array.isArray(keys) ? keys : [keys]);
    const match = (rows: StandingRow[]) => rows.find((r) => r.driver.split(" / ").some((p) => wanted.has(driverKey(p))));
    // Un piloto puede estar sólo en un campeonato secundario de la categoría (p. ej. Clase 2 del TN).
    return match(getStandings(seriesId)) ?? (meta[seriesId]?.secondaryStandings && match(meta[seriesId].secondaryStandings.rows));
  };

  /** Temporada de un piloto sumando todas las formas en que lo escribieron las fuentes. */
  function driverSeasonFor(keys: string[]): DriverSeason {
    const parts = keys.map((k) => getDriverSeasons().get(k)).filter((x): x is DriverSeason => Boolean(x));
    const results = parts.flatMap((p) => p.results).sort((a, b) => ms(a.session.start) - ms(b.session.start));
    const bySeries: Record<string, DriverSeriesStats> = {};
    for (const p of parts) {
      for (const [id, s] of Object.entries(p.bySeries)) {
        const t = (bySeries[id] ??= { races: 0, wins: 0, podiums: 0, poles: 0, best: null });
        t.races += s.races;
        t.wins += s.wins;
        t.podiums += s.podiums;
        t.poles += s.poles;
        if (s.best !== null && (t.best === null || s.best < t.best)) t.best = s.best;
      }
    }
    return { results, bySeries };
  }

  const getEventsForSeries = (seriesId: string) =>
    events.filter((e) => e.seriesId === seriesId).sort((a, b) => ms(eventStart(a)) - ms(eventStart(b)));

  const getNextSession = (event: RaceEvent, now: string) => event.sessions.find((s) => sessionStatus(s, now) !== "done");

  const getRecentResults = (now: string, scope?: Series["scope"]) =>
    itemsAt(now)
      .filter((i) => i.status === "done" && i.session.results?.length && RECENT_KINDS.includes(i.session.kind))
      .filter((i) => !scope || i.series.scope === scope)
      // Lo más reciente primero; con la misma hora (p. ej. TN sin horario), la final antes que las series.
      .sort((a, b) => ms(b.session.start) - ms(a.session.start) || KIND_WEIGHT[a.session.kind] - KIND_WEIGHT[b.session.kind]);

  /**
   * Sesiones de cualquier tipo (también prácticas y clasificaciones) que terminaron hace poco y ya tienen resultados: lo primero que
   * busca alguien que entra justo después de una sesión. Lo que terminó más recientemente va primero; a igual hora, la categoría argentina.
   */
  const getJustFinished = (now: string, hours = 30) =>
    itemsAt(now)
      .filter((i) => {
        if (i.status !== "done" || !i.session.results?.length || i.session.timeKnown === false) return false;
        const ended = ms(i.session.start) + i.session.durationMin * 60000;
        return ms(now) - ended < hours * 3600000;
      })
      .sort((a, b) => ms(b.session.start) + b.session.durationMin * 60000 - (ms(a.session.start) + a.session.durationMin * 60000) || seriesTier(a.series) - seriesTier(b.series));

  const getDriverResults = (slug: string, now: string) =>
    itemsAt(now)
      .filter((i) => i.status === "done" && i.session.results?.some((r) => r.driverSlug === slug))
      .map((i) => ({ ...i, row: i.session.results!.find((r) => r.driverSlug === slug)! }))
      .sort((a, b) => ms(b.session.start) - ms(a.session.start));

  function getRunnerStatus(driver: Driver, now: string): RunnerStatus {
    const items = itemsAt(now).filter((i) => i.event.seriesId === driver.seriesId);
    const live = items.find((i) => i.status === "live");
    const upcoming = items.find((i) => i.status === "upcoming");
    const at = live ? ms(now) : upcoming ? ms(upcoming.session.start) : Infinity;
    if (live) {
      return { at, state: "live", stateLabel: "En pista", headline: `${live.session.name} en curso`, detail: live.event.circuit.city, href: `/eventos/${live.event.id}` };
    }
    const next = items.find((i) => i.status === "upcoming");
    const today = next && dayKey(next.session.start) === dayKey(now);
    const last = getDriverResults(driver.slug, now)[0];
    if (last && !today && ms(now) - ms(last.session.start) < 4 * 86400000) {
      const verb = last.session.kind === "clasificacion" ? "Clasificó" : last.session.kind === "practica" ? "Fue" : "Terminó";
      return { at, state: "finished", stateLabel: "Final", headline: `${verb} ${last.row.pos}.º`, detail: `${last.session.name} · ${last.event.circuit.city}`, href: `/eventos/${last.event.id}` };
    }
    // Sin equipo confirmado (p. ej. un piloto entre butacas) no hay forma de saber si va a estar en la próxima
    // fecha del calendario de la categoría: mejor "sin datos" que dar por hecho que corre.
    if (next && driver.team) {
      const when = next.session.timeKnown === false ? "" : `, ${fmtTime(next.session.start)}`;
      return {
        at,
        state: "upcoming",
        stateLabel: "Próxima",
        headline: today ? `${VERB[next.session.kind]} hoy${when}` : `${next.session.name} · ${fmtDayShort(next.session.start)}`,
        detail: `${next.session.name} · ${next.event.circuit.city}`,
        href: `/eventos/${next.event.id}`,
      };
    }
    return { at: Infinity, state: "no-data", stateLabel: "Sin datos", headline: "Sin actividad próxima cargada", detail: "", href: `/pilotos/${driver.slug}` };
  }

  return {
    updatedAt: raw.generatedAt,
    failures: raw.failures ?? [],
    getAllEvents: () => events,
    getEvent: (id: string) => events.find((e) => e.id === id),

    /** Resultados y estadísticas de la temporada de un piloto del índice. */
    getDriverSeason: (driver: Pick<IndexedDriver, "key" | "keys">): DriverSeason => driverSeasonFor(driver.keys ?? [driver.key]),
    getDriverStanding: standingFor,

    /** Otras categorías que corren en el mismo lugar ese fin de semana (p. ej. TC Pista, TC Mouras y Pick Up junto al TC). */
    getSiblingEvents(event: RaceEvent) {
      const lastDay = (e: RaceEvent) => ms(`${dayKey(e.sessions.at(-1)!.start)}T12:00:00-03:00`);
      const city = normalize(event.circuit.city);
      return events
        .filter((e) => e.id !== event.id && normalize(e.circuit.city) === city && Math.abs(lastDay(e) - lastDay(event)) <= 86400000)
        .sort((a, b) => series.findIndex((s) => s.id === a.seriesId) - series.findIndex((s) => s.id === b.seriesId));
    },
    getStandings,
    getSeasonMeta: (seriesId: string): SeasonMeta => meta[seriesId] ?? {},
    getEventsForSeries,
    getNextSession,
    getRecentResults,
    getJustFinished,
    getDriverResults,
    getRunnerStatus,

    /**
     * Agenda de la home: sólo lo que está en curso y lo que sigue. Arranca en el día de la primera sesión pendiente
     * (aunque sea otra semana) y llega hasta el domingo de esa semana. Lo que ya terminó no aparece.
     */
    getAgenda(now: string) {
      const pending = itemsAt(now).filter((i) => i.status !== "done");
      if (!pending.length) return { items: [], days: [], firstDay: undefined, to: now };
      const firstDay = dayKey(pending[0].session.start);
      const start = ms(`${firstDay}T00:00:00-03:00`);
      const weekday = new Date(`${firstDay}T12:00:00-03:00`).getUTCDay();
      const end = start + (weekday === 0 ? 1 : 8 - weekday) * 86400000;
      const items = pending.filter((i) => ms(i.session.start) < end);
      const days = [...new Set(items.map((i) => dayKey(i.session.start)))].map((key) => ({ key, iso: `${key}T12:00:00-03:00` }));
      return { items, days, firstDay, to: new Date(end).toISOString() };
    },

    /** Lo que está en pista ahora. Si hay varias cosas a la vez, primero la categoría argentina, después la internacional con argentinos y al final el resto; dentro de cada nivel, la que arrancó antes. */
    getLiveItems: (now: string) =>
      itemsAt(now)
        .filter((i) => i.status === "live")
        .sort((a, b) => seriesTier(a.series) - seriesTier(b.series) || ms(a.session.start) - ms(b.session.start)),

    getHomeMode(now: string): HomeMode {
      const items = itemsAt(now);
      if (items.some((i) => i.status === "live")) return "live";
      const today = dayKey(now);
      const weekday = new Date(`${today}T12:00:00-03:00`).getUTCDay();
      if (weekday === 1 || weekday === 2) return "results";
      if (weekday === 3) return "midweek";
      if (weekday === 0) {
        const pendingToday = items.some((i) => i.status !== "done" && dayKey(i.session.start) === today);
        return pendingToday ? "weekend" : "results";
      }
      return "weekend";
    },

    getUpcomingEvents: (now: string) => events.filter((e) => eventEnd(e) >= ms(now)).sort((a, b) => ms(eventStart(a)) - ms(eventStart(b))),

    getNextRace: (seriesId: string, now: string) =>
      itemsAt(now).find((i) => i.event.seriesId === seriesId && i.status !== "done" && ["carrera", "final"].includes(i.session.kind)),

    /** Resultados recientes de argentinos que corren afuera, del mejor al peor. */
    getArgentineHighlights(now: string, days = 8) {
      const abroad = new Set(getDriversAbroad().map((d) => d.slug));
      return getRecentResults(now, "internacional")
        .filter((i) => ms(now) - ms(i.session.start) < days * 86400000)
        .flatMap((i) => i.session.results!.filter((r) => r.driverSlug && abroad.has(r.driverSlug)).map((row) => ({ ...i, row })))
        .sort((a, b) => a.row.pos - b.row.pos || ms(b.session.start) - ms(a.session.start));
    },

    /** Próxima sesión con participación argentina: categorías argentinas o internacionales donde corre alguno de los nuestros. */
    getNextArgentineSession(now: string) {
      return itemsAt(now).find((i) => seriesTier(i.series) <= 2 && i.status === "upcoming");
    },

    getStandingPosition(driver: Driver) {
      const row = getStandings(driver.seriesId).find((r) => r.driverSlug === driver.slug);
      if (row) return { position: row.pos, points: row.points, wins: row.wins, label: meta[driver.seriesId]?.standingsLabel };
      // Un piloto puede estar sólo en un campeonato secundario de la categoría (p. ej. Clase 2 del TN).
      const secondary = meta[driver.seriesId]?.secondaryStandings;
      const secRow = secondary?.rows.find((r) => r.driverSlug === driver.slug);
      return secRow ? { position: secRow.pos, points: secRow.points, wins: secRow.wins, label: secondary!.label } : null;
    },
  };
}

export type Season = ReturnType<typeof createSeason>;

let cached: { raw: RawSeason; season: Season } | null = null;

/** Una sola temporada por pedido: el layout, la página y los metadatos comparten el resultado. */
export const getSeason = cache(async (): Promise<Season> => {
  const raw = await loadRawSeason();
  if (cached?.raw !== raw) cached = { raw, season: createSeason(raw) };
  return cached.season;
});
