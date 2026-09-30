import assert from "node:assert/strict";
import { test } from "node:test";
import { TIMING_SOURCE } from "./sources/actc-timing.mjs";
import { EVIDENCE_LOCK_MINUTES, EVIDENCE_MAX_TRIES, actcWeekendEvents, decideDispatch, newDocuments, storedDocumentIds, syncStep } from "./pulso-sync.mjs";
import { claimDispatch } from "./pulso-dispatch.mjs";

// Domingo 27/09/2026 17:00 AR = 20:00Z.
const DOMINGO = "2026-09-27T20:00:00Z";
const MARTES = "2026-09-29T20:00:00Z";

const listingHtml = (docs) => {
  const bySeries = new Map();
  for (const d of docs) bySeries.set(d.tab, [...(bySeries.get(d.tab) ?? []), d]);
  return [...bySeries]
    .map(
      ([tab, rows]) =>
        `<div class="acc-item" data-tab="${tab}">${rows
          .map((d) => `<div class="result-row"><div class="result-title">${d.title}</div><div class="result-date">${d.date ?? "27/09/2026"}</div><a href="/resultados/${d.id}/ver">ver</a></div>`)
          .join("")}</div>`,
    )
    .join("");
};

const doc = (id, title, tab = "TCM") => ({ id, title, tab });

// Mouras: sesiones sin hora conocida (portal, 12:00) y una ya guardada desde el documento 960.
const stored = (id) => ({ name: TIMING_SOURCE, url: `https://tiempos.actc.org.ar/resultados/${id}/ver` });
const mouras = (sessions) => ({
  id: "tc-mouras-2026-09-27",
  seriesId: "tc-mouras",
  sessions: sessions.map(([name, kind, src]) => ({
    id: name,
    kind,
    name,
    start: "2026-09-27T12:00:00-03:00",
    timeKnown: false,
    durationMin: 30,
    ...(src ? { results: [{ pos: 1, driver: "A" }], resultsSource: stored(src) } : {}),
  })),
});

const deps = (over = {}) => {
  const calls = { listing: 0, claim: [], record: [], dispatch: 0 };
  return {
    calls,
    args: {
      events: [],
      rawEvents: [mouras([["Serie 1", "serie", 960]])],
      now: DOMINGO,
      fetchListing: async () => {
        calls.listing++;
        return listingHtml([doc(960, "TC MOURAS SERIE 1"), doc(961, "TC MOURAS GRILLA DE LARGADA"), doc(967, "TC MOURAS FINAL")]);
      },
      readPrevious: async () => null,
      claim: async (m) => (calls.claim.push(m), true),
      record: async (e) => void calls.record.push(e),
      dispatch: async () => (calls.dispatch++, { ok: true, status: 204 }),
      ...over,
    },
  };
};

test("hay documento nuevo: dispara con candado corto y guarda cuál fue", async () => {
  const { args, calls } = deps();
  const res = await syncStep(args);
  assert.equal(res.status, "disparada");
  assert.equal(res.motivo, "evidencia");
  assert.equal(res.documento, "tc-mouras:967");
  assert.deepEqual(calls.claim, [EVIDENCE_LOCK_MINUTES]);
  assert.deepEqual(calls.record, [{ doc: "tc-mouras:967", tries: 1 }]);
  assert.equal(calls.dispatch, 1);
});

test("no hay documento nuevo (los parciales y grillas no cuentan): no dispara", async () => {
  const { args, calls } = deps({ fetchListing: async () => listingHtml([doc(960, "TC MOURAS SERIE 1"), doc(961, "TC MOURAS GRILLA DE LARGADA"), doc(962, "TCM PARCIALES")]) });
  const res = await syncStep(args);
  assert.equal(res.status, "skipped");
  assert.equal(calls.claim.length, 0);
  assert.equal(calls.dispatch, 0);
});

test("candado corto activo: no dispara", async () => {
  // Con el candado real: se disparó hace 6 min y el candado corto es de 10.
  const row = { at: "2026-09-27T19:54:00Z" };
  const sql = async (strings, now, _x, lockMinutes) => {
    void strings;
    if (row.at && !(Date.parse(row.at) < Date.parse(now) - lockMinutes * 60000)) return [];
    row.at = now;
    return [{}];
  };
  const { args, calls } = deps({ claim: (m) => claimDispatch(sql, DOMINGO, { lockMinutes: m }) });
  const res = await syncStep(args);
  assert.equal(res.status, "skipped");
  assert.match(res.reason, /10 min/);
  assert.equal(calls.dispatch, 0);
  assert.equal(calls.record.length, 0);
});

test("sesión sin hora conocida: dispara igual si hay documento nuevo", async () => {
  const { args, calls } = deps();
  assert.equal(args.rawEvents[0].sessions.every((s) => s.timeKnown === false), true);
  const res = await syncStep(args);
  assert.equal(res.pendientes, 0);
  assert.equal(res.motivo, "evidencia");
  assert.equal(calls.dispatch, 1);
});

test("fuera de un fin de semana ACTC: ni se consulta el listado", async () => {
  const { args, calls } = deps({ now: MARTES });
  const res = await syncStep(args);
  assert.equal(res.status, "skipped");
  assert.equal(calls.listing, 0);
  // Tampoco de madrugada del domingo.
  const noche = deps({ now: "2026-09-27T05:00:00Z" });
  await syncStep(noche.args);
  assert.equal(noche.calls.listing, 0);
  // Ni con un fin de semana sin fechas de la ACTC.
  const otra = deps({ rawEvents: [{ id: "f1", seriesId: "f1", sessions: [{ start: "2026-09-27T12:00:00-03:00" }] }] });
  await syncStep(otra.args);
  assert.equal(otra.calls.listing, 0);
});

test("el listado falla o cambia de formato: se informa y el resto sigue (el disparo por reloj funciona)", async () => {
  const pendiente = { id: "e", seriesId: "f1", sessions: [{ id: "s", kind: "carrera", name: "Carrera", start: "2026-09-27T17:00:00Z", timeKnown: true, durationMin: 0 }] };
  for (const fetchListing of [async () => { throw new Error("503"); }, async () => "<html>otra cosa</html>"]) {
    const { args, calls } = deps({ fetchListing, events: [pendiente] });
    const res = await syncStep(args);
    assert.equal(res.evidencia.status, "error");
    assert.equal(res.status, "disparada");
    assert.equal(res.motivo, "reloj");
    assert.deepEqual(calls.claim, [45]);
  }
  const sinPendiente = deps({ fetchListing: async () => { throw new Error("503"); } });
  assert.equal((await syncStep(sinPendiente.args)).status, "skipped");
});

test("por reloj sigue igual: candado de 45 min y sin registrar evidencia", async () => {
  const pendiente = { id: "e", seriesId: "f1", sessions: [{ id: "s", kind: "carrera", name: "Carrera", start: "2026-09-29T17:00:00Z", timeKnown: true, durationMin: 0 }] };
  const { args, calls } = deps({ events: [pendiente], rawEvents: [], now: MARTES });
  const res = await syncStep(args);
  assert.equal(res.motivo, "reloj");
  assert.deepEqual(calls.claim, [45]);
  assert.equal(calls.record.length, 0);
});

test("si no se puede guardar la evidencia (columna sin crear), igual dispara y lo informa", async () => {
  const { args, calls } = deps({ record: async () => { throw new Error('column "evidence_doc" does not exist'); } });
  const res = await syncStep(args);
  assert.equal(res.status, "disparada");
  assert.match(res.evidencia.registro, /evidence_doc/);
  assert.equal(calls.dispatch, 1);
});

test("el mismo documento no motiva más de EVIDENCE_MAX_TRIES disparos seguidos", async () => {
  const gastado = deps({ readPrevious: async () => ({ doc: "tc-mouras:967", tries: EVIDENCE_MAX_TRIES }) });
  assert.equal((await syncStep(gastado.args)).status, "skipped");
  const otroDoc = deps({ readPrevious: async () => ({ doc: "tc-mouras:966", tries: EVIDENCE_MAX_TRIES }) });
  assert.equal((await syncStep(otroDoc.args)).status, "disparada");
  const uno = deps({ readPrevious: async () => ({ doc: "tc-mouras:967", tries: 1 }) });
  const res = await syncStep(uno.args);
  assert.equal(res.status, "disparada");
  assert.deepEqual(uno.calls.record, [{ doc: "tc-mouras:967", tries: 2 }]);
});

test("decideDispatch: la evidencia gana sobre el reloj; sin nada no hay disparo", () => {
  const nuevos = [{ key: "tc:1", id: 1 }];
  assert.equal(decideDispatch({ nuevos, pendientes: [1] }).motivo, "evidencia");
  assert.equal(decideDispatch({ pendientes: [1] }).lockMinutes, 45);
  assert.equal(decideDispatch({}), null);
  // Documento agotado pero con sesiones pendientes: cae al reloj.
  assert.equal(decideDispatch({ nuevos, pendientes: [1], previo: { doc: "tc:1", tries: EVIDENCE_MAX_TRIES } }).motivo, "reloj");
});

test("storedDocumentIds y newDocuments: sólo cuentan documentos del portal; una versión más nueva de la misma sesión es nueva", () => {
  const events = [mouras([["Serie 1", "serie", 960], ["Final", "final", 967]])];
  events[0].sessions.push({ id: "otra", kind: "final", name: "Otra", start: "2026-09-27T12:00:00-03:00", results: [{}], resultsSource: { name: "SoloTC", url: "https://x/resultados/999/ver" } });
  assert.deepEqual([...storedDocumentIds(events)].sort(), [960, 967]);
  const weekend = actcWeekendEvents(events, DOMINGO);
  assert.equal(weekend.length, 1);
  const listing = [
    { seriesId: "tc-mouras", title: "TC MOURAS FINAL", day: "2026-09-27", id: 967 },
    { seriesId: "tc-mouras", title: "TC MOURAS FINAL RECTIFICADA", day: "2026-09-27", id: 970 },
    { seriesId: "tc-pick-up", title: "TC PICK UP FINAL", day: "2026-09-27", id: 971 },
  ];
  assert.deepEqual(newDocuments(listing, events, weekend).map((d) => d.id), [970]);
});

test("fin de semana ACTC: de viernes a lunes, del día anterior al primer día hasta el posterior al último", () => {
  const events = [mouras([["Serie 1", "serie", null]])];
  events[0].sessions.push({ ...events[0].sessions[0], id: "sab", start: "2026-09-26T12:00:00-03:00" }); // sábado 26 y domingo 27
  const at = (iso) => actcWeekendEvents(events, iso).length;
  assert.equal(at("2026-09-25T15:00:00Z"), 1, "viernes");
  assert.equal(at("2026-09-28T15:00:00Z"), 1, "lunes");
  assert.equal(at("2026-09-24T15:00:00Z"), 0, "jueves");
  assert.equal(at("2026-09-29T15:00:00Z"), 0, "martes");
});
