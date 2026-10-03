import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { actcTiming, chooseDocs, observationLines, pageFormat, parseListing, parsePlanilla, planillaResults, provisionalProblems, TIMING_SOURCE } from "./actc-timing.mjs";
import { keepSessionData } from "./guard.mjs";
import { isProvisional } from "../provisorio.mjs";

// Páginas reales de tiempos.actc.org.ar (Balcarce, 27/09/2026, y Termas, 10/05/2026), recortadas al cuerpo: ver docs/plan-datos/tc-provisorios.md.
const fx = (name) => readFileSync(new URL(`./fixtures/actc/${name}`, import.meta.url), "utf8");
const PAGES = {
  960: "planilla-final-tcppk-2026-09-27.html",
  962: "oficial-final-tcppk-2026-09-27.html",
  961: "planilla-final-tcpk-2026-09-27.html",
  963: "oficial-final-tcpk-2026-09-27.html",
  949: "planilla-serie1-tcppk-2026-09-27.html",
  952: "oficial-serie1-tcppk-2026-09-27.html",
};
const LISTING = fx("listado-balcarce-2026-09-27.html");

/** El listado sin las filas de ciertos documentos (para simular "todavía no publicaron el PDF"). */
const without = (html, ids) =>
  html
    .split('<div class="result-row')
    .filter((chunk, i) => i === 0 || !ids.some((id) => chunk.includes(`/resultados/${id}/ver"`)))
    .join('<div class="result-row');

const io = (listing, pages = PAGES) => ({
  text: async () => listing,
  bytes: async (url) => {
    const id = url.match(/\/resultados\/(\d+)\/ver/)?.[1];
    if (!pages[id]) throw new Error(`404 ${url}`);
    return Buffer.from(fx(pages[id]));
  },
  sleep: async () => {},
});

const evento = (seriesId, sessions) => ({
  id: `${seriesId}-2026-f8`,
  seriesId,
  name: "Fecha 8",
  sessions: sessions.map(([name, kind]) => ({ id: name, kind, name, start: "2026-09-27T14:00:00-03:00", timeKnown: true, durationMin: 40 })),
});
const OPTS = { windowDays: 100000, delayMs: 0 };
const sesion = (result, name) => result.events[0].sessions.find((s) => s.name === name);
const run = (listing, event, previous, pages) => actcTiming(io(listing, pages), [event], previous ? { events: [previous] } : undefined, OPTS);

test("el listado dice qué es cada documento: Excel (planilla), PDF (oficial) o nada (Mouras)", () => {
  const docs = parseListing(LISTING);
  const byId = (id) => docs.find((d) => d.id === id);
  assert.equal(byId(961).format, "xlsx");
  assert.equal(byId(963).format, "pdf");
  assert.equal(byId(951).format, "xlsx");
  assert.equal(byId(957).format, "pdf");
});

test("chooseDocs clásico ignora las planillas 'PARCIALES' (como antes); con provisional las suma como última opción", () => {
  const docs = parseListing(LISTING).filter((d) => d.seriesId === "tc-pick-up" && d.day === "2026-09-27");
  const classic = chooseDocs(docs);
  assert.equal(classic.get("Final").doc.id, 963);
  assert.equal(classic.get("Final").candidates.length, 1);
  const prov = chooseDocs(docs, { provisional: true });
  assert.deepEqual(prov.get("Final").candidates.map((c) => [c.doc.id, c.planilla]), [[963, false], [961, true]]);
  // Sólo la planilla publicada: es la elegida y se marca como planilla.
  const soloPlanilla = chooseDocs(docs.filter((d) => d.id !== 963), { provisional: true }).get("Final");
  assert.equal(soloPlanilla.doc.id, 961);
  assert.equal(soloPlanilla.planilla, true);
  // Una serie con planilla (Excel, mismo título que el oficial) y PDF: gana el PDF; sin PDF, la planilla.
  assert.equal(prov.get("Serie 2").doc.id, 958);
  assert.equal(chooseDocs(docs.filter((d) => d.id !== 958), { provisional: true }).get("Serie 2").planilla, true);
});

test("un oficial gana aunque la planilla tenga el id más alto", () => {
  const docs = [
    { id: 10, seriesId: "tc", title: "FINAL TC", day: "2026-09-27", url: "u10", format: "pdf" },
    { id: 11, seriesId: "tc", title: "FINAL TC PARCIALES", day: "2026-09-27", url: "u11", format: "xlsx" },
  ];
  const chosen = chooseDocs(docs, { provisional: true }).get("Final");
  assert.equal(chosen.doc.id, 10);
  assert.equal(chosen.planilla, false);
});

test("pageFormat: planilla (mejor vuelta, sin tiempo total) y oficial (tiempo total)", () => {
  assert.equal(pageFormat(fx(PAGES[960])), "planilla");
  assert.equal(pageFormat(fx(PAGES[962])), "oficial");
  assert.equal(pageFormat("<html>nada</html>"), "otro");
});

test("planilla de la final de TC Pista Pick Up (27/09): pasa la regla; orden de llegada, sin diferencias inventadas", () => {
  const rows = parsePlanilla(fx(PAGES[960]));
  assert.equal(rows.length, 10);
  assert.deepEqual(provisionalProblems(rows), []);
  assert.deepEqual(rows.slice(0, 3).map((r) => [r.number, r.laps]), [["107", 19], ["144", 19], ["133", 19]]);
  const results = planillaResults(rows, new Map());
  assert.deepEqual(results.slice(0, 3).map((r) => r.driver), ["Sganga Antonino", "Cifre Faustino", "Juan Pablo Alberti"]);
  assert.ok(results.slice(0, 5).every((r) => r.gap === ""));
  // Quienes dieron menos vueltas figuran a una o más vueltas del líder (19): Oroza 18, Santilli Pazos 16.
  assert.equal(results.find((r) => r.number === "88").gap, "+1 vuelta");
  assert.equal(results.find((r) => r.number === "123").gap, "+3 vueltas");
});

test("planilla de la final de TC Pick Up (27/09): 18 filas, líder con 20 vueltas", () => {
  const rows = parsePlanilla(fx(PAGES[961]));
  assert.equal(rows.length, 18);
  assert.deepEqual(provisionalProblems(rows), []);
  assert.equal(rows[0].laps, 20);
});

test("planilla ordenada por mejor vuelta (TC, serie 1 del 10/05): se rechaza, el orden no dice quién ganó", () => {
  const rows = parsePlanilla(fx("planilla-mejor-vuelta-tc-2026-05-10.html"));
  assert.equal(rows.length, 19);
  assert.deepEqual(provisionalProblems(rows), ["ordenada por mejor vuelta"]);
});

test("planilla mal armada (TC, final del 10/05): el primero tiene menos vueltas que los demás y no trae sectores: se rechaza", () => {
  const rows = parsePlanilla(fx("planilla-lider-mal-tc-2026-05-10.html"));
  const problems = provisionalProblems(rows);
  assert.ok(problems.includes("las vueltas no decrecen"));
  assert.ok(problems.includes("el líder no trae sectores"));
});

test("pocas filas: no es una clasificación completa", () => {
  const rows = parsePlanilla(fx(PAGES[960])).slice(0, 2);
  assert.deepEqual(provisionalProblems(rows), ["pocas filas"]);
});

test("observaciones del PDF oficial: una línea por sanción", () => {
  const lines = observationLines(fx(PAGES[963]));
  assert.equal(lines[0], "EXCLUIDO POR TECNICA TC PICK UP N°3 (WERNER) COMPRESION");
  assert.ok(lines.some((l) => /^5" DE RECARGO.*N°115/.test(l)));
});

// ─── La sincronización, de punta a punta con las páginas reales ────────────────────────────────────────────────

test("sólo la planilla de la final: el resultado se carga como provisorio", async () => {
  const event = evento("tc-pick-up", [["Final", "final"]]);
  const result = await run(without(LISTING, [963]), event);
  const final = sesion(result, "Final");
  assert.equal(isProvisional(final), true);
  assert.equal(final.resultsSource.name, TIMING_SOURCE);
  assert.equal(final.resultsSource.url, "https://tiempos.actc.org.ar/resultados/961/ver");
  assert.equal(final.results.length, 18);
  assert.equal(final.results[0].driver, "Hernan Palazzo");
  assert.equal(final.results[1].driver, "Diego Ciantini");
});

test("el oficial reemplaza al provisorio, y dice qué cambió en el podio", async () => {
  const event = evento("tc-pick-up", [["Final", "final"]]);
  const first = await run(without(LISTING, [963]), event);
  const provisional = sesion(first, "Final");
  const second = await run(LISTING, event, first.events[0]);
  const final = sesion(second, "Final");
  assert.equal(isProvisional(final), false);
  assert.equal(final.resultsSource.url, "https://tiempos.actc.org.ar/resultados/963/ver");
  assert.deepEqual(final.results.slice(0, 3).map((r) => r.driver), ["Hernan Palazzo", "Otto Fritzler", "Lucas Valle"]);
  assert.deepEqual(final.resultsSource.provisional.podium.map((p) => p.driver), provisional.results.slice(0, 3).map((r) => r.driver));
  assert.equal(final.resultsSource.note, "Oficial: Diego Ciantini pasó del 2.º al 5.º por un recargo de 5 s");
});

test("el oficial no se degrada: si el PDF no se puede leer hoy y sólo está la planilla, sigue el oficial guardado", async () => {
  const event = evento("tc-pick-up", [["Final", "final"]]);
  const first = await run(without(LISTING, [963]), event);
  const oficial = await run(LISTING, event, first.events[0]);
  // El PDF desaparece del listado (o la página cae): la planilla sigue ahí, pero no vale.
  const hoy = await run(without(LISTING, [963]), event, oficial.events[0]);
  const final = sesion(hoy, "Final");
  assert.equal(isProvisional(final), false);
  assert.equal(final.resultsSource.url, "https://tiempos.actc.org.ar/resultados/963/ver");
  assert.equal(final.resultsSource.note, sesion(oficial, "Final").resultsSource.note);
  // Lo mismo si el PDF figura en el listado pero la página falla.
  const caida = await run(LISTING, event, oficial.events[0], { ...PAGES, 963: undefined });
  assert.equal(isProvisional(sesion(caida, "Final")), false);
  assert.equal(sesion(caida, "Final").results.length, oficial.events[0].sessions[0].results.length);
});

test("planilla que no pasa la regla: no se muestra nada (antes se mostraba como oficial) y lo guardado se conserva", async () => {
  const event = evento("tc-pick-up", [["Final", "final"]]);
  const pages = { ...PAGES, 961: "planilla-mejor-vuelta-tc-2026-05-10.html" };
  const vacio = await run(without(LISTING, [963]), event, undefined, pages);
  assert.equal(sesion(vacio, "Final")?.results, undefined);
  // Con un provisorio bueno ya guardado, una planilla rota no lo reemplaza.
  const bueno = await run(without(LISTING, [963]), event);
  const mismo = await run(without(LISTING, [963]), event, bueno.events[0], pages);
  assert.equal(sesion(mismo, "Final").results.length, 18);
  assert.equal(isProvisional(sesion(mismo, "Final")), true);
});

test("final de TC Pista Pick Up: el oficial excluye al tercero del provisorio y la nota lo dice", async () => {
  const event = evento("tc-pista-pick-up", [["Final", "final"]]);
  const first = await run(without(LISTING, [962]), event);
  assert.equal(isProvisional(sesion(first, "Final")), true);
  assert.deepEqual(sesion(first, "Final").results.slice(0, 3).map((r) => r.number), ["107", "144", "133"]);
  const second = await run(LISTING, event, first.events[0]);
  const final = sesion(second, "Final");
  assert.deepEqual(final.results.slice(0, 3).map((r) => r.number), ["107", "144", "14"]);
  assert.equal(final.resultsSource.note, "Oficial: Juan Pablo Alberti (3.º en el provisorio) fue excluido");
});

test("serie 1 de TC Pista Pick Up: la planilla (mismo título que el PDF) sale como provisoria y el ganador cambia con el oficial", async () => {
  const event = evento("tc-pista-pick-up", [["Serie 1", "serie"]]);
  const first = await run(without(LISTING, [952]), event);
  const provisional = sesion(first, "Serie 1");
  assert.equal(isProvisional(provisional), true);
  assert.equal(provisional.results[0].number, "144");
  const second = await run(LISTING, event, first.events[0]);
  const oficial = sesion(second, "Serie 1");
  assert.equal(isProvisional(oficial), false);
  assert.equal(oficial.results[0].number, "107");
  assert.match(oficial.resultsSource.note, /^Oficial: Cifre Faustino pasó del 1\.º al 4\.º por un recargo$/);
});

test("sin nada nuevo, una segunda pasada con el mismo oficial no cambia nada (estable)", async () => {
  const event = evento("tc-pick-up", [["Final", "final"]]);
  const first = await run(without(LISTING, [963]), event);
  const a = await run(LISTING, event, first.events[0]);
  const b = await run(LISTING, event, a.events[0]);
  assert.deepEqual(sesion(b, "Final"), sesion(a, "Final"));
});

// ─── La guarda de "las fuentes no se achican" ─────────────────────────────────────────────────────────────────

test("guard: un provisorio nunca pisa un oficial ya guardado", () => {
  const row = (pos, number) => ({ pos, number: String(number), driver: `P${number}`, team: "", gap: "" });
  const old = { id: "e", seriesId: "tc-pick-up", sessions: [{ id: "s", kind: "final", name: "Final", start: "2026-09-27T12:00:00-03:00", results: [row(1, 1), row(2, 2), row(3, 3)], resultsSource: { name: TIMING_SOURCE, url: "u963" } }] };
  const next = { id: "e", seriesId: "tc-pick-up", sessions: [{ id: "s", kind: "final", name: "Final", start: "2026-09-27T12:00:00-03:00", results: [row(1, 9), row(2, 8), row(3, 7), row(4, 6)], resultsSource: { name: TIMING_SOURCE, url: "u961", status: "provisional" } }] };
  const { event, restored } = keepSessionData(next, old);
  assert.equal(restored, 1);
  assert.equal(event.sessions[0].resultsSource.url, "u963");
  assert.equal(event.sessions[0].results[0].number, "1");
});

test("guard: un oficial nuevo sí reemplaza al provisorio guardado (y uno oficial a otro oficial, como siempre)", () => {
  const row = (pos, number) => ({ pos, number: String(number), driver: `P${number}`, team: "", gap: "" });
  const old = { id: "e", seriesId: "tc-pick-up", sessions: [{ id: "s", kind: "final", name: "Final", start: "2026-09-27T12:00:00-03:00", results: [row(1, 1), row(2, 2), row(3, 3)], resultsSource: { name: TIMING_SOURCE, url: "u961", status: "provisional" } }] };
  const next = { id: "e", seriesId: "tc-pick-up", sessions: [{ id: "s", kind: "final", name: "Final", start: "2026-09-27T12:00:00-03:00", results: [row(1, 2), row(2, 1)], resultsSource: { name: TIMING_SOURCE, url: "u963" } }] };
  const { event, restored } = keepSessionData(next, old);
  assert.equal(restored, 0);
  assert.equal(event.sessions[0].resultsSource.url, "u963");
});

// ─── Clasificación: la planilla "CLASIFICACION PARCIALES" se muestra primero y el PDF la reemplaza ──────────────────────

const qrow = (pos, number, name, best, laps = 5) => ({ pos, number, name, best, laps, sectors: true });

test("chooseDocs con provisional: la planilla 'CLASIFICACION PARCIALES' entra como última opción; el PDF oficial gana", () => {
  const planilla = { id: 20, seriesId: "tc", title: "CLASIFICACION PARCIALES", day: "2026-10-03", url: "u20", format: "xlsx" };
  const pdf = { id: 19, seriesId: "tc", title: "CLASIFICACION", day: "2026-10-03", url: "u19", format: "pdf" };
  assert.equal(chooseDocs([planilla]).size, 0, "modo clásico: sin cambios");
  const solo = chooseDocs([planilla], { provisional: true }).get("Clasificación");
  assert.equal(solo.doc.id, 20);
  assert.equal(solo.planilla, true);
  assert.equal(chooseDocs([planilla, pdf], { provisional: true }).get("Clasificación").doc.id, 19);
  // Las prácticas siguen sin planilla provisoria.
  const practica = { id: 21, seriesId: "tc", title: "2DO ENTRENAMIENTO PARCIALES", day: "2026-10-03", url: "u21", format: "xlsx" };
  assert.equal(chooseDocs([practica], { provisional: true }).size, 0);
});

test("clasificación provisoria: ordenada por mejor vuelta es lo normal; sin líder con tiempo o desordenada se rechaza", () => {
  const ok = [qrow(1, "1", "CANAPINO AGUSTIN", 61.234), qrow(2, "3", "WERNER MATIAS", 61.5), qrow(3, "7", "MANGONI FACUNDO", 61.9)];
  assert.deepEqual(provisionalProblems(ok, "clasificacion"), []);
  assert.deepEqual(provisionalProblems([ok[0], ok[2], ok[1]], "clasificacion"), ["no está ordenada por mejor vuelta"]);
  assert.deepEqual(provisionalProblems([{ ...ok[0], best: null }, ok[1], ok[2]], "clasificacion"), ["el líder no trae mejor vuelta"]);
  assert.deepEqual(provisionalProblems(ok.slice(0, 2), "clasificacion"), ["pocas filas"]);
  // Las carreras siguen rechazando lo ordenado por mejor vuelta.
  assert.deepEqual(provisionalProblems([...ok, qrow(4, "9", "X", 62)], "final"), ["ordenada por mejor vuelta"]);
});

test("planillaResults de clasificación: mejor vuelta del líder y diferencia de los demás, como el PDF", () => {
  const rows = [qrow(1, "1", "CANAPINO AGUSTIN", 61.234), qrow(2, "3", "WERNER MATIAS", 61.5), { ...qrow(3, "7", "MANGONI FACUNDO", null), laps: 0 }];
  const res = planillaResults(rows, new Map(), "clasificacion");
  assert.deepEqual(res.map((r) => r.gap), ["1:01.234", "+0.266", ""]);
  assert.equal(res[2].status, "Sin tiempo");
});
