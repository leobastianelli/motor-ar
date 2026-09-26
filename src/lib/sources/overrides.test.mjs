import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { mergeSessionPatches } from "./overrides.mjs";

const manual = JSON.parse(fs.readFileSync(new URL("../../data/manual-overrides.json", import.meta.url), "utf8"));

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

// ——— Toda carga manual tiene que citar de dónde sale: si no, una carga sin fuente pasa sin que nadie lo note (ver docs/fuentes-de-datos.md).

const HTTPS = /^https:\/\//;

// Excepción explícita y temporal: sesiones "placeholder" (timeKnown: false, sin horario real todavía) de la carga manual de Ligier JFC.
// Tienen "start" porque el motor necesita una fecha para ordenarlas, pero no hay horario que citar: cuando se sepa la hora real hay que
// agregarle timeSources y sacarla de esta lista. No inventar una fuente para cerrar la prueba.
const SIN_FUENTE_DE_HORA = new Set([
  "ligier-jfc-2026-1-carreras", // calendario oficial sólo da el fin de semana, no la hora de la carrera
  "ligier-jfc-2026-2-carreras",
  "ligier-jfc-2026-3-carreras",
  "ligier-jfc-2026-4-carreras",
  "ligier-jfc-2026-5-carrera-3", // las carreras 1 y 2 de esta fecha sí tienen horario y fuente; la 3 todavía no se corrió
  "ligier-jfc-2026-6-carreras",
]);

function checkSession(label, s) {
  const id = s.id ?? `${label}:${s.kind}:${s.name}`;
  if (s.start && !SIN_FUENTE_DE_HORA.has(id)) {
    assert.ok(Array.isArray(s.timeSources) && s.timeSources.length > 0, `${label} (${id}): tiene "start" pero no "timeSources"`);
    for (const src of s.timeSources) {
      assert.ok(src?.name && src?.url, `${label} (${id}): un timeSources sin "name" o "url"`);
      assert.match(src.url, HTTPS, `${label} (${id}): timeSources.url no es https (${src.url})`);
    }
  }
  if (s.results?.length) {
    assert.ok(s.resultsSource?.name && s.resultsSource?.url, `${label} (${id}): tiene "results" pero no "resultsSource" completo`);
    assert.match(s.resultsSource.url, HTTPS, `${label} (${id}): resultsSource.url no es https (${s.resultsSource?.url})`);
  }
}

test("toda sesión de manual-overrides.json con horario cita su fuente (https), y con resultados cita la fuente de resultados", () => {
  for (const [eventId, patch] of Object.entries(manual.events ?? {})) {
    for (const s of patch.sessions ?? []) checkSession(`events.${eventId}`, s);
  }
  for (const e of manual.newEvents ?? []) {
    for (const s of e.sessions ?? []) checkSession(`newEvents.${e.id}`, s);
  }
});

test("toda tabla de campeonato cargada a mano (standings) tiene fuente", () => {
  for (const [id, table] of Object.entries(manual.standings ?? {})) {
    assert.ok(typeof table.source === "string" && table.source.trim().length > 0, `standings.${id}: falta "source"`);
  }
});
