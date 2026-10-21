import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { applyF2Schedule, formula2ArgSeason } from "./formula2-arg.mjs";
import { actcNotes } from "./actc-site.mjs";
import { buildConsensus } from "./schedule-notes.mjs";

// Horarios de la Fórmula 2 Argentina: salen de las notas de cronograma del TC en actc.org.ar (bloque "Todos los horarios", líneas "Fórmula 2").
const fixture = (name) => fs.readFileSync(new URL(`./fixtures/formula2-arg/${name}.html`, import.meta.url), "utf8");
// Nota real: actc.org.ar/tc/noticias/los-horarios-del-tc-para-rosario (Redacción ACTC, 20/10/2026).
const NOTA = fixture("actc-horarios-rosario");
const PAGES = {
  "https://formula2.com.ar/calendario-2026/": fixture("calendario-2026"),
  "https://formula2.com.ar/pilotos/": fixture("pilotos"),
  "https://formula2.com.ar/campeonato-de-pilotos-2026/": fixture("campeonato-de-pilotos-2026"),
  "https://formula2.com.ar/fecha-1-2026/": fixture("fecha-1-2026"),
};
const NOW = new Date("2026-10-21T15:00:00Z");
const sitioIo = () => ({
  async text(url) {
    if (!(url in PAGES)) throw new Error(`404 al pedir ${url}`);
    return PAGES[url];
  },
  sleep: async () => {},
});
const run = (previous) => formula2ArgSeason(sitioIo(), previous, { now: NOW, delayMs: 0, windowDays: 400 });
const notaIo = () => ({
  async text(url) {
    if (url === "https://actc.org.ar/tc/noticias") return '<a href="/tc/noticias/los-horarios-del-tc-para-rosario">Los horarios del TC para Rosario</a>';
    if (url === "https://actc.org.ar/tc/noticias/los-horarios-del-tc-para-rosario") return NOTA;
    return "<html></html>"; // las otras cinco categorías no tienen nota
  },
  sleep: async () => {},
});

test("la nota de la ACTC da la hora oficial de las cinco sesiones de Rosario (sábado y domingo)", async () => {
  const notes = await actcNotes(notaIo());
  assert.equal(notes.length, 1);
  assert.equal(notes[0].published, "2026-10-20");
  const consensus = buildConsensus(notes);
  const f2 = consensus.filter((s) => s.seriesId === "f2-arg").map((s) => `${s.date} ${s.name} ${s.start}-${s.end}`);
  assert.deepEqual(f2, [
    "2026-10-24 1° Entrenamiento 08:20-08:50",
    "2026-10-24 2° Entrenamiento 11:15-11:45",
    "2026-10-24 Clasificación 12:50-13:00",
    "2026-10-24 Carrera clasificatoria 15:10-15:20",
    "2026-10-25 Final 12:10-12:30",
  ]);

  const { events } = await run();
  const rosario = events[10];
  assert.equal(rosario.name, "Fecha 11 · Rosario");
  // Antes de la nota: sábado y domingo del calendario, "a confirmar".
  assert.deepEqual(rosario.sessions.map((s) => [s.start.slice(0, 10), s.timeKnown]), [["2026-10-24", false], ["2026-10-24", false], ["2026-10-24", false], ["2026-10-24", false], ["2026-10-25", false]]);
  const timed = applyF2Schedule(rosario, consensus);
  assert.deepEqual(
    timed.sessions.map((s) => `${s.name} ${s.start.slice(0, 16)} ${s.durationMin}min ${s.timeKnown} ${s.timeStatus}`),
    [
      "1° Entrenamiento 2026-10-24T08:20 30min true confirmed",
      "2° Entrenamiento 2026-10-24T11:15 30min true confirmed",
      "Clasificación 2026-10-24T12:50 10min true confirmed",
      "Carrera clasificatoria 2026-10-24T15:10 10min true confirmed",
      "Final 2026-10-25T12:10 20min true confirmed",
    ],
  );
  assert.equal(timed.sessions[0].timeSources[0].name, "ACTC (cronograma oficial)");
  // Otra fecha no recibe las horas de Rosario.
  assert.equal(applyF2Schedule(events[0], consensus).sessions.some((s) => s.timeKnown), false);
});

test("las líneas de la Fórmula 2 no se mezclan con las del TC ni las del TC Pista", async () => {
  const consensus = buildConsensus(await actcNotes(notaIo()));
  const hora = (seriesId, name) => consensus.filter((s) => s.seriesId === seriesId && s.name === name).map((s) => `${s.start}-${s.end}`);
  assert.deepEqual(hora("tc", "1° Entrenamiento"), ["10:05-11:10"]);
  assert.deepEqual(hora("tc", "2° Entrenamiento"), ["12:00-12:45"]);
  assert.deepEqual(hora("tc-pista", "1° Entrenamiento"), ["08:55-10:00"]);
  assert.deepEqual(hora("tc-pista", "2° Entrenamiento"), ["13:05-14:10"]);
  assert.deepEqual(hora("tc-pista", "Final"), ["12:55-13:35"]);
  assert.deepEqual(hora("tc", "Final"), ["14:00-14:50"]);
  assert.equal(consensus.filter((s) => s.seriesId === "f2-arg").length, 5);
});

test("la hora oficial ya cargada no vuelve a 'a confirmar' cuando la nota deja de leerse", async () => {
  const consensus = buildConsensus(await actcNotes(notaIo()));
  const first = await run();
  const timed = first.events.map((e) => applyF2Schedule(e, consensus));
  const again = await run({ events: timed, standings: first.standings, meta: first.meta });
  assert.deepEqual(again.events[10].sessions.map((s) => s.start.slice(0, 16)), ["2026-10-24T08:20", "2026-10-24T11:15", "2026-10-24T12:50", "2026-10-24T15:10", "2026-10-25T12:10"]);
  assert.equal(again.events[10].sessions.every((s) => s.timeKnown), true);
});
