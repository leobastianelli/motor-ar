import assert from "node:assert/strict";
import { test } from "node:test";
import { parseResults } from "./f1-official.mjs";
import { buildSeason } from "./season.mjs";

// Pruebas de degradación: qué pasa con la temporada cuando una fuente de F1 responde mal. Todo el I/O es falso; las demás fuentes
// (ACTC, TN, GT…) fallan sin ruido y `buildSeason` las reemplaza por lo anterior.

const HOUR = 3600000;
const iso = (offsetMs) => new Date(Date.now() + offsetMs).toISOString().replace(/\.\d+Z$/, "Z");
const at = (offsetMs) => {
  const [date, time] = iso(offsetMs).split("T");
  return { date, time };
};

const jolpicaRace = (round, name, { practice, race }) => ({
  round: String(round),
  raceName: name,
  date: at(race).date,
  time: at(race).time,
  FirstPractice: at(practice),
  Circuit: { circuitName: "Circuito", Location: { locality: "Ciudad", country: "Australia" } },
});
const standingsList = { round: "1", DriverStandings: [{ position: "1", points: "25", wins: "1", Driver: { givenName: "Kimi", familyName: "Antonelli" }, Constructors: [{ name: "Mercedes" }] }] };
const mrdata = (extra) => ({ MRData: { total: "0", RaceTable: { Races: [] }, StandingsTable: { StandingsLists: [standingsList] }, ...extra } });

/** Jolpica: `races` es el calendario; sin resultados de carrera, clasificación ni sprint. */
const jolpica = (races) => (url) => {
  if (/\/driverstandings\.json/.test(url)) return mrdata({});
  if (/\/2026\.json/.test(url)) return mrdata({ RaceTable: { Races: races } });
  return mrdata({}); // results / qualifying / sprint vacíos
};

const cell = (x) => `<td>${x}</td>`;
const driver = (first, last, code) => cell(`<span><span class="max-lg:hidden">${first}</span> <span class="max-md:hidden">${last}</span><span class="md:hidden">${code}</span></span>`);
const page = (heads, rows, rowClass = "Table-module_body-row__x") =>
  `<html><head><title>FORMULA 1 AUSTRALIAN GRAND PRIX 2026</title></head><table><thead><tr>${heads.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr class="${rowClass}">${r.join("")}</tr>`).join("")}</tbody></table></html>`;
const HEADS = ["Pos.", "No.", "Driver", "Team", "Time / Gap", "Laps"];
const ROWS = [[cell("1"), cell("63"), driver("George", "Russell", "RUS"), cell("Mercedes"), cell("1:45.387"), cell("24")]];
const OFFICIAL = "https://www.formula1.com/en/results/2026/races";
const INDEX = `<a href="/en/results/2026/races/1294/australia/race-result"></a>`;

/** io falso: `routes` = [regex, respuesta o función]; lo que no coincide falla con 503, como una fuente caída. */
function fakeIo(routes) {
  const answer = async (url) => {
    for (const [re, res] of routes) if (re.test(url)) return typeof res === "function" ? res(url) : res;
    throw new Error(`503 al pedir ${url}`);
  };
  return { json: answer, text: answer, bytes: answer, wiki: answer, sleep: async () => {} };
}
const openf1Blocked = [
  /api\.openf1\.org/,
  () => {
    throw new Error("401 al pedir https://api.openf1.org/v1/sessions?year=2026");
  },
];

const practiceSession = (extra = {}) => ({ id: "f1-2026-1-firstpractice", kind: "practica", name: "Práctica 1", start: iso(-2 * 24 * HOUR), timeKnown: true, durationMin: 60, ...extra });
const f1Event = (over = {}) => ({ id: "f1-2026-1", seriesId: "f1", round: 1, name: "GP de Australia", officialName: "Australian Grand Prix", circuit: { name: "Circuito", city: "Ciudad", country: "Australia", flag: "" }, sessions: [practiceSession()], ...over });
const CALENDAR = [jolpicaRace(1, "Australian Grand Prix", { practice: -2 * 24 * HOUR, race: 10 * 24 * HOUR })];
const f1Events = (season) => season.events.filter((e) => e.seriesId === "f1");
const russell = { pos: 1, driver: "George Russell", team: "Mercedes", gap: "1:45.387" };
const official = { name: "Fórmula 1 (oficial)", url: "u" };

test("OpenF1 responde 401 a todo: no cuenta como falla y los resultados de F1 salen de la fuente oficial", async () => {
  const io = fakeIo([openf1Blocked, [/api\.jolpi\.ca/, jolpica(CALENDAR)], [new RegExp(`^${OFFICIAL}$`), INDEX], [/practice\/1$/, page(HEADS, ROWS)]]);
  const season = await buildSeason(io, { events: [], standings: {}, meta: {} });
  assert.ok(!season.failures.some((f) => /OpenF1/.test(f)), season.failures.join("\n"));
  assert.equal(season.meta.openf1.restrictedWhileLive, true);
  const practice = f1Events(season)[0].sessions.find((s) => s.name === "Práctica 1");
  assert.equal(practice.results[0].driver, "George Russell");
  assert.equal(practice.resultsSource.name, "Fórmula 1 (oficial)");
});

test("Jolpica caído: la F1 conserva lo anterior, queda en failures y no se pierde ningún resultado", async () => {
  const before = f1Event({ sessions: [practiceSession({ results: [russell], resultsSource: official })] });
  const previous = { events: [before], standings: { f1: [{ pos: 1, driver: "Kimi Antonelli", team: "Mercedes", points: 25, wins: 1 }] }, meta: { f1: { standingsAsOfRound: 1, progression: [] } } };
  const io = fakeIo([openf1Blocked]); // todo lo demás, incluida Jolpica, responde 503
  const season = await buildSeason(io, previous);
  assert.ok(season.failures.some((f) => /^F1: /.test(f)), season.failures.join("\n"));
  assert.equal(f1Events(season).length, 1);
  assert.equal(f1Events(season)[0].sessions[0].results[0].driver, "George Russell");
  assert.equal(season.standings.f1[0].driver, "Kimi Antonelli");
});

test("formula1.com con otro HTML: error explícito y se conserva lo previo, nunca una tabla vacía tomada como válida", async () => {
  const before = f1Event({ sessions: [practiceSession({ results: [russell], resultsSource: official })] });
  const changed = page(HEADS, ROWS, "otra-clase-de-fila"); // la tabla está, las filas ya no tienen la clase esperada
  const io = fakeIo([openf1Blocked, [/api\.jolpi\.ca/, jolpica(CALENDAR)], [new RegExp(`^${OFFICIAL}$`), INDEX], [/practice\/1$/, changed]]);
  const season = await buildSeason(io, { events: [before], standings: {}, meta: {} });
  assert.ok(season.failures.some((f) => /F1 oficial: .*formato esperado/.test(f)), season.failures.join("\n"));
  assert.equal(f1Events(season)[0].sessions.find((s) => s.name === "Práctica 1").results[0].driver, "George Russell");
});

test("parseResults: columnas distintas o filas irreconocibles lanzan error; sin tabla o sin filas es 'todavía no hay'", () => {
  assert.throws(() => parseResults(page(["Rank", "Piloto", "Tiempo"], ROWS), "practice"), /columnas esperadas/);
  assert.throws(() => parseResults(page(HEADS, ROWS, "otra-clase"), "practice"), /formato esperado/);
  assert.deepEqual(parseResults("<html><p>todavía no</p></html>", "practice"), []);
  assert.deepEqual(parseResults(page(HEADS, []), "practice"), []);
});

test("una fuente que devuelve menos fechas que antes: la temporada no las pierde", async () => {
  const anterior = f1Event({ id: "f1-2026-0", round: 0, name: "GP de Baréin", officialName: "Bahrain Grand Prix", sessions: [practiceSession({ id: "f1-2026-0-firstpractice", start: iso(-30 * 24 * HOUR), results: [{ pos: 1, driver: "Lando Norris", team: "McLaren", gap: "1:30.000" }] })] });
  const io = fakeIo([openf1Blocked, [/api\.jolpi\.ca/, jolpica(CALENDAR)]]); // Jolpica sólo lista la fecha 1
  const season = await buildSeason(io, { events: [anterior], standings: {}, meta: {} });
  const ids = f1Events(season).map((e) => e.id);
  assert.ok(ids.includes("f1-2026-0") && ids.includes("f1-2026-1"), ids.join(", "));
  assert.equal(f1Events(season).find((e) => e.id === "f1-2026-0").sessions[0].results[0].driver, "Lando Norris");
});
