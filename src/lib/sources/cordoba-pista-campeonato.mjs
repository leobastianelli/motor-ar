// Campeonato de Córdoba Pista CALCULADO POR FIERROS con los resultados del cronometraje y el puntaje del reglamento.
//
// Por qué se calcula: la tabla de cordobapista.com va entre 1 y 3 fechas atrasada (la de TC 4000 decía "Fecha 5/9" con la 6 ya corrida), y
// mostrarla así sería mostrar un dato viejo como actual. La FRAD sí publica una tabla en PDF después de cada fecha (fradcba.com.ar), pero
// no es una fuente que se pueda leer sola: se usa para VALIDAR este cálculo (ver cordoba-pista-campeonato.test.mjs).
//
// Reglamento: "Reglamento General del Campeonato TC4000, TCPista, Clase 2, Tur.128 y Tur.Fiat 2026" de la FRAD, art. 7 (PUNTAJE):
//   · Final: 25-20-16-14-13-12-11-10-9-8-7-6-5-4-3 (15 puestos). Series: 6-5-4-3-2-1; con una sola serie, 6-6-5-5-4-4-3-3-2-2-1-1.
//   · 4 puntos de presentación (quien hizo la clasificación, largó una serie o la final) y 1 punto por la pole de la clasificación.
//   · Sólo puntúa quien cubrió el 75 % de las vueltas del ganador. Si en la clasificación hubo menos de 8 autos, series, final y pole valen el
//     50 % (la presentación no: los datos de las fechas 1 y 6 de Turismo Fiat lo confirman).
//   · Quien se descalifica de la final y de otra sesión del mismo fin de semana pierde todos los puntos de esa fecha; si sólo se descalifica de
//     una sesión, pierde los de esa sesión (así salen las tablas oficiales).
//   · La última fecha del calendario vale 50 % más. El Play Off de TC 4000 y TC Pista 4000 es una tabla aparte; la tabla general "se sigue
//     confeccionando de la manera habitual" (Anexo III, art. 48), que es la que se calcula acá.
//
// Sólo se publica una clase si el cálculo reproduce, piloto por piloto, las tablas oficiales de la FRAD de todas las fechas en que existen
// (`CLASES_VALIDADAS`). Turismo Fiat y Turismo Fiat 128 coinciden hasta la fecha 5 pero en la 6 difieren en medio punto en algunos pilotos (la
// fecha de menos de 8 autos, con puntaje al 50 %): no se muestran hasta entender la diferencia. Turismo Cordobés Histórico, Clase 3 y Fórmula
// Renault Plus no están en el reglamento general y su puntaje no se pudo reproducir: "Sin campeonato publicado".
import { CLASES, SERIES_ID } from "./cordoba-pista-clases.mjs";
import { desambiguar } from "./cordoba-pista-nombres.mjs";

export const REGLAMENTO = {
  name: "Reglamento General del Campeonato Córdoba Pista 2026 (FRAD)",
  url: "https://fradcba.com.ar/reglamentos/reg-gral-del-campeonato-cordoba-pista-2026/",
};
export const TABLAS_OFICIALES = { name: "tablas del campeonato de la FRAD", url: "https://fradcba.com.ar/category/cordoba-pista/" };
export const TOTAL_FECHAS = 9;

const PUNTOS_FINAL = [25, 20, 16, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3];
const PUNTOS_SERIE = [6, 5, 4, 3, 2, 1];
const PUNTOS_SERIE_UNICA = [6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1];
const PRESENTACION = 4;
const POLE = 1;
const MIN_AUTOS = 8;

/**
 * Clases con campeonato calculado. `validadoHasta`: última fecha cuya tabla oficial de la FRAD coincide con el cálculo, piloto por piloto.
 * `desde`: primera fecha en que corrió la clase (si falta una fecha intermedia, no se publica: faltarían puntos).
 */
export const CLASES_VALIDADAS = {
  tc4000: { desde: 1, validadoHasta: 6 },
  tcp4000: { desde: 1, validadoHasta: 6 },
};

/** Por qué una clase no tiene campeonato publicado (se muestra tal cual). */
export const SIN_CAMPEONATO = {
  fiat: "Coincide con la tabla oficial de la FRAD hasta la fecha 5, pero en la fecha 6 (con menos de 8 autos, puntaje al 50 %) difiere en medio punto para algún piloto. No lo mostramos hasta entender la diferencia.",
  fiat128: "Coincide con la tabla oficial de la FRAD en las fechas 2 a 5, pero en las fechas 1 y 6 (con menos de 8 autos, puntaje al 50 %) difiere en medio punto para algún piloto. No lo mostramos hasta entender la diferencia.",
  tch: "El reglamento general 2026 no incluye el puntaje de esta clase y no pudimos reproducir la tabla que publica la FRAD.",
  clase3: "El reglamento general 2026 no incluye el puntaje de esta clase y no pudimos reproducir la tabla que publica la FRAD.",
  frplus: "La clase tiene campeonato y reglamento propios (frplus.com.ar): el puntaje no está en el reglamento de Córdoba Pista.",
};

const descalificado = (r) => r.status === "Descalificado" || r.positionText === "DSQ";

/** Filas que puntúan en una serie o final: cubrieron el 75 % de las vueltas del que más dio y no están descalificadas. */
function puntuan(session) {
  const rows = session.results ?? [];
  const top = Math.max(0, ...rows.map((r) => r.laps ?? 0));
  const minimo = Math.floor(top * 0.75);
  return rows.filter((r) => !descalificado(r) && (top === 0 || (r.laps ?? 0) >= minimo));
}

/** Puntos de un piloto en UNA fecha: { driver → { pts, win } }. */
export function puntosDeFecha(sessions, { ultima = false } = {}) {
  const clasificaciones = sessions.filter((s) => s.kind === "clasificacion" && !/s[uú]per/i.test(s.name) && s.results?.length);
  const q = clasificaciones[0];
  const series = sessions.filter((s) => s.kind === "serie" && s.results?.length);
  const finales = sessions.filter((s) => s.kind === "final" && s.results?.length);
  const final = finales.at(-1);
  const autos = q ? q.results.length : Math.max(0, ...sessions.map((s) => s.results?.length ?? 0));
  const mitad = autos < MIN_AUTOS ? 0.5 : 1;
  const extra = ultima ? 1.5 : 1;

  const todas = [q, ...series, ...finales].filter(Boolean);
  // Perdió todo el fin de semana: descalificado de la final y de alguna otra sesión.
  const fuera = new Set();
  if (final) {
    const otras = new Set([q, ...series].filter(Boolean).flatMap((s) => s.results.filter(descalificado).map((r) => r.driver)));
    for (const r of final.results) if (descalificado(r) && otras.has(r.driver)) fuera.add(r.driver);
  }

  const out = new Map();
  const add = (driver, n, win = false) => {
    if (fuera.has(driver)) return;
    const d = out.get(driver) ?? { pts: 0, win: false };
    d.pts += n;
    d.win ||= win;
    out.set(driver, d);
  };
  for (const s of todas) for (const r of s.results) if (!fuera.has(r.driver)) add(r.driver, 0);
  for (const driver of out.keys()) add(driver, PRESENTACION * extra);
  if (q) {
    const pole = q.results.find((r) => !descalificado(r));
    if (pole) add(pole.driver, POLE * mitad * extra);
  }
  if (series.length) {
    const escala = series.length === 1 ? PUNTOS_SERIE_UNICA : PUNTOS_SERIE;
    for (const s of series) puntuan(s).forEach((r, i) => escala[i] && add(r.driver, escala[i] * mitad * extra));
  } else if (q) {
    // Sin series, la clasificación da los puntos de la serie única (art. 7, d).
    q.results.filter((r) => !descalificado(r)).forEach((r, i) => PUNTOS_SERIE_UNICA[i] && add(r.driver, PUNTOS_SERIE_UNICA[i] * mitad * extra));
  }
  if (final) puntuan(final).forEach((r, i) => PUNTOS_FINAL[i] && add(r.driver, PUNTOS_FINAL[i] * mitad * extra, i === 0));
  return out;
}

/**
 * Tabla de una clase, sumando todas las fechas con resultados de su final. `events`: los de la categoría (con `classId` en cada sesión).
 * → { rows, asOfRound } o null si la clase no tiene ninguna fecha con final.
 */
export function calcularClase(events, classId, { totalFechas = TOTAL_FECHAS } = {}) {
  const fechas = events
    .filter((e) => e.seriesId === SERIES_ID)
    .map((e) => ({ e, sessions: e.sessions.filter((s) => s.classId === classId) }))
    .filter((f) => f.sessions.some((s) => s.kind === "final" && s.results?.length))
    .sort((a, b) => a.e.round - b.e.round);
  if (!fechas.length) return null;
  const total = new Map();
  for (const { e, sessions } of fechas) {
    for (const [driver, p] of puntosDeFecha(sessions, { ultima: e.round === totalFechas })) {
      const t = total.get(driver) ?? { points: 0, wins: 0 };
      t.points += p.pts;
      if (p.win) t.wins++;
      total.set(driver, t);
    }
  }
  const rows = [...total.entries()]
    .map(([driver, t]) => ({ driver, team: "", points: Math.round(t.points * 10) / 10, wins: t.wins }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins || a.driver.localeCompare(b.driver, "es"))
    .map((r, i) => ({ pos: i + 1, ...r }));
  return { rows, asOfRound: fechas.at(-1).e.round, rounds: fechas.map((f) => f.e.round) };
}

/**
 * El campeonato de cada clase, listo para guardar en `meta["cordoba-pista"].clases`. Una clase se publica ("calculado") sólo si es una de las
 * validadas y tiene resultados de la final de todas las fechas desde que corre; si no, "sin-campeonato" con el motivo.
 * `previous` (lo guardado antes) evita que una tabla con pilotos desaparezca por una fuente que hoy trae menos: si la de hoy tiene menos filas
 * o menos fechas, se conserva la anterior.
 */
export function campeonatosDeCordobaPista(events, { previous = {}, totalFechas = TOTAL_FECHAS } = {}) {
  const out = {};
  for (const clase of CLASES) {
    const config = CLASES_VALIDADAS[clase.id];
    if (!config) {
      out[clase.id] = { status: "sin-campeonato", reason: SIN_CAMPEONATO[clase.id] ?? "Sin reglamento de puntaje publicado." };
      continue;
    }
    const calc = calcularClase(events, clase.id, { totalFechas });
    let result;
    if (!calc) {
      result = { status: "sin-campeonato", reason: "Todavía no hay resultados de la final de ninguna fecha." };
    } else {
      const faltan = [];
      for (let r = config.desde; r <= calc.asOfRound; r++) if (!calc.rounds.includes(r)) faltan.push(r);
      result = faltan.length
        ? { status: "sin-campeonato", reason: `Faltan los resultados de la final de la fecha ${faltan.join(", ")}: sin ellos la tabla estaría incompleta.` }
        : { status: "calculado", asOfRound: calc.asOfRound, validatedThrough: config.validadoHasta, rows: calc.rows };
    }
    // Una fila guardada con el nombre viejo de un homónimo (de antes de separarlo con `desambiguar`) no cuenta: es la misma gente con otro nombre.
    const guardada = previous?.[clase.id];
    const before = guardada?.status === "calculado" ? { ...guardada, rows: guardada.rows.filter((r) => desambiguar(clase.id, r.driver) === r.driver) } : guardada;
    // Nunca se achica: una tabla calculada antes no se reemplaza por una con menos pilotos o que llega a una fecha anterior.
    if (before?.status === "calculado" && (result.status !== "calculado" || result.asOfRound < before.asOfRound || result.rows.length < before.rows.length)) result = before;
    out[clase.id] = result;
  }
  return out;
}
