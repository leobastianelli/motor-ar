import assert from "node:assert/strict";
import { test } from "node:test";
import { sessionId } from "./session-id.mjs";
import { applySchedules } from "./sources/schedule-notes.mjs";

test("sessionId: las tildes pasan a su letra, no se pierden", () => {
  assert.equal(sessionId("tcp-2026-12", "clasificacion", "Clasificación"), "tcp-2026-12-clasificacion-clasificacion");
  assert.equal(sessionId("tc-2026-12", "serie", "Serie 1"), "tc-2026-12-serie-serie1");
  assert.equal(sessionId("tc-2026-12", "practica", "1° Entrenamiento"), "tc-2026-12-practica-1entrenamiento");
});

test("el cronograma arma el mismo id que el cronometraje para la misma sesión", () => {
  const event = { id: "tcp-2026-12", seriesId: "tcp", sessions: [{ id: "x", kind: "final", name: "Final", start: "2026-10-04T12:00:00-03:00", timeKnown: false }] };
  const found = [
    { seriesId: "tcp", date: "2026-10-03", start: "11:00", kind: "clasificacion", name: "Clasificación", status: "oficial", sources: [] },
    { seriesId: "tcp", date: "2026-10-04", start: "14:00", kind: "final", name: "Final", status: "oficial", sources: [] },
  ];
  const { events } = applySchedules([event], found);
  assert.deepEqual(events[0].sessions.map((s) => s.id), ["tcp-2026-12-clasificacion-clasificacion", "tcp-2026-12-final-final"]);
});
