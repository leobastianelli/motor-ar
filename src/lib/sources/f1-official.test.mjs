import assert from "node:assert/strict";
import { test } from "node:test";
import { f1OfficialSessions, parseIndex, parseResults } from "./f1-official.mjs";
import { f1Videos, parseTitle } from "./f1-youtube.mjs";

const cell = (x) => `<td class="c">${x}</td>`;
const driver = (first, last, code) =>
  cell(`<span class="flex"><span class="avatar"><img src="x.webp" alt=""/></span><span><span class="max-lg:hidden">${first}</span> <span class="max-md:hidden">${last}</span><span class="md:hidden">${code}</span></span></span>`);
const table = (heads, rows) =>
  `<html><head><title>FORMULA 1 AZERBAIJAN GRAND PRIX 2026 - X</title></head><table><thead><tr>${heads.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr class="Table-module_body-row__x">${r.join("")}</tr>`).join("")}</tbody></table></html>`;

const PRACTICE = table(
  ["Pos.", "No.", "Driver", "Team", "Time / Gap", "Laps"],
  [
    [cell("1"), cell("63"), driver("George", "Russell", "RUS"), cell("<span>Mercedes</span>"), cell("1:45.387"), cell("24")],
    [cell("2"), cell("3"), driver("Max", "Verstappen", "VER"), cell("Red Bull Racing"), cell("+0.400s"), cell("23")],
    [cell("3"), cell("11"), driver("Sergio", "Perez", "PER"), cell("Cadillac"), cell("+1.250s"), cell("20")],
  ],
);
const RACE = table(
  ["Pos.", "No.", "Driver", "Team", "Laps", "Time / Retired", "Pts."],
  [
    [cell("1"), cell("12"), driver("Kimi", "Antonelli", "ANT"), cell("Mercedes"), cell("51"), cell("1:34:23.754"), cell("25")],
    [cell("2"), cell("3"), driver("Max", "Verstappen", "VER"), cell("Red Bull Racing"), cell("51"), cell("+4.351s"), cell("18")],
    [cell("3"), cell("1"), driver("Lando", "Norris", "NOR"), cell("McLaren"), cell("50"), cell("+1 Lap"), cell("15")],
    [cell("NC"), cell("44"), driver("Lewis", "Hamilton", "HAM"), cell("Ferrari"), cell("20"), cell("DNF"), cell("0")],
  ],
);
const QUALI = table(
  ["Pos.", "No.", "Driver", "Team", "Q1", "Q2", "Q3", "Laps"],
  [
    [cell("1"), cell("1"), driver("Lando", "Norris", "NOR"), cell("McLaren"), cell("1:32.0"), cell("1:31.9"), cell("1:31.824"), cell("15")],
    [cell("17"), cell("77"), driver("Valtteri", "Bottas", "BOT"), cell("Cadillac"), cell("1:33.0"), cell(""), cell(""), cell("6")],
  ],
);

test("índice: las fechas salen en el orden de la página y sin repetirse", () => {
  const html = `<a href="/en/results/2026/races/1294/spain/race-result"></a><a href="/en/results/2026/races/1295/azerbaijan/race-result"></a><a href="/en/results/2026/races/1295/azerbaijan/race-result"></a><a href="/en/results/2026/races/1308/bahrain/race-result"></a>`;
  assert.deepEqual(parseIndex(html), [
    { id: "1294", slug: "spain" },
    { id: "1295", slug: "azerbaijan" },
    { id: "1308", slug: "bahrain" },
  ]);
});

test("práctica: posición, número, nombre, sigla, equipo y diferencia (sin la 's' final)", () => {
  const rows = parseResults(PRACTICE, "practice");
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { pos: 1, number: "63", driver: "George Russell", code: "RUS", team: "Mercedes", gap: "1:45.387" });
  assert.equal(rows[1].gap, "+0.400");
});

test("carrera: puntos, vueltas de diferencia y abandonos", () => {
  const rows = parseResults(RACE, "race");
  assert.equal(rows[0].points, 25);
  assert.equal(rows[1].gap, "+4.351");
  assert.equal(rows[2].gap, "+1 vuelta");
  assert.equal(rows[3].positionText, "NC");
  assert.equal(rows[3].status, "Abandonó");
  assert.equal(rows[3].gap, "");
});

test("clasificación: el tiempo es el de la última ronda que corrió", () => {
  const rows = parseResults(QUALI, "qualifying");
  assert.equal(rows[0].gap, "1:31.824");
  assert.equal(rows[1].gap, "1:33.0");
});

test("una sesión que todavía no publicó tabla no da resultados ni error", () => {
  assert.deepEqual(parseResults("<html><title>x</title><p>sin datos</p></html>", "practice"), []);
  assert.deepEqual(parseResults(table(["Pos.", "No.", "Driver", "Team", "Time / Gap", "Laps"], []), "practice"), []);
});

const NOW = Date.parse("2026-09-24T13:30:00Z");
const event = (round, id, officialName, sessions) => ({ id, seriesId: "f1", round, name: officialName, officialName, sessions });
const session = (name, start, results) => ({ id: `${name}-${start}`, kind: "practica", name, start, durationMin: 60, ...(results ? { results } : {}) });
const io = (pages) => ({
  requested: [],
  async text(url) {
    this.requested.push(url);
    if (!(url in pages)) throw new Error(`404 ${url}`);
    return pages[url];
  },
  sleep: async () => {},
});
const INDEX = `<a href="/en/results/2026/races/1294/spain/race-result"></a><a href="/en/results/2026/races/1295/azerbaijan/race-result"></a>`;
const BASE = "https://www.formula1.com/en/results/2026/races";

test("completa la práctica que terminó y no pide lo que ya tiene resultados ni lo que todavía no empezó", async () => {
  const events = [
    event(14, "f1-2026-14", "Spanish Grand Prix", [session("Práctica 1", "2026-09-11T11:30:00Z", [{ pos: 1, driver: "X", team: "", gap: "" }])]),
    event(15, "f1-2026-15", "Azerbaijan Grand Prix", [session("Práctica 1", "2026-09-24T08:30:00Z"), session("Práctica 2", "2026-09-24T12:00:00Z"), session("Práctica 3", "2026-09-25T08:30:00Z")]),
  ];
  const fake = io({ [BASE]: INDEX, [`${BASE}/1295/azerbaijan/practice/1`]: PRACTICE, [`${BASE}/1295/azerbaijan/practice/2`]: table(["Pos.", "No.", "Driver", "Team", "Time / Gap", "Laps"], []) });
  const { events: out, meta } = await f1OfficialSessions(fake, events, {}, { now: NOW, knownNames: ["Sergio Pérez"] });
  const [p1, p2, p3] = out[1].sessions;
  assert.equal(p1.results.length, 3);
  assert.equal(p1.results[2].driver, "Sergio Pérez");
  assert.equal(p1.resultsSource.name, "Fórmula 1 (oficial)");
  assert.equal(p2.results, undefined);
  assert.equal(p3.results, undefined);
  assert.equal(meta.f1Official.sessionsWithResults, 1);
  assert.ok(!fake.requested.some((u) => u.includes("1294")), "no pide fechas sin sesiones pendientes");
  assert.ok(!fake.requested.some((u) => u.includes("practice/3")), "no pide una sesión que no empezó");
});

// Carrera en la ventana temprana: largó a las 08:00 AR (11:00Z), programada en 120 min, pero el resultado puede estar desde los 75 min.
const RACE_START = "2026-09-26T11:00:00Z";
const grid = (n, withTimes = n) =>
  Array.from({ length: n }, (_, i) => [cell(String(i + 1)), cell(String(i + 10)), driver("Nombre", `Apellido${i}`, "AAA"), cell("Equipo"), cell("51"), cell(i < withTimes ? (i === 0 ? "1:34:23.754" : `+${i}.000s`) : ""), cell("0")]);
const RACE_HEADS = ["Pos.", "No.", "Driver", "Team", "Laps", "Time / Retired", "Pts."];
const raceEvent = () => [event(14, "f1-2026-14", "Spanish Grand Prix", []), event(15, "f1-2026-15", "Azerbaijan Grand Prix", [{ id: "r", kind: "carrera", name: "Carrera", start: RACE_START, durationMin: 120 }])];
const raceUrl = `${BASE}/1295/azerbaijan/race-result`;
const at = (min) => Date.parse(RACE_START) + min * 60000;

test("carrera terminada antes de lo programado: con la tabla completa se publica sin esperar al fin programado", async () => {
  const fake = io({ [BASE]: INDEX, [raceUrl]: table(RACE_HEADS, grid(22)) });
  const { events: out } = await f1OfficialSessions(fake, raceEvent(), {}, { now: at(100) });
  assert.equal(out[1].sessions[0].results.length, 22);
  assert.equal(out[1].sessions[0].resultsSource.url, raceUrl);
});

test("carrera en curso: una tabla incompleta no se publica como final", async () => {
  // Pocas filas (publicándose) o filas sin tiempo ni estado (clasificación provisional a medias).
  for (const rows of [grid(5), grid(22, 12)]) {
    const fake = io({ [BASE]: INDEX, [raceUrl]: table(RACE_HEADS, rows) });
    const { events: out, meta } = await f1OfficialSessions(fake, raceEvent(), {}, { now: at(80) });
    assert.equal(out[1].sessions[0].results, undefined);
    assert.equal(meta.f1Official.sessionsWithResults, 0);
    assert.deepEqual(meta.f1Official.errors, []);
  }
});

test("carrera en curso, antes de la ventana: no se pide nada", async () => {
  const fake = io({ [BASE]: INDEX, [raceUrl]: table(RACE_HEADS, grid(22)) });
  const { events: out } = await f1OfficialSessions(fake, raceEvent(), {}, { now: at(40) });
  assert.equal(out[1].sessions[0].results, undefined);
  assert.deepEqual(fake.requested, []);
});

test("sesión sin hora conocida: no se pide aunque la tabla exista", async () => {
  const events = raceEvent();
  events[1].sessions[0].timeKnown = false;
  const fake = io({ [BASE]: INDEX, [raceUrl]: table(RACE_HEADS, grid(22)) });
  const { events: out } = await f1OfficialSessions(fake, events, {}, { now: at(100) });
  assert.equal(out[1].sessions[0].results, undefined);
  assert.deepEqual(fake.requested, []);
});

test("si el índice oficial no coincide con el calendario, no se publica nada de otra carrera", async () => {
  const events = [event(15, "f1-2026-15", "Azerbaijan Grand Prix", [session("Práctica 1", "2026-09-24T08:30:00Z")])];
  await assert.rejects(f1OfficialSessions(io({ [BASE]: INDEX }), events, {}, { now: NOW }), /índice oficial/);
});

test("si la página no es de la fecha esperada, se descarta con un error y no se cargan resultados", async () => {
  const events = [event(15, "f1-2026-15", "Azerbaijan Grand Prix", [session("Práctica 1", "2026-09-24T08:30:00Z")])];
  const spain = PRACTICE.replace("AZERBAIJAN", "SPANISH");
  const pages = { [BASE]: `<a href="/en/results/2026/races/1295/azerbaijan/race-result"></a>`, [`${BASE}/1295/azerbaijan/practice/1`]: spain };
  const { events: out, meta } = await f1OfficialSessions(io(pages), events, {}, { now: NOW });
  assert.equal(out[0].sessions[0].results, undefined);
  assert.equal(meta.f1Official.errors.length, 1);
});

test("videos: sólo resúmenes de sesiones de 2026, con el nombre de la sesión de Fierros", () => {
  assert.deepEqual(parseTitle("FP1 Highlights | 2026 Azerbaijan Grand Prix"), { gp: "azerbaijan grand prix", session: "Práctica 1" });
  assert.equal(parseTitle("Sprint Qualifying Highlights | 2026 British Grand Prix").session, "Clasificación sprint");
  assert.equal(parseTitle("Qualifying Highlights | 2026 Spanish Grand Prix").session, "Clasificación");
  assert.equal(parseTitle("Race Highlights | 2026 Spanish Grand Prix").session, "Carrera");
  assert.equal(parseTitle("Extended Highlights | 2026 Spanish Grand Prix").label, "Extendido");
  assert.equal(parseTitle("Extended Highlights | 2018 Azerbaijan Grand Prix"), null);
  assert.equal(parseTitle("Weekend Warm-Up | 2026 Azerbaijan Grand Prix"), null);
  assert.equal(parseTitle("Incredible, Hulk"), null);
});

const FEED_URL = "https://www.youtube.com/feeds/videos.xml?channel_id=UCB_qr75-ydFVKSF9Dmo6izg";
const FEED = (entries) => `<feed>${entries.map(([id, title, at]) => `<entry><yt:videoId>${id}</yt:videoId><title>${title}</title><published>${at}</published></entry>`).join("")}</feed>`;

test("videos: se enlazan al terminar la sesión y uno ya enlazado no se pierde si el feed deja de mostrarlo", async () => {
  const events = [event(15, "f1-2026-15", "Azerbaijan Grand Prix", [session("Práctica 1", "2026-09-24T08:30:00Z"), session("Práctica 2", "2026-09-24T12:00:00Z")])];
  const feed = FEED([
    ["Os85ZjKi8Co", "FP1 Highlights | 2026 Azerbaijan Grand Prix", "2026-09-24T11:47:55+00:00"],
    ["zzz", "Incredible, Hulk", "2026-09-24T11:58:00+00:00"],
  ]);
  const first = await f1Videos(io({ [FEED_URL]: feed }), events, {}, { now: new Date(NOW) });
  assert.deepEqual(first.events[0].sessions[0].videos, [{ id: "Os85ZjKi8Co", kind: "highlights" }]);
  assert.equal(first.events[0].sessions[1].videos, undefined);

  const quiet = io({ [FEED_URL]: FEED([["zzz", "Incredible, Hulk", "2026-09-30T00:00:00+00:00"]]) });
  const later = await f1Videos(quiet, events, { events: first.events }, { now: new Date(NOW) });
  assert.equal(later.events[0].sessions[0].videos[0].id, "Os85ZjKi8Co");
});

test("OpenF1 bloqueado por una sesión en vivo (401) no es una falla: se conservan los resultados anteriores", async () => {
  const { openf1Sessions } = await import("./openf1.mjs");
  const before = [event(15, "f1-2026-15", "Azerbaijan Grand Prix", [{ ...session("Práctica 1", "2026-09-24T08:30:00Z", [{ pos: 1, driver: "X", team: "", gap: "" }]), resultsSource: { name: "OpenF1", url: "u" } }])];
  const events = [event(15, "f1-2026-15", "Azerbaijan Grand Prix", [session("Práctica 1", "2026-09-24T08:30:00Z")])];
  const blocked = { json: async (url) => { throw new Error(`401 al pedir ${url}`); }, sleep: async () => {} };
  const out = await openf1Sessions(blocked, events, { events: before });
  assert.equal(out.meta.restrictedWhileLive, true);
  assert.equal(out.events[0].sessions[0].results.length, 1);
  const broken = { json: async () => { throw new Error("500 al pedir"); }, sleep: async () => {} };
  await assert.rejects(openf1Sessions(broken, events, { events: before }), /500/);
});
