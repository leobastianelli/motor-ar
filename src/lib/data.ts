import { cache } from "react";
import { broadcastsBySeries } from "@/data/broadcasts";
import { drivers } from "@/data/drivers";
import history from "@/data/history.json";
import driverIndex from "@/data/drivers-2026.json";
import manualOverrides from "@/data/manual-overrides.json";
import { driverKey } from "./sources/driver-index.mjs";
import { momentoDeCategoria, momentoDeEvento, momentoDePiloto } from "./momento.mjs";
import { isProvisional } from "./provisorio.mjs";
import { mergeSessionPatches } from "./sources/overrides.mjs";
import { series, seriesById } from "@/data/series";
import { dayKey } from "./format";
import { createTimeViews, eventStart, ms, weekendWindow } from "./tiempo.mjs";
import { loadRawSeason, type RawSeason } from "./season-data";
import type { Broadcast, CategoryHistory, Driver, RaceEvent, ResultRow, Series, Session, StandingRow } from "./types";

// Capa de acceso a datos. Lo estático (categorías, pilotos, archivo) se lee directo; la temporada se carga con
// getSeason(), que en producción se mantiene al día desde las fuentes.

// FIERROS_NOW permite simular otro momento (por ejemplo, para revisar la home de un lunes). Sin la variable, es la hora real.
export const getNow = () => process.env.FIERROS_NOW ?? new Date().toISOString();
/** Con FIERROS_NOW definida la hora está congelada: el navegador no debe reemplazarla por la real. */
export const isSimulatedNow = () => Boolean(process.env.FIERROS_NOW);

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
  /** Direcciones que tuvo antes (redirigen con 301 a `slug`). */
  formerSlugs?: string[];
}
// Los pilotos con ficha completa (drivers.ts) no se repiten: se descartan por nombre o por cualquiera de sus alias.
const CURATED_KEYS = new Set(drivers.flatMap((d) => [d.name, ...(d.aliases ?? [])].map((n) => driverKey(n))));
const INDEXED = (driverIndex as unknown as { drivers: IndexedDriver[] }).drivers.filter((d) => !(d.keys ?? [d.key]).some((k) => CURATED_KEYS.has(k)));
export const getIndexedDrivers = () => INDEXED;
const INDEXED_SLUG_BY_KEY = new Map(INDEXED.flatMap((d) => (d.keys ?? [d.key]).map((k) => [k, d.slug] as const)));
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


/**
 * Prioridad de una categoría cuando dos cosas pasan al mismo tiempo (el orden principal siempre es la hora):
 * 1 = categoría argentina, 2 = categoría internacional con argentinos corriendo, 3 = el resto.
 */
const WITH_ARGENTINES = new Set(drivers.map((d) => d.seriesId));
export const seriesTier = (s: Series): 1 | 2 | 3 => (s.scope !== "internacional" ? 1 : WITH_ARGENTINES.has(s.id) ? 2 : 3);
export { eventStart, ms, weekendWindow };

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const SLUG_BY_NAME = new Map(drivers.flatMap((d) => [d.name, ...(d.aliases ?? [])].map((n) => [normalize(n), d.slug] as const)));
// En las tripulaciones ("A / B / C", GT y resistencia) alcanza con que alguno de los pilotos sea uno de los nuestros.
const slugFor = (name: string) => SLUG_BY_NAME.get(normalize(name)) ?? name.split(" / ").map((n) => SLUG_BY_NAME.get(normalize(n))).find(Boolean);

const RACE_KINDS = ["carrera", "final", "sprint"];

export type { FeedItem, HomeMode, RunnerStatus } from "./tiempo.mjs";

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
  /** Campeonato de cada clase de una categoría con clases (Córdoba Pista), tal como lo guarda la sincronización. */
  clases?: Record<string, RawClassStanding>;
}

/** Lo que guarda la sincronización por clase: ver `campeonatosDeCordobaPista` (src/lib/sources/cordoba-pista-campeonato.mjs). */
interface RawClassStanding {
  status: "calculado" | "oficial" | "sin-campeonato";
  asOfRound?: number;
  validatedThrough?: number;
  /** De dónde sale una tabla "oficial". */
  source?: { name: string; url: string };
  reason?: string;
  rows?: Omit<StandingRow, "driverSlug">[];
}

/**
 * El campeonato de una clase. `calculado`: lo calculó Fierros con los resultados y el reglamento (y coincide con la tabla oficial hasta
 * `validatedThrough`); `oficial`: la tabla tal cual la publica el organizador (`source`), sin cálculo nuestro; `sin-campeonato`: no se publica,
 * con el motivo en `reason`. Una tabla que quedó atrás de las fechas ya corridas pasa a `sin-campeonato`, igual que las demás: no se muestra un
 * dato viejo como actual.
 */
export interface ClassStanding {
  classId: string;
  status: "calculado" | "oficial" | "sin-campeonato";
  rows: StandingRow[];
  asOfRound?: number;
  validatedThrough?: number;
  source?: { name: string; url: string };
  reason?: string;
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

  // Categorías con clases (Córdoba Pista): el campeonato de cada clase vive en meta[categoría].clases[clase]. Una clase sin tabla publicada, o con
  // una tabla que quedó atrás de las fechas ya corridas, figura "sin campeonato" (nunca un dato viejo como si fuera actual).
  const classStandings: Record<string, Record<string, ClassStanding>> = {};
  for (const s of series) {
    if (!s.classes?.length) continue;
    const raw = meta[s.id]?.clases ?? {};
    classStandings[s.id] = Object.fromEntries(
      s.classes.map((c) => {
        const cls = raw[c.id];
        // Un resultado provisorio (el Rally Argentino, hasta que pasa al histórico) todavía no obliga a la tabla a estar al día.
        const played = Math.max(0, ...events.filter((e) => e.seriesId === s.id && e.sessions.some((x) => x.classId === c.id && x.kind === "final" && x.results?.length && !isProvisional(x))).map((e) => e.round));
        if ((cls?.status === "calculado" || cls?.status === "oficial") && cls.rows?.length && (cls.asOfRound ?? 0) >= played) {
          // Quienes no tienen ficha propia (casi todos en una categoría zonal) enlazan a su ficha automática del índice de pilotos.
          const rows = cls.rows.map((r) => ({ ...r, driverSlug: slugFor(r.driver) ?? INDEXED_SLUG_BY_KEY.get(driverKey(r.driver)) }));
          return [c.id, { classId: c.id, status: cls.status, rows, asOfRound: cls.asOfRound, validatedThrough: cls.validatedThrough, source: cls.source }];
        }
        const reason = cls?.status === "calculado" || cls?.status === "oficial" ? `La tabla llega hasta la fecha ${cls.asOfRound} y ya se corrieron más: no la mostramos para no confundir.` : (cls?.reason ?? "Todavía no publicamos el campeonato de esta clase.");
        return [c.id, { classId: c.id, status: "sin-campeonato" as const, rows: [], reason }];
      }),
    );
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

  // Todo lo que depende de "ahora" vive en tiempo.mjs, compartido con el navegador (los componentes lo recalculan con la hora real).
  const views = createTimeViews({ events, seriesById, tierOf: seriesTier, driversAbroad: getDriversAbroad() });

  const getStandings = (seriesId: string) => standings[seriesId] ?? [];

  // Temporada de cada piloto (por nombre normalizado), calculada una sola vez: resultados y estadísticas por categoría.
  let driverSeasons: Map<string, DriverSeason> | null = null;
  function getDriverSeasons() {
    if (driverSeasons) return driverSeasons;
    const map = new Map<string, DriverSeason>();
    const ordered = [...events].sort((a, b) => ms(eventStart(a)) - ms(eventStart(b)));
    for (const event of ordered) {
      // Una fecha con clasificación general (Rally Argentino) cuenta una sola vez por piloto: las clasificaciones por clase son otra mirada de la misma carrera.
      const hayGeneral = event.sessions.some((x) => !x.classId && RACE_KINDS.includes(x.kind) && x.results?.length);
      for (const session of event.sessions) {
        for (const row of session.results ?? []) {
          for (const part of row.driver.split(" / ")) {
            const key = driverKey(part);
            if (!map.has(key)) map.set(key, { results: [], bySeries: {} });
            const d = map.get(key)!;
            d.results.push({ event, session, row });
            const s = (d.bySeries[event.seriesId] ??= { races: 0, wins: 0, podiums: 0, poles: 0, best: null });
            const classified = !row.positionText || /^\d+$/.test(row.positionText);
            // Un resultado provisorio (planilla de la ACTC antes de la revisión de los comisarios) se lista pero no suma victorias, podios ni "mejor resultado".
            if (RACE_KINDS.includes(session.kind) && !isProvisional(session) && !(hayGeneral && session.classId)) {
              s.races++;
              if (classified && row.pos === 1) s.wins++;
              if (classified && row.pos <= 3) s.podiums++;
              if (classified && (s.best === null || row.pos < s.best)) s.best = row.pos;
            }
            // La "Súper clasificación" de Fórmula Renault Plus no es la pole de la fecha.
            if (session.kind === "clasificacion" && !/s[uú]per/i.test(session.name) && classified && row.pos === 1) s.poles++;
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
    const found = match(getStandings(seriesId)) ?? (meta[seriesId]?.secondaryStandings && match(meta[seriesId].secondaryStandings.rows));
    if (found) return found;
    // En una categoría con clases, en la tabla de la clase en que corre (sólo las clases con campeonato calculado).
    for (const c of Object.values(classStandings[seriesId] ?? {})) {
      const row = match(c.rows);
      if (row) return { ...row, classId: c.classId };
    }
    return undefined;
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


  /** "Los nuestros" son los pilotos con ficha de las categorías internacionales; en las nacionales corre todo el mundo y no hay a quién destacar. */
  const momentoOptions = (seriesId: string) => ({
    argentineSlugs: seriesById[seriesId]?.scope === "internacional" ? drivers.filter((d) => d.seriesId === seriesId).map((d) => d.slug) : [],
    failures: raw.failures ?? [],
  });

  return {
    updatedAt: raw.generatedAt,
    /** Versión de la temporada que se sirve y de dónde salió (almacén, última vista o instantánea). */
    source: raw.source,
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
    /** Campeonato de una clase de una categoría con clases (p. ej. `getClassStanding("cordoba-pista", "tc4000")`). */
    getClassStanding: (seriesId: string, classId: string): ClassStanding | undefined => classStandings[seriesId]?.[classId],
    getClassStandings: (seriesId: string): ClassStanding[] => Object.values(classStandings[seriesId] ?? {}),
    getSeasonMeta: (seriesId: string): SeasonMeta => meta[seriesId] ?? {},

    /**
     * En qué situación está una categoría (en pista, fin de semana, resultados o entre semana) y qué mostrar: ver src/lib/momento.mjs.
     */
    getMomentoCategoria: (seriesId: string, now: string) => momentoDeCategoria(events.filter((e) => e.seriesId === seriesId), now, momentoOptions(seriesId)),
    /** Lo mismo, limitado a una fecha: la página del evento. */
    getMomentoEvento: (event: RaceEvent, now: string) => momentoDeEvento(event, now, momentoOptions(event.seriesId)),
    /**
     * El momento de un piloto: el de su categoría (o la más activa, si corre en varias) con su fila en cada sesión.
     * `keys` son las formas en que las fuentes escriben su nombre (`driverKey`).
     */
    getMomentoPiloto: (seriesIds: string[], keys: string[], now: string) =>
      momentoDePiloto(events.filter((e) => seriesIds.includes(e.seriesId)), now, keys, { failures: raw.failures ?? [] }),
    getEventsForSeries,
    ...views,

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
