import assert from "node:assert/strict";
import { test } from "node:test";
import { ageMin, dataMetaContent, healthReport, isFallback, noResultsReason, parseDataMeta, pendingSessions, rallyLocalSyncDue, recentWinners, latestEventWithResults } from "./salud-core.mjs";

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

test("Córdoba Pista y Nuevo Car Show: una falla de su propia fuente se reconoce, y la de la otra no", () => {
  assert.equal(noResultsReason(session(), "nuevo-car-show", ["Nuevo Car Show: Clase 1 fecha 7 Final: 404"], NOW), "No pudimos consultar la fuente");
  assert.equal(noResultsReason(session(), "nuevo-car-show", ["Córdoba Pista: evento 1: 503"], NOW), "La fuente todavía no los publicó");
  assert.equal(noResultsReason(session(), "cordoba-pista", ["Córdoba Pista: evento 1: 503"], NOW), "No pudimos consultar la fuente");
});

test("publicada pero sin leer: no se le echa la culpa a la fuente (Baku 2026: práctica y clasificación 1 de F2)", () => {
  assert.equal(noResultsReason(session({ resultsUnread: true }), "f2", [], NOW), "La fuente los publicó, pero no pudimos leerlos");
  assert.equal(noResultsReason(session({ resultsUnread: true }), "f2", ["FIA F2: caída"], NOW), "No pudimos consultar la fuente");
  const [row] = pendingSessions([{ id: "f2-2026-12", seriesId: "f2", circuit: { city: "Baku" }, sessions: [session({ name: "Práctica", resultsUnread: true })] }], NOW);
  assert.deepEqual(row, { categoria: "f2", sesion: "Baku · Práctica", terminoHaceMin: 120, publicadosSinLeer: true });
});

test("pendientes: una sesión con la tabla incompleta de la fuente lo dice, con la dirección", () => {
  const url = "https://tiempos.actc.org.ar/resultados/973/ver";
  const ev = { id: "tc-pista-1", seriesId: "tc-pista", circuit: { city: "San Nicolás" }, sessions: [session({ name: "1° Entrenamiento", resultsGap: { reason: "incompleto", url, rows: 3 } })] };
  const [row] = pendingSessions([ev], NOW);
  assert.deepEqual(row.tablaIncompleta, { url, filas: 3 });
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

test("ganadores recientes: sólo categorías automáticas, sesiones terminadas en los últimos 3 días y con posición 1", () => {
  const now = "2026-09-24T18:00:00Z";
  const ev = (id, seriesId, sessions) => ({ id, seriesId, sessions });
  const s = (name, start, results) => ({ name, start, durationMin: 60, ...(results ? { results } : {}) });
  const events = [
    ev("f1-15", "f1", [s("Práctica 1", "2026-09-24T08:30:00Z", [{ pos: 1, driver: "George Russell" }]), s("Carrera", "2026-09-10T12:00:00Z", [{ pos: 1, driver: "Viejo" }]), s("Práctica 2", "2026-09-24T17:30:00Z", [{ pos: 1, driver: "En curso" }])]),
    ev("tc2000-1", "tc2000", [s("Final", "2026-09-24T08:00:00Z", [{ pos: 1, driver: "Manual" }])]),
  ];
  const w = recentWinners(events, now);
  assert.deepEqual(w.map((x) => [x.evento, x.sesion, x.ganador]), [["f1-15", "Práctica 1", "George Russell"]]);
  assert.equal(latestEventWithResults(events), "f1-15");
  assert.equal(latestEventWithResults([ev("x", "f1", [s("Carrera", "2026-09-24T08:00:00Z")])]), null);
});

test("el informe lista las crónicas automáticas y marca cuáles entran en el menú", () => {
  const notes = [{ slug: "a", title: "A", auto: {} }, { slug: "m", title: "M" }, { slug: "b", title: "B", auto: {} }, { slug: "c", title: "C" }, { slug: "d", title: "D", auto: {} }];
  const r = healthReport({ source, stored: null, notes, now: "2026-09-24T18:00:00Z" });
  assert.deepEqual(r.cronicas, [{ slug: "a", title: "A", enMenu: true }, { slug: "b", title: "B", enMenu: true }, { slug: "d", title: "D", enMenu: false }]);
});

test("Rally Argentino: avisa la fecha terminada sin resultados y la que sigue provisoria; no la que la fuente nunca publica", () => {
  const ses = (kind, start, extra = {}) => ({ id: `${kind}-${start}`, kind, name: kind, start, timeKnown: false, durationMin: 60, ...extra });
  const rally = (round, end, sessionExtra = {}) => ({ id: `rally-argentino-2026-${round}`, seriesId: "rally-argentino", round, name: `Rally ${round}`, sessions: [ses("carrera", `${end}T12:00:00-03:00`, sessionExtra)] });
  const now = "2026-10-08T12:00:00-03:00";
  const sin = rally(7, "2026-10-04");
  const provisoria = rally(6, "2026-10-01", { results: [{ pos: 1 }], resultsSource: { name: "x", url: "x", status: "provisional" } });
  const oficial = rally(5, "2026-10-01", { results: [{ pos: 1 }], resultsSource: { name: "x", url: "x" } });
  const ilegible = rally(4, "2026-10-01", { resultsUnread: true });
  const recien = rally(8, "2026-10-08");
  const out = rallyLocalSyncDue([sin, provisoria, oficial, ilegible, recien, { ...sin, id: "tc-1", seriesId: "tc" }], now);
  assert.deepEqual(out.map((r) => [r.fecha, r.motivo]), [[7, "sin-resultados"], [6, "provisoria"]]);
  // Pasadas las 3 semanas ya no se insiste.
  assert.equal(rallyLocalSyncDue([sin], "2026-11-01T12:00:00-03:00").length, 0);
});
