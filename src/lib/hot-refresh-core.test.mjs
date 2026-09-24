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
  assert.equal(hotNeeds(f1(3 / 60), NOW).results.length, 0);
});

test("terminó hace 7 h sin resultados: ya no es cosa del refresco caliente", () => {
  const n = hotNeeds(f1(7, { videos: [{ id: "v" }] }), NOW);
  assert.deepEqual([n.needed, n.results], [false, []]);
});

test("sin video: se busca hasta 3 días, después no", () => {
  const done = { results: [{ pos: 1 }] };
  assert.equal(hotNeeds(f1(70, done), NOW).needed, true);
  assert.equal(hotNeeds(f1(73, done), NOW).needed, false);
});

test("una sesión que no terminó, sin hora confirmada o de otra categoría no cuenta", () => {
  assert.equal(hotNeeds(f1(-2), NOW).needed, false);
  assert.equal(hotNeeds(f1(1, { timeKnown: false }), NOW).needed, false);
  assert.equal(hotNeeds(f1(1, {}, "tc"), NOW).needed, false);
});

test("una sesión sin página oficial (nombre desconocido) no dispara los resultados", () => {
  assert.equal(hotNeeds(f1(1, { name: "Ceremonia", videos: [{ id: "v" }] }), NOW).results.length, 0);
});
