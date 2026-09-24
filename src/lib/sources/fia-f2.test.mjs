import assert from "node:assert/strict";
import { test } from "node:test";
import { parseOfficialSchedule } from "./f2.mjs";
import { F2_OFFICIAL_SOURCE, FIA_F2_SOURCE, f2Names, fiaF2, keepPreviousFia, officialRows, parseOfficialSessions } from "./fia-f2.mjs";
import { protectSeason } from "./guard.mjs";

// ——— Página de una fecha en fiaformula2.com (recortada): JSON-LD con los horarios y los datos embebidos de Next.js con las sesiones ———

const jsonLd = (sessions) =>
  sessions
    .map(
      ([name, start, end]) =>
        `{"@context":"https://schema.org","@type":"SportsEvent","@id":"https://www.fiaformula2.com/en/racing/2026/baku#${name}","name":"${name} - Azerbaijan Grand Prix","description":"x","startDate":"${start}","endDate":"${end}","eventStatus":"https://schema.org/EventScheduled"}`,
    )
    .join(",");

const row = (pos, first, last, team, time, number) => ({
  sessionNumber: 2,
  completionStatusCode: "OK",
  positionValue: String(pos),
  positionNumber: String(pos),
  classifiedTime: time,
  racingNumber: String(number),
  driverFirstName: first,
  driverLastName: last,
  driverShortName: `${first[0]}. ${last}`,
  teamName: team,
  displayTime: time,
});

const Q2_ROWS = [
  row(1, "Martinius", "Stenshorne", "Rodin Motorsport", "1:53.728", 14),
  row(2, "Alexander", "Dunne", "Rodin Motorsport", "1:54.173", 15),
  row(3, "Laurens", "van Hoepen", "TRIDENT", "1:54.495", 24),
  row(4, "Gabriele", "Mini", "MP Motorsport", "1:55.443", 9),
];

/** Sesiones de Baku 2026 como las publica fiaformula2.com; `latest` es la última terminada, la única que trae resultados. */
function bakuPage({ completed, latest, rows }) {
  const all = [
    ["Practice 0", "Practice", "Practice", 0, "2026-09-24T10:00:00", "2026-09-24T10:45:00"],
    ["Qualifying 1", "Qualifying 1", "Qualifying", 1, "2026-09-24T14:00:00", "2026-09-24T14:20:00"],
    ["Qualifying 2", "Qualifying 2", "Qualifying", 2, "2026-09-24T14:30:00", "2026-09-24T14:50:00"],
    ["Race 1", "Sprint Race", "Race", 1, "2026-09-25T08:15:00", "2026-09-25T09:05:00"],
    ["Race 2", "Feature Race 1", "Race", 2, "2026-09-25T14:15:00", "2026-09-25T15:20:00"],
    ["Race 3", "Feature Race 2", "Race", 3, "2026-09-26T11:00:00", "2026-09-26T12:05:00"],
  ].map(([session, shortName, sessionType, sessionNumber, startTime, endTime]) => ({
    session,
    shortName,
    sessionType,
    sessionNumber,
    startTime,
    endTime,
    gmtOffset: "+04:00",
    state: completed.includes(shortName) ? "completed" : "upcoming",
    ...(shortName === latest ? { results: rows } : {}),
  }));
  const flight = `3:["$","$L11",null,{"race":{"meetingSessions":${JSON.stringify(all)},"season":"2026","meetingName":"Azerbaijan Grand Prix [test]"}}]`;
  const ld = jsonLd([
    ["Practice", "2026-09-24T06:00:00.000Z", "2026-09-24T06:45:00.000Z"],
    ["Qualifying", "2026-09-24T10:00:00.000Z", "2026-09-24T10:20:00.000Z"],
    ["Qualifying", "2026-09-24T10:30:00.000Z", "2026-09-24T10:50:00.000Z"],
    ["Race", "2026-09-25T04:15:00.000Z", "2026-09-25T05:05:00.000Z"],
    ["Race", "2026-09-25T10:15:00.000Z", "2026-09-25T11:20:00.000Z"],
    ["Race", "2026-09-26T07:00:00.000Z", "2026-09-26T08:05:00.000Z"],
  ]);
  return `<html><script type="application/ld+json">[${ld}]</script><script>self.__next_f.push([1,${JSON.stringify(flight)}])</script></html>`;
}

// La fecha como la arma f2.mjs con el horario oficial: seis sesiones.
const S = (suffix, kind, name, start, durationMin) => ({ id: `f2-2026-12-${suffix}`, kind, name, start, timeKnown: true, durationMin });
const BAKU = {
  id: "f2-2026-12",
  seriesId: "f2",
  round: 12,
  name: "Baku",
  circuit: { name: "Baku City Circuit", city: "Baku", country: "", flag: "AZ" },
  venueSlug: "baku",
  sessions: [
    S("practica", "practica", "Práctica", "2026-09-24T06:00:00.000Z", 45),
    S("clasificacion-1", "clasificacion", "Clasificación 1", "2026-09-24T10:00:00.000Z", 20),
    S("clasificacion-2", "clasificacion", "Clasificación 2", "2026-09-24T10:30:00.000Z", 20),
    S("sprint", "sprint", "Carrera sprint", "2026-09-25T04:15:00.000Z", 50),
    S("carrera", "carrera", "Carrera principal", "2026-09-25T10:15:00.000Z", 65),
    S("carrera-2", "carrera", "Carrera principal 2", "2026-09-26T07:00:00.000Z", 65),
  ],
};

const EMPTY_FIA = "<html><h1>Qualifying Classification</h1></html>";

function fakeIo(pages) {
  const asked = [];
  return {
    asked,
    sleep: async () => {},
    text: async (url) => {
      asked.push(url);
      if (url in pages) return pages[url];
      throw new Error(`404 ${url}`);
    },
  };
}

const OFFICIAL_URL = "https://www.fiaformula2.com/en/racing/2026/baku";
const NOW = Date.parse("2026-09-24T20:15:00Z");
const NAMES = ["Martinius Stenshorne", "Alexander Dunne", "Laurens van Hoepen", "Gabriele Minì"];
const session = (season, id) => season.events[0].sessions.find((s) => s.id === id);

test("horario oficial: dos clasificaciones y tres carreras (Baku 2026) no se pisan", () => {
  const sessions = parseOfficialSchedule(bakuPage({ completed: [], latest: null, rows: [] }));
  assert.deepEqual([...sessions.keys()], ["Practice", "Qualifying 1", "Qualifying 2", "Sprint Race", "Feature Race", "Feature Race 2"]);
  assert.equal(sessions.get("Qualifying 2").start, "2026-09-24T10:30:00.000Z");
  assert.equal(sessions.get("Feature Race 2").start, "2026-09-26T07:00:00.000Z");

  const normal = parseOfficialSchedule(
    `<script>[${jsonLd([
      ["Practice", "2026-07-03T09:00:00.000Z", "2026-07-03T09:45:00.000Z"],
      ["Qualifying", "2026-07-03T13:00:00.000Z", "2026-07-03T13:30:00.000Z"],
      ["Race", "2026-07-04T13:00:00.000Z", "2026-07-04T13:45:00.000Z"],
      ["Race", "2026-07-05T09:00:00.000Z", "2026-07-05T10:05:00.000Z"],
    ])}]</script>`,
  );
  assert.deepEqual([...normal.keys()], ["Practice", "Qualifying", "Sprint Race", "Feature Race"]);

  // Mónaco: dos grupos de clasificación y dos carreras → una sola clasificación (combinada), del inicio del grupo A al fin del B.
  const monaco = parseOfficialSchedule(
    `<script>[${jsonLd([
      ["Practice", "2026-06-04T13:00:00.000Z", "2026-06-04T13:45:00.000Z"],
      ["Qualifying", "2026-06-05T13:10:00.000Z", "2026-06-05T13:26:00.000Z"],
      ["Qualifying", "2026-06-05T13:34:00.000Z", "2026-06-05T13:50:00.000Z"],
      ["Race", "2026-06-06T12:15:00.000Z", "2026-06-06T13:00:00.000Z"],
      ["Race", "2026-06-07T07:25:00.000Z", "2026-06-07T08:30:00.000Z"],
    ])}]</script>`,
  );
  assert.deepEqual([...monaco.keys()], ["Practice", "Qualifying", "Sprint Race", "Feature Race"]);
  assert.deepEqual(monaco.get("Qualifying"), { start: "2026-06-05T13:10:00.000Z", end: "2026-06-05T13:50:00.000Z" });
});

test("fiaformula2.com: lee las sesiones embebidas y la clasificación de la última terminada", () => {
  const sessions = parseOfficialSessions(bakuPage({ completed: ["Practice", "Qualifying 1", "Qualifying 2"], latest: "Qualifying 2", rows: Q2_ROWS }));
  assert.deepEqual(
    sessions.map((s) => [s.kind, s.index, s.state, s.results.length]),
    [
      ["practica", 0, "completed", 0],
      ["clasificacion", 0, "completed", 0],
      ["clasificacion", 1, "completed", 4],
      ["sprint", 0, "upcoming", 0],
      ["carrera", 0, "upcoming", 0],
      ["carrera", 1, "upcoming", 0],
    ],
  );
  assert.equal(new Date(sessions[2].end).toISOString(), "2026-09-24T10:50:00.000Z", "hora local de Baku (+04:00)");

  const rows = officialRows(sessions[2].results, "clasificacion", f2Names(NAMES));
  assert.deepEqual(rows[0], { pos: 1, number: "14", driver: "Martinius Stenshorne", team: "Rodin Motorsport", gap: "1:53.728" });
  assert.equal(rows[1].gap, "+0.445");
  assert.equal(rows[2].team, "Trident", "equipo en mayúsculas → nombre propio");
  assert.equal(rows[3].driver, "Gabriele Minì", "el nombre completo del campeonato gana (con tilde)");
  assert.deepEqual(parseOfficialSessions("<html>sin datos</html>"), []);
});

test("Baku: la clasificación 2 sale de fiaformula2.com; práctica y clasificación 1 quedan como publicadas sin leer", async () => {
  const io = fakeIo({
    [OFFICIAL_URL]: bakuPage({ completed: ["Practice", "Qualifying 1", "Qualifying 2"], latest: "Qualifying 2", rows: Q2_ROWS }),
    "https://www.fia.com/events/formula-2-championship/season-2026/baku/qualifying-classification": EMPTY_FIA,
  });
  const season = await fiaF2(io, [BAKU], null, { delayMs: 0, officialDelayMs: 0, knownNames: NAMES, now: NOW });

  const q2 = session(season, "f2-2026-12-clasificacion-2");
  assert.equal(q2.results.length, 4);
  assert.equal(q2.results[0].driver, "Martinius Stenshorne");
  assert.deepEqual(q2.resultsSource, { name: F2_OFFICIAL_SOURCE, url: OFFICIAL_URL });
  assert.equal(q2.resultsUnread, undefined);

  for (const id of ["f2-2026-12-practica", "f2-2026-12-clasificacion-1"]) {
    assert.equal(session(season, id).results, undefined, id);
    assert.equal(session(season, id).resultsUnread, true, id);
  }
  // Las carreras todavía no se corrieron: ni resultados ni marca.
  assert.equal(session(season, "f2-2026-12-sprint").resultsUnread, undefined);
  assert.equal(season.events[0].sessions.length, 6, "no se agregan sesiones fantasma");
  // fia.com publica una sola página de clasificación: con dos clasificaciones no se sabe de cuál es, así que ni se pide.
  assert.ok(!io.asked.some((u) => u.includes("qualifying-classification")));
  assert.deepEqual(season.meta.unread, ["Baku · Práctica", "Baku · Clasificación 1"]);
});

test("lo leído de fiaformula2.com se conserva cuando la página ya muestra otra sesión (las fuentes nunca se achican)", async () => {
  // Corrida 1, entre la práctica y la clasificación: la práctica es la última sesión terminada.
  const first = await fiaF2(
    fakeIo({ [OFFICIAL_URL]: bakuPage({ completed: ["Practice"], latest: "Practice", rows: Q2_ROWS.map((r) => ({ ...r, sessionNumber: 0 })) }) }),
    [BAKU],
    null,
    { delayMs: 0, officialDelayMs: 0, knownNames: NAMES, now: Date.parse("2026-09-24T09:00:00Z") },
  );
  assert.equal(session(first, "f2-2026-12-practica").results.length, 4);

  // Corrida 2: la página ya muestra la clasificación 2; la práctica tiene que seguir con sus resultados.
  const second = await fiaF2(
    fakeIo({ [OFFICIAL_URL]: bakuPage({ completed: ["Practice", "Qualifying 1", "Qualifying 2"], latest: "Qualifying 2", rows: Q2_ROWS }) }),
    [BAKU],
    first,
    { delayMs: 0, officialDelayMs: 0, knownNames: NAMES, now: NOW },
  );
  assert.equal(session(second, "f2-2026-12-practica").results.length, 4);
  assert.equal(session(second, "f2-2026-12-practica").resultsUnread, undefined);
  assert.equal(session(second, "f2-2026-12-clasificacion-2").results.length, 4);
  assert.equal(session(second, "f2-2026-12-clasificacion-1").resultsUnread, true);

  // Corrida 3: fiaformula2.com caída. Nada se pierde: ni los resultados ni la marca de "publicada sin leer".
  const third = await fiaF2(fakeIo({}), [BAKU], second, { delayMs: 0, officialDelayMs: 0, knownNames: NAMES, now: NOW + 3600000 });
  assert.equal(session(third, "f2-2026-12-practica").results.length, 4);
  assert.equal(session(third, "f2-2026-12-clasificacion-2").results.length, 4);
  assert.equal(session(third, "f2-2026-12-clasificacion-1").resultsUnread, true);
  const kept = keepPreviousFia([BAKU], second);
  assert.equal(kept[0].sessions.find((s) => s.id === "f2-2026-12-clasificacion-2").results.length, 4);
  assert.equal(kept[0].sessions.find((s) => s.id === "f2-2026-12-clasificacion-1").resultsUnread, true);

  // Y la protección general tampoco ve nada que falte.
  const guarded = protectSeason(third.events, second);
  assert.deepEqual(guarded.warnings, []);
});

test("fecha normal: la tabla de fia.com gana sobre la de fiaformula2.com", async () => {
  const monza = {
    ...BAKU,
    id: "f2-2026-10",
    venueSlug: "monza",
    circuit: { ...BAKU.circuit, city: "Monza" },
    sessions: [
      { id: "f2-2026-10-practica", kind: "practica", name: "Práctica", start: "2026-09-04T08:00:00.000Z", timeKnown: true, durationMin: 45 },
      { id: "f2-2026-10-clasificacion", kind: "clasificacion", name: "Clasificación", start: "2026-09-04T12:55:00.000Z", timeKnown: true, durationMin: 30 },
    ],
  };
  const fiaTable =
    '<table><tr class="table-header"><td class="header-pos">P</td><td class="header-nr">N</td><td class="header-driver">D</td><td class="header-team">T</td><td class="header-best-lap">B</td><td class="header-gap-first">G</td></tr>' +
    '<tr class="competitor"><td>1</td><td>14</td><td><div class="name">M. Stenshorne</div></td><td>Rodin Motorsport</td><td>1:30.000</td><td></td></tr></table>';
  const official = bakuPage({ completed: ["Practice", "Qualifying 1"], latest: "Qualifying 1", rows: Q2_ROWS });
  const io = fakeIo({
    "https://www.fia.com/events/formula-2-championship/season-2026/monza/qualifying-classification": fiaTable,
    "https://www.fiaformula2.com/en/racing/2026/monza": official,
  });
  const season = await fiaF2(io, [monza], null, { delayMs: 0, officialDelayMs: 0, knownNames: NAMES, now: NOW });
  const quali = season.events[0].sessions.find((s) => s.id === "f2-2026-10-clasificacion");
  assert.equal(quali.resultsSource.name, FIA_F2_SOURCE);
  assert.equal(quali.results.length, 1);
  // La práctica no está en fia.com: queda como publicada sin leer (fiaformula2.com ya muestra la clasificación).
  assert.equal(season.events[0].sessions.find((s) => s.id === "f2-2026-10-practica").resultsUnread, true);
});
