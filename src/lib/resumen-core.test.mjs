import assert from "node:assert/strict";
import { test } from "node:test";
import { borradores } from "./redes-core.mjs";
import { fechaLabel, MAX_RESTO, resumenFinde, resumenReciente, shortName, ultimoDomingo } from "./resumen-core.mjs";

// Orden de series como en series.ts: F1 primero, TC antes que TC Pista.
const series = [
  { id: "f1", name: "Fórmula 1", short: "F1", code: "F1", scope: "internacional", color: "#dc3e25" },
  { id: "tc", name: "Turismo Carretera", short: "TC", code: "TC", scope: "nacional", color: "#16658f" },
  { id: "tc-pista", name: "TC Pista", short: "TC Pista", code: "TCP", scope: "nacional", color: "#16658f" },
  { id: "tn", name: "TN APAT", short: "TN", code: "TN", scope: "nacional", color: "#b47805" },
  { id: "tc2000", name: "TC2000", short: "TC2000", code: "TC2K", scope: "nacional", color: "#101213" },
  { id: "gt3", name: "GT World Challenge Europe", short: "GTWC", code: "GT3", scope: "internacional", color: "#6b3d83" },
  { id: "wec", name: "FIA WEC", short: "WEC", code: "WEC", scope: "internacional", color: "#8a3f1f" },
];
const drivers = [{ slug: "franco-colapinto", name: "Franco Colapinto", seriesId: "f1", team: "Alpine" }];
const catalog = { drivers, series, broadcasts: {} };

const row = (pos, driver, extra = {}) => ({ pos, positionText: String(pos), driver, team: "Equipo", gap: pos === 1 ? "37:37.123" : `+${pos}.000`, ...extra });
const quali = (pole) => ({ id: "q", kind: "clasificacion", name: "Clasificación", start: "2026-10-03T14:00:00-03:00", timeKnown: true, durationMin: 30, results: [row(1, pole), row(2, "Otro Piloto")] });
const final = (results, start = "2026-10-04T14:00:00-03:00", extra = {}) => ({ id: "r", kind: "final", name: "Final", start, timeKnown: true, durationMin: 40, results, ...extra });
const ev = (id, seriesId, sessions, extra = {}) => ({ id, seriesId, round: 1, name: `Fecha ${id}`, circuit: { city: `Ciudad ${id}` }, source: "ACTC (calendario)", sessions, ...extra });
const season = (events, extra = {}) => ({ events, standings: {}, meta: {}, ...extra });
const DOM = "2026-10-04T23:30:00Z"; // domingo 20:30 hora argentina
const run = (events, when = DOM, opts = {}) => resumenFinde(season(events, opts.season), when, { catalog, ...opts });

const tc = () => ev("tc-12", "tc", [quali("Ignacio Faín"), final([row(1, "Ignacio Faín", { team: "Torino" }), row(2, "Facundo Chapur"), row(3, "Julián Santero")])], { circuit: { city: "San Nicolás" } });
const f1 = (colapinto = row(13, "Franco Colapinto", { grid: 21 })) =>
  ev("f1-16", "f1", [{ ...final([row(1, "Max Verstappen"), row(2, "Kimi Antonelli"), row(3, "Lewis Hamilton"), colapinto], "2026-10-04T04:00:00-03:00"), kind: "carrera" }], { source: "Jolpica-F1", name: "GP de Baréin" });

test("el héroe es la categoría nacional aunque la internacional salga más temprano; pole y victoria se detectan por la clasificación", () => {
  const sabado = ev("tn-s", "tn", [final([row(1, "Un Piloto")], "2026-10-03T15:00:00-03:00")]);
  const r = run([f1(), tc(), sabado]);
  assert.equal(r.hero.series.code, "TC");
  assert.equal(r.hero.series.color, "#16658f");
  assert.equal(r.hero.ciudad, "San Nicolás");
  assert.equal(r.hero.winner.name, "Ignacio Faín");
  assert.equal(r.hero.winner.team, "Torino");
  assert.equal(r.hero.pole, "Ignacio Faín");
  assert.equal(r.hero.poleYVictoria, true);
  assert.deepEqual(r.hero.podium.map((p) => [p.pos, p.name, p.gap]), [[1, "Ignacio Faín", "37:37.123"], [2, "Facundo Chapur", "+2.000"], [3, "Julián Santero", "+3.000"]]);
  assert.equal(r.hero.provisional, false);
  assert.equal(r.fecha, "3 y 4 de octubre", "los días con carrera principal con resultado (la clasificación del sábado no cuenta)");
  assert.equal(run([tc()]).fecha, "4 de octubre");
});

test("si gana otro que el poleman, no hay poleYVictoria; sin clasificación con resultados, tampoco se inventa la pole", () => {
  const otro = ev("tc-1", "tc", [quali("Otro Piloto"), final([row(1, "Ignacio Faín"), row(2, "Facundo Chapur")])]);
  const r = run([otro]);
  assert.equal(r.hero.poleYVictoria, false);
  assert.equal(r.hero.pole, "Otro Piloto");
  const sinQuali = ev("tc-2", "tc", [final([row(1, "Ignacio Faín"), row(2, "Facundo Chapur")])]);
  const s = run([sinQuali]);
  assert.equal(s.hero.pole, null);
  assert.equal(s.hero.poleYVictoria, false);
});

test("sin categorías nacionales, el héroe es una internacional con argentinos; sin eso, el resto, en el orden de series", () => {
  assert.equal(run([f1()]).hero.series.code, "F1");
  const gt3 = ev("gt3-1", "gt3", [final([row(1, "A / B")], "2026-10-04T18:20:00+02:00")], { source: "GT World Challenge Europe (oficial)" });
  const wec = ev("wec-1", "wec", [final([row(1, "C")], "2026-10-04T10:00:00-03:00")], { source: "FIA WEC" });
  assert.equal(run([wec, gt3]).hero.series.code, "GT3", "mismo grupo: manda el orden de series.ts, no la hora");
});

test("el líder del campeonato sólo sale si la tabla está al día", () => {
  const standings = { tc: [{ pos: 1, driver: "Mariano Werner", points: 310 }] };
  const fresca = run([tc()], DOM, { season: { standings, meta: { tc: { standingsAsOfRound: 1 } } } });
  assert.deepEqual(fresca.hero.lider, { driver: "Mariano Werner", points: 310 });
  const vieja = run([tc(), ev("tc-0", "tc", [final([row(1, "X")], "2026-09-20T14:00:00-03:00")]), ev("tc-0b", "tc", [final([row(1, "Y")], "2026-09-27T14:00:00-03:00")])], DOM, {
    season: { standings, meta: { tc: { standingsAsOfRound: 1 } } },
  });
  assert.equal(vieja.hero.lider, null, "hay más fechas corridas que las que cubre la tabla");
  assert.equal(run([tc()]).hero.lider, null, "sin tabla");
});

test("argentinos: el mejor ubicado de su categoría, con posición de largada y la fila del ganador y el podio", () => {
  const r = run([tc(), f1()]);
  assert.equal(r.argentinos.driver, "Franco Colapinto");
  assert.equal(r.argentinos.pos, 13);
  assert.equal(r.argentinos.grid, 21);
  assert.equal(r.argentinos.terminó, true);
  assert.equal(r.argentinos.texto, "terminó 13.º");
  assert.equal(r.argentinos.series.code, "F1");
  assert.equal(r.argentinos.winner.name, "Max Verstappen");
  assert.equal(r.argentinos.podium.length, 3);
  assert.deepEqual(r.slides, ["portada", "hero", "argentinos"]);
  assert.equal(r.resto.length, 0, "el evento de los argentinos no se repite en «Y además»");
});

test("argentinos: sin posición de largada no se inventa; un abandono se cuenta como tal", () => {
  const sinGrid = run([f1(row(9, "Franco Colapinto"))]);
  assert.equal(sinGrid.argentinos.grid, null);
  const dnf = run([f1({ pos: 18, positionText: "R", driver: "Franco Colapinto", team: "Alpine", gap: "", grid: 12, status: "Engine" })]);
  assert.equal(dnf.argentinos.terminó, false);
  assert.equal(dnf.argentinos.texto, "abandonó");
  assert.equal(dnf.argentinos.winner.name, "Max Verstappen");
});

test("sin argentinos que hayan corrido, argentinos es null y no hay placa para ellos", () => {
  const r = run([tc(), ev("f1-x", "f1", [{ ...final([row(1, "Max Verstappen"), row(2, "Otro")]), kind: "carrera" }])]);
  assert.equal(r.argentinos, null);
  assert.deepEqual(r.slides, ["portada", "hero", "resto"], "F1 sin Colapinto en la tabla cae al resto");
  assert.equal(r.resto[0].series.code, "F1");
});

test("resto: orden por grupo y series.ts, sin el héroe, con tope y con el segundo", () => {
  const mk = (id, seriesId, h) => ev(id, seriesId, [final([row(1, `Ganador ${id}`), row(2, `Segundo ${id}`)], `2026-10-04T${h}:00:00-03:00`)]);
  const r = run([mk("wec-1", "wec", "10"), mk("tn-1", "tn", "11"), mk("tcp-1", "tc-pista", "12"), mk("tc2k-1", "tc2000", "13"), mk("gt3-1", "gt3", "09"), tc()]);
  assert.equal(r.hero.series.code, "TC");
  assert.equal(r.resto.length, MAX_RESTO);
  assert.deepEqual(r.resto.map((x) => x.series.code), ["TCP", "TN", "TC2K", "GT3"], "nacionales en el orden de series.ts, después internacionales; el quinto (WEC) queda afuera");
  assert.equal(r.resto[0].winner.name, "Ganador tcp-1");
  assert.equal(r.resto[0].second, "Segundo tcp-1");
  assert.deepEqual(r.slides, ["portada", "hero", "resto"]);
});

test("provisorio: el flag viaja con el héroe y con las filas del resto", () => {
  const prov = { resultsSource: { status: "provisional" } };
  const heroProv = ev("tc-p", "tc", [final([row(1, "Ignacio Faín")], "2026-10-04T14:00:00-03:00", prov)]);
  assert.equal(run([heroProv]).hero.provisional, true);
  const pista = ev("tcp-p", "tc-pista", [final([row(1, "Thomas Pozner"), row(2, "Gabriel Gandulia")], "2026-10-04T12:55:00-03:00", prov)]);
  const r = run([tc(), pista]);
  assert.equal(r.hero.provisional, false);
  assert.equal(r.resto[0].provisional, true);
});

test("carga manual y sesiones sin carrera ni ganador clasificado no entran; sin héroe es null", () => {
  const manual = ev("tn-m", "tn", [final([row(1, "Un piloto")])], { source: "Carga manual · calendario" });
  assert.equal(run([manual]), null);
  assert.equal(run([ev("x", "tc", [quali("A")])]), null, "sólo clasificación");
  assert.equal(run([ev("y", "tc", [final([{ pos: 1, positionText: "D", driver: "Descalificado", gap: "" }])])]), null, "el 1.º no está clasificado");
  assert.equal(run([]), null);
});

test("ventana: domingo desde las 20:00 o lunes antes del mediodía; fuera, null; {sunday} la saltea", () => {
  const events = [tc()];
  assert.equal(run(events, "2026-10-04T22:00:00Z"), null, "domingo 19:00");
  assert.equal(run(events, DOM).sunday, "2026-10-04");
  assert.equal(run(events, "2026-10-05T14:00:00Z").sunday, "2026-10-04", "lunes 11:00");
  assert.equal(run(events, "2026-10-05T16:00:00Z"), null, "lunes 13:00");
  assert.equal(run(events, { sunday: "2026-10-04" }).hero.winner.name, "Ignacio Faín");
  assert.equal(run(events, { sunday: "2026-09-27" }), null, "otro finde sin resultados");
});

test("resumenReciente: el último domingo con resultados, mirando hacia atrás", () => {
  const events = [tc()];
  assert.equal(resumenReciente(season(events), "2026-10-07T15:00:00Z", { catalog }).sunday, "2026-10-04");
  assert.equal(resumenReciente(season(events), "2026-10-04T15:00:00Z", { catalog }).sunday, "2026-10-04", "el mismo domingo cuenta");
  assert.equal(resumenReciente(season(events), "2026-12-30T15:00:00Z", { catalog }), null, "demasiado atrás");
});

test("fechaLabel, ultimoDomingo y shortName", () => {
  assert.equal(fechaLabel(["2026-10-04"]), "4 de octubre");
  assert.equal(fechaLabel(["2026-10-02", "2026-10-03", "2026-10-04", "2026-10-04"]), "2, 3 y 4 de octubre");
  assert.equal(fechaLabel(["2026-10-31", "2026-11-01"]), "31 de octubre y 1 de noviembre");
  assert.equal(ultimoDomingo("2026-10-07T15:00:00Z"), "2026-10-04");
  assert.equal(ultimoDomingo("2026-10-05T01:00:00Z"), "2026-10-04", "domingo 22:00 argentino");
  assert.equal(shortName("Thierry Vermeulen / Ben Green"), "Vermeulen y Green");
  assert.equal(shortName("Ignacio Faín"), "Faín");
});

test("el borrador «resumen» lleva las URLs de las placas que existen, con el domingo", () => {
  const [d] = borradores(season([tc(), f1()]), DOM, { catalog }).filter((x) => x.kind === "resumen");
  assert.deepEqual(d.images, ["https://www.somosfierros.ar/placa/resumen/1?domingo=2026-10-04", "https://www.somosfierros.ar/placa/resumen/2?domingo=2026-10-04", "https://www.somosfierros.ar/placa/resumen/3?domingo=2026-10-04"]);
  const [solo] = borradores(season([tc()]), DOM, { catalog }).filter((x) => x.kind === "resumen");
  assert.equal(solo.images.length, 2, "sin argentinos ni resto: portada y detalle");
});
