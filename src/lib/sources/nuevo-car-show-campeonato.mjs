// Campeonato del Nuevo Car Show CALCULADO POR FIERROS con los resultados de las planillas de cronometraje y el puntaje del reglamento, y
// PUBLICADO SÓLO SI REPRODUCE la tabla oficial.
//
// Por qué se calcula: las tablas de nuevocarshow.com.ar van atrasadas (la de Clase 3 llegaba a la fecha 5 con la 7 ya corrida) y
// mostrarlas así sería mostrar un dato viejo como actual. Por qué se valida: el puntaje oficial lleva ajustes que no figuran en las planillas
// (pilotos invitados o debutantes que no suman y reordenan a los demás, exclusiones que se anuncian aparte, la Gran Carrera de la fecha 3 con
// dos finales por auto). Si el cálculo no coincide, piloto por piloto, con TODAS las fechas que cubre la tabla oficial, la clase queda en
// "Sin campeonato publicado" con el motivo, y la tabla oficial se enlaza pero no se copia.
//
// Reglamento de Campeonato 2026 (ACAPSFE), art. 3 y 4:
//   · 1 punto de asistencia (inscripto y verificado) y 1 punto al que hace la pole de la clasificación (general).
//   · Series: 5-4-3-2-1. Final: 30-25-22-20-18-16-14-13-12-11-10-9-8-7-6-5-4-3-2-1.
//   · La primera y la última fecha valen 50 % más (asistencia, pole, series y final).
//   · Si en la final largan menos de 6 autos, la fecha da el 50 % del puntaje.
//   · Puntúan sólo los clasificados (el que no cubre el 75 % de las vueltas, el excluido y el que no largó quedan sin puntos de series/final).
// No incluye los puntos "bonus" de la etapa regular que el reglamento suma al empezar la Copa: la tabla oficial tampoco los suma.
import { CLASES, SERIES_ID } from "./nuevo-car-show-clases.mjs";

export const REGLAMENTO = {
  name: "Reglamento de Campeonato 2026 del Nuevo Car Show (ACAPSFE)",
  url: "https://nuevocarshow.com.ar/wp-content/uploads/2026/03/REGLAMENTO-DE-CAMPEONATO-NUEVO-CAR-SHOW-ANO-2026.pdf",
};
export const TOTAL_FECHAS = 10;
const SLUG_OFICIAL = { clase1: "campeonato-clase-1", clase2: "campeonato-clase-2", clase3: "campeonato-clase-3", tc4000: "campeonato-tc-4000", fiat600: "campeonato-fiat-600" };
export const tablaOficialUrl = (classId) => `https://nuevocarshow.com.ar/${SLUG_OFICIAL[classId]}/`;
export const slugOficial = (classId) => SLUG_OFICIAL[classId];

const PUNTOS_FINAL = [30, 25, 22, 20, 18, 16, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const PUNTOS_SERIE = [5, 4, 3, 2, 1];
const MIN_AUTOS = 6;
/** Días después de la carrera en que todavía se espera que el sitio publique los resultados antes de dar la tabla por atrasada. */
const GRACIA_DIAS = 2;
const DAY = 86400000;
const TOLERANCIA = 0.01;

const num = (x) => (Number.isFinite(Number(x)) && String(x).trim() !== "" ? Number(x) : 0);
const redondear = (n) => Math.round(n * 100) / 100;
const fuera = (r) => ["NE", "EX", "NC"].includes(r.positionText) || r.status === "Sin tiempo";
const dia = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/**
 * Tabla oficial de una clase (página /campeonato-<clase>/, Elementor): una pestaña por fecha con una fila por piloto — número, nombre y las
 * celdas de puntos (asistencia, clasificación, serie, final; las vacías figuran "--" o faltan). Como las columnas no son confiables (en
 * algunas fechas faltan celdas), se toma el TOTAL de la fecha de cada piloto: la suma de sus celdas.
 * → { fechas: [{ round, totals: Map(número → puntos) }] } sólo con las fechas que ya tienen puntos.
 */
export function parseTablaOficial(html) {
  const text = (s) => s.replace(/<[^>]+>/g, "").replace(/&#8211;/g, "-").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const fechas = [];
  String(html)
    .split('role="tabpanel"')
    .slice(1)
    .forEach((panel, i) => {
      const totals = new Map();
      for (const ul of panel.matchAll(/<ul class="elementor-inline-items[^>]*>([\s\S]*?)<\/ul>/g)) {
        const celdas = [...ul[1].matchAll(/<span class="elementor-icon-list-text[^>]*>([\s\S]*?)<\/span>/g)].map((m) => text(m[1]));
        if (celdas.length < 3 || !/^\d+$/.test(celdas[0])) continue;
        const total = redondear(celdas.slice(2).reduce((a, c) => a + num(c), 0));
        if (total > 0) totals.set(celdas[0], total);
      }
      if (totals.size) fechas.push({ round: i + 1, totals });
    });
  return { fechas };
}

/** Puntos de cada auto (por número) en UNA fecha de una clase, con el nombre con que figura. → Map(número → { pts, name, win }) */
export function puntosDeFecha(sessions, round, totalFechas = TOTAL_FECHAS) {
  const ss = sessions.filter((s) => s.results?.length);
  const clasis = ss.filter((s) => s.kind === "clasificacion");
  const general = clasis.find((s) => /general/i.test(s.name)) ?? clasis[0];
  const series = ss.filter((s) => s.kind === "serie");
  const finales = ss.filter((s) => s.kind === "final");
  const mult = round === 1 || round === totalFechas ? 1.5 : 1;
  const mitad = finales.length && finales.every((f) => f.results.filter((r) => r.positionText !== "NE").length < MIN_AUTOS) ? 0.5 : 1;
  const out = new Map();
  const add = (r, pts, win = false) => {
    const d = out.get(r.number) ?? { pts: 0, name: r.driver, win: false };
    d.pts += pts;
    d.win ||= win;
    out.set(r.number, d);
  };
  for (const s of [...clasis, ...series, ...finales]) for (const r of s.results) if (r.positionText !== "NE") add(r, 0);
  for (const n of out.keys()) out.get(n).pts = mult;
  if (general) add(general.results[0], mult * mitad);
  for (const s of series) s.results.filter((r) => !fuera(r)).slice(0, PUNTOS_SERIE.length).forEach((r, i) => add(r, PUNTOS_SERIE[i] * mult * mitad));
  for (const f of finales) f.results.filter((r) => !fuera(r)).slice(0, PUNTOS_FINAL.length).forEach((r, i) => add(r, PUNTOS_FINAL[i] * mult * mitad, i === 0));
  return out;
}

/** Quién es el titular de un auto de dos pilotos ("A. Cief / M. Vitali" → "Andrés Cief", si hay un piloto de esa clase con ese apellido e inicial). */
function titular(nombre, conocidos) {
  if (!nombre.includes("/")) return nombre;
  const primero = nombre.split("/")[0].trim();
  const [inicial, ...apellido] = primero.split(" ");
  const ap = apellido.join(" ").toLowerCase();
  const hit = conocidos.find((c) => c.toLowerCase().endsWith(` ${ap}`) && c.toLowerCase().startsWith(inicial.replace(".", "").toLowerCase()));
  return hit ?? primero;
}

/**
 * Tabla de una clase sumando las fechas con final. `events`: los de la categoría (con `classId` en cada sesión).
 * → { rows, rounds, asOfRound, porFecha: Map(round → Map(número → puntos)) } o null si la clase no tiene ninguna final con resultados.
 */
export function calcularClase(events, classId, { totalFechas = TOTAL_FECHAS } = {}) {
  const fechas = events
    .filter((e) => e.seriesId === SERIES_ID)
    .map((e) => ({ e, sessions: e.sessions.filter((s) => s.classId === classId) }))
    .filter((f) => f.sessions.some((s) => s.kind === "final" && s.results?.length))
    .sort((a, b) => a.e.round - b.e.round);
  if (!fechas.length) return null;
  const conocidos = [...new Set(events.flatMap((e) => e.sessions.filter((s) => s.classId === classId).flatMap((s) => (s.results ?? []).map((r) => r.driver))))].filter((n) => !n.includes("/"));
  const total = new Map();
  const porFecha = new Map();
  for (const { e, sessions } of fechas) {
    const pts = puntosDeFecha(sessions, e.round, totalFechas);
    porFecha.set(e.round, new Map([...pts].map(([n, p]) => [n, redondear(p.pts)])));
    for (const p of pts.values()) {
      const name = titular(p.name, conocidos);
      const t = total.get(name) ?? { points: 0, wins: 0 };
      t.points += p.pts;
      if (p.win) t.wins++;
      total.set(name, t);
    }
  }
  const rows = [...total.entries()]
    .map(([driver, t]) => ({ driver, team: "", points: redondear(t.points), wins: t.wins }))
    .filter((r) => r.points > 0)
    .sort((a, b) => b.points - a.points || b.wins - a.wins || a.driver.localeCompare(b.driver, "es"))
    .map((r, i) => ({ pos: i + 1, ...r }));
  return { rows, rounds: fechas.map((f) => f.e.round), asOfRound: fechas.at(-1).e.round, porFecha };
}

/**
 * Compara el cálculo con la tabla oficial fecha por fecha (por número de auto). → { ok, hasta, difs: [{ round, number, calculado, oficial }] }
 * `hasta`: la última fecha que cubre la tabla oficial. Con una sola diferencia en una sola fecha, `ok` es falso.
 */
export function validar(calc, oficial) {
  const difs = [];
  let hasta = 0;
  for (const f of oficial.fechas) {
    hasta = Math.max(hasta, f.round);
    const mio = calc.porFecha.get(f.round) ?? new Map();
    for (const n of new Set([...mio.keys(), ...f.totals.keys()])) {
      const a = mio.get(n) ?? 0;
      const b = f.totals.get(n) ?? 0;
      if (Math.abs(a - b) > TOLERANCIA && !(a === 0 && b === 0)) difs.push({ round: f.round, number: n, calculado: a, oficial: b });
    }
  }
  return { ok: oficial.fechas.length > 0 && difs.length === 0, hasta, difs };
}

const lista = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} y ${xs.at(-1)}` : String(xs[0]));

/**
 * El campeonato de cada clase, listo para guardar en `meta["nuevo-car-show"].clases`.
 * @param events fechas de la categoría
 * @param oficiales { [classId]: tabla oficial parseada | null } (null: no se pudo leer)
 * @param previous lo guardado antes (una tabla calculada no se pierde por una fuente que hoy trae menos)
 * @param now fecha de hoy (para saber qué fechas ya deberían tener resultados)
 */
export function campeonatosDeNuevoCarShow(events, { oficiales = {}, previous = {}, now = new Date(), totalFechas = TOTAL_FECHAS } = {}) {
  const out = {};
  for (const clase of CLASES) {
    let result;
    const calc = calcularClase(events, clase.id, { totalFechas });
    const oficial = oficiales[clase.id];
    // Fechas ya corridas (con la gracia de unos días para que el sitio publique) cuya final todavía no tiene resultados.
    const pendientes = events
      .filter((e) => e.seriesId === SERIES_ID && !e.sessions.some((s) => s.classId === clase.id && s.kind === "final" && s.results?.length))
      .filter((e) => Date.parse(e.sessions.map((s) => s.start).sort().at(-1)) + (1 + GRACIA_DIAS) * DAY < now.getTime())
      .sort((a, b) => a.round - b.round);
    if (!calc) {
      result = { status: "sin-campeonato", reason: "Todavía no hay resultados de la final de ninguna fecha." };
    } else if (pendientes.length) {
      const primera = pendientes[0];
      const corrida = dia(primera.sessions.map((s) => s.start).sort().at(-1));
      result = {
        status: "sin-campeonato",
        reason: `Faltan los resultados de la final de ${pendientes.length > 1 ? `las fechas ${lista(pendientes.map((p) => p.round))} (la primera se corrió` : `la fecha ${primera.round} (se corrió`} el ${corrida}): el sitio oficial todavía no los publicó y sin ellos la tabla estaría atrasada.`,
      };
    } else if (!oficial?.fechas?.length) {
      result = { status: "sin-campeonato", reason: "No pudimos leer la tabla oficial para verificar el cálculo, y no publicamos un campeonato sin verificarlo." };
    } else {
      const v = validar(calc, oficial);
      if (v.ok) {
        result = { status: "calculado", asOfRound: calc.asOfRound, validatedThrough: v.hasta, rows: calc.rows };
      } else {
        const rounds = [...new Set(v.difs.map((d) => d.round))];
        const d = v.difs[0];
        result = {
          status: "sin-campeonato",
          reason: `Nuestro cálculo con el reglamento no coincide con la tabla oficial en ${rounds.length} de las ${oficial.fechas.length} fechas que ésta cubre (por ejemplo, el auto ${d.number} de la fecha ${d.round}: ${String(d.calculado).replace(".", ",")} contra ${String(d.oficial).replace(".", ",")} puntos). La tabla oficial incluye ajustes que no figuran en las planillas, como invitados que no suman o exclusiones anunciadas aparte.`,
        };
      }
    }
    const before = previous?.[clase.id];
    // Nunca se achica: una tabla calculada antes no se reemplaza por una con menos pilotos o que llega a una fecha anterior.
    if (before?.status === "calculado" && result.status === "calculado" && (result.asOfRound < before.asOfRound || result.rows.length < before.rows.length)) result = before;
    out[clase.id] = result;
  }
  return out;
}
