import assert from "node:assert/strict";
import { test } from "node:test";
import { estadoDeSesion, momentoDeCategoria, momentoDeEvento, momentoDePiloto, nombreVisibleSesion } from "./momento.mjs";
import { driverKey } from "./sources/driver-index.mjs";

const row = (pos, driver, extra = {}) => ({ pos, driver, team: "X", gap: "", ...extra });
const ses = (id, name, kind, start, extra = {}) => ({ id, name, kind, start, durationMin: 60, ...extra });

// Una fecha de jueves a sábado, como Baku (horas UTC; Argentina = UTC-3).
const baku = (results = {}) => ({
  id: "f1-15",
  seriesId: "f1",
  round: 15,
  name: "GP de Azerbaiyán",
  circuit: { city: "Baku" },
  broadcasts: [],
  sessions: [
    ses("p1", "Práctica 1", "practica", "2026-09-24T08:30:00Z", { results: results.p1 }),
    ses("p2", "Práctica 2", "practica", "2026-09-24T12:00:00Z", { results: results.p2 }),
    ses("p3", "Práctica 3", "practica", "2026-09-25T08:30:00Z"),
    ses("q", "Clasificación", "clasificacion", "2026-09-25T12:00:00Z"),
    ses("r", "Carrera", "carrera", "2026-09-26T11:00:00Z", { durationMin: 120, results: results.r }),
  ],
});
const madrid = (results) => ({
  id: "f1-14",
  seriesId: "f1",
  round: 14,
  name: "GP de España",
  circuit: { city: "Madrid" },
  broadcasts: [],
  sessions: [ses("m-r", "Carrera", "carrera", "2026-09-13T13:00:00Z", { durationMin: 120, results })],
});
const opts = { argentineSlugs: ["franco-colapinto"] };
const colapinto = (pos, extra) => row(pos, "Franco Colapinto", { driverSlug: "franco-colapinto", ...extra });

test("en-pista: una sesión en curso manda, aunque haya otra fecha cerca", () => {
  const m = momentoDeCategoria([madrid(), baku()], "2026-09-24T08:45:00Z", opts);
  assert.equal(m.modo, "en-pista");
  assert.equal(m.fecha.id, "f1-15");
  assert.deepEqual(m.sesiones.map((s) => s.estado), ["en-vivo", "proxima", "proxima", "proxima", "proxima"]);
  assert.equal(m.proximaSesion.id, "p1");
});

test("finde: una fecha de jueves a sábado cubre desde 3 días antes hasta que termina", () => {
  const events = [madrid([row(1, "Kimi Antonelli")]), baku()];
  // Martes 22, a más de 48 h del jueves: ya es "el fin de semana".
  assert.equal(momentoDeCategoria(events, "2026-09-22T15:00:00Z", opts).modo, "finde");
  // Viernes 25 antes de la P3: la P1 y la P2 ya se corrieron.
  const viernes = momentoDeCategoria([baku({ p1: [row(1, "Max Verstappen"), colapinto(18)], p2: [row(1, "Lando Norris"), colapinto(11)] })], "2026-09-25T07:00:00Z", opts);
  assert.equal(viernes.modo, "finde");
  assert.deepEqual(viernes.sesiones.map((s) => s.estado), ["terminada", "terminada", "proxima", "proxima", "proxima"]);
  assert.equal(viernes.proximaSesion.name, "Práctica 3");
  assert.deepEqual(viernes.sesiones[1].ganador, { name: "Lando Norris", slug: undefined });
  assert.deepEqual(viernes.sesiones[1].argentinos, [{ slug: "franco-colapinto", name: "Franco Colapinto", pos: 11 }]);
  // La P3 todavía no se corrió: el estado lo decide la hora; el motivo queda listo por si termina con la página abierta.
  assert.equal(viernes.sesiones[2].hasResults, false);
});

test("una sesión terminada sin resultados dice por qué (nunca un hueco)", () => {
  const m = momentoDeCategoria([baku()], "2026-09-24T14:00:00Z", opts);
  const p1 = m.sesiones[0];
  assert.equal(p1.estado, "terminada");
  assert.equal(p1.hasResults, false);
  assert.equal(p1.ganador, undefined);
  assert.equal(p1.motivo, "La fuente todavía no los publicó");
  // Con una fuente que falló en la última sincronización.
  const caida = momentoDeCategoria([baku()], "2026-09-24T14:00:00Z", { ...opts, failures: ["OpenF1: timeout"] });
  assert.equal(caida.sesiones[0].motivo, "No pudimos consultar la fuente");
});

test("resultados: hasta 72 h después de terminar la última fecha", () => {
  const events = [baku({ r: [row(1, "Max Verstappen", { driverSlug: "max" }), row(2, "Lando Norris"), row(3, "Oscar Piastri"), colapinto(9)] })];
  // El domingo 27 a las 12:00 (la carrera terminó el sábado a las 10:00 argentinas → +26 h).
  const m = momentoDeCategoria([...events, { ...madrid(), id: "f1-16", sessions: [ses("x", "Carrera", "carrera", "2026-10-04T07:00:00Z")] }], "2026-09-27T15:00:00Z", opts);
  assert.equal(m.modo, "resultados");
  assert.equal(m.fecha.id, "f1-15");
  assert.deepEqual(m.fecha.carrera.podio.map((p) => p.name), ["Max Verstappen", "Lando Norris", "Oscar Piastri"]);
  assert.deepEqual(m.fecha.carrera.argentinos.map((a) => a.pos), [9]);
  assert.equal(m.proximaFecha.id, "f1-16");
  assert.equal(m.ultimaFecha.id, "f1-15");
});

test("entre-semana: pasadas las 72 h y sin nada cerca, la próxima fecha y la última en una línea", () => {
  const proxima = { ...madrid(), id: "f1-16", round: 16, circuit: { city: "Kuala Lumpur" }, sessions: [ses("x", "Práctica 1", "practica", "2026-10-09T04:30:00Z"), ses("y", "Carrera", "carrera", "2026-10-11T07:00:00Z")] };
  const events = [baku({ r: [row(1, "Max Verstappen"), colapinto(4)] }), proxima];
  const m = momentoDeCategoria(events, "2026-09-30T15:00:00Z", opts);
  assert.equal(m.modo, "entre-semana");
  assert.equal(m.fecha.id, "f1-16");
  assert.equal(m.proximaFecha.id, "f1-16");
  assert.equal(m.proximaFecha.primeraSesion.name, "Práctica 1");
  assert.equal(m.ultimaFecha.id, "f1-15");
  assert.equal(m.ultimaFecha.carrera.podio[0].name, "Max Verstappen");
  assert.equal(m.proximaSesion.id, "x");
});

test("una categoría sin fechas próximas: entre-semana sin `fecha`, con la última si hay", () => {
  const sola = momentoDeCategoria([madrid([row(1, "Kimi Antonelli")])], "2026-10-20T15:00:00Z", opts);
  assert.equal(sola.modo, "entre-semana");
  assert.equal(sola.fecha, undefined);
  assert.equal(sola.proximaFecha, undefined);
  assert.equal(sola.proximaSesion, undefined);
  assert.equal(sola.ultimaFecha.id, "f1-14");
  const vacia = momentoDeCategoria([], "2026-10-20T15:00:00Z", opts);
  assert.equal(vacia.modo, "entre-semana");
  assert.deepEqual(vacia.sesiones, []);
});

test("sesiones sin hora confirmada: nunca en vivo", () => {
  const tn = {
    id: "tn-5",
    seriesId: "tn",
    round: 5,
    name: "Fecha 5",
    circuit: { city: "Rosario" },
    sessions: [ses("s1", "Serie 1", "serie", "2026-09-27T03:00:00Z", { timeKnown: false }), ses("f", "Final", "final", "2026-09-27T03:00:00Z", { timeKnown: false })],
  };
  // Domingo 27 al mediodía: el día está en curso, pero sin horario no hay "en vivo".
  const m = momentoDeCategoria([tn], "2026-09-27T15:00:00Z");
  assert.equal(m.modo, "finde");
  assert.deepEqual(m.sesiones.map((s) => s.estado), ["proxima", "proxima"]);
  assert.equal(m.sesiones[0].timeKnown, false);
  // Con resultados se da por terminada; sin ellos, al terminar el día.
  const conResultados = { ...tn, sessions: [{ ...tn.sessions[0], results: [row(1, "A")] }, tn.sessions[1]] };
  assert.equal(momentoDeCategoria([conResultados], "2026-09-27T15:00:00Z").sesiones[0].estado, "terminada");
  assert.equal(momentoDeCategoria([tn], "2026-09-28T04:00:00Z").modo, "resultados");
});

test("un argentino que no terminó figura con su estado, y sin puesto no hay ganador falso", () => {
  const r = [row(1, "Max Verstappen"), row(2, "Lando Norris"), colapinto(17, { positionText: "R", status: "Engine" })];
  const m = momentoDeCategoria([baku({ r })], "2026-09-26T14:00:00Z", opts);
  assert.equal(m.sesiones.at(-1).ganador.name, "Max Verstappen");
  assert.deepEqual(m.sesiones.at(-1).argentinos, [{ slug: "franco-colapinto", name: "Franco Colapinto", pos: 17, noTermino: "abandonó" }]);
  // Una fuente que sólo publica parte de la clasificación (sin el 1.º): ni ganador ni podio.
  const parcial = momentoDeCategoria([baku({ r: [row(2, "Lando Norris"), row(3, "Oscar Piastri")] })], "2026-09-26T14:00:00Z", opts);
  assert.equal(parcial.sesiones.at(-1).ganador, undefined);
  assert.deepEqual(parcial.fecha.carrera.podio, []);
});

test("estadoDeSesion: el navegador recalcula con el mismo criterio que el servidor", () => {
  const s = { start: "2026-09-25T08:30:00Z", durationMin: 60, timeKnown: true, hasResults: false };
  assert.equal(estadoDeSesion(s, "2026-09-25T08:29:00Z"), "proxima");
  assert.equal(estadoDeSesion(s, "2026-09-25T08:30:00Z"), "en-vivo");
  assert.equal(estadoDeSesion(s, "2026-09-25T09:30:00Z"), "terminada");
  assert.equal(estadoDeSesion({ ...s, timeKnown: false }, "2026-09-25T08:30:00Z"), "proxima");
});

const KEYS = [driverKey("Franco Colapinto")];

test("piloto: cada sesión ya corrida lleva su fila, y la próxima sesión es la P3 (no la carrera)", () => {
  const e = baku({ p1: [row(1, "Max Verstappen"), colapinto(18, { gap: "+1.802" })], p2: [row(1, "Lando Norris"), colapinto(11, { gap: "+2.132" })] });
  const m = momentoDePiloto([e], "2026-09-24T20:00:00-03:00", KEYS);
  assert.equal(m.modo, "finde");
  assert.deepEqual(m.sesiones.map((s) => s.fila), [{ pos: 18, gap: "+1.802" }, { pos: 11, gap: "+2.132" }, undefined, undefined, undefined]);
  assert.equal(m.proximaSesion.name, "Práctica 3");
  assert.equal(m.participa, true);
});

test("piloto: quien no corrió una sesión no tiene fila en ella; quien no terminó, su estado", () => {
  const e = baku({ p1: [row(1, "Max Verstappen"), colapinto(18)], p2: [row(1, "Lando Norris")], r: [row(1, "Max Verstappen"), colapinto(17, { positionText: "R" })] });
  const m = momentoDePiloto([e], "2026-09-26T14:00:00Z", KEYS);
  assert.equal(m.sesiones[1].fila, undefined);
  assert.deepEqual(m.sesiones.at(-1).fila, { pos: 17, noTermino: "abandonó" });
});

test("piloto: una tripulación 'A / B / C' cuenta si está uno de ellos, y un piloto sin resultados no participa", () => {
  const gt = { id: "gt-1", seriesId: "gt3", round: 1, name: "6 Horas", circuit: { city: "Spa" }, sessions: [ses("c", "Carrera", "carrera", "2026-09-24T08:30:00Z", { results: [row(4, "Nico Varrone / Otro Piloto / Tercero")] })] };
  const m = momentoDePiloto([gt], "2026-09-24T12:00:00Z", [driverKey("Nico Varrone")]);
  assert.deepEqual(m.sesiones[0].fila, { pos: 4 });
  assert.equal(momentoDePiloto([gt], "2026-09-24T12:00:00Z", [driverKey("Otro Nadie")]).participa, false);
});

test("piloto en varias categorías: gana la que está en pista; sin eventos, entre-semana vacío", () => {
  const tn = { id: "tn-1", seriesId: "tn", round: 1, name: "Fecha 1", circuit: { city: "Rosario" }, sessions: [ses("t", "Final", "final", "2026-09-24T08:40:00Z")] };
  const m = momentoDePiloto([madrid(), tn], "2026-09-24T09:00:00Z", KEYS);
  assert.equal(m.modo, "en-pista");
  assert.equal(m.fecha.id, "tn-1");
  const vacio = momentoDePiloto([], "2026-09-24T09:00:00Z", KEYS);
  assert.equal(vacio.modo, "entre-semana");
  assert.equal(vacio.participa, false);
});

test("momentoDeEvento: una fecha ya corrida trae sus sesiones y los argentinos, aunque hayan pasado semanas", () => {
  const ev = madrid([row(1, "Max Verstappen"), colapinto(9)]);
  const m = momentoDeEvento(ev, "2026-10-20T12:00:00Z", opts);
  assert.equal(m.modo, "entre-semana");
  assert.equal(m.fecha.id, "f1-14");
  assert.equal(m.sesiones.length, 1);
  assert.equal(m.sesiones[0].estado, "terminada");
  assert.deepEqual(m.sesiones[0].argentinos.map((a) => [a.slug, a.pos]), [["franco-colapinto", 9]]);
  assert.equal(m.fecha.carrera.ganador.name, "Max Verstappen");
});

test("momentoDeEvento: una fecha lejana trae todas sus sesiones como próximas", () => {
  const m = momentoDeEvento(baku(), "2026-09-01T12:00:00Z", opts);
  assert.equal(m.sesiones.length, 5);
  assert.ok(m.sesiones.every((s) => s.estado === "proxima"));
  assert.equal(m.fecha.id, "f1-15");
});

test("momentoDeEvento: en pista sólo mira esta fecha, no otras de la categoría", () => {
  const m = momentoDeEvento(baku({ p1: [row(1, "Lando Norris"), colapinto(18)] }), "2026-09-24T08:45:00Z", opts);
  assert.equal(m.modo, "en-pista");
  assert.equal(m.sesiones.find((s) => s.id === "p1").estado, "en-vivo");
});

test("nombreVisibleSesion: con dos carreras principales, la primera se ve como 'Carrera principal 1' (sin tocar el name guardado)", () => {
  const sesiones = [
    ses("carrera", "Carrera principal", "carrera", "2026-09-26T11:00:00Z"),
    ses("carrera-2", "Carrera principal 2", "carrera", "2026-09-27T11:00:00Z"),
  ];
  assert.equal(nombreVisibleSesion(sesiones[0], sesiones), "Carrera principal 1");
  assert.equal(nombreVisibleSesion(sesiones[1], sesiones), "Carrera principal 2");
  assert.equal(sesiones[0].name, "Carrera principal");
});

test("nombreVisibleSesion: con una sola carrera principal, el nombre no cambia", () => {
  const sesiones = [ses("carrera", "Carrera principal", "carrera", "2026-09-26T11:00:00Z")];
  assert.equal(nombreVisibleSesion(sesiones[0], sesiones), "Carrera principal");
});
