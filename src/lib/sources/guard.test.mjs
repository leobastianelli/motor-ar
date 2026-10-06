import assert from "node:assert/strict";
import { test } from "node:test";
import { protectSeason, protectStandings, stripFutureResults } from "./guard.mjs";

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

test("si un id de evento cambia de significado, los resultados de otra fecha no se le pegan", () => {
  // Antes "Fecha 9" era La Plata (agosto); tras corregir el calendario, "Fecha 9" es Rosario (septiembre, todavía sin correr).
  const agosto = { id: "s", kind: "serie", name: "Serie única", start: "2026-08-16T12:00:00-03:00", durationMin: 20, results: [{ pos: 1, driver: "A" }] };
  const previous = { events: [{ id: "tcm-9", seriesId: "tc-mouras", sessions: [agosto] }] };
  const rosario = { id: "tcm-9", seriesId: "tc-mouras", sessions: [{ id: "f", kind: "final", name: "Final", start: "2026-09-27T12:00:00-03:00", durationMin: 25 }] };
  const { events, warnings } = protectSeason([rosario], previous);
  assert.equal(events[0].sessions.length, 1);
  assert.equal(events[0].sessions[0].results, undefined);
  assert.equal(warnings.length, 0);
});

test("una sesión de la misma fecha (o de un día antes) sí es del evento", () => {
  const sabado = { id: "s", kind: "practica", name: "1° Entrenamiento", start: "2026-09-26T12:00:00-03:00", durationMin: 20, results: [{ pos: 1, driver: "A" }] };
  const previous = { events: [{ id: "tcm-9", seriesId: "tc-mouras", sessions: [sabado] }] };
  const rosario = { id: "tcm-9", seriesId: "tc-mouras", sessions: [{ id: "f", kind: "final", name: "Final", start: "2026-09-27T12:00:00-03:00", durationMin: 25 }] };
  assert.equal(protectSeason([rosario], previous).events[0].sessions.length, 2);
});

test("una sesión de un día que todavía no llegó no puede tener resultados", () => {
  const ahora = Date.parse("2026-09-21T12:00:00-03:00");
  const conResultados = (start) => ({ id: start, kind: "final", name: "Final", start, durationMin: 25, results: [{ pos: 1, driver: "A" }], resultsSource: { name: "x", url: "y" } });
  const { events, stripped } = stripFutureResults(
    [{ id: "e", seriesId: "tc-mouras", sessions: [conResultados("2026-09-27T12:00:00-03:00"), conResultados("2026-09-21T12:00:00-03:00"), conResultados("2026-08-16T12:00:00-03:00")] }],
    ahora,
  );
  assert.equal(stripped, 1);
  assert.equal(events[0].sessions[0].results, undefined);
  assert.equal(events[0].sessions[0].resultsSource, undefined);
  assert.equal(events[0].sessions[1].results.length, 1, "hoy todavía puede tener resultados");
  assert.equal(events[0].sessions[2].results.length, 1);
});

test("protectSeason limpia los resultados imposibles y lo avisa", () => {
  const futura = { id: "f", kind: "final", name: "Final", start: "2026-09-27T12:00:00-03:00", durationMin: 25, results: [{ pos: 1, driver: "A" }] };
  const { events, warnings } = protectSeason([{ id: "tcm-9", seriesId: "tc-mouras", sessions: [futura] }], { events: [] }, Date.parse("2026-09-21T12:00:00-03:00"));
  assert.equal(events[0].sessions[0].results, undefined);
  assert.match(warnings[0], /todavía no se corrieron/);
});

test("un provisorio que no cambió (la fuente no se consultó) no cuenta como conservado", () => {
  const prov = { status: "provisional", name: "Rally", url: "https://x" };
  const kept = { ...ses("r", "General", [{ pos: 1, driver: "A" }, { pos: 2, driver: "B" }]), resultsSource: prov };
  const previous = { events: [ev("rally-7", "rally-argentino", [kept])] };
  assert.equal(protectSeason([ev("rally-7", "rally-argentino", [kept])], previous).warnings.length, 0);
  const copy = structuredClone(kept);
  assert.equal(protectSeason([ev("rally-7", "rally-argentino", [copy])], previous).warnings.length, 0);
});

test("un provisorio más corto que el anterior sigue sin pisarlo y avisa", () => {
  const prov = { status: "provisional", name: "Rally", url: "https://x" };
  const rows = [{ pos: 1, driver: "A" }, { pos: 2, driver: "B" }];
  const previous = { events: [ev("rally-7", "rally-argentino", [{ ...ses("r", "General", rows), resultsSource: prov }])] };
  const { events, warnings } = protectSeason([ev("rally-7", "rally-argentino", [{ ...ses("r", "General", rows.slice(0, 1)), resultsSource: prov }])], previous);
  assert.deepEqual(events[0].sessions[0].results, rows);
  assert.match(warnings[0], /1 sesiones/);
});
