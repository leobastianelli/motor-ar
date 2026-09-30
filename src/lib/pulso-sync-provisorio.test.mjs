import assert from "node:assert/strict";
import { test } from "node:test";
import { TIMING_SOURCE } from "./sources/actc-timing.mjs";
import { newDocuments, syncStep, actcWeekendEvents } from "./pulso-sync.mjs";
import { parseListing } from "./sources/actc-timing.mjs";

// Domingo 27/09/2026 17:00 AR = 20:00Z. El disparo por evidencia también tiene que reaccionar a una planilla parcial nueva:
// si no, el resultado provisorio llegaría recién con el reloj (docs/plan-datos/tc-provisorios.md).
const DOMINGO = "2026-09-27T20:00:00Z";

const row = (d) =>
  `<div class="result-row"><div class="result-title">${d.title}</div><div class="result-date">27/09/2026</div><a href="/resultados/${d.id}/ver" class="dl-btn ver">ver</a>` +
  `${d.format ? `<a href="/descargar/x.${d.format}" class="dl-btn ${d.format}">descarga</a>` : ""}</div>`;
const listing = (docs) => `<div class="acc-item" data-tab="TCPK">${docs.map(row).join("")}</div>`;

const FINAL = { id: 963, title: "FINAL TC PICK UP", format: "pdf" };
const PARCIAL = { id: 961, title: "FINAL TC PICK UP PARCIALES", format: "xlsx" };
const SERIE_PLANILLA = { id: 951, title: "1ERA SERIE TC PICK UP", format: "xlsx" };

const storedUrl = (id) => `https://tiempos.actc.org.ar/resultados/${id}/ver`;
const tcpk = (sessions) => ({
  id: "tc-pick-up-2026-f8",
  seriesId: "tc-pick-up",
  sessions: sessions.map(([name, kind, src]) => ({
    id: name,
    kind,
    name,
    start: "2026-09-27T14:10:00-03:00",
    timeKnown: true,
    durationMin: 40,
    ...(src ? { results: [{ pos: 1, driver: "A" }], resultsSource: { name: TIMING_SOURCE, url: storedUrl(src.id), ...(src.status ? { status: src.status } : {}) } } : {}),
  })),
});

const deps = (docs, rawEvents) => {
  const calls = { claim: [], record: [], dispatch: 0 };
  return {
    calls,
    args: {
      events: [],
      rawEvents,
      now: DOMINGO,
      fetchListing: async () => listing(docs),
      readPrevious: async () => null,
      claim: async (m) => (calls.claim.push(m), true),
      record: async (e) => void calls.record.push(e),
      dispatch: async () => (calls.dispatch++, { ok: true, status: 204 }),
    },
  };
};

test("planilla parcial nueva de la final: el pulso dispara por evidencia, sin esperar al reloj", async () => {
  const { args, calls } = deps([PARCIAL], [tcpk([["Final", "final"]])]);
  const res = await syncStep(args);
  assert.equal(res.status, "disparada");
  assert.equal(res.motivo, "evidencia");
  assert.equal(res.documento, "tc-pick-up:961");
  assert.deepEqual(calls.record, [{ doc: "tc-pick-up:961", tries: 1 }]);
  assert.equal(calls.dispatch, 1);
});

test("planilla de una serie (Excel con el mismo título que el PDF) nueva: también dispara", () => {
  const weekend = actcWeekendEvents([tcpk([["Serie 1", "serie"]])], DOMINGO);
  const nuevos = newDocuments(parseListing(listing([SERIE_PLANILLA])), [tcpk([["Serie 1", "serie"]])], weekend);
  assert.deepEqual(nuevos.map((d) => d.key), ["tc-pick-up:951"]);
});

test("la planilla ya guardada como provisoria no vuelve a disparar", async () => {
  const { args, calls } = deps([PARCIAL], [tcpk([["Final", "final", { id: 961, status: "provisional" }]])]);
  const res = await syncStep(args);
  assert.equal(res.status, "skipped");
  assert.equal(calls.dispatch, 0);
});

test("con la planilla guardada, el PDF oficial que aparece después sí dispara (el oficial gana sobre la planilla)", async () => {
  const { args, calls } = deps([PARCIAL, FINAL], [tcpk([["Final", "final", { id: 961, status: "provisional" }]])]);
  const res = await syncStep(args);
  assert.equal(res.status, "disparada");
  assert.equal(res.documento, "tc-pick-up:963");
  assert.equal(calls.dispatch, 1);
});

test("con el oficial guardado, una planilla en el listado no dispara nada", async () => {
  const { args, calls } = deps([PARCIAL, FINAL], [tcpk([["Final", "final", { id: 963 }]])]);
  const res = await syncStep(args);
  assert.equal(res.status, "skipped");
  assert.equal(calls.dispatch, 0);
});
