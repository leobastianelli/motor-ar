// Todo lo que depende de "ahora" y se calcula a partir de las sesiones: qué está en vivo, qué sigue, qué terminó, el modo de la portada,
// el estado de cada piloto. JavaScript puro, sin Next ni alias `@/`: lo usan `data.ts` (el servidor) y los componentes del navegador
// (`useNow`, src/components/live-clock.tsx), que lo vuelven a calcular con la hora real aunque el HTML sea de hace 15 minutos
// (las páginas son ISR con `revalidate = 900`; ver docs/plan-datos). Una sola lógica en los dos lados: `npm test` la cubre.
import { fmtDayShort, fmtTime } from "./fmt-core.mjs";
import { diaDeHoy } from "./hoy.mjs";
import { dayKey, dayOnlyEnd, dayStart, sessionEnd as sessionEndOf, sessionStatus } from "./session-status.mjs";

/** @typedef {import("./types").Series} Series */
/** @typedef {import("./types").RaceEvent} RaceEvent */
/** @typedef {import("./types").Session} Session */
/** @typedef {"live" | "upcoming" | "done"} SessionStatus */
/** @typedef {"live" | "upcoming" | "finished" | "no-data"} StateKind */
/** @typedef {{ session: Session, event: RaceEvent, series: Series }} BaseItem */
/** @typedef {BaseItem & { status: SessionStatus }} FeedItem */
/**
 * @typedef {object} RunnerStatus
 * @property {number} at Cuándo vuelve a estar en pista (ms): sirve para ordenar por orden de aparición. Infinity si no hay nada cargado.
 * @property {StateKind} state
 * @property {string} stateLabel
 * @property {string} headline
 * @property {string} detail
 * @property {string} href
 */
/**
 * Qué busca la gente según el momento: en pista o de jueves a domingo antes de que termine lo del día, lo que pasa y lo que viene;
 * el domingo ya terminado, el lunes y el martes, los resultados; el miércoles es intermedio.
 * @typedef {"live" | "weekend" | "results" | "midweek"} HomeMode
 */

export const ms = (/** @type {string} */ iso) => new Date(iso).getTime();
export const eventStart = (/** @type {RaceEvent} */ e) => e.sessions[0].start;
const sessionEnd = (/** @type {Session} */ s) => sessionEndOf(s);
const eventEnd = (/** @type {RaceEvent} */ e) => Math.max(...e.sessions.map(sessionEnd));

/**
 * Desde qué instante (ms) la sesión figura como terminada: lo mismo que `sessionStatus(...) === "done"`, pero como un número. Sirve para
 * mandar al navegador un umbral en vez de un estado: "terminó" es `now >= sessionDoneAt(s)`.
 * @param {Pick<Session, "start" | "durationMin" | "timeKnown" | "results">} s
 */
export function sessionDoneAt(s) {
  if (s.timeKnown === false) return s.results?.length ? dayStart(s.start) : dayOnlyEnd(s.start);
  return ms(s.start) + s.durationMin * 60000;
}
/** Desde qué instante (ms) todas las sesiones de la fecha figuran como terminadas. */
export const eventDoneAt = (/** @type {RaceEvent} */ e) => Math.max(...e.sessions.map(sessionDoneAt));

/** Fin de semana de carreras: el actual (viernes a domingo) o, de lunes a jueves, el próximo. */
export function weekendWindow(/** @type {string} */ now) {
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

const RACE_KINDS = ["carrera", "final", "sprint"];
// Para "lo último que pasó" cuentan también las series (TN), pero no para estadísticas: una serie no es una carrera ganada.
const RECENT_KINDS = [...RACE_KINDS, "serie"];
const KIND_WEIGHT = /** @type {Record<string, number>} */ ({ final: 0, carrera: 0, sprint: 1, serie: 2 });

const VERB = /** @type {Record<string, string>} */ ({
  practica: "Practica",
  clasificacion: "Clasifica",
  sprint: "Corre la sprint",
  serie: "Corre la serie",
  final: "Corre la final",
  carrera: "Corre",
});

/**
 * Las vistas del tiempo sobre una lista de fechas. `events` puede ser la temporada entera (servidor) o un recorte con lo que la página
 * necesita (navegador, ver snapshot.mjs): mientras el recorte traiga lo que la página usa, el resultado es idéntico.
 * @param {object} deps
 * @param {RaceEvent[]} deps.events
 * @param {Record<string, Series>} deps.seriesById
 * @param {(s: Series) => 1 | 2 | 3} deps.tierOf Prioridad de una categoría cuando dos cosas pasan al mismo tiempo (el orden principal siempre es la hora).
 * @param {{ slug: string }[]} deps.driversAbroad
 */
export function createTimeViews({ events, seriesById, tierOf, driversAbroad }) {
  /** @type {BaseItem[]} */
  const baseItems = events
    .flatMap((event) => event.sessions.map((session) => ({ session, event, series: seriesById[event.seriesId] })))
    .sort((a, b) => ms(a.session.start) - ms(b.session.start) || tierOf(a.series) - tierOf(b.series));
  const itemsAt = (/** @type {string} */ now) => /** @type {FeedItem[]} */ (baseItems.map((i) => ({ ...i, status: sessionStatus(i.session, now) })));

  const getNextSession = (/** @type {RaceEvent} */ event, /** @type {string} */ now) => event.sessions.find((s) => sessionStatus(s, now) !== "done");

  /**
   * @param {string} now
   * @param {Series["scope"]} [scope]
   */
  const getRecentResults = (now, scope) =>
    itemsAt(now)
      .filter((i) => i.status === "done" && i.session.results?.length && RECENT_KINDS.includes(i.session.kind))
      .filter((i) => !scope || i.series.scope === scope)
      // Lo más reciente primero; con la misma hora (p. ej. TN sin horario), la final antes que las series.
      .sort((a, b) => ms(b.session.start) - ms(a.session.start) || KIND_WEIGHT[a.session.kind] - KIND_WEIGHT[b.session.kind]);

  /**
   * Sesiones de cualquier tipo (también prácticas y clasificaciones) que terminaron hace poco y ya tienen resultados: lo primero que
   * busca alguien que entra justo después de una sesión. Lo que terminó más recientemente va primero; a igual hora, la categoría argentina.
   */
  const getJustFinished = (/** @type {string} */ now, hours = 30) =>
    itemsAt(now)
      .filter((i) => {
        if (i.status !== "done" || !i.session.results?.length || i.session.timeKnown === false) return false;
        const ended = ms(i.session.start) + i.session.durationMin * 60000;
        return ms(now) - ended < hours * 3600000;
      })
      .sort((a, b) => ms(b.session.start) + b.session.durationMin * 60000 - (ms(a.session.start) + a.session.durationMin * 60000) || tierOf(a.series) - tierOf(b.series));

  const getDriverResults = (/** @type {string} */ slug, /** @type {string} */ now) =>
    itemsAt(now)
      .filter((i) => i.status === "done" && i.session.results?.some((r) => r.driverSlug === slug))
      .map((i) => ({ ...i, row: /** @type {import("./types").ResultRow} */ (i.session.results?.find((r) => r.driverSlug === slug)) }))
      .sort((a, b) => ms(b.session.start) - ms(a.session.start));

  /**
   * @param {{ seriesId: string, slug: string, team?: string }} driver
   * @param {string} now
   * @returns {RunnerStatus}
   */
  function getRunnerStatus(driver, now) {
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
    itemsAt,
    getNextSession,
    getRecentResults,
    getJustFinished,
    getDriverResults,
    getRunnerStatus,

    /**
     * Agenda de la home: sólo lo que está en curso y lo que sigue. Arranca en el día de la primera sesión pendiente
     * (aunque sea otra semana) y llega hasta el domingo de esa semana. Lo que ya terminó no aparece.
     */
    getAgenda(/** @type {string} */ now) {
      const pending = itemsAt(now).filter((i) => i.status !== "done");
      if (!pending.length) return { items: /** @type {FeedItem[]} */ ([]), days: /** @type {{ key: string, iso: string }[]} */ ([]), firstDay: /** @type {string | undefined} */ (undefined), to: now };
      const firstDay = dayKey(pending[0].session.start);
      const start = ms(`${firstDay}T00:00:00-03:00`);
      const weekday = new Date(`${firstDay}T12:00:00-03:00`).getUTCDay();
      const end = start + (weekday === 0 ? 1 : 8 - weekday) * 86400000;
      const items = pending.filter((i) => ms(i.session.start) < end);
      const days = [...new Set(items.map((i) => dayKey(i.session.start)))].map((key) => ({ key, iso: `${key}T12:00:00-03:00` }));
      return { items, days, firstDay, to: new Date(end).toISOString() };
    },

    /**
     * Qué corre hoy (día calendario argentino), de todas las categorías: ver src/lib/hoy.mjs. Si hoy no hay nada,
     * trae el próximo día con actividad. A diferencia de `getAgenda`, incluye también lo que ya terminó hoy.
     */
    getToday: (/** @type {string} */ now) => /** @type {{ key: string | undefined, items: FeedItem[], isToday: boolean }} */ (diaDeHoy(itemsAt(now), now)),

    /** Lo que está en pista ahora. Si hay varias cosas a la vez, primero la categoría argentina, después la internacional con argentinos y al final el resto; dentro de cada nivel, la que arrancó antes. */
    getLiveItems: (/** @type {string} */ now) =>
      itemsAt(now)
        .filter((i) => i.status === "live")
        .sort((a, b) => tierOf(a.series) - tierOf(b.series) || ms(a.session.start) - ms(b.session.start)),

    getHomeMode(/** @type {string} */ now) {
      const items = itemsAt(now);
      if (items.some((i) => i.status === "live")) return /** @type {HomeMode} */ ("live");
      const today = dayKey(now);
      const weekday = new Date(`${today}T12:00:00-03:00`).getUTCDay();
      if (weekday === 1 || weekday === 2) return /** @type {HomeMode} */ ("results");
      if (weekday === 3) return /** @type {HomeMode} */ ("midweek");
      if (weekday === 0) {
        const pendingToday = items.some((i) => i.status !== "done" && dayKey(i.session.start) === today);
        return /** @type {HomeMode} */ (pendingToday ? "weekend" : "results");
      }
      return /** @type {HomeMode} */ ("weekend");
    },

    getUpcomingEvents: (/** @type {string} */ now) => events.filter((e) => eventEnd(e) >= ms(now)).sort((a, b) => ms(eventStart(a)) - ms(eventStart(b))),

    getNextRace: (/** @type {string} */ seriesId, /** @type {string} */ now) =>
      itemsAt(now).find((i) => i.event.seriesId === seriesId && i.status !== "done" && ["carrera", "final"].includes(i.session.kind)),

    /** Resultados recientes de argentinos que corren afuera, del mejor al peor. */
    getArgentineHighlights(/** @type {string} */ now, days = 8) {
      const abroad = new Set(driversAbroad.map((d) => d.slug));
      return getRecentResults(now, "internacional")
        .filter((i) => ms(now) - ms(i.session.start) < days * 86400000)
        .flatMap((i) => (i.session.results ?? []).filter((r) => r.driverSlug && abroad.has(r.driverSlug)).map((row) => ({ ...i, row })))
        .sort((a, b) => a.row.pos - b.row.pos || ms(b.session.start) - ms(a.session.start));
    },

    /** Próxima sesión con participación argentina: categorías argentinas o internacionales donde corre alguno de los nuestros. */
    getNextArgentineSession(/** @type {string} */ now) {
      return itemsAt(now).find((i) => tierOf(i.series) <= 2 && i.status === "upcoming");
    },
  };
}
