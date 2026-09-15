// GT World Challenge Europe 2026 (GT3) desde Wikipedia (en): calendario del Sprint Cup y del Endurance Cup, clasificación de
// cada carrera (sale del campeonato de pilotos, que tiene la posición de cada tripulación en cada carrera) y ganadores por clase.
import { COUNTRY_ISO, dateOnly, dayMonth } from "./common.mjs";
import { clean, intOf, section, tables, texts } from "./wikitext.mjs";

const COUNTRY_BY_CIRCUIT = [
  [/brands hatch|silverstone|donington/i, "Reino Unido", "GB"],
  [/misano|monza|imola/i, "Italia", "IT"],
  [/magny|paul ricard|le castellet/i, "Francia", "FR"],
  [/zandvoort/i, "Países Bajos", "NL"],
  [/barcelona|catalunya|valencia|ricardo tormo/i, "España", "ES"],
  [/spa|francorchamps/i, "Bélgica", "BE"],
  [/n[üu]rburgring|hockenheim/i, "Alemania", "DE"],
  [/portim[aã]o|algarve/i, "Portugal", "PT"],
];
const countryOf = (text) => COUNTRY_BY_CIRCUIT.find(([re]) => re.test(text)) ?? [null, "", ""];

/** Nombres de una celda de tripulación ("Kelvin van der Linde<br>Charles Weerts") → "Kelvin van der Linde / Charles Weerts". */
const crew = (cell) =>
  String(cell?.raw ?? "")
    .split(/<br\s*\/?>/i)
    .map((part) => clean(part).trim())
    .filter(Boolean)
    .join(" / ") || cell?.text || "";

/** Tabla del campeonato de pilotos general: la primera con "Drivers" y muchas filas. */
function driversTable(text) {
  return tables(section(text, "Championship standings")).find((t) => t.rows.length >= 10 && texts(t.rows[0]).some((c) => /drivers?/i.test(c)));
}

/** Clasificación de cada carrera (columna del campeonato) → filas ordenadas por posición. */
function perRace(table, raceCount) {
  if (!table) return [];
  const header = texts(table.rows[0]);
  const first = header.findIndex((c) => /team/i.test(c)) + 1;
  const columns = header.length - first - 1; // la última columna son los puntos
  if (first <= 0 || columns !== raceCount) return [];
  const races = Array.from({ length: raceCount }, () => []);
  const standings = [];
  for (const row of table.rows.slice(1)) {
    const pos = intOf(row.cells[0]?.text);
    if (pos === null || !row.cells[1]) continue;
    const driver = crew(row.cells[1]);
    const team = row.cells[2]?.text ?? "";
    standings.push({ pos, driver, team, points: Number.parseFloat(row.cells.at(-1)?.text) || 0 });
    for (let i = 0; i < raceCount; i++) {
      const cell = row.cells[first + i]?.text ?? "";
      const p = intOf(cell);
      if (p !== null) races[i].push({ pos: p, driver, team, gap: "" });
      else if (/ret|dnf|dsq|dns/i.test(cell)) races[i].push({ pos: 999, positionText: cell.match(/ret|dnf|dsq|dns/i)[0].toUpperCase(), driver, team, gap: "", status: /dns/i.test(cell) ? "No largó" : /dsq/i.test(cell) ? "Descalificado" : "Abandonó" });
    }
  }
  const sorted = races.map((raw) => {
    // Wikipedia a veces separa en filas a los pilotos de un mismo auto: misma posición y mismo equipo → una sola tripulación.
    const list = [];
    for (const r of raw.sort((a, b) => a.pos - b.pos)) {
      const same = r.pos !== 999 && list.find((x) => x.pos === r.pos && x.team === r.team);
      if (same) same.driver = `${same.driver} / ${r.driver}`;
      else list.push({ ...r });
    }
    const ordered = list;
    const classified = ordered.filter((r) => r.pos !== 999).length;
    return ordered.map((r, i) => (r.pos === 999 ? { ...r, pos: classified + i + 1 } : r));
  });
  return { races: sorted, standings };
}

function calendar(text) {
  return (tables(section(text, "Calendar"))[0]?.rows ?? [])
    .map((r) => texts(r))
    .filter((c) => intOf(c[0]) !== null)
    .map((c) => {
      const hasRaceName = c.length >= 5;
      const circuitCell = hasRaceName ? c[2] : c[1];
      const dateCell = hasRaceName ? c[3] : c[2];
      const parts = circuitCell.split(",").map((s) => s.trim());
      const last = dateCell.split(/[–-]/).at(-1);
      return { round: intOf(c[0]), race: hasRaceName ? c[1] : "", circuit: parts[0], city: parts[1] ?? parts[0], country: parts[2] ?? "", end: dayMonth(last) ?? dayMonth(dateCell) };
    })
    .filter((c) => c.end);
}

/** "CrowdStrike 24 Hours of Spa" → "24 Horas de Spa". */
const raceName = (name) => name.replace(/^CrowdStrike\s+/i, "").replace(/\bHours of\b/i, "Horas de").replace(/\bHour of\b/i, "Hora de");

/** "Misano World Circuit Marco Simoncelli" → "Misano"; "Circuit de Nevers Magny-Cours" → "Magny-Cours". */
const shortCircuit = (name) =>
  name
    .replace(/^(Circuit|Circuito|Autodromo Nazionale|Autódromo)\s+(de\s+|of\s+)?/i, "")
    .replace(/\s+World Circuit.*$/i, "")
    .replace(/^Nevers\s+/i, "")
    .trim();

/**
 * Ganador general de cada carrera desde la tabla "Race results", que alterna una fila con el auto ("No. 7 Comtoyou Racing")
 * y otra con la tripulación. Sirve cuando el campeonato no permite armar la clasificación completa (p. ej. Spa suma por hora).
 */
function winners(text) {
  const table = tables(section(text, "Race results"))[0];
  if (!table) return [];
  const header = texts(table.rows[0]);
  const col = header.findIndex((c) => /overall/i.test(c));
  const out = [];
  const rows = table.rows.slice(1);
  for (let i = 0; i + 1 < rows.length; i += 2) {
    const car = rows[i].cells[col]?.text ?? "";
    const names = crew(rows[i + 1].cells[col]);
    if (!names || /did not|no entries|cancel/i.test(names)) {
      out.push(null);
      continue;
    }
    out.push({ pos: 1, driver: names, team: car.replace(/^(No\.|#)\s*\d+\s*/i, "").trim(), gap: "" });
  }
  return out;
}

function build(text, cup) {
  const cal = calendar(text);
  const sprint = cup === "sprint";
  const raceCount = sprint ? cal.length * 2 : cal.length;
  const table = driversTable(text);
  const { races = [], standings = [] } = perRace(table, raceCount) || {};
  const winnerRows = winners(text);
  const events = cal.map((c, index) => {
    const [, countryEs, flag] = countryOf(`${c.circuit} ${c.city} ${c.country}`);
    const end = dateOnly(2026, c.end.m, c.end.d);
    const dayBefore = new Date(Date.parse(end) - 86400000).toISOString().slice(0, 10);
    const sessions = sprint
      ? [
          { id: `gt3-2026-s${c.round}-r1`, kind: "carrera", name: "Carrera 1", start: `${dayBefore}T12:00:00-03:00`, timeKnown: false, durationMin: 60 },
          { id: `gt3-2026-s${c.round}-r2`, kind: "carrera", name: "Carrera 2", start: end, timeKnown: false, durationMin: 60 },
        ]
      : [{ id: `gt3-2026-e${c.round}-race`, kind: "carrera", name: c.race ? raceName(c.race) : "Carrera", start: end, timeKnown: false, durationMin: 180 }];
    const url = `https://en.wikipedia.org/wiki/2026_GT_World_Challenge_Europe_${sprint ? "Sprint" : "Endurance"}_Cup`;
    sessions.forEach((s, k) => {
      const i = sprint ? index * 2 + k : index;
      const results = races[i];
      if (results?.length) Object.assign(s, { results, resultsSource: { name: "Wikipedia · campeonato de pilotos", url } });
      else if (winnerRows[i]) Object.assign(s, { results: [winnerRows[i]], resultsSource: { name: "Wikipedia · ganadores", url } });
    });
    return {
      id: `gt3-2026-${sprint ? "s" : "e"}${c.round}`,
      seriesId: "gt3",
      round: c.round,
      name: `${sprint ? "Sprint Cup" : "Endurance Cup"} · ${c.race ? raceName(c.race) : shortCircuit(c.circuit)}`,
      circuit: { name: c.circuit, city: c.city, country: countryEs || c.country, flag: flag || COUNTRY_ISO[c.country] || "" },
      sessions,
      source: `Wikipedia · 2026 GT World Challenge Europe ${sprint ? "Sprint" : "Endurance"} Cup`,
    };
  });
  // Pilotos argentinos según las banderas de Wikipedia: "{{flagicon|ARG}} [[Ignacio Montenegro]]".
  const argentines = [...text.matchAll(/\{\{flagicon\|ARG\}\}\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)].map((m) => (m[2] ?? m[1]).trim());
  // Hasta qué fecha del Sprint Cup llega la tabla de campeonato (sólo tiene sentido para el Sprint: en Endurance
  // no hay tabla de pilotos, sólo ganadores). Cuenta de a dos columnas (Carrera 1 y 2 de cada fecha).
  const covered = sprint ? Math.floor(races.filter((list) => list.length > 0).length / 2) : 0;
  return { events, standings, argentines, covered };
}

export async function gtwcSeason(io) {
  const sprint = build(await io.wiki("en-gtwc-sprint-2026"), "sprint");
  await io.sleep(500);
  const endurance = build(await io.wiki("en-gtwc-endurance-2026"), "endurance");
  // El campeonato de pilotos puede quedar atrás de las carreras ya corridas (mismo problema que en TC2000). Se
  // compara contra las fechas de Sprint con resultado cargado, no contra todo GT3 (que también incluye Endurance,
  // con su propia numeración de fechas, bajo la misma categoría).
  const sprintRaced = sprint.events.filter((e) => e.sessions.some((s) => s.results?.length)).length;
  const stale = sprintRaced > sprint.covered;
  return {
    events: [...sprint.events, ...endurance.events],
    standings: { gt3: stale ? [] : sprint.standings },
    meta: {
      gt3: {
        standingsLabel: "Sprint Cup",
        ...(stale ? { standingsHidden: true, standingsAsOfRound: sprint.covered } : {}),
        endurance: endurance.standings,
        argentines: [...new Set([...sprint.argentines, ...endurance.argentines])],
      },
    },
  };
}
