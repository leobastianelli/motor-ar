import assert from "node:assert/strict";
import { test } from "node:test";
import { DISPATCH_AFTER_MIN, DISPATCH_BEFORE_HOURS, pendingForDispatch } from "./pulso-core.mjs";

const NOW = "2026-09-24T18:00:00Z";
const MIN = 60_000;
const minsAgo = (m) => new Date(Date.parse(NOW) - m * MIN).toISOString();
// Sesión de 0 min (durationMin: 0) que terminó hace `m` minutos.
const session = (m) => ({ id: "s", kind: "carrera", name: "Carrera", start: minsAgo(m), timeKnown: true, durationMin: 0 });
const events = (m, seriesId = "f1") => [{ id: "e", seriesId, sessions: [session(m)] }];

test("terminó hace 9 min: todavía no (después de 10)", () => {
  assert.equal(pendingForDispatch(events(DISPATCH_AFTER_MIN - 1), NOW).length, 0);
});

test("terminó hace 11 min sin resultados: hace falta", () => {
  assert.equal(pendingForDispatch(events(DISPATCH_AFTER_MIN + 1), NOW).length, 1);
});

test("terminó hace más de 6 h: ya no (lo toma el reintento horario)", () => {
  assert.equal(pendingForDispatch(events(DISPATCH_BEFORE_HOURS * 60 + 1), NOW).length, 0);
});

test("categoría sin fuente automática: no cuenta", () => {
  assert.equal(pendingForDispatch(events(30, "tc2000"), NOW).length, 0);
});

test("con resultados: no cuenta", () => {
  const [e] = events(30);
  e.sessions[0].results = [{ pos: 1, driver: "A" }];
  assert.equal(pendingForDispatch([e], NOW).length, 0);
});
