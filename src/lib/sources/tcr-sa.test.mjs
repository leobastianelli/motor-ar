import assert from "node:assert/strict";
import { test } from "node:test";
import { SCALES, resultsFromPoints, tcrSaSeason } from "./tcr-sa.mjs";

// API (recortada): tres fechas de 2026 (seasonId 6) y una de 2025 que se tiene que ignorar.
// Fecha 1 (Curvelo): carreras normales. Fecha 3 (Interlagos): Super Challenge, con dos pilotos por auto. Fecha 4 (Posadas): sólo clasificación.
const pilot = (id, name, team, number, nationality = "AR") => ({ id, name, nationality, numberOfCar: number, teamId: 1, team: { name: team } });
const PILOTS = [
  pilot(1, "Ana Uno", "Honda Racing", 1),
  pilot(2, "Beto Dos ", "Hyundai MSA", 2, "BR"), // la API trae nombres con espacio al final
  pilot(3, "Caro Tres", "Honda Racing", 3),
  pilot(4, "Dani Invitado", "Otro Equipo", 44, "BR"),
  pilot(5, "Eli Invitada", "Hyundai MSA", 45, "BR"),
];
const row = (raceId, alias, pilotId, points) => ({ raceId, championshipId: 11, alias, pilotId, teamId: null, points, bonusPoints: 0 });
const RACES = [
  { id: 20, seasonId: 5, stage: 1, name: "Viejo", country: "AR", city: "Viejo", startDate: "2025-03-09T03:00:00.000Z", results: [], points: [] },
  {
    id: 26,
    seasonId: 6,
    stage: 1,
    name: "Curvelo",
    country: "BR",
    city: "Minas Gerais",
    startDate: "2026-03-08T03:00:00.000Z",
    endDate: null,
    results: [
      { id: 153, name: "CURVELO 2026 - GRID RACE 1", documentId: 5637 },
      { id: 156, name: "CURVELO 2026 - RACE 2", documentId: 5650 },
      { id: 157, name: "CURVELO 2026 - RACE 1", documentId: 5666 },
    ],
    points: [
      row(26, "Q", 1, 10),
      row(26, "Q", 2, 7),
      row(26, "R1", 1, 40),
      row(26, "R1", 2, 35),
      row(26, "R1", 3, 0),
      row(26, "R2", 2, 35),
      row(26, "R2", 3, 30),
      row(26, "R2", 1, 27),
      { ...row(26, "R1", 99, 5), championshipId: 10, pilotId: null, teamId: 7 }, // equipos: no cuenta
    ],
  },
  {
    id: 28,
    seasonId: 6,
    stage: 3,
    name: "Interlagos",
    country: "BR",
    city: "São Paulo",
    startDate: "2026-04-26T03:00:00.000Z",
    results: [{ id: 179, name: "RACE SUPER CHALLENGE - INTERLAGOS 2026", documentId: 6041 }],
    points: [row(28, "R1", 1, 50), row(28, "R1", 4, 50), row(28, "R1", 2, 44), row(28, "R1", 5, 44), row(28, "R1", 3, 38), row(28, "R2", 1, 0), row(28, "R2", 2, 0)],
  },
  {
    id: 33,
    seasonId: 6,
    stage: 4,
    name: "Posadas",
    country: "AR",
    city: "Posadas",
    startDate: "2026-10-04T03:00:00.000Z",
    results: [],
    points: [row(33, "Q", 1, 10), row(33, "R1", 1, 0), row(33, "R1", 2, 0), row(33, "R2", 1, 0)],
  },
];

const WIKI = `
==Calendar==
{| class="wikitable"
!Rnd.
!Circuit/Location
!Dates
|-
! 1
| {{flagicon|BRA}} [[Circuito dos Cristais]], [[Curvelo]]
| 6–8 March
|-
! 3
| {{flagicon|BRA}} [[Interlagos Circuit]], [[São Paulo]]
| 24–26 April
|-
! 4
| {{flagicon|ARG}} [[Autódromo Rosamonte]], [[Posadas, Misiones|Posadas]]
| 2–5 October
|}
== Championship standings==
=== Drivers' championship ===
{|
! Pos. !! Driver !! CRV !! CRV !! CAS !! CAS !! INT !! Points
|-
! Pos. !! Driver !! SR1 !! SR2 !! SR1 !! SR2 !! END !! Points
|-
! 1
| {{flagicon|ARG}} [[Ana Uno]] || 1 || 3 ||  ||  || 1 || 127
|-
! 2
| {{flagicon|BRA}} [[Beto Dos]] || 2 || 1 ||  ||  || 2 || 121
|}
`;

/** `io` falso: responde desde un mapa de direcciones y anota qué se pidió. */
function fakeIo({ races = RACES, pilots = PILOTS, wiki = WIKI, files = {}, fail = [] } = {}) {
  const calls = [];
  return {
    calls,
    sleep: async () => {},
    wiki: async () => {
      if (wiki instanceof Error) throw wiki;
      return wiki;
    },
    json: async (url) => {
      calls.push(url);
      if (fail.some((f) => url.includes(f))) throw new Error(`falla ${url}`);
      if (url.endsWith("/races")) return races;
      if (url.includes("/pilots")) return pilots;
      const id = url.match(/\/files\/(\d+)/)?.[1];
      if (id && files[id]) return { filename: files[id] };
      throw new Error(`sin respuesta para ${url}`);
    },
  };
}

const byName = new Map(PILOTS.map((p) => [p.id, { id: p.id, name: p.name.trim(), team: p.team.name, number: String(p.numberOfCar), nationality: p.nationality }]));

test("los puntos de una carrera sprint vuelven a ser posiciones exactas, sólo para quienes puntuaron", () => {
  const { results, wins, problems } = resultsFromPoints([row(1, "R1", 1, 40), row(1, "R1", 2, 35), row(1, "R1", 3, 0), row(1, "R1", 4, 30)], byName, SCALES.sprint1);
  assert.deepEqual(results.map((r) => [r.pos, r.driver, r.points]), [[1, "Ana Uno", 40], [2, "Beto Dos", 35], [3, "Dani Invitado", 30]]);
  assert.deepEqual(wins, [1]);
  assert.deepEqual(problems, []);
  assert.equal(results[0].number, "1");
  assert.equal(results[0].gap, "");
});

test("la Carrera 2 usa su propia escala (35 puntos es el 1.º, no el 2.º)", () => {
  const { results } = resultsFromPoints([row(1, "R2", 2, 35), row(1, "R2", 3, 30)], byName, SCALES.sprint2);
  assert.deepEqual(results.map((r) => [r.pos, r.driver]), [[1, "Beto Dos"], [2, "Caro Tres"]]);
});

test("un puntaje fuera de la escala no se inventa: queda anotado y sin fila", () => {
  const { results, problems } = resultsFromPoints([row(1, "R1", 1, 40), row(1, "R1", 2, 33)], byName, SCALES.sprint1);
  assert.equal(results.length, 1);
  assert.match(problems[0], /33 puntos/);
});

test("Interlagos: los dos pilotos de un auto suman lo mismo y salen como una tripulación, aunque figuren en equipos distintos", () => {
  const rows = [row(28, "R1", 1, 50), row(28, "R1", 4, 50), row(28, "R1", 2, 44), row(28, "R1", 5, 44), row(28, "R1", 3, 38)];
  const { results } = resultsFromPoints(rows, byName, SCALES.endurance, { endurance: true });
  assert.deepEqual(results.map((r) => [r.pos, r.driver, r.points]), [[1, "Ana Uno / Dani Invitado", 50], [2, "Beto Dos / Eli Invitada", 44], [3, "Caro Tres", 38]]);
  assert.equal(results[0].team, "Honda Racing / Otro Equipo");
  assert.equal(results[0].number, "1/44");
});

test("arma una fecha por etapa de 2026, con clasificación el día anterior y dos carreras sin horario", async () => {
  const season = await tcrSaSeason(fakeIo(), { events: [] });
  assert.deepEqual(season.events.map((e) => e.id), ["tcr-sa-2026-1", "tcr-sa-2026-3", "tcr-sa-2026-4"]);
  const curvelo = season.events[0];
  assert.equal(curvelo.seriesId, "tcr-sa");
  assert.equal(curvelo.name, "Curvelo");
  assert.deepEqual(curvelo.circuit, { name: "Circuito dos Cristais", city: "Curvelo", country: "Brasil", flag: "BR" });
  assert.deepEqual(curvelo.sessions.map((s) => [s.name, s.start, s.timeKnown]), [
    ["Clasificación", "2026-03-07T12:00:00-03:00", false],
    ["Carrera 1", "2026-03-08T12:00:00-03:00", false],
    ["Carrera 2", "2026-03-08T12:00:00-03:00", false],
  ]);
});

test("Interlagos tiene clasificación y una sola carrera, y la Carrera 2 sin puntos no genera resultados", async () => {
  const season = await tcrSaSeason(fakeIo({ files: { 6041: "super.pdf" } }), { events: [] });
  const interlagos = season.events.find((e) => e.round === 3);
  assert.deepEqual(interlagos.sessions.map((s) => s.name), ["Clasificación", "Super Challenge"]);
  const race = interlagos.sessions[1];
  assert.equal(race.results.length, 3);
  assert.equal(race.results[0].driver, "Ana Uno / Dani Invitado");
  assert.equal(race.resultsSource.url, "https://apisa.tcr-series.com/super.pdf");
});

test("una sesión cuyos puntos suman cero no tiene resultados, y la clasificación nunca los tiene", async () => {
  const season = await tcrSaSeason(fakeIo(), { events: [] });
  const posadas = season.events.find((e) => e.round === 4);
  assert.ok(posadas.sessions.every((s) => !s.results && !s.resultsSource));
  const curvelo = season.events[0];
  assert.equal(curvelo.sessions[0].results, undefined);
  assert.deepEqual(curvelo.sessions[1].results.map((r) => r.driver), ["Ana Uno", "Beto Dos"]);
  assert.deepEqual(curvelo.sessions[2].results.map((r) => [r.pos, r.driver]), [[1, "Beto Dos"], [2, "Caro Tres"], [3, "Ana Uno"]]);
});

test("el resultado enlaza al PDF oficial de esa carrera; si /files falla, a la página de resultados", async () => {
  const ok = await tcrSaSeason(fakeIo({ files: { 5666: "r1.pdf", 5650: "r2 final.pdf" } }), { events: [] });
  assert.equal(ok.events[0].sessions[1].resultsSource.url, "https://apisa.tcr-series.com/r1.pdf");
  assert.equal(ok.events[0].sessions[2].resultsSource.url, "https://apisa.tcr-series.com/r2%20final.pdf");
  assert.equal(ok.events[0].sessions[1].resultsSource.name, "TCR South America · puntos del campeonato");
  assert.match(ok.events[0].sessions[1].resultsSource.note, /15 que sumaron puntos/);

  const failed = await tcrSaSeason(fakeIo({ fail: ["/files/"] }), { events: [] });
  assert.equal(failed.events[0].sessions[1].resultsSource.url, "https://southamerica.tcr-series.com/resultados");
});

test("no vuelve a pedir un PDF cuya dirección ya teníamos", async () => {
  const previous = { events: [{ id: "tcr-sa-2026-1", sessions: [{ id: "tcr-sa-2026-1-r1", resultsSource: { url: "https://apisa.tcr-series.com/ya.pdf" } }] }] };
  const io = fakeIo({ files: { 5650: "r2.pdf" } });
  const season = await tcrSaSeason(io, previous);
  assert.equal(season.events[0].sessions[1].resultsSource.url, "https://apisa.tcr-series.com/ya.pdf");
  assert.ok(!io.calls.some((u) => u.endsWith("/files/5666")));
});

test("el campeonato suma puntos de todas las carreras (el de equipos no), con Interlagos para cada piloto de la tripulación", async () => {
  const season = await tcrSaSeason(fakeIo(), { events: [] });
  const table = season.standings["tcr-sa"];
  // Ana: 10+40+27+50+10 = 137; Beto: 7+35+35+44 = 121; Caro: 30+38 = 68; Dani: 50; Eli: 44.
  assert.deepEqual(table.map((r) => [r.pos, r.driver, r.team, r.points]), [
    [1, "Ana Uno", "Honda Racing", 137],
    [2, "Beto Dos", "Hyundai MSA", 121],
    [3, "Caro Tres", "Honda Racing", 68],
    [4, "Dani Invitado", "Otro Equipo", 50],
    [5, "Eli Invitada", "Hyundai MSA", 44],
  ]);
  const meta = season.meta["tcr-sa"];
  assert.equal(meta.standingsLabel, "Pilotos");
  assert.equal(meta.standingsAsOfRound, 4); // en Posadas ya hay puntos de clasificación
  assert.deepEqual(meta.argentines, ["Ana Uno", "Caro Tres"]);
});

test("el empate de puntos se resuelve por victorias", async () => {
  // Ana: 5 + 35 = 40 sin ganar; Beto: 40 con una victoria. Ana va antes por orden alfabético, así que si gana Beto es por las victorias.
  const races = [{ id: 1, seasonId: 6, stage: 1, name: "A", country: "AR", city: "A", startDate: "2026-03-08T03:00:00.000Z", results: [], points: [row(1, "Q", 1, 5), row(1, "R1", 1, 35), row(1, "R1", 2, 40)] }];
  const season = await tcrSaSeason(fakeIo({ races, wiki: "" }), { events: [] });
  assert.deepEqual(season.standings["tcr-sa"].map((r) => [r.pos, r.driver, r.points]), [[1, "Beto Dos", 40], [2, "Ana Uno", 40]]);
});

test("si la fecha de Wikipedia no coincide con la de la API, manda la API y queda en discrepancias", async () => {
  const season = await tcrSaSeason(fakeIo(), { events: [] });
  const posadas = season.events.find((e) => e.round === 4);
  assert.equal(posadas.sessions[1].start, "2026-10-04T12:00:00-03:00");
  assert.equal(posadas.circuit.name, "Posadas", "con la fecha en duda no se usa el nombre de Wikipedia");
  assert.ok(season.meta["tcr-sa"].discrepancies.some((d) => /Fecha 4/.test(d) && /4\/10/.test(d) && /5\/10/.test(d)));
});

test("compara el podio y los puntos con la tabla de Wikipedia y anota lo que no coincide, sin tirar error", async () => {
  // Wikipedia pone a Beto 1.º y a Ana 2.º en la Carrera 1 de Curvelo (la API dice al revés), y a Ana 117 puntos (la API, 127 hasta ahí).
  const wiki = WIKI.replace("[[Ana Uno]] || 1 || 3 ||  ||  || 1 || 127", "[[Ana Uno]] || 2 || 3 ||  ||  || 1 || 117").replace("[[Beto Dos]] || 2 || 1 ||", "[[Beto Dos]] || 1 || 1 ||");
  const { discrepancies } = (await tcrSaSeason(fakeIo({ wiki }), { events: [] })).meta["tcr-sa"];
  assert.ok(discrepancies.some((d) => /Fecha 1 Carrera 1, puesto 1: Wikipedia Beto Dos, API Ana Uno/.test(d)), discrepancies.join("\n"));
  assert.ok(discrepancies.some((d) => /Puntos hasta la fecha 3/.test(d) && /Ana Uno 117/.test(d)));
});

test("sin discrepancias cuando Wikipedia coincide", async () => {
  const { discrepancies } = (await tcrSaSeason(fakeIo(), { events: [] })).meta["tcr-sa"];
  assert.ok(!discrepancies.some((d) => /puesto|Puntos/.test(d)), discrepancies.join("\n"));
});

test("si la API falla arma el calendario con Wikipedia (sólo fechas, sin resultados) y deja una nota", async () => {
  const previous = { events: [], meta: { "tcr-sa": { argentines: ["Ana Uno"] } } };
  const season = await tcrSaSeason(fakeIo({ fail: ["/races"] }), previous);
  assert.deepEqual(season.events.map((e) => [e.id, e.name]), [["tcr-sa-2026-1", "Curvelo"], ["tcr-sa-2026-3", "Interlagos"], ["tcr-sa-2026-4", "Posadas"]]);
  assert.deepEqual(season.events[1].sessions.map((s) => s.name), ["Clasificación", "Super Challenge"], "la columna END de Wikipedia marca la carrera de resistencia");
  assert.equal(season.events[0].sessions[1].start, "2026-03-08T12:00:00-03:00");
  assert.equal(season.events[0].circuit.country, "Brasil");
  assert.ok(season.events.every((e) => e.sessions.every((s) => !s.results)));
  assert.deepEqual(season.standings["tcr-sa"], []);
  assert.deepEqual(season.meta["tcr-sa"].argentines, ["Ana Uno"]);
  assert.match(season.meta["tcr-sa"].notes[0], /API oficial no respondió/);
});

test("si fallan la API y Wikipedia tira error (la temporada conserva lo anterior)", async () => {
  await assert.rejects(() => tcrSaSeason(fakeIo({ fail: ["/races"], wiki: new Error("caída") }), { events: [] }), /API.*Wikipedia: caída/);
});

test("si sólo falla Wikipedia, la temporada sale igual con los nombres de la API y una nota", async () => {
  const season = await tcrSaSeason(fakeIo({ wiki: new Error("caída") }), { events: [] });
  assert.equal(season.events.length, 3);
  assert.equal(season.events[0].circuit.name, "Curvelo");
  assert.match(season.meta["tcr-sa"].notes[0], /Wikipedia no respondió/);
});
