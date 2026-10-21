// Fórmula 2 Argentina 2026 desde el sitio oficial (formula2.com.ar, WordPress con tablas HTML en el servidor, robots.txt sin restricciones para
// estas páginas): calendario, resultados de cada fecha (clasificación, carrera clasificatoria y final), campeonato de pilotos y equipos de las fichas.
// La organiza y fiscaliza la ACTC y corre junto al TC en todas las fechas; no tiene nada que ver con la Fórmula 2 de la FIA (`f2`).
//
// Qué publica el sitio y qué no:
// - Calendario (/calendario-2026/): un solo día por fecha, el de la final (el domingo). No publica horarios. Las horas salen de las notas de cronograma
//   del TC en actc.org.ar (bloque "Todos los horarios", líneas "Fórmula 2"; ver `applyF2Schedule`, que season.mjs llama con el consenso de
//   horarios). Mientras no hay nota, el formato fijo del finde con la hora "a confirmar": entrenamientos, clasificación y carrera clasificatoria
//   el sábado (el día anterior al del calendario) y la final el domingo.
// - Resultados (/fecha-N-2026/): una tabla por sesión, "APELLIDO NOMBRE", con vueltas, tiempo y diferencia. Una fecha sin página (404) todavía no se corrió.
// - Campeonato (/campeonato-de-pilotos-2026/): la tabla con puntos y victorias. Dice "(9/12)" pero ya suma las 10 victorias de las 10 finales
//   corridas; para no ocultar una tabla al día ni mostrar una atrasada, la fecha hasta la que llega se toma del mayor de los dos números.
// Nombres: las tablas traen "APELLIDO NOMBRE" casi siempre, pero hay erratas ("SALVADOR AUDISIO" en 11 filas, "GUTIERREZ FACUNDOF"); el número del auto
// identifica a la persona y manda el orden más repetido. El campeonato escribe a algunos "NOMBRE APELLIDO": ahí también se busca por número.
import { dateOnly } from "./common.mjs";
import { keepSessionData, missingEvents } from "./guard.mjs";

const SITE = "https://formula2.com.ar";
const SERIES = "f2-arg";
const YEAR = 2026;
const MAX_ROUNDS = 12;
const DAY = 86400000;
const SOURCE = "Fórmula 2 Argentina (formula2.com.ar)";

const decode = (s) =>
  String(s)
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;|&#8212;/g, "-")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"');
const text = (html) => decode(String(html).replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const fold = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Sedes con el nombre y la ciudad que usa la ACTC (mismas ciudades que el TC, para "Corren el mismo finde").
const SEDES = {
  viedma: { name: "Ciudad de Viedma", city: "Viedma", province: "Río Negro" },
  neuquen: { name: "Parque Provincia del Neuquén", city: "Centenario", province: "Neuquén" },
  "concepcion del uruguay": { name: "Ciudad de Concepción del Uruguay", city: "Concepción del Uruguay", province: "Entre Ríos" },
  "termas de rio hondo": { name: "Autódromo Internacional de Termas de Río Hondo", city: "Termas de Río Hondo", province: "Santiago del Estero" },
  "alta gracia": { name: "Oscar Cabalén", city: "Alta Gracia", province: "Córdoba" },
  posadas: { name: "Rosamonte", city: "Posadas", province: "Misiones" },
  villicum: { name: "San Juan Villicum", city: "Albardón", province: "San Juan" },
  parana: { name: "Ciudad de Paraná", city: "Paraná", province: "Entre Ríos" },
  "san luis": { name: "Rosendo Hernández", city: "San Luis", province: "San Luis" },
  "san nicolas": { name: "Ciudad San Nicolás", city: "San Nicolás", province: "Buenos Aires" },
  rosario: { name: "Juan Manuel Fangio-ROSARIO", city: "Rosario", province: "Santa Fe" },
  "la plata": { name: "Roberto José Mouras", city: "La Plata", province: "Buenos Aires" },
};
const sedeDe = (venue) => {
  const s = SEDES[fold(venue)];
  return { name: s?.name ?? venue, city: s?.city ?? venue, country: "Argentina", flag: "AR", province: s?.province ?? "" };
};

// ---------------------------------------------------------------------------------------------------------------- nombres

// Erratas de la fuente y acentos que el sitio no escribe. Sólo lo que hace falta: la regla general es "APELLIDO NOMBRE" → "Nombre Apellido".
const ERRATAS = { facundof: "facundo" };
const ACENTOS = { joaquin: "Joaquín", sebastian: "Sebastián", ivan: "Iván", gutierrez: "Gutiérrez" };
const PARTICULAS = new Set(["de", "del", "la", "las", "los", "da", "di", "van", "von"]);
const title = (w) => ACENTOS[fold(w)] ?? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

/** "LEONARDELLI JUAN PABLO" → "Juan Pablo Leonardelli" (apellido primero; las partículas "DE LA" se pegan al apellido). */
export function nombreDe(raw) {
  const words = String(raw).replace(/\s+/g, " ").trim().split(" ").filter(Boolean).map((w) => ERRATAS[fold(w)] ?? w);
  if (words.length < 2) return words.map(title).join(" ");
  let n = 1;
  while (n < words.length - 1 && PARTICULAS.has(fold(words[n - 1]))) n++;
  return [...words.slice(n), ...words.slice(0, n)].map(title).join(" ");
}

/**
 * Nombre de cada número de auto: el orden de palabras más repetido entre todas las filas de resultados de la temporada
 * ("AUDISIO SALVADOR" 17 veces, "SALVADOR AUDISIO" 11). → Map número → "Nombre Apellido".
 */
function nombresPorNumero(sections) {
  const votes = new Map();
  for (const rows of sections) {
    for (const r of rows) {
      if (!r.number) continue;
      const name = nombreDe(r.raw);
      const byName = votes.get(r.number) ?? new Map();
      byName.set(name, (byName.get(name) ?? 0) + 1);
      votes.set(r.number, byName);
    }
  }
  return new Map([...votes].map(([number, byName]) => [number, [...byName].sort((a, b) => b[1] - a[1])[0][0]]));
}

// ---------------------------------------------------------------------------------------------------------------- lectura de páginas

/** Calendario: [{ round, month, day, venue }]. Cada fila es "1º | 8 de Marzo | Viedma ✓". */
export function parseCalendario(html) {
  const meses = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
  const out = [];
  for (const tr of String(html).match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => text(m[1]));
    const round = Number(cells[0]?.match(/^(\d{1,2})\s*[º°o]?$/)?.[1]);
    const when = cells[1]?.match(/^(\d{1,2})\s+de\s+([a-záéíóú]+)/i);
    const month = meses[fold(when?.[2] ?? "")];
    const venue = (cells[2] ?? "").replace(/[✓✔]/g, "").trim();
    if (round && when && month && venue) out.push({ round, month, day: Number(when[1]), venue });
  }
  return out.sort((a, b) => a.round - b.round);
}

/** Tipo de sesión según el título de la tabla ("» CARRERA CLASIFICATORIA"). null si no se reconoce. */
export function tipoDeSesion(heading) {
  const t = fold(heading).replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  if (/^final\b/.test(t)) return "final";
  if (/clasificatoria|serie/.test(t)) return "serie";
  if (/clasificacion/.test(t)) return "clasificacion";
  if (/entrenamiento|practica|libre/.test(t)) return "practica";
  return null;
}

/**
 * Página de una fecha: las tablas con su título, en el orden de la página. → { sections: [{ heading, kind, rows }], unknown: [títulos] }.
 * Cada fila: { pos (texto), number, raw (nombre), laps, time, diff }. La tabla de clasificación no tiene la columna de vueltas.
 */
export function parseFecha(html) {
  const sections = [];
  const unknown = [];
  const re = /»\s*([^<]+?)\s*<[\s\S]*?(<table[\s\S]*?<\/table>)/g;
  for (const m of String(html).matchAll(re)) {
    const heading = text(m[1]);
    const table = m[2];
    const header = [...(table.match(/<thead[\s\S]*?<\/thead>/)?.[0] ?? "").matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((h) => fold(text(h[1])));
    const withLaps = header.some((h) => /^vtas|vueltas/.test(h));
    const rows = [];
    for (const tr of table.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
      const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => text(c[1]));
      if (cells.length < 3 || !cells[2]) continue;
      const [pos, number, raw, ...rest] = cells;
      const [laps, time, diff] = withLaps ? rest : ["", rest[0], rest[1]];
      rows.push({ pos, number, raw, laps: laps ?? "", time: time ?? "", diff: diff ?? "" });
    }
    const kind = tipoDeSesion(heading);
    if (!kind) unknown.push(heading);
    else sections.push({ heading, kind, rows });
  }
  return { sections, unknown };
}

/** Fichas de /pilotos/: número → equipo. Los nombres de esa página están escritos al revés a veces: no se usan. */
export function parsePilotos(html) {
  const teams = new Map();
  for (const m of String(html).matchAll(/<span class="numero">\s*(\d+)\s*<\/span>[\s\S]*?<strong>Equipo:<\/strong>([^<]*)/g)) {
    const team = decode(m[2]).replace(/\s+/g, " ").trim();
    if (team && team !== "—") teams.set(m[1], team);
  }
  return teams;
}

/** Campeonato: { rows: [{ pos, number, raw, points, wins }], label: "9/12" | null }. Los puntos van con coma decimal ("415,5"); las victorias, "x4". */
export function parseCampeonato(html) {
  const table = String(html).match(/<table[\s\S]*?<\/table>/)?.[0] ?? "";
  const rows = [];
  for (const tr of table.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => text(c[1]));
    const pos = Number(cells[0]);
    const points = Number(String(cells[3] ?? "").replace(",", "."));
    if (!pos || !cells[2] || !Number.isFinite(points)) continue;
    rows.push({ pos, number: cells[1], raw: cells[2], points, wins: Number(cells[4]?.match(/x\s*(\d+)/i)?.[1] ?? 0) });
  }
  const label = String(html).match(/\((\d{1,2})\s*\/\s*(\d{1,2})\)/);
  return { rows, label: label ? { done: Number(label[1]), total: Number(label[2]) } : null };
}

// ---------------------------------------------------------------------------------------------------------------- filas del modelo

/** "4.442" → "+4.442"; "29.29" → "+29.290" (el sitio quita ceros del final). Lo que no es un tiempo ("2 vts.", "--") no es una diferencia. */
const gapTime = (diff) => {
  const m = String(diff).match(/^(\d+:)?(\d+)\.(\d{1,3})$/);
  return m ? `+${m[1] ?? ""}${m[2]}.${m[3].padEnd(3, "0")}` : "";
};
const lapsBehind = (diff) => {
  const n = Number(String(diff).match(/^(\d+)\s*(?:vts?|vueltas?)\b/i)?.[1]);
  return n > 0 ? n : 0;
};
const empty = (s) => !s || /^-+$/.test(s);

/**
 * Filas del modelo de una tabla. El primero lleva su tiempo (la carrera) o su mejor vuelta (la clasificación) y los demás la diferencia; quien está
 * a vueltas, "+N vueltas". Un "EX" es una exclusión de los comisarios; una fila sin vueltas ni tiempo, un auto que no registró nada.
 */
export function filasDe(rows, kind, nombres, equipos) {
  const race = kind === "serie" || kind === "final";
  return rows.map((r, i) => {
    const excluded = /^(ex|dq|dsq)$/i.test(r.pos);
    const noTime = !excluded && (race ? empty(r.laps) && empty(r.time) && empty(r.diff) : empty(r.time));
    const behind = lapsBehind(r.diff);
    const lead = i === 0 && !excluded;
    const laps = Number(r.laps);
    const gap = excluded || noTime ? "" : lead ? (empty(r.time) ? "" : r.time) : behind ? `+${behind} ${behind === 1 ? "vuelta" : "vueltas"}` : gapTime(r.diff);
    return {
      pos: i + 1,
      ...(excluded ? { positionText: "EX", status: "Excluido" } : noTime ? { status: race ? "Sin vueltas" : "Sin tiempo" } : {}),
      number: r.number,
      driver: nombres.get(r.number) ?? nombreDe(r.raw),
      team: equipos.get(r.number) ?? "",
      gap,
      ...(race && laps > 0 ? { laps } : {}),
    };
  });
}

// Formato fijo del finde (el mismo que publica la ACTC cada fecha): dos entrenamientos, la clasificación y la carrera clasificatoria el sábado, la final
// el domingo. Los nombres son los que lee `parseSchedule` en las notas de cronograma del TC, para que la hora oficial caiga en la sesión que corresponde.
const SESSIONS = [
  { kind: "practica", suffix: "practica1", name: "1° Entrenamiento", durationMin: 30, saturday: true },
  { kind: "practica", suffix: "practica2", name: "2° Entrenamiento", durationMin: 30, saturday: true },
  { kind: "clasificacion", suffix: "clasificacion", name: "Clasificación", durationMin: 10, saturday: true },
  { kind: "serie", suffix: "serie", name: "Carrera clasificatoria", durationMin: 10, saturday: true },
  { kind: "final", suffix: "final", name: "Final", durationMin: 20, saturday: false },
];

const isoDay = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
const dayBefore = (c) => {
  const [y, m, d] = isoDay(YEAR, c.month, c.day - 1).split("-").map(Number);
  return { y, m, d };
};

/**
 * Horas oficiales de una fecha: las sesiones de `consensus` (buildConsensus de las notas de cronograma de la ACTC, ya con la categoría `f2-arg`)
 * que caen en el fin de semana de la fecha. Cada una pisa la hora "a confirmar" de la sesión del mismo nombre; las que la nota no trae quedan como estaban.
 */
export function applyF2Schedule(event, consensus) {
  const finalDay = event.sessions.find((s) => s.kind === "final")?.start.slice(0, 10);
  if (!finalDay) return event;
  const [y, m, d] = finalDay.split("-").map(Number);
  const from = isoDay(y, m, d - 3);
  const found = consensus.filter((s) => s.seriesId === SERIES && s.date >= from && s.date <= finalDay);
  if (!found.length) return event;
  const sessions = event.sessions.map((s) => {
    const hit = found.find((f) => f.name === s.name);
    if (!hit) return s;
    const start = `${hit.date}T${hit.start}:00-03:00`;
    const minutes = hit.end ? Math.max(5, (Date.parse(`${hit.date}T${hit.end}:00-03:00`) - Date.parse(start)) / 60000) : s.durationMin;
    return { ...s, start, timeKnown: true, durationMin: minutes, timeStatus: hit.status, timeSources: hit.sources };
  });
  return { ...event, sessions: sessions.sort((a, b) => Date.parse(a.start) - Date.parse(b.start)) };
}

function eventFor(c) {
  const id = `${SERIES}-${YEAR}-${c.round}`;
  const sunday = dateOnly(YEAR, c.month, c.day);
  const saturday = (({ y, m, d }) => dateOnly(y, m, d))(dayBefore(c));
  const sede = sedeDe(c.venue);
  return {
    id,
    seriesId: SERIES,
    round: c.round,
    name: `Fecha ${c.round} · ${sede.city}`,
    circuit: sede,
    sessions: SESSIONS.map((s) => ({ id: `${id}-${s.suffix}`, kind: s.kind, name: s.name, start: s.saturday ? saturday : sunday, timeKnown: false, durationMin: s.durationMin })),
    source: SOURCE,
  };
}

/** ¿Ya terminó el día de la final? (a partir de ahí la página de la fecha puede tener resultados). */
const raced = (c, now) => Date.parse(`${YEAR}-${String(c.month).padStart(2, "0")}-${String(c.day).padStart(2, "0")}T00:00:00-03:00`) <= now.getTime();

/**
 * Fórmula 2 Argentina: calendario, resultados por sesión y campeonato.
 * `windowDays`: las fechas más viejas que eso no se vuelven a pedir (se toman de la versión anterior, que nunca se achica). `now` es para las pruebas.
 */
export async function formula2ArgSeason(io, previous = { events: [], standings: {}, meta: {} }, { windowDays = 21, delayMs = 400, now = new Date() } = {}) {
  const errors = [];
  const notes = [];
  const calendario = parseCalendario(await io.text(`${SITE}/calendario-2026/`, { revalidate: 3600 })).filter((c) => c.round <= MAX_ROUNDS);
  if (!calendario.length) throw new Error("el calendario del sitio no trajo ninguna fecha");
  const before = new Map((previous.events ?? []).filter((e) => e.seriesId === SERIES).map((e) => [e.id, e]));

  // Fichas (equipos): si fallan, los resultados salen igual, sin equipo.
  let equipos = new Map();
  try {
    equipos = parsePilotos(await io.text(`${SITE}/pilotos/`, { revalidate: 3600 }));
    await io.sleep(delayMs);
  } catch (error) {
    notes.push(`Fichas de pilotos: ${error.message}`);
  }
  // El mismo equipo con y sin acento ("Werner Competición" / "Competicion") es uno solo: manda la escritura con acentos.
  const forma = new Map();
  for (const t of equipos.values()) if (!forma.has(fold(t)) || /[^\x00-\x7f]/.test(t)) forma.set(fold(t), t);
  equipos = new Map([...equipos].map(([n, t]) => [n, forma.get(fold(t))]));

  // Resultados de cada fecha ya corrida (y dentro de la ventana, o que todavía no tenemos).
  const parsed = new Map();
  for (const c of calendario) {
    const prev = before.get(`${SERIES}-${YEAR}-${c.round}`);
    if (!raced(c, now)) continue;
    const reciente = Date.parse(`${YEAR}-${String(c.month).padStart(2, "0")}-${String(c.day).padStart(2, "0")}T12:00:00-03:00`) >= now.getTime() - (windowDays + 4) * DAY;
    if (!reciente && prev?.sessions.some((s) => s.results?.length)) continue; // fuera de la ventana: se conserva lo de antes
    try {
      const html = await io.text(`${SITE}/fecha-${c.round}-${YEAR}/`, { revalidate: 120 });
      const page = parseFecha(html);
      for (const heading of page.unknown) notes.push(`Fecha ${c.round}: sección «${heading}» sin tipo conocido, no se carga`);
      parsed.set(c.round, page);
    } catch (error) {
      // Una página que todavía no existe (404) es una fecha sin resultados; cualquier otra falla se avisa y se conserva lo anterior.
      if (!/HTTP 404|\b404\b/.test(error.message)) errors.push(`Fecha ${c.round}: ${error.message}`);
    }
    await io.sleep(delayMs);
  }
  const nombres = nombresPorNumero([...parsed.values()].flatMap((p) => p.sections.map((s) => s.rows)));

  const events = [];
  for (const c of calendario) {
    const event = eventFor(c);
    const page = parsed.get(c.round);
    for (const section of page?.sections ?? []) {
      // El sitio no publica entrenamientos: si algún día lo hace, hay que decidir a cuál de los dos va cada tabla.
      const session = section.kind === "practica" ? null : event.sessions.find((s) => s.kind === section.kind);
      if (!session) {
        notes.push(`Fecha ${c.round}: «${section.heading}» no tiene sesión en el modelo, no se carga`);
        continue;
      }
      const results = filasDe(section.rows, section.kind, nombres, equipos);
      if (!results.length) continue;
      session.results = results;
      session.resultsSource = { name: "Fórmula 2 Argentina · resultados oficiales", url: `${SITE}/fecha-${c.round}-${YEAR}/` };
    }
    // La hora oficial que ya teníamos (de las notas de cronograma de la ACTC, que sólo se leen mientras están recientes) no vuelve a "a confirmar".
    const old = before.get(event.id);
    for (const s of event.sessions) {
      const was = old?.sessions.find((x) => x.id === s.id);
      if (was?.timeKnown) Object.assign(s, { start: was.start, timeKnown: true, durationMin: was.durationMin, timeStatus: was.timeStatus, timeSources: was.timeSources });
    }
    event.sessions.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    // Nada ya cargado se pierde porque el sitio de hoy no lo traiga (página caída, tabla vacía, fecha fuera de la ventana).
    events.push(keepSessionData(event, old).event);
  }
  // Una fecha que el calendario de hoy ya no trae se conserva (el sitio nunca achica la temporada).
  const lost = missingEvents(events, [...before.values()], [SERIES]);
  if (lost.length) notes.push(`El calendario del sitio dejó de traer ${lost.length} fechas que ya teníamos (${lost.map((e) => e.round).join(", ")}): se conservan`);
  events.push(...lost);
  events.sort((a, b) => a.round - b.round);

  // Campeonato.
  const meta = { standingsLabel: "Pilotos", notes, errors };
  let standings = previous.standings?.[SERIES] ?? [];
  try {
    const camp = parseCampeonato(await io.text(`${SITE}/campeonato-de-pilotos-2026/`, { revalidate: 600 }));
    if (!camp.rows.length) throw new Error("la tabla del campeonato vino vacía");
    if (camp.rows.length < standings.length) throw new Error(`la tabla trae ${camp.rows.length} pilotos y teníamos ${standings.length}`);
    const wins = camp.rows.reduce((sum, r) => sum + r.wins, 0);
    // Cada victoria es una final: la tabla cubre por lo menos tantas fechas como victorias suma, aunque el rótulo "(9/12)" diga menos.
    const asOf = Math.max(camp.label?.done ?? 0, wins);
    if (camp.label && wins > camp.label.done) notes.push(`El campeonato dice «(${camp.label.done}/${camp.label.total})» pero suma ${wins} victorias: se toma como tabla tras la fecha ${wins}`);
    standings = camp.rows.map((r, i) => ({
      pos: i + 1,
      driver: nombres.get(r.number) ?? nombreDe(r.raw),
      team: equipos.get(r.number) ?? "",
      points: r.points,
      ...(r.wins ? { wins: r.wins } : {}),
    }));
    meta.standingsAsOfRound = Math.min(asOf, calendario.length);
  } catch (error) {
    errors.push(`Campeonato: ${error.message} (se conserva la tabla anterior)`);
    if (previous.meta?.[SERIES]?.standingsAsOfRound !== undefined) meta.standingsAsOfRound = previous.meta[SERIES].standingsAsOfRound;
  }

  return { events, standings: { [SERIES]: standings }, meta: { [SERIES]: meta } };
}
