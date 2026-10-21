// Fórmula Nacional Argentina 2026 (monoplazas Renault 2.0) desde el sitio oficial, formulanacional.com.ar (PHP con el HTML ya armado; robots.txt
// no prohíbe nada). Salen de ahí el calendario, el cronograma y los tiempos de cada sesión (la página "tiempos" de cada fecha publica práctica
// libre, entrenamientos, clasificación y carreras con hora, vueltas y diferencia), los pilotos con equipo y número, y el campeonato.
// Los PDF de resultados de institucional.php dicen lo mismo con menos detalle: el HTML manda y no se leen.
import { dateOnly, describeBody, pad } from "./common.mjs";

const BASE = "https://formulanacional.com.ar";
const SERIES = "formula-nacional";
const YEAR = 2026;
const SOURCE_NAME = "Fórmula Nacional Argentina (sitio oficial)";

// ---------------------------------------------------------------------------------------------------------------- HTML

const ENTITIES = {
  nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", ordm: "º", ordf: "ª", deg: "°",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", uuml: "ü",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ", Uuml: "Ü",
};

/** Texto plano de un fragmento de HTML: sin etiquetas ni comentarios, con las entidades resueltas y los espacios juntos. */
export const plain = (html) =>
  String(html ?? "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#\d+|[a-z]+);/gi, (m, e) => (e[0] === "#" ? String.fromCharCode(Number(e.slice(1))) : (ENTITIES[e] ?? m)))
    .replace(/\s+/g, " ")
    .trim();

const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** Clave de un nombre sin importar acentos, mayúsculas ni orden: "Tomás CAMPRA" y "Campra Tomas" son la misma. */
const nameKey = (s) => fold(s).replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean).sort().join(" ");
/** "Tomás CAMPRA" → "Tomás Campra" (el sitio escribe el apellido en mayúsculas). */
export const properName = (s) => plain(s).toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, p, c) => p + c.toUpperCase());

const MONTHS = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const WEEKDAYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const WEEKDAY_NAMES = { miercoles: "miércoles", sabado: "sábado" };

// ---------------------------------------------------------------------------------------------------------------- calendario

/** Las fechas del calendario: número, último día (el sitio sólo publica ése, "DD-MM"), nombre del lugar y número de evento del sitio. */
export function parseCalendar(html) {
  const out = [];
  const seen = new Set();
  for (const box of String(html).split('class="box-fechas"').slice(1)) {
    const round = Number(box.match(/class="item-fechas">\s*(\d+)/)?.[1]);
    const end = box.match(/class="gris">\s*(\d{1,2})-(\d{1,2})\s*</);
    const id = box.match(/accion=historial&(?:amp;)?id=(\d+)/)?.[1];
    const place = plain(box.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1]);
    if (!round || !end || !id || !place || seen.has(round)) continue;
    seen.add(round);
    out.push({ round, end: { d: Number(end[1]), m: Number(end[2]) }, place, siteId: id });
  }
  return out.sort((a, b) => a.round - b.round);
}

/** Circuito de la página de historial: "Autódromo X", "Lugar Ciudad, Provincia". Devuelve null si la fecha todavía no tiene sede. */
export function parseCircuit(html) {
  const block = String(html).match(/class="detalle_autodromo">([\s\S]*?)<\/h5>/)?.[1];
  if (!block) return null;
  const name = plain(block.match(/<h4>([\s\S]*?)<\/h4>/)?.[1]);
  const place = plain(block.match(/Lugar\s*([^<]*)/)?.[1]);
  if (!name || /a confirmar/i.test(name) || /a confirmar/i.test(place)) return null;
  const [first, ...rest] = place.split(",").map((s) => s.trim()).filter(Boolean);
  const nameParts = name.split(",").map((s) => s.trim());
  const province = (rest.at(-1) ?? first ?? "").replace(/^rio negro$/i, "Río Negro");
  // "Autódromo de Toay, Provincia de La Pampa": la ciudad está en el nombre y el "Lugar" es sólo la provincia.
  const city = rest.length ? first : (nameParts[0].match(/^Aut[óo]dromo de ([A-ZÁÉÍÓÚÑ][\p{L} ]+)$/u)?.[1] ?? first ?? "");
  return { name: nameParts[0], city, province };
}

// ---------------------------------------------------------------------------------------------------------------- pilotos y campeonato

/** Pilotos por equipo: nombre, número de auto y equipo. */
export function parsePilots(html) {
  const out = new Map();
  let team = "";
  const re = /nombre_equipo">\s*<h2>([\s\S]*?)<\/h2>|<h3>\s*(\d+)\s*<\/h3>\s*<p>([\s\S]*?)<\/p>/g;
  for (const m of String(html).matchAll(re)) {
    if (m[1] !== undefined) team = plain(m[1]);
    else out.set(nameKey(plain(m[3])), { name: properName(m[3]), number: m[2], team });
  }
  return out;
}

/** Campeonato de pilotos (pestaña "Pilotos"): posición, piloto y total. Sin descartes: el sitio publica el total tal cual. */
export function parseStandings(html) {
  const tab = String(html).match(/id="tabs-1"[\s\S]*?(?=id="tabs-2"|$)/)?.[0] ?? "";
  const rows = [];
  for (const block of tab.split('<ul class="puntajes">').slice(1)) {
    const pos = Number(block.match(/class="posicion[^"]*">\s*(\d+)/)?.[1]);
    const driver = properName(block.match(/class="piloto">([\s\S]*?)<\/li>/)?.[1] ?? "");
    const points = Number(plain(block.match(/class="total">([\s\S]*?)<\/li>/)?.[1]));
    // Los puntos de cada fecha (página "fecha por fecha"): una celda por fecha del calendario, en orden.
    const perRound = [...(block.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1].matchAll(/<td>\s*(\d+)\s*<\/td>/g) ?? [])].map((c) => Number(c[1]));
    if (pos && driver && Number.isFinite(points)) rows.push({ pos, driver, points, perRound });
  }
  return rows;
}

// ---------------------------------------------------------------------------------------------------------------- tiempos de una fecha

const dayKey = ({ y, m, d }) => `${y}-${pad(m)}-${pad(d)}`;
const shift = ({ y, m, d }, days) => {
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
};

/**
 * "Carrera 1 Sábado 2 de mayo de 2026, 15:10 a 15:30hs,15 min. + 1 vta" → título, día de la semana, número de día, mes, hora de inicio y de fin.
 * El sitio tiene errores de tipeo en las fechas (un "2016", un "noviembre 2025" en una fecha de agosto): el mes y el año se leen pero no mandan,
 * ver `resolveDay`.
 */
export function parseHeading(text) {
  const t = plain(text);
  const m = t.match(/^(.*?)\s*\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s+(\d{1,2})\s+de\s+([a-záéíóú]+)[^\d]*?(\d{4})?\s*[,;:.]?\s*(\d{1,2}):(\d{2})(?:\s*a\s*(\d{1,2}):(\d{2}))?/i);
  if (!m) return { title: t, weekday: null };
  return {
    title: m[1].trim(),
    weekday: fold(m[2]),
    day: Number(m[3]),
    month: MONTHS[fold(m[4])] ?? null,
    year: m[5] ? Number(m[5]) : null,
    start: { h: Number(m[6]), min: Number(m[7]) },
    end: m[8] ? { h: Number(m[8]), min: Number(m[9]) } : null,
  };
}

/**
 * Día de una sesión dentro del fin de semana que termina el `end`. Se acepta el día del mes sólo si cae en los cuatro días del fin de semana
 * y su día de la semana coincide con el escrito: así un mes o un año mal tipeados no mueven la sesión. Devuelve { day, repaired } o null.
 */
export function resolveDay(heading, end) {
  for (let back = 0; back <= 3; back++) {
    const day = shift(end, -back);
    if (day.d !== heading.day) continue;
    if (WEEKDAYS[new Date(Date.UTC(day.y, day.m - 1, day.d)).getUTCDay()] !== heading.weekday) continue;
    return { day, repaired: heading.month !== day.m || (heading.year !== null && heading.year !== day.y) };
  }
  return null;
}

const KINDS = [
  [/^(gral\.?|general)\b/i, null], // repiten las prácticas sueltas, ordenadas por mejor vuelta
  [/^pr[aá]cticas? oficiales\b/i, null],
  [/^tanda libre/i, { kind: "practica", name: "Tanda libre", slug: "tl" }],
  [/^pr[aá]ctica oficial\s*(\d)/i, (m) => ({ kind: "practica", name: `Práctica oficial ${m[1]}`, slug: `p${m[1]}` })],
  [/^(\d)\s*[°º]?\s*entrenamiento/i, (m) => ({ kind: "practica", name: `${m[1]}° Entrenamiento`, slug: `p${m[1]}` })],
  [/^clasificaci/i, { kind: "clasificacion", name: "Clasificación", slug: "q" }],
  [/^carrera\b/i, { kind: "carrera", name: "Carrera", slug: "r" }],
];

/** Qué sesión es un título del sitio. `null` = se ignora a propósito; `undefined` = no se reconoce. */
function classify(title) {
  for (const [re, spec] of KINDS) {
    const m = title.match(re);
    if (m) return typeof spec === "function" ? spec(m) : spec;
  }
  return undefined;
}

const lapTime = (s) => plain(s);
const isZero = (s) => !s || /^0*[.:]?0*$/.test(s.replace(/[:.]/g, ""));

/** Filas de una tabla de tiempos: Posición | Piloto | Marca | Vueltas | Tiempo | Diferencia. */
function tableRows(body) {
  const rows = [];
  for (const tr of body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((c) => plain(c[1]));
    if (cells.length < 6 || !/^\d+$/.test(cells[0])) continue;
    rows.push({ pos: Number(cells[0]), name: cells[1], laps: Number(cells[3]) || 0, time: lapTime(cells[4]), diff: lapTime(cells[5]) });
  }
  return rows;
}

/** Las grillas de salida ("Lugar de Partida"), una lista por carrera y en el mismo orden que las carreras. */
function gridLists(html) {
  const out = [];
  for (const chunk of String(html).split(/<li>\s*<h3>/).slice(1)) {
    if (!/Lugar de Partida/.test(chunk)) continue;
    const grid = new Map();
    for (const m of chunk.matchAll(/<h5>\s*(\d+)\s*-\s*Lugar de Partida[\s\S]*?<h5 class="amarillo[^"]*">([^<]*)<\/h5>/g)) grid.set(nameKey(plain(m[2])), Number(m[1]));
    out.push(grid);
  }
  return out;
}

/**
 * Todas las sesiones publicadas en la página de tiempos de una fecha. `end` es el último día del fin de semana (del calendario).
 * Devuelve { sessions, problems, repairs }: `problems` son encabezados que no se pudieron ubicar (no se inventan) y `repairs` los errores
 * de fecha del sitio que se corrigieron por el día de la semana.
 */
export function parseTiempos(html, end) {
  const sessions = [];
  const problems = [];
  const repairs = [];
  const heads = [...String(html).matchAll(/<h5><i class="fa fa-caret-down"><\/i>([\s\S]*?)<\/h5>/g)];
  const gridsEnd = String(html).indexOf("lista_grillas");
  heads.forEach((m, i) => {
    const heading = parseHeading(m[1]);
    const spec = classify(heading.title);
    if (spec === null) return;
    if (spec === undefined) {
      problems.push(`sesión "${heading.title}" no reconocida`);
      return;
    }
    const stop = i + 1 < heads.length ? heads[i + 1].index : gridsEnd === -1 ? html.length : gridsEnd;
    const rows = tableRows(html.slice(m.index + m[0].length, stop));
    if (!heading.weekday || !heading.start) {
      problems.push(`${spec.name}: el encabezado no trae día y hora ("${heading.title}")`);
      return;
    }
    const resolved = resolveDay(heading, end);
    if (!resolved) {
      problems.push(`${spec.name}: "${plain(m[1])}" no cae en el fin de semana de la fecha`);
      return;
    }
    if (resolved.repaired) repairs.push(`${spec.name}: el sitio escribe "${heading.day} de ${Object.keys(MONTHS).find((k) => MONTHS[k] === heading.month) ?? "?"}${heading.year ? ` ${heading.year}` : ""}" y se toma el ${WEEKDAY_NAMES[heading.weekday] ?? heading.weekday} ${resolved.day.d}/${resolved.day.m}`);
    const { h, min } = heading.start;
    const durationMin = heading.end ? Math.max(0, (heading.end.h * 60 + heading.end.min) - (h * 60 + min)) : 0;
    sessions.push({ ...spec, day: resolved.day, start: `${dayKey(resolved.day)}T${pad(h)}:${pad(min)}:00-03:00`, durationMin, rows });
  });

  // Carrera sola → "Carrera"; dos o más → "Carrera 1", "Carrera 2" (el sitio las llama "Carrera" y "Carrera Final", o 1 y 2).
  const races = sessions.filter((s) => s.kind === "carrera");
  races.forEach((s, i) => {
    if (races.length > 1) Object.assign(s, { name: `Carrera ${i + 1}`, slug: `r${i + 1}` });
  });
  // Grilla de salida: sólo si hay una lista por carrera.
  const grids = gridLists(html);
  if (grids.length === races.length) races.forEach((s, i) => (s.grid = grids[i]));
  sessions.sort((a, b) => a.start.localeCompare(b.start));
  return { sessions, problems, repairs };
}

/** Filas de resultado de una sesión, con equipo y número del auto de la página de pilotos. */
export function resultRows(session, pilots) {
  const leader = session.rows[0];
  const race = session.kind === "carrera";
  return session.rows.map((r, i) => {
    const pilot = pilots.get(nameKey(r.name));
    const behind = leader && race ? leader.laps - r.laps : 0;
    let gap = "";
    if (i === 0) gap = r.time;
    else if (behind > 0) gap = `+${behind} ${behind === 1 ? "vuelta" : "vueltas"}`;
    else if (!isZero(r.diff)) gap = `+${r.diff}`;
    const grid = session.grid?.get(nameKey(r.name));
    return {
      pos: r.pos,
      driver: pilot?.name ?? properName(r.name),
      team: pilot?.team ?? "",
      ...(pilot?.number ? { number: pilot.number } : {}),
      gap,
      ...(r.laps ? { laps: r.laps } : {}),
      ...(grid ? { grid } : {}),
    };
  });
}

// ---------------------------------------------------------------------------------------------------------------- temporada

/** El sitio llama "La Pampa" a la fecha del autódromo de Toay (los PDF de resultados dicen "Toay"). */
const PLACE_ALIAS = { "la pampa": "Toay" };
const TBC = /a confirmar/i;

const dayMs = 86_400_000;

/**
 * Fecha sin horarios publicados (el cronograma del sitio es una imagen): el formato fijo del fin de semana de las fechas 3 a 7, cada sesión en su día y
 * sin hora ("horario a confirmar"): sábado dos prácticas oficiales, clasificación y carrera 1; domingo (último día) carrera 2. No se pone nada el viernes
 * (la tanda libre no está en todas). Los ids son los mismos que cuando el sitio publica los tiempos, así que las sesiones reales los reemplazan.
 */
function placeholder(round, end) {
  const saturday = shift({ y: YEAR, ...end }, -1);
  const at = (day) => dateOnly(day.y, day.m, day.d);
  const id = (slug) => `${SERIES}-${YEAR}-${round}-${slug}`;
  return [
    { id: id("p1"), kind: "practica", name: "Práctica oficial 1", start: at(saturday), timeKnown: false, durationMin: 20 },
    { id: id("p2"), kind: "practica", name: "Práctica oficial 2", start: at(saturday), timeKnown: false, durationMin: 20 },
    { id: id("q"), kind: "clasificacion", name: "Clasificación", start: at(saturday), timeKnown: false, durationMin: 15 },
    { id: id("r1"), kind: "carrera", name: "Carrera 1", start: at(saturday), timeKnown: false, durationMin: 20 },
    { id: id("r2"), kind: "carrera", name: "Carrera 2", start: at({ y: YEAR, ...end }), timeKnown: false, durationMin: 30 },
  ];
}

/**
 * Fórmula Nacional Argentina: calendario, sesiones con horario y resultados, y campeonato de pilotos.
 * `windowDays`: las fechas ya corridas hace más que eso no se vuelven a pedir si ya tienen resultados (se toman de la versión anterior).
 */
export async function formulaNacionalSeason(io, previous = { events: [], standings: {}, meta: {} }, { windowDays = 21, delayMs = 400, now = new Date() } = {}) {
  const errors = [];
  const notes = [];
  const pause = async () => io.sleep(delayMs);

  const calendarHtml = await io.text(`${BASE}/carreras.php?evento=calendario`, { revalidate: 300 });
  const calendar = parseCalendar(calendarHtml);
  if (calendar.length < 2) throw new Error(`el calendario no trajo fechas (${describeBody(calendarHtml)})`);

  await pause();
  const pilots = parsePilots(await io.text(`${BASE}/equipos.php?accion=pilotos`, { revalidate: 3600 }));
  if (!pilots.size) errors.push("no se pudo leer la página de pilotos (resultados sin equipo ni número)");

  const before = new Map((previous.events ?? []).filter((e) => e.seriesId === SERIES).map((e) => [e.id, e]));
  const nowMs = now.getTime();
  const events = [];
  let fetched = 0;
  for (const c of calendar) {
    const id = `${SERIES}-${YEAR}-${c.round}`;
    const old = before.get(id);
    const lastDay = Date.parse(`${YEAR}-${pad(c.end.m)}-${pad(c.end.d)}T23:59:00-03:00`);
    // Una fecha vieja que ya tiene resultados no se vuelve a pedir; las que vienen o pasaron hace poco, sí.
    const settled = old?.sessions.some((s) => s.results?.length) && lastDay < nowMs - windowDays * dayMs;
    const recent = lastDay >= nowMs - windowDays * dayMs;
    const sourceUrl = `${BASE}/carreras.php?accion=tiempos&id=${c.siteId}`;

    let circuit = old?.circuit && !TBC.test(old.circuit.name) ? old.circuit : null;
    let sessions = old?.sessions ?? [];
    if (!settled && (recent || !old?.sessions.some((s) => s.results?.length))) {
      try {
        if (fetched++) await pause();
        const tiempos = parseTiempos(await io.text(sourceUrl, { revalidate: 120 }), { y: YEAR, m: c.end.m, d: c.end.d });
        for (const p of tiempos.problems) errors.push(`fecha ${c.round}: ${p}`);
        for (const r of tiempos.repairs) notes.push(`Fecha ${c.round} (${c.place}) · ${r}`);
        if (tiempos.sessions.length) {
          sessions = tiempos.sessions.map((s) => {
            const results = s.rows.length ? resultRows(s, pilots) : [];
            return {
              id: `${id}-${s.slug}`,
              kind: s.kind,
              name: s.name,
              start: s.start,
              timeKnown: true,
              durationMin: s.durationMin || (s.kind === "carrera" ? 25 : 15),
              ...(results.length ? { results, resultsSource: { name: SOURCE_NAME, url: sourceUrl } } : {}),
            };
          });
        } else if (!old?.sessions.some((s) => s.timeKnown)) {
          sessions = placeholder(c.round, c.end);
        }
      } catch (error) {
        errors.push(`fecha ${c.round}: ${error.message}`);
        if (!sessions.length) sessions = placeholder(c.round, c.end);
      }
    }
    if (!sessions.length) sessions = placeholder(c.round, c.end);

    if (!circuit) {
      try {
        if (fetched++) await pause();
        circuit = parseCircuit(await io.text(`${BASE}/carreras.php?accion=historial&id=${c.siteId}`, { revalidate: 21600 }));
      } catch (error) {
        errors.push(`fecha ${c.round}: circuito: ${error.message}`);
      }
    }

    const tbc = TBC.test(c.place);
    // El calendario escribe bien el nombre ("Junín"); el historial a veces lo escribe sin tilde ("Junin"): si es la misma ciudad, manda el calendario.
    const calendarName = c.place.replace(/,.*$/, "").trim();
    const city = PLACE_ALIAS[fold(c.place)] ?? (circuit?.city && fold(circuit.city) !== fold(calendarName) ? circuit.city : tbc ? "A confirmar" : calendarName);
    events.push({
      id,
      seriesId: SERIES,
      round: c.round,
      name: `Fecha ${c.round} · ${city}`,
      circuit: circuit
        ? { name: circuit.name, city, country: "Argentina", flag: "AR", ...(circuit.province ? { province: circuit.province } : {}) }
        : { name: tbc ? "A confirmar" : c.place, city, country: "Argentina", flag: "AR" },
      sessions,
      source: "Fórmula Nacional Argentina (sitio oficial)",
    });
  }

  // Campeonato: la tabla de pilotos y, de la página "fecha por fecha", hasta qué fecha llegan los puntos.
  await pause();
  let standings = [];
  let asOfRound;
  try {
    const table = parseStandings(await io.text(`${BASE}/estadisticas.php?accion=posiciones`, { revalidate: 300 }));
    standings = table.map((r) => ({ pos: r.pos, driver: r.driver, team: pilots.get(nameKey(r.driver))?.team ?? "", points: r.points }));
    try {
      await pause();
      const byRound = parseStandings(await io.text(`${BASE}/estadisticas.php?accion=por_fecha`, { revalidate: 300 }));
      const scored = Math.max(0, ...byRound.map((r) => r.perRound.findLastIndex((p) => p > 0) + 1));
      if (scored) asOfRound = scored;
      // Control: el total de la tabla tiene que ser la suma de sus fechas (si no, el sitio aplica descartes o se desactualizó una de las dos).
      const sums = new Map(byRound.map((r) => [nameKey(r.driver), r.perRound.reduce((a, b) => a + b, 0)]));
      const off = table.filter((r) => sums.has(nameKey(r.driver)) && sums.get(nameKey(r.driver)) !== r.points);
      if (off.length) notes.push(`Campeonato: ${off.length} pilotos con un total distinto de la suma de sus fechas (${off.slice(0, 3).map((r) => `${r.driver} ${r.points}`).join(", ")}); se muestra el total del sitio`);
    } catch (error) {
      errors.push(`fecha por fecha: ${error.message}`);
    }
  } catch (error) {
    errors.push(`campeonato: ${error.message}`);
  }

  return {
    events,
    standings: { [SERIES]: standings },
    meta: {
      [SERIES]: { standingsLabel: "Pilotos", ...(asOfRound ? { standingsAsOfRound: asOfRound } : {}), ...(notes.length ? { notes } : {}) },
      formulaNacional: { events: events.length, errors },
    },
  };
}
