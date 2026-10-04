// TCR South America 2026. El calendario, los puntos de cada carrera y el campeonato salen de la API oficial del campeonato
// (apisa.tcr-series.com, abierta y sin clave); Wikipedia (en) pone el nombre completo del autódromo y sirve de control cruzado.
// La API no publica la posición de cada piloto, sólo los puntos: como la escala de puntos es fija, la posición de quienes puntuaron
// (los 15 primeros de cada carrera) se recupera exacta. Los demás no se inventan: la clasificación completa está en el PDF oficial.
import { dateOnly, dayMonth } from "./common.mjs";
import { clean, intOf, section, tables, texts } from "./wikitext.mjs";

const API = "https://apisa.tcr-series.com";
const SITE = "https://southamerica.tcr-series.com";
const WIKI_KEY = "en-tcr-sa-2026";
const SEASON_ID = 6; // temporada 2026 en la API
const DRIVERS = 11; // campeonato de pilotos (10 equipos, 12 trofeo, 13 junior)
const SERIES = "tcr-sa";

/** Puntos por posición (1.º a 15.º). Las carreras sprint 1 y 2 puntúan distinto; la de resistencia (Interlagos) tiene su propia escala. */
export const SCALES = {
  sprint1: [40, 35, 30, 27, 24, 21, 18, 15, 13, 11, 9, 7, 5, 3, 1],
  sprint2: [35, 30, 27, 24, 21, 18, 15, 13, 11, 9, 7, 5, 3, 2, 1],
  endurance: [50, 44, 38, 34, 30, 26, 22, 19, 16, 14, 11, 9, 6, 4, 2],
};

const COUNTRIES = {
  BR: ["Brasil", "BR"],
  AR: ["Argentina", "AR"],
  UY: ["Uruguay", "UY"],
};
const FLAGICON = { BRA: "BR", ARG: "AR", URU: "UY" };

const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const tidy = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
/** Nombre de la celda de un piloto: Wikipedia lo escribe a veces con {{interlanguage link|Nombre|es}}, que clean() descarta. */
const wikiName = (cell) => tidy(clean(String(cell.raw).replace(/\{\{\s*(?:interlanguage link|ill)\s*\|([^|}]+)[^}]*\}\}/gi, "$1")));
const dayMonthEs = ({ m, d }) => `${d}/${m}`;

/** Día local argentino de una fecha ISO (la API da la medianoche argentina como 03:00 UTC). */
function localDay(iso) {
  const t = new Date(Date.parse(iso) - 3 * 3600_000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}
const shiftDay = ({ y, m, d }, days) => {
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
};
const at = ({ y, m, d }) => dateOnly(y, m, d);

/**
 * Filas de resultado de una carrera a partir de sus puntos. Sólo puntúan los 15 primeros, así que sólo ellos tienen fila.
 * En la carrera de resistencia (dos pilotos por auto) los dos de un mismo auto suman lo mismo: se agrupan en una tripulación "A / B".
 * Se agrupa sólo por puntos (dos autos nunca empatan en la escala) y no por equipo: el invitado suele figurar en otro equipo que el titular.
 * Devuelve { results, wins, problems }: `wins` son los pilotos que ganaron, para desempatar el campeonato.
 */
export function resultsFromPoints(points, pilotById, scale, { endurance = false } = {}) {
  const problems = [];
  const entries = [];
  for (const p of points) {
    if (!(p.points > 0)) continue;
    const pilot = pilotById.get(p.pilotId);
    if (!pilot) {
      problems.push(`piloto ${p.pilotId} sin ficha`);
      continue;
    }
    entries.push({ points: p.points, pilot });
  }
  entries.sort((a, b) => b.points - a.points || a.pilot.id - b.pilot.id);

  const groups = [];
  for (const e of entries) {
    const same = endurance && groups.find((g) => g.points === e.points);
    if (same) same.pilots.push(e.pilot);
    else groups.push({ points: e.points, pilots: [e.pilot] });
  }

  const results = [];
  const wins = [];
  for (const g of groups) {
    const idx = scale.indexOf(g.points);
    if (idx === -1) {
      problems.push(`${g.pilots.map((p) => p.name).join(" / ")}: ${g.points} puntos no está en la escala`);
      continue;
    }
    if (idx === 0) wins.push(...g.pilots.map((p) => p.id));
    const numbers = [...new Set(g.pilots.map((p) => p.number).filter(Boolean))];
    results.push({
      pos: idx + 1,
      driver: g.pilots.map((p) => p.name).join(" / "),
      team: [...new Set(g.pilots.map((p) => p.team).filter(Boolean))].join(" / "),
      number: numbers.join("/"),
      gap: "",
      points: g.points,
    });
  }
  return { results, wins, problems };
}

// ---------------------------------------------------------------------------------------------------------------- Wikipedia

/** Calendario de Wikipedia: ronda, autódromo, ciudad, país y último día del fin de semana. */
function wikiCalendar(text) {
  return (tables(section(text, "Calendar"))[0]?.rows ?? [])
    .filter((r) => intOf(r.cells[0]?.text) !== null && r.cells.length >= 3)
    .map((r) => {
      const [circuit, ...rest] = r.cells[1].text.split(",").map((s) => s.trim());
      const dates = r.cells[2].text;
      const iso = r.cells[1].raw.match(/flagicon\|([A-Z]{3})/i)?.[1]?.toUpperCase();
      return { round: intOf(r.cells[0].text), circuit, city: rest[0] ?? circuit, country: FLAGICON[iso] ?? "", end: dayMonth(dates.split(/[–-]/).at(-1)) };
    })
    .filter((c) => c.end);
}

/**
 * Tabla del campeonato de pilotos de Wikipedia. Una columna por carrera (SR1, SR2) y una sola para la de resistencia (END).
 * Devuelve las posiciones por carrera (ronda|carrera → posición → nombres), los puntos de cada piloto y hasta qué ronda llega.
 */
function wikiStandings(text) {
  const table = tables(section(text, "Drivers' championship")).find((t) => t.rows.length >= 3 && texts(t.rows[1] ?? { cells: [] }).some((c) => /^(SR1|END)$/i.test(c)));
  if (!table) return null;
  const labels = texts(table.rows[1]).slice(2, -1).map((l) => l.toUpperCase());
  const columns = [];
  let round = 1;
  for (const label of labels) {
    if (label === "END") columns.push({ round: round++, race: 1, endurance: true });
    else if (label === "SR1") columns.push({ round, race: 1 });
    else if (label === "SR2") columns.push({ round: round++, race: 2 });
  }
  if (columns.length !== labels.length) return null;
  const races = new Map();
  const totals = new Map();
  let covered = 0;
  for (const row of table.rows.slice(2)) {
    if (intOf(row.cells[0]?.text) === null || row.cells.length < 3 + columns.length) continue;
    const name = wikiName(row.cells[1]);
    totals.set(norm(name), { name, points: Number.parseFloat(row.cells.at(-1).text) || 0 });
    columns.forEach((col, i) => {
      const cell = row.cells[2 + i].text;
      if (!cell) return;
      covered = Math.max(covered, col.round);
      const pos = intOf(cell);
      if (pos === null) return;
      const key = `${col.round}|${col.race}`;
      if (!races.has(key)) races.set(key, new Map());
      const byPos = races.get(key);
      byPos.set(pos, [...(byPos.get(pos) ?? []), name]);
    });
  }
  return { races, totals, covered, endurance: new Set(columns.filter((c) => c.endurance).map((c) => c.round)) };
}

function parseWiki(text) {
  const out = { calendar: [], standings: null };
  try {
    out.calendar = wikiCalendar(text);
  } catch {
    /* sin calendario de Wikipedia: se usa el de la API */
  }
  try {
    out.standings = wikiStandings(text);
  } catch {
    /* sin tabla de Wikipedia: no hay control cruzado */
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------- sesiones

/** Sesiones de una fecha: clasificación el día anterior y las carreras el último día. Sin horarios publicados, sólo el día. */
function sessionsFor(stage, last, endurance) {
  const before = at(shiftDay(last, -1));
  const day = at(last);
  const id = (suffix) => `tcr-sa-2026-${stage}-${suffix}`;
  return [
    { id: id("q"), kind: "clasificacion", name: "Clasificación", start: before, timeKnown: false, durationMin: 30 },
    ...(endurance
      ? [{ id: id("carrera"), kind: "carrera", name: "Super Challenge", start: day, timeKnown: false, durationMin: 90 }]
      : [
          { id: id("r1"), kind: "carrera", name: "Carrera 1", start: day, timeKnown: false, durationMin: 35 },
          { id: id("r2"), kind: "carrera", name: "Carrera 2", start: day, timeKnown: false, durationMin: 35 },
        ]),
  ];
}

const SHORT_NAMES = [
  [/interlagos/i, "Interlagos"],
  [/velo citt/i, "Velocitta"],
];

/** Calendario armado sólo con Wikipedia (la API no respondió): fechas y sedes, sin resultados ni campeonato. */
function fromWikipedia(wiki, previous, why) {
  const endurance = wiki.standings?.endurance ?? new Set();
  const events = wiki.calendar.map((c) => {
    const [country, flag] = COUNTRIES[c.country] ?? ["", ""];
    const name = SHORT_NAMES.find(([re]) => re.test(c.circuit))?.[1] ?? c.city;
    return {
      id: `tcr-sa-2026-${c.round}`,
      seriesId: SERIES,
      round: c.round,
      name,
      circuit: { name: c.circuit, city: c.city, country, flag },
      sessions: sessionsFor(c.round, { y: 2026, m: c.end.m, d: c.end.d }, endurance.has(c.round)),
      source: "Wikipedia · 2026 TCR South America Touring Car Championship",
    };
  });
  return {
    events,
    standings: { [SERIES]: [] },
    meta: {
      [SERIES]: {
        standingsLabel: "Pilotos",
        argentines: previous?.meta?.[SERIES]?.argentines ?? [],
        notes: [`La API oficial no respondió (${why}): calendario armado desde Wikipedia, sin resultados ni campeonato.`],
      },
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------- API

/** Documento (PDF oficial) de una carrera entre los que publicó la fecha, o null. Si hay varios (rectificado), el último. */
function documentOf(race, kind) {
  const re = kind === "carrera" ? /race\s+super\s+challenge/i : kind === "r1" ? /\brace\s*1\b/i : /\brace\s*2\b/i;
  return (race.results ?? [])
    .filter((r) => r.documentId && re.test(r.name ?? "") && !/grid/i.test(r.name ?? ""))
    .sort((a, b) => b.id - a.id)[0];
}

async function pdfUrl(io, doc, before, state) {
  // Si ya teníamos la dirección del PDF de este documento, no se vuelve a pedir.
  if (before?.resultsSource?.url?.startsWith(`${API}/`)) return before.resultsSource.url;
  try {
    if (state.fetched) await io.sleep(300);
    state.fetched = true;
    const file = await io.json(`${API}/files/${doc.documentId}`, { revalidate: 21600 });
    if (file?.filename) return `${API}/${encodeURIComponent(file.filename)}`;
  } catch {
    /* se usa la página de resultados */
  }
  return `${SITE}/resultados`;
}

async function fromApi(io, previous, wiki) {
  const [allRaces, pilots] = await Promise.all([io.json(`${API}/races`, { revalidate: 120 }), io.json(`${API}/pilots?championshipId=${DRIVERS}`, { revalidate: 3600 })]);
  const races = (Array.isArray(allRaces) ? allRaces : []).filter((r) => r.seasonId === SEASON_ID).sort((a, b) => a.stage - b.stage);
  if (!races.length || !Array.isArray(pilots)) throw new Error("la API no trajo la temporada 2026");

  const pilotById = new Map(
    pilots.map((p) => [p.id, { id: p.id, name: tidy(p.name), team: tidy(p.team?.name), number: p.numberOfCar == null ? "" : String(p.numberOfCar), nationality: p.nationality }]),
  );
  const previousById = new Map((previous?.events ?? []).map((e) => [e.id, e]));
  const discrepancies = [];
  const state = { fetched: false };
  const wikiByRound = new Map((wiki?.calendar ?? []).map((c) => [c.round, c]));
  const totals = new Map(); // piloto → { total, byRound }
  const wins = new Map();
  let lastScored = 0;

  const events = [];
  for (const race of races) {
    const stage = race.stage;
    const last = localDay(race.startDate);
    const points = (race.points ?? []).filter((p) => p.championshipId === DRIVERS);
    const endurance = (race.results ?? []).some((r) => /super\s+challenge/i.test(r.name ?? ""));

    // Fecha de Wikipedia: si no coincide con la de la API manda la API y queda anotado.
    const fromWiki = wikiByRound.get(stage);
    let wikiOk = Boolean(fromWiki);
    if (fromWiki && (fromWiki.end.d !== last.d || fromWiki.end.m !== last.m)) {
      wikiOk = false;
      discrepancies.push(`Fecha ${stage} (${race.name}): la API termina el ${dayMonthEs({ m: last.m, d: last.d })} y Wikipedia el ${dayMonthEs(fromWiki.end)}; se usa la de la API`);
    }

    const sessions = sessionsFor(stage, last, endurance);
    const sessionKinds = endurance ? { [`tcr-sa-2026-${stage}-carrera`]: ["R1", "carrera", SCALES.endurance] } : { [`tcr-sa-2026-${stage}-r1`]: ["R1", "r1", SCALES.sprint1], [`tcr-sa-2026-${stage}-r2`]: ["R2", "r2", SCALES.sprint2] };
    const eventPrevious = previousById.get(`tcr-sa-2026-${stage}`);

    for (const session of sessions) {
      const spec = sessionKinds[session.id];
      if (!spec) continue;
      const [alias, docKind, scale] = spec;
      const rows = points.filter((p) => p.alias === alias);
      if (!(rows.reduce((sum, p) => sum + (p.points || 0), 0) > 0)) continue;
      const { results, wins: winners, problems } = resultsFromPoints(rows, pilotById, scale, { endurance });
      for (const problem of problems) discrepancies.push(`Fecha ${stage} ${session.name}: ${problem}`);
      for (const id of winners) wins.set(id, (wins.get(id) ?? 0) + 1);
      if (!results.length) continue;
      const doc = documentOf(race, docKind);
      const url = doc ? await pdfUrl(io, doc, eventPrevious?.sessions.find((s) => s.id === session.id), state) : `${SITE}/resultados`;
      session.results = results;
      session.resultsSource = {
        name: "TCR South America · puntos del campeonato",
        url,
        note: endurance
          ? "Sólo las 15 tripulaciones que sumaron puntos; la clasificación completa está en el PDF oficial."
          : "Sólo los 15 que sumaron puntos; la clasificación completa está en el PDF oficial.",
      };
    }

    for (const p of points) {
      if (!(p.points + (p.bonusPoints || 0) > 0)) continue;
      lastScored = Math.max(lastScored, stage);
      const entry = totals.get(p.pilotId) ?? { total: 0, byRound: new Map() };
      const value = (p.points || 0) + (p.bonusPoints || 0);
      entry.total += value;
      entry.byRound.set(stage, (entry.byRound.get(stage) ?? 0) + value);
      totals.set(p.pilotId, entry);
    }

    const [country, flag] = COUNTRIES[race.country] ?? ["", ""];
    events.push({
      id: `tcr-sa-2026-${stage}`,
      seriesId: SERIES,
      round: stage,
      name: tidy(race.name),
      circuit: wikiOk ? { name: fromWiki.circuit, city: fromWiki.city, country: country || "", flag } : { name: tidy(race.name), city: tidy(race.name), country, flag },
      sessions,
      source: "TCR South America (API oficial) · Wikipedia (circuito)",
    });
  }

  const standings = [...totals]
    .map(([id, t]) => ({ pilot: pilotById.get(id), ...t }))
    .filter((t) => t.pilot && t.total > 0)
    .sort((a, b) => b.total - a.total || (wins.get(b.pilot.id) ?? 0) - (wins.get(a.pilot.id) ?? 0) || a.pilot.name.localeCompare(b.pilot.name))
    .map((t, i) => ({ pos: i + 1, driver: t.pilot.name, team: t.pilot.team, points: t.total }));

  if (wiki?.standings) discrepancies.push(...crossCheck(wiki.standings, events, pilotById, totals));

  return {
    events,
    standings: { [SERIES]: standings },
    meta: {
      [SERIES]: {
        standingsLabel: "Pilotos",
        ...(lastScored ? { standingsAsOfRound: lastScored } : {}),
        argentines: [...pilotById.values()].filter((p) => p.nationality === "AR").map((p) => p.name),
        discrepancies,
        ...(wiki ? {} : { notes: ["Wikipedia no respondió: nombres de autódromo de la API y sin control cruzado."] }),
      },
    },
  };
}

/** Compara con la tabla de Wikipedia el podio de cada carrera y los puntos acumulados hasta donde ella llega. Sólo informa, nunca corrige. */
function crossCheck(wiki, events, pilotById, totals) {
  const out = [];
  for (const event of events) {
    for (const session of event.sessions) {
      if (session.kind !== "carrera") continue;
      const race = session.id.endsWith("-r2") ? 2 : 1;
      const podium = wiki.races.get(`${event.round}|${race}`);
      if (!podium) continue;
      for (const pos of [1, 2, 3]) {
        const wikiNames = podium.get(pos);
        if (!wikiNames) continue;
        if (!session.results?.length) {
          out.push(`Fecha ${event.round} ${session.name}: Wikipedia ya tiene el podio y la API todavía no tiene puntos`);
          break;
        }
        const api = session.results.filter((r) => r.pos === pos).flatMap((r) => r.driver.split(" / "));
        const apiKeys = new Set(api.map(norm));
        if (!wikiNames.every((n) => apiKeys.has(norm(n)))) out.push(`Fecha ${event.round} ${session.name}, puesto ${pos}: Wikipedia ${wikiNames.join(" / ")}, API ${api.join(" / ") || "nadie"}`);
      }
    }
  }
  const byName = new Map([...totals].map(([id, t]) => [norm(pilotById.get(id)?.name), t]));
  const off = [];
  for (const [key, w] of wiki.totals) {
    let sum = 0;
    for (const [round, value] of byName.get(key)?.byRound ?? []) if (round <= wiki.covered) sum += value;
    if (sum !== w.points) off.push(`${w.name} ${w.points} (Wikipedia) y ${sum} (API)`);
  }
  if (off.length) out.push(`Puntos hasta la fecha ${wiki.covered} distintos: ${off.slice(0, 5).join("; ")}${off.length > 5 ? ` y ${off.length - 5} más` : ""}`);
  return out;
}

export async function tcrSaSeason(io, previous) {
  let wiki = null;
  let wikiError = "";
  try {
    wiki = parseWiki(await io.wiki(WIKI_KEY));
  } catch (error) {
    wikiError = error.message;
  }
  try {
    return await fromApi(io, previous, wiki);
  } catch (error) {
    if (!wiki?.calendar.length) throw new Error(`API: ${error.message}; Wikipedia: ${wikiError || "sin calendario"}`);
    return fromWikipedia(wiki, previous, error.message);
  }
}

