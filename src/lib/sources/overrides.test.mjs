import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeSessionPatches } from "./overrides.mjs";

const dayKey = (iso) => iso.slice(0, 10);
const rows = [{ pos: 1, driver: "A" }];
const src = (id, kind, name, start = "2026-09-20T12:00:00-03:00") => ({ id, kind, name, start, timeKnown: false, durationMin: 25, results: rows });
const patch = (kind, name, start) => ({ kind, name, start, timeKnown: true, durationMin: 35 });

test("nombre exacto: pisa los campos y conserva los resultados", () => {
  const out = mergeSessionPatches("e", [src("a", "final", "Final Clase 2")], [patch("final", "Final Clase 2", "2026-09-20T13:05:00-03:00")], dayKey);
  assert.equal(out.length, 1);
  assert.equal(out[0].start, "2026-09-20T13:05:00-03:00");
  assert.equal(out[0].results, rows);
});

test("'2 Series Clase 2' no crea una fila fantasma cuando la fuente ya trae las series", () => {
  const sessions = [src("s1", "serie", "Serie 1 Clase 2"), src("s2", "serie", "Serie 2 Clase 2"), src("s3", "serie", "Serie 1 Clase 3")];
  const out = mergeSessionPatches("e", sessions, [patch("serie", "2 Series Clase 2", "2026-09-20T10:05:00-03:00")], dayKey);
  assert.equal(out.length, 3);
  assert.equal(out.find((s) => s.id === "s1").start, "2026-09-20T10:05:00-03:00");
  assert.equal(out.find((s) => s.id === "s1").timeKnown, true);
  assert.equal(out.find((s) => s.id === "s2").timeKnown, false);
  assert.equal(out.find((s) => s.id === "s3").timeKnown, false);
});

test("antes de que existan resultados, la sesión manual sí se agrega", () => {
  const out = mergeSessionPatches("e", [{ id: "f", kind: "final", name: "Final Clase 2", start: "2026-09-20T12:00:00-03:00", timeKnown: false, durationMin: 35 }], [patch("serie", "2 Series Clase 2", "2026-09-20T10:05:00-03:00")], dayKey);
  assert.equal(out.length, 2);
  assert.equal(out[0].name, "2 Series Clase 2");
});

test("dos cargas para la misma clasificación: la segunda se descarta, no se duplica", () => {
  const sessions = [src("c2", "clasificacion", "Clasificación Clase 2", "2026-09-19T12:00:00-03:00")];
  const out = mergeSessionPatches(
    "e",
    sessions,
    [patch("clasificacion", "Clasificación 1 Clase 2", "2026-09-19T15:20:00-03:00"), patch("clasificacion", "Clasificación 2 Clase 2", "2026-09-19T17:50:00-03:00")],
    dayKey,
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].start, "2026-09-19T15:20:00-03:00");
});
