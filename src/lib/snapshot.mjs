// Recortes de la temporada que viajan al navegador. Las páginas con ISR (`revalidate = 900`) ya no dibujan en el servidor lo que depende
// de la hora: mandan las fechas y sesiones que hacen falta y el navegador decide qué está en vivo, qué sigue y qué terminó con
// `tiempo.mjs` (src/lib/tiempo.mjs). JavaScript puro, sin Next ni alias `@/`: `npm test` verifica que el recorte da lo mismo que la
// temporada entera para cualquier hora de las 15 siguientes (src/lib/snapshot.test.mjs).
import { puestoEnClase } from "./clase.mjs";
import { dayKey } from "./session-status.mjs";
import { driverKey } from "./sources/driver-index.mjs";
import { createTimeViews, eventDoneAt, eventStart, ms, sessionDoneAt } from "./tiempo.mjs";

/** @typedef {import("./types").RaceEvent} RaceEvent */
/** @typedef {import("./types").Session} Session */
/** @typedef {import("./types").ResultRow} ResultRow */

const DAY = 86_400_000;
/** Días hacia atrás en los que una sesión conserva sus resultados en la portada (los resultados más viejos nunca se muestran). */
export const PORTADA_DIAS_ATRAS = 10;

/**
 * Las filas de resultados que alguna página usa: el podio, los pilotos con ficha (`driverSlug`) y, si se pasan, los que coinciden con
 * `keys` (`driverKey` de cada forma del nombre). La primera fila siempre queda: sin ella `results.length` y "el mejor puesto conocido" cambiarían.
 * Y de cada fila sólo los campos que se muestran (el número del auto, las vueltas o el estado no viajan).
 * @param {ResultRow[] | undefined} results
 * @param {Set<string>} [keys]
 */
export function recortarResultados(results, keys) {
  if (!results?.length) return results;
  return results
    .filter((r, i) => i === 0 || r.pos <= 3 || r.driverSlug || (keys && r.driver.split(" / ").some((p) => keys.has(driverKey(p)))))
    .map((r) => {
      /** @type {ResultRow} */
      const out = { pos: r.pos, driver: r.driver, team: r.team, gap: r.gap };
      // Multiclase: la clase y el puesto en ella se calculan con la tabla entera, antes de recortarla.
      const c = puestoEnClase(results, r);
      if (c) Object.assign(out, { class: c.class, classPos: c.pos });
      if (r.code) out.code = r.code;
      if (r.driverSlug) out.driverSlug = r.driverSlug;
      if (r.points !== undefined) out.points = r.points;
      if (r.positionText) out.positionText = r.positionText;
      return out;
    });
}

/**
 * De la fuente de los resultados, lo que el navegador usa: si es provisoria, qué dice la aclaración y si reemplazó a una provisoria (sin el podio
 * que se había mostrado, que sólo hace falta del lado del servidor).
 * @param {NonNullable<Session["resultsSource"]>} src
 */
const recortarFuente = (src) => {
  // El nombre y la dirección sólo se muestran en la página de la fecha (servidor): acá viajan vacíos.
  /** @type {NonNullable<Session["resultsSource"]>} */
  const out = { name: "", url: "" };
  if (src.status) out.status = src.status;
  if (src.note) out.note = src.note;
  if (src.provisional) out.provisional = { podium: [] };
  return out;
};

/**
 * La sesión con lo que el navegador necesita; `conResultados` dice si conserva (recortada) su tabla.
 * @param {Session} s
 * @param {boolean} conResultados
 * @param {Set<string>} [keys]
 * @returns {Session}
 */
export function recortarSesion(s, conResultados, keys) {
  /** @type {Session} */
  const out = { id: s.id, kind: s.kind, name: s.name, start: s.start, durationMin: s.durationMin };
  if (s.timeKnown !== undefined) out.timeKnown = s.timeKnown;
  if (s.classId) out.classId = s.classId;
  if (conResultados && s.results?.length && s.resultsSource) out.resultsSource = recortarFuente(s.resultsSource);
  if (s.resultsUnread) out.resultsUnread = s.resultsUnread;
  if (s.resultsGap) out.resultsGap = s.resultsGap;
  if (s.videos?.length) out.videos = s.videos;
  if (conResultados && s.results?.length) out.results = /** @type {ResultRow[]} */ (recortarResultados(s.results, keys));
  return out;
}

/**
 * @param {RaceEvent} e
 * @param {(s: Session) => boolean} conResultados
 * @param {Set<string>} [keys]
 * @returns {RaceEvent}
 */
export function recortarFecha(e, conResultados, keys) {
  return {
    id: e.id,
    seriesId: e.seriesId,
    name: e.name,
    round: e.round,
    circuit: e.circuit,
    broadcasts: e.broadcasts,
    sessions: e.sessions.map((s) => recortarSesion(s, conResultados(s), keys)),
  };
}

const endOf = (/** @type {Session} */ s) => (s.timeKnown === false ? ms(s.start) : ms(s.start) + s.durationMin * 60000);

/**
 * Lo que la portada necesita de la temporada, a la hora `now` del servidor (sirve para cualquier hora del navegador de ahí en adelante):
 * - las fechas de los últimos 10 días, con los resultados recortados (lo que la portada muestra: podio, argentinos, el mejor tiempo);
 * - lo que ya empezó o empieza antes del fin de la semana de la agenda, y las 10 fechas siguientes;
 * - el último resultado de carrera (general y nacional) aunque sea más viejo, la próxima sesión argentina y la próxima fecha de cada categoría
 *   donde corren los nuestros afuera.
 * @param {RaceEvent[]} events todas las fechas de la temporada
 * @param {string} now
 * @param {{ seriesById: Record<string, import("./types").Series>, tierOf: (s: import("./types").Series) => 1 | 2 | 3, driversAbroad: { slug: string, seriesId: string }[] }} deps
 */
export function fechasDeLaPortada(events, now, deps) {
  const views = createTimeViews({ events, ...deps });
  const nowMs = ms(now);
  const toMs = ms(views.getAgenda(now).to);
  const ordenadas = [...events].sort((a, b) => ms(eventStart(a)) - ms(eventStart(b)));

  const ultimas = [views.getRecentResults(now)[0], views.getRecentResults(now, "nacional")[0]].filter(Boolean);
  /** Sesiones viejas que igual conservan su tabla: el último resultado general y el nacional. */
  const conTabla = new Set(ultimas.map((i) => i.session.id));
  const keep = new Set(ultimas.map((i) => i.event.id));

  for (const e of ordenadas) {
    const viva = ms(eventStart(e)) < toMs; // ya empezó o empieza antes del fin de la semana de la agenda
    const reciente = Math.max(...e.sessions.map(endOf)) >= nowMs - PORTADA_DIAS_ATRAS * DAY;
    if (viva && reciente) keep.add(e.id);
  }
  // Las que siguen a la semana de la agenda ("Lo que viene": las 3 próximas; se dejan 10 por si la agenda corre de semana).
  for (const e of ordenadas.filter((x) => ms(eventStart(x)) >= toMs && eventDoneAt(x) > nowMs).slice(0, 10)) keep.add(e.id);
  const argentina = views.getNextArgentineSession(now);
  if (argentina) keep.add(argentina.event.id);
  // La próxima fecha de cada categoría donde corre alguno de los nuestros afuera ("Los nuestros": su próxima sesión).
  for (const id of new Set(deps.driversAbroad.map((d) => d.seriesId))) {
    const next = ordenadas.find((e) => e.seriesId === id && eventDoneAt(e) > nowMs);
    if (next) keep.add(next.id);
  }

  const recientes = (/** @type {Session} */ s) => conTabla.has(s.id) || endOf(s) >= nowMs - PORTADA_DIAS_ATRAS * DAY;
  return ordenadas.filter((e) => keep.has(e.id)).map((e) => recortarFecha(e, recientes));
}

/**
 * Las fechas de UNA categoría que alcanzan para `momentoDeCategoria` (src/lib/momento.mjs) y para saber cuál es la próxima sesión, a
 * cualquier hora desde `now` en adelante (el navegador sólo la hace avanzar unos minutos u horas: después `AutoRefresh` trae la página nueva):
 * las 3 primeras que todavía no terminaron (la que está en pista, la del fin de semana, la próxima), las 2 últimas que ya terminaron y la
 * última con resultados (aunque sea vieja: en "entre semana" se muestra quién ganó).
 * @param {RaceEvent[]} events fechas de una sola categoría
 * @param {string} now
 * @param {{ keys?: Set<string>, proximas?: number, pasadas?: number }} [options] `keys`: `driverKey` de los pilotos de los que hay que conservar la fila
 * @returns {RaceEvent[]}
 */
export function fechasDeCategoria(events, now, { keys, proximas = 3, pasadas = 2 } = {}) {
  const nowMs = ms(now);
  const ordenadas = [...events].filter((e) => e.sessions?.length).sort((a, b) => Math.min(...a.sessions.map((s) => ms(s.start))) - Math.min(...b.sessions.map((s) => ms(s.start))));
  const hechas = ordenadas.filter((e) => eventDoneAt(e) <= nowMs);
  const pendientes = ordenadas.filter((e) => eventDoneAt(e) > nowMs);
  const conResultados = hechas.filter((e) => e.sessions.some((s) => s.results?.length)).at(-1);
  const keep = new Set([...pendientes.slice(0, proximas), ...(pasadas > 0 ? hechas.slice(-pasadas) : []), ...(conResultados ? [conResultados] : [])].map((e) => e.id));
  return ordenadas.filter((e) => keep.has(e.id)).map((e) => recortarFecha(e, () => true, keys));
}

/**
 * Lo que hace falta para decir "último resultado" de un piloto con ficha: sus 3 sesiones más recientes con fila (de cualquier categoría),
 * con el instante en que cada una figura como terminada. El navegador elige la primera que ya terminó. El orden entre sesiones que arrancan a
 * la misma hora es el de `createTimeViews` (categoría argentina primero), el mismo que usa `getDriverResults`.
 * @param {RaceEvent[]} events todas las fechas
 * @param {string} slug
 * @param {{ seriesById: Record<string, import("./types").Series>, tierOf: (s: import("./types").Series) => 1 | 2 | 3 }} deps
 */
export function ultimosResultados(events, slug, { seriesById, tierOf }) {
  return events
    .flatMap((e) => e.sessions.map((s) => ({ e, s })))
    .sort((a, b) => ms(a.s.start) - ms(b.s.start) || tierOf(seriesById[a.e.seriesId]) - tierOf(seriesById[b.e.seriesId]))
    .filter(({ s }) => s.results?.some((r) => r.driverSlug === slug))
    .sort((a, b) => ms(b.s.start) - ms(a.s.start))
    .slice(0, 3)
    .map(({ e, s }) => {
      const row = /** @type {ResultRow} */ (s.results?.find((r) => r.driverSlug === slug));
      // Multiclase (GT3, la general del Rally): el puesto que vale es el de su clase.
      const c = puestoEnClase(s.results, row);
      return { doneAt: sessionDoneAt(s), pos: row.pos, ...(c ? { clase: { pos: c.pos, class: c.class } } : {}), session: s.name, city: e.circuit.city };
    });
}

/**
 * Lo que `/hoy` necesita (src/lib/hoy.mjs, `diaDeHoy`): las fechas con sesiones en los primeros 4 días con actividad desde hoy (hoy incluido, con
 * lo que ya terminó). Alcanza para que el navegador cambie de día a medianoche sin esperar la página nueva; `cubreHasta` es el último día completo.
 * @param {RaceEvent[]} events todas las fechas
 * @param {string} now
 */
export function fechasDeHoy(events, now) {
  const hoy = dayKey(now);
  const dias = [...new Set(events.flatMap((e) => e.sessions.map((s) => dayKey(s.start))).filter((k) => k >= hoy))].sort().slice(0, 4);
  const incluidos = new Set(dias);
  const fechas = events.filter((e) => e.sessions.some((s) => incluidos.has(dayKey(s.start)))).map((e) => recortarFecha(e, () => true));
  return { fechas, cubreHasta: dias.at(-1) ?? hoy };
}

/**
 * Las fechas que hacen falta para el estado de uno o varios pilotos con ficha (`getRunnerStatus`): las 2 primeras sin terminar de cada
 * categoría donde corren (lo que está en pista y lo que sigue) y las sesiones de los últimos 6 días en las que figura alguno (su último
 * resultado, que puede ser de otra categoría: Canapino corre el TC y el TN), con sólo su fila.
 * @param {RaceEvent[]} events todas las fechas
 * @param {string} now
 * @param {{ slug: string, seriesId: string }[]} drivers
 * @returns {RaceEvent[]}
 */
export function fechasDeLosPilotos(events, now, drivers) {
  const nowMs = ms(now);
  const slugs = new Set(drivers.map((d) => d.slug));
  const keep = new Map(); // id -> fecha
  for (const id of new Set(drivers.map((d) => d.seriesId))) {
    const pendientes = events
      .filter((e) => e.seriesId === id && e.sessions?.length && eventDoneAt(e) > nowMs)
      .sort((a, b) => ms(eventStart(a)) - ms(eventStart(b)))
      .slice(0, 2);
    for (const e of pendientes) keep.set(e.id, e);
  }
  for (const e of events) {
    const reciente = e.sessions.some((s) => s.results?.some((r) => r.driverSlug && slugs.has(r.driverSlug)) && endOf(s) >= nowMs - 6 * DAY);
    if (reciente) keep.set(e.id, e);
  }
  return [...keep.values()]
    .sort((a, b) => ms(eventStart(a)) - ms(eventStart(b)))
    .map((e) => ({
      ...recortarFecha(e, () => true),
      sessions: e.sessions.map((s) => {
        const out = recortarSesion(s, false);
        if (!s.results?.length) return out;
        // Sólo las filas de estos pilotos; si no figura ninguno, queda la primera para que la sesión siga "teniendo resultados".
        const mias = s.results.filter((r) => r.driverSlug && slugs.has(r.driverSlug));
        out.results = mias.length ? mias : [s.results[0]];
        return out;
      }),
    }));
}
