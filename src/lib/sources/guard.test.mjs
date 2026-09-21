import assert from "node:assert/strict";
import { test } from "node:test";
import { protectSeason, protectStandings } from "./guard.mjs";

const ses = (id, name, results) => ({ id, kind: "serie", name, start: "2026-09-20T12:00:00-03:00", durationMin: 25, ...(results ? { results } : {}) });
const ev = (id, seriesId, sessions = [ses(`${id}-s`, "Serie 1")]) => ({ id, seriesId, sessions });

test("una categoría que la fuente devuelve vacía no desaparece", () => {
  const previous = { events: [ev("tn-1", "tn"), ev("tn-2", "tn"), ev("tc-1", "tc")] };
  const { events, warnings } = protectSeason([ev("tc-1", "tc")], previous);
  assert.deepEqual(events.map((e) => e.id).sort(), ["tc-1", "tn-1", "tn-2"]);
  assert.match(warnings[0], /tn 2/);
});

test("una fecha nueva se suma sin tocar las conservadas", () => {
  const previous = { events: [ev("tn-1", "tn")] };
  const { events, warnings } = protectSeason([ev("tn-1", "tn"), ev("tn-2", "tn")], previous);
  assert.equal(events.length, 2);
  assert.equal(warnings.length, 0);
});

test("una sesión que la fuente trae sin resultados recupera los de antes", () => {
  const rows = [{ pos: 1, driver: "A" }];
  const previous = { events: [ev("tn-9", "tn", [ses("a", "Serie 1", rows)])] };
  const { events, warnings } = protectSeason([ev("tn-9", "tn", [ses("a", "Serie 1")])], previous);
  assert.deepEqual(events[0].sessions[0].results, rows);
  assert.match(warnings[0], /1 sesiones/);
});

test("una sesión con resultados que la fuente ya no lista se vuelve a sumar", () => {
  const rows = [{ pos: 1, driver: "A" }];
  const previous = { events: [ev("tn-9", "tn", [ses("a", "Serie 1", rows), ses("b", "Serie 2", rows)])] };
  const { events } = protectSeason([ev("tn-9", "tn", [ses("a", "Serie 1", rows)])], previous);
  assert.equal(events[0].sessions.length, 2);
});

test("resultados nuevos pisan a los viejos (rectificaciones)", () => {
  const previous = { events: [ev("tn-9", "tn", [ses("a", "Serie 1", [{ pos: 1, driver: "A" }])])] };
  const next = [ev("tn-9", "tn", [ses("a", "Serie 1", [{ pos: 1, driver: "B" }])])];
  assert.equal(protectSeason(next, previous).events[0].sessions[0].results[0].driver, "B");
});

test("un campeonato que la fuente no trajo se conserva", () => {
  const standings = {};
  const meta = {};
  const warnings = protectStandings(standings, meta, { standings: { tn: [{ pos: 1, driver: "A" }] }, meta: { tn: { standingsLabel: "Clase 3" } } });
  assert.equal(standings.tn.length, 1);
  assert.equal(meta.tn.standingsLabel, "Clase 3");
  assert.equal(warnings.length, 1);
});
