import assert from "node:assert/strict";
import { test } from "node:test";
import { ageMin, dataMetaContent, healthReport, isFallback, noResultsReason, parseDataMeta, pendingSessions } from "./salud-core.mjs";

const NOW = "2026-09-24T15:00:00Z";
const source = { versionId: 12, origin: "hot", generatedAt: "2026-09-24T14:30:00Z", createdAt: "2026-09-24T14:31:00Z", servedFrom: "store" };
const session = (over = {}) => ({ id: "s", name: "Carrera", kind: "carrera", start: "2026-09-24T12:00:00Z", durationMin: 60, ...over });

test("el <meta> se escribe y se lee de ida y vuelta", () => {
  const content = dataMetaContent(source);
  assert.equal(content, "v=12;origen=hot;generado=2026-09-24T14:30:00Z;servido=store");
  assert.deepEqual(parseDataMeta(content), { v: "12", origen: "hot", generado: "2026-09-24T14:30:00Z", servido: "store" });
  assert.equal(parseDataMeta("basura"), null);
});

test("la instantánea no tiene versión: el <meta> lo dice", () => {
  assert.match(dataMetaContent({ ...source, versionId: null, origin: "snapshot", servedFrom: "snapshot" }), /^v=snapshot;/);
});

test("sólo se avisa desactualización si no se leyó el almacén; una versión vieja del almacén no es error", () => {
  assert.equal(isFallback(source), false);
  assert.equal(isFallback({ ...source, servedFrom: "memo" }), true);
  assert.equal(isFallback({ ...source, servedFrom: "snapshot" }), true);
  assert.equal(isFallback({ ...source, createdAt: "2026-01-01T00:00:00Z" }), false);
});

test("edad de la versión en minutos", () => {
  assert.equal(ageMin(source, NOW), 29);
  assert.equal(ageMin({ ...source, createdAt: null }, NOW), 30);
});

test("sin resultados: los tres casos, y nada si todavía es pronto", () => {
  assert.equal(noResultsReason(session(), "f1", [], NOW), "La fuente todavía no los publicó");
  assert.equal(noResultsReason(session(), "f1", ["OpenF1: timeout (se conservan los resultados anteriores)"], NOW), "No pudimos consultar la fuente");
  assert.equal(noResultsReason(session(), "tc2000", [], NOW), "Resultados sin cargar todavía");
  assert.equal(noResultsReason(session({ start: "2026-09-24T14:00:00Z" }), "f1", [], NOW), null, "terminó hace 0 min");
  assert.equal(noResultsReason(session({ results: [{ pos: 1 }] }), "f1", [], NOW), null);
});

test("una falla de otra categoría no cuenta, y una de video tampoco", () => {
  assert.equal(noResultsReason(session(), "f1", ["F2: caída", "YouTube F1: cuota"], NOW), "La fuente todavía no los publicó");
  assert.equal(noResultsReason(session(), "tc", ["Tiempos ACTC: caída"], NOW), "No pudimos consultar la fuente");
});

test("publicada pero sin leer: no se le echa la culpa a la fuente (Baku 2026: práctica y clasificación 1 de F2)", () => {
  assert.equal(noResultsReason(session({ resultsUnread: true }), "f2", [], NOW), "La fuente los publicó, pero no pudimos leerlos");
  assert.equal(noResultsReason(session({ resultsUnread: true }), "f2", ["FIA F2: caída"], NOW), "No pudimos consultar la fuente");
  const [row] = pendingSessions([{ id: "f2-2026-12", seriesId: "f2", circuit: { city: "Baku" }, sessions: [session({ name: "Práctica", resultsUnread: true })] }], NOW);
  assert.deepEqual(row, { categoria: "f2", sesion: "Baku · Práctica", terminoHaceMin: 120, publicadosSinLeer: true });
});

test("pendientes: sólo categorías automáticas, entre 15 min y 48 h", () => {
  const ev = (seriesId, s) => ({ id: seriesId, seriesId, name: "GP", circuit: { city: "Monza" }, sessions: [s] });
  const out = pendingSessions(
    [
      ev("f1", session({ name: "Carrera" })), // terminó hace 120 min
      ev("tc2000", session()), // manual
      ev("tn", session({ start: "2026-09-24T13:55:00Z" })), // terminó hace 5 min
      ev("f2", session({ start: "2026-09-20T12:00:00Z" })), // hace días
      ev("tc", session({ timeKnown: false })),
    ],
    NOW,
  );
  assert.deepEqual(out, [{ categoria: "f1", sesion: "Monza · Carrera", terminoHaceMin: 120 }]);
});

test("el informe junta lo que se sirve, lo que hay en el almacén y lo pendiente", () => {
  const r = healthReport({ source, stored: { id: 13, origin: "sync", createdAt: "2026-09-24T14:50:00Z" }, failures: ["F1: x"], events: [], now: NOW });
  assert.equal(r.sirviendo.versionId, 12);
  assert.equal(r.almacen.ultimaVersion, 13);
  assert.equal(r.edadMin, 29);
  assert.deepEqual(r.fallas, ["F1: x"]);
  assert.equal(healthReport({ source, stored: null, storeError: "boom", now: NOW }).almacen.error, "boom");
});
