import { test } from "node:test";
import assert from "node:assert/strict";
import { hotNeeds } from "./hot-refresh-core.mjs";

const HOUR = 3600_000;
const NOW = Date.parse("2026-09-24T18:00:00Z");
const at = (hoursAgo) => new Date(NOW - hoursAgo * HOUR).toISOString();
// Una sesión de 1 h que terminó hace `endedAgo` horas.
const f1 = (endedAgo, extra = {}, seriesId = "f1") => [{ id: "e", seriesId, sessions: [{ id: "s", name: "Carrera", start: at(endedAgo + 1), durationMin: 60, ...extra }] }];

test("terminó hace poco y no tiene resultados: hace falta", () => {
  const n = hotNeeds(f1(0.5), NOW);
  assert.deepEqual([n.needed, n.results], [true, ["s"]]);
});

test("con resultados y con video: no hace falta", () => {
  assert.equal(hotNeeds(f1(0.5, { results: [{ pos: 1 }], videos: [{ id: "v" }] }), NOW).needed, false);
});

test("con resultados pero sin video: hace falta sólo por el video", () => {
  const n = hotNeeds(f1(0.5, { results: [{ pos: 1 }] }), NOW);
  assert.deepEqual([n.needed, n.results, n.videos], [true, [], ["s"]]);
});

test("terminó hace menos de 5 minutos: todavía no se pide", () => {
  assert.equal(hotNeeds(f1(3 / 60, { name: "Práctica 1" }), NOW).results.length, 0);
});

test("terminó hace 7 h sin resultados: ya no es cosa del refresco caliente", () => {
  const n = hotNeeds(f1(7, { videos: [{ id: "v" }] }), NOW);
  assert.deepEqual([n.needed, n.results], [false, []]);
});

test("sin video: se busca hasta 12 h, después no", () => {
  const done = { results: [{ pos: 1 }] };
  assert.equal(hotNeeds(f1(11, done), NOW).needed, true);
  assert.equal(hotNeeds(f1(13, done), NOW).needed, false);
});

test("una sesión que no terminó, sin hora confirmada o de otra categoría no cuenta", () => {
  assert.equal(hotNeeds(f1(-2), NOW).needed, false);
  assert.equal(hotNeeds(f1(1, { timeKnown: false }), NOW).needed, false);
  assert.equal(hotNeeds(f1(1, {}, "tc"), NOW).needed, false);
});

test("una sesión sin página oficial (nombre desconocido) no dispara los resultados", () => {
  assert.equal(hotNeeds(f1(1, { name: "Ceremonia", videos: [{ id: "v" }] }), NOW).results.length, 0);
});

// Ventana de resultados según el tipo de sesión: arranca antes del fin programado.
const START = Date.parse("2026-09-26T11:00:00Z");
const MINUTE = 60_000;
const one = (name, durationMin, extra = {}) => [{ id: "e", seriesId: "f1", sessions: [{ id: "s", name, start: new Date(START).toISOString(), durationMin, ...extra }] }];
const asks = (events, minutesAfterStart) => hotNeeds(events, START + minutesAfterStart * MINUTE).results.length === 1;

test("carrera programada en 120 min: se busca desde los 75 min, no desde los 125", () => {
  const race = one("Carrera", 120);
  assert.equal(asks(race, 74), false);
  assert.equal(asks(race, 75), true);
  assert.equal(asks(race, 100), true, "carrera terminada antes de lo programado: la bandera ya bajó");
  assert.equal(asks(race, 125), true, "sigue pidiéndose después del fin programado");
});

test("sesión en curso: antes de la ventana no hace falta nada, y la ventana cierra 6 h después del fin programado", () => {
  const race = one("Carrera", 120);
  assert.equal(hotNeeds(race, START - 10 * MINUTE).needed, false, "todavía no largó");
  assert.equal(asks(race, 30), false, "largó hace 30 min: en curso");
  assert.equal(asks(race, 120 + 6 * 60 - 1), true);
  assert.equal(asks(race, 120 + 6 * 60 + 1), false);
});

test("sesión sin hora conocida: nunca se busca, ni en la ventana temprana", () => {
  assert.equal(asks(one("Carrera", 120, { timeKnown: false }), 100), false);
});

test("cada tipo de sesión tiene su fin más temprano", () => {
  for (const [name, duration, earliest] of [["Sprint", 45, 30], ["Clasificación", 60, 55], ["Clasificación sprint", 45, 40]]) {
    const events = one(name, duration);
    assert.equal(asks(events, earliest - 1), false, `${name} a ${earliest - 1} min`);
    assert.equal(asks(events, earliest), true, `${name} a ${earliest} min`);
  }
});

test("las prácticas esperan su duración programada más 5 min", () => {
  const p = one("Práctica 1", 60);
  assert.equal(asks(p, 64), false);
  assert.equal(asks(p, 65), true);
});

test("si la sesión programada dura menos que el mínimo, vale la programada", () => {
  assert.equal(asks(one("Carrera", 60), 59), false);
  assert.equal(asks(one("Carrera", 60), 60), true);
});
