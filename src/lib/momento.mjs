// "El momento" de una categoría: en qué situación está (en pista, fin de semana, resultados recientes o entre semana) y
// qué mostrar. JavaScript puro, sin Next ni alias `@/`, para que `npm test` la cubra. Los estados de las sesiones salen de
// `session-status.mjs`, la misma fuente que usa `format.ts`.
import { noResultsReason } from "./salud-core.mjs";
import { sessionEnd, sessionStatus } from "./session-status.mjs";
import { driverKey } from "./sources/driver-index.mjs";

const HOUR = 3_600_000;
/** Un evento que empieza dentro de este plazo (o que ya empezó y no terminó) es "el fin de semana". */
export const FINDE_HORAS = 72;
/** Un evento que terminó hace menos que esto sigue siendo "resultados recientes". */
export const RESULTADOS_HORAS = 72;

const ESTADO = { live: "en-vivo", upcoming: "proxima", done: "terminada" };
const MAIN_KINDS = ["final", "carrera"];
// Cómo se dice, en una palabra, que alguien no terminó (la fuente publica R, DSQ, DNS…).
const NO_TERMINO = { R: "abandonó", RET: "abandonó", D: "descalificado", DSQ: "descalificado", DNS: "no largó", DNQ: "no clasificó", W: "se retiró", EX: "excluido" };

const startMs = (e) => Math.min(...e.sessions.map((s) => Date.parse(s.start)));
const endMs = (e) => Math.max(...e.sessions.map(sessionEnd));
const isDone = (e, now) => e.sessions.every((s) => sessionStatus(s, now) === "done");
const classified = (r) => !r.positionText || /^\d+$/.test(r.positionText);

/** Los nuestros en una tabla de resultados, en el orden en que terminaron. Quien no terminó lleva `noTermino`. */
function argentinosDe(results, argentineSlugs) {
  return (results ?? [])
    .filter((r) => r.driverSlug && argentineSlugs.has(r.driverSlug))
    .map((r) => ({
      slug: r.driverSlug,
      name: r.driver,
      pos: r.pos,
      ...(classified(r) ? {} : { noTermino: NO_TERMINO[String(r.positionText).toUpperCase()] ?? "sin clasificar" }),
    }))
    .sort((a, b) => a.pos - b.pos);
}

/** Sólo si el primer puesto está de verdad en la tabla (algunas fuentes publican una parte) y llegó a la meta. */
function ganadorDe(results) {
  const r = (results ?? []).find((x) => x.pos === 1 && classified(x));
  return r ? { name: r.driver, slug: r.driverSlug } : undefined;
}

/** Datos mínimos de una sesión para mostrar y para que el navegador recalcule el estado (no viaja la tabla completa). */
function resumenSesion(s, now, seriesId, failures, argentineSlugs) {
  const hasResults = Boolean(s.results?.length);
  // El motivo se calcula "como si ya hubiera pasado media hora": si la sesión termina con la página abierta, el navegador ya sabe qué decir.
  const late = new Date(Math.max(Date.parse(now), sessionEnd(s) + 31 * 60_000)).toISOString();
  return {
    id: s.id,
    name: s.name,
    kind: s.kind,
    start: s.start,
    durationMin: s.durationMin,
    timeKnown: s.timeKnown !== false,
    hasResults,
    estado: ESTADO[sessionStatus(s, now)],
    ganador: ganadorDe(s.results),
    argentinos: argentinosDe(s.results, argentineSlugs),
    ...(hasResults ? {} : { motivo: noResultsReason(s, seriesId, failures, late) ?? undefined }),
  };
}

/** Una fecha en una línea: qué es, cuándo, y el podio y los argentinos de la carrera principal (si ya hay resultados). */
function resumenFecha(e, now, argentineSlugs, failures) {
  const main = [...e.sessions].reverse().find((s) => MAIN_KINDS.includes(s.kind)) ?? e.sessions.at(-1);
  const results = main?.results ?? [];
  /** @type {{ pos: number, name: string, slug?: string }[]} */
  const podio = results.filter((r) => classified(r) && r.pos <= 3).map((r) => ({ pos: r.pos, name: r.driver, slug: r.driverSlug }));
  // Sin el 1.º en la tabla no hay podio que anunciar.
  const podioValido = podio.some((p) => p.pos === 1) ? podio : [];
  const primera = [...e.sessions].sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0];
  return {
    id: e.id,
    name: e.name,
    round: e.round,
    city: e.circuit?.city,
    start: primera.start,
    end: new Date(endMs(e)).toISOString(),
    primeraSesion: { name: primera.name, start: primera.start, timeKnown: primera.timeKnown !== false },
    carrera: main ? { ...resumenSesion(main, now, e.seriesId, failures, argentineSlugs), podio: podioValido } : undefined,
  };
}

/**
 * @param {any[]} events eventos de UNA categoría (con sus sesiones y resultados)
 * @param {string} now ISO
 * @param {{ argentineSlugs?: Iterable<string>, failures?: string[] }} [options]
 */
export function momentoDeCategoria(events, now, { argentineSlugs = [], failures = [] } = {}) {
  const slugs = new Set(argentineSlugs);
  const nowMs = Date.parse(now);
  const evs = events.filter((e) => e.sessions?.length).sort((a, b) => startMs(a) - startMs(b));

  const enPista = evs.find((e) => e.sessions.some((s) => sessionStatus(s, now) === "live"));
  // Ya empezó y no terminó, o empieza dentro de FINDE_HORAS: el primero en el tiempo.
  const enCurso = evs.find((e) => !isDone(e, now) && startMs(e) <= nowMs + FINDE_HORAS * HOUR);
  const terminados = evs.filter((e) => isDone(e, now));
  const ultimo = terminados.at(-1);
  const proximo = evs.find((e) => !isDone(e, now) && startMs(e) > nowMs);
  const reciente = ultimo && nowMs - endMs(ultimo) < RESULTADOS_HORAS * HOUR ? ultimo : undefined;

  let modo;
  let fecha;
  if (enPista) [modo, fecha] = ["en-pista", enPista];
  else if (enCurso) [modo, fecha] = ["finde", enCurso];
  else if (reciente) [modo, fecha] = ["resultados", reciente];
  else [modo, fecha] = ["entre-semana", proximo];

  const sesiones = fecha ? [...fecha.sessions].sort((a, b) => Date.parse(a.start) - Date.parse(b.start)).map((s) => resumenSesion(s, now, fecha.seriesId, failures, slugs)) : [];
  // La última fecha con algo que contar: en entre-semana, la que terminó más recientemente con resultados.
  const conResultados = [...terminados].reverse().find((e) => e.sessions.some((s) => s.results?.length));
  const ultimaFecha = modo === "entre-semana" ? (conResultados ?? ultimo) : modo === "resultados" ? fecha : undefined;
  const proximaFecha = modo === "entre-semana" || modo === "resultados" ? proximo : undefined;

  return {
    modo,
    fecha: fecha ? resumenFecha(fecha, now, slugs, failures) : undefined,
    sesiones,
    proximaSesion: sesiones.find((s) => s.estado !== "terminada"),
    ultimaFecha: ultimaFecha ? resumenFecha(ultimaFecha, now, slugs, failures) : undefined,
    proximaFecha: proximaFecha ? resumenFecha(proximaFecha, now, slugs, failures) : undefined,
  };
}

/** Estado de una sesión del momento a la hora `now`, con el mismo criterio que el servidor (para el navegador). */
export const estadoDeSesion = (s, now) => ESTADO[sessionStatus({ start: s.start, durationMin: s.durationMin, timeKnown: s.timeKnown, hasResults: s.hasResults }, now)];

/** La fila de un piloto en una tabla: en las tripulaciones ("A / B / C") alcanza con que esté uno de ellos. */
function filaDe(results, keys) {
  const r = (results ?? []).find((x) => x.driver.split(" / ").some((p) => keys.has(driverKey(p))));
  if (!r) return undefined;
  return {
    pos: r.pos,
    ...(classified(r) ? {} : { noTermino: NO_TERMINO[String(r.positionText).toUpperCase()] ?? "sin clasificar" }),
    ...(r.gap ? { gap: r.gap } : {}),
  };
}

// Qué categoría manda cuando un piloto corre en varias: lo que pasa ahora, después lo próximo, después lo último.
const PRIORIDAD = { "en-pista": 0, finde: 1, resultados: 2, "entre-semana": 3 };

/**
 * El momento de un piloto: el de su categoría, y a cada sesión le suma **su** fila (posición, diferencia, "no terminó").
 * Si corre en más de una categoría, gana la que tiene algo en pista o más cerca. `participa` dice si figura en algún resultado
 * de la fecha mostrada (para un piloto sin ficha, es lo único que prueba que corre esa fecha).
 * @param {any[]} events eventos de las categorías del piloto
 * @param {string} now ISO
 * @param {Iterable<string>} driverKeys `driverKey` de cada forma en que las fuentes escriben al piloto
 * @param {{ failures?: string[] }} [options]
 */
export function momentoDePiloto(events, now, driverKeys, { failures = [] } = {}) {
  const keys = new Set(driverKeys);
  const ids = [...new Set(events.map((e) => e.seriesId))];
  const candidatos = ids.map((id) => {
    const evs = events.filter((e) => e.seriesId === id);
    const m = momentoDeCategoria(evs, now, { failures });
    return { m, evs, start: m.fecha ? Date.parse(m.fecha.start) : Infinity };
  });
  candidatos.sort((a, b) => PRIORIDAD[a.m.modo] - PRIORIDAD[b.m.modo] || a.start - b.start);
  const elegido = candidatos[0];
  if (!elegido) return { ...momentoDeCategoria([], now, { failures }), participa: false };

  const { m, evs } = elegido;
  const crudas = new Map((evs.find((e) => e.id === m.fecha?.id)?.sessions ?? []).map((s) => [s.id, s]));
  const sesiones = m.sesiones.map((s) => ({ ...s, fila: filaDe(crudas.get(s.id)?.results, keys) }));
  return { ...m, sesiones, proximaSesion: sesiones.find((s) => s.estado !== "terminada"), participa: sesiones.some((s) => s.fila) };
}
