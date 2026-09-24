import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeOnto } from "./season-merge.mjs";

const session = (id, start, results) => ({ id, kind: "carrera", name: id, start, ...(results ? { results } : {}) });
const event = (id, sessions, seriesId = "f1") => ({ id, seriesId, name: id, sessions });
const T = "2026-03-01T15:00:00Z";
const res = [{ pos: 1, driver: "A" }];
const season = (events, standings = {}, meta = {}) => ({ generatedAt: "g", events, standings, meta, failures: [] });

test("la sincronización no borra un resultado caliente", () => {
  const latest = season([event("e1", [session("s1", T, res)])]);
  const next = season([event("e1", [session("s1", T)])]);
  const out = mergeOnto(next, latest);
  assert.deepEqual(out.events[0].sessions[0].results, res);
});

test("la sincronización agrega resultados nuevos y no pisa con los viejos", () => {
  const latest = season([event("e1", [session("s1", T, res), session("s2", "2026-03-02T15:00:00Z")])]);
  const fresh = [{ pos: 1, driver: "B" }];
  const next = season([event("e1", [session("s1", T, fresh), session("s2", "2026-03-02T15:00:00Z", res)])]);
  const out = mergeOnto(next, latest);
  assert.deepEqual(out.events[0].sessions[0].results, fresh);
  assert.deepEqual(out.events[0].sessions[1].results, res);
});

test("los eventos que sólo están en latest se suman", () => {
  const latest = season([event("e1", [session("s1", T)]), event("e2", [session("s2", T)])]);
  const out = mergeOnto(season([event("e1", [session("s1", T)])]), latest);
  assert.deepEqual(out.events.map((e) => e.id), ["e1", "e2"]);
});

test("campeonatos y metadatos salen de next, salvo una categoría sin tabla", () => {
  const latest = season([], { f1: [{ driver: "old" }], f2: [{ driver: "f2" }] }, { f1: { v: "old" }, f2: { v: "f2" } });
  const next = season([], { f1: [{ driver: "new" }], f2: [] }, { f1: { v: "new" }, f2: { v: "vacío" } });
  const out = mergeOnto(next, latest);
  assert.deepEqual(out.standings.f1, [{ driver: "new" }]);
  assert.deepEqual(out.meta.f1, { v: "new" });
  assert.deepEqual(out.standings.f2, [{ driver: "f2" }]);
  assert.deepEqual(out.meta.f2, { v: "f2" });
});

test("fusionar algo consigo mismo no cambia nada", () => {
  const s = season([event("e1", [session("s1", T, res)]), event("e2", [session("s2", T)])], { f1: [{ driver: "A" }] }, { f1: { v: 1 } });
  assert.deepEqual(mergeOnto(s, s), s);
});

test("no modifica los argumentos", () => {
  const latest = season([event("e1", [session("s1", T, res)])]);
  const next = season([event("e1", [session("s1", T)])]);
  const snap = JSON.stringify([next, latest]);
  mergeOnto(next, latest);
  assert.equal(JSON.stringify([next, latest]), snap);
});
