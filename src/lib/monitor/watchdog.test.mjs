import assert from "node:assert/strict";
import { test } from "node:test";
import { saludFindings, siteFindings, syncFindings } from "./watchdog-checks.mjs";

const ok = (path, extra = {}) => ({ path, ok: true, status: 200, ms: 300, body: path === "/" ? "<h1>Fierros</h1>" : "", ...extra });

test("un sitio sano no produce hallazgos", () => {
  assert.deepEqual(siteFindings([ok("/"), ok("/calendario")]), []);
});

test("una página que no responde, o que responde vacía o rota, es una caída crítica", () => {
  const caida = siteFindings([ok("/calendario", { ok: false, status: 502 })]);
  assert.equal(caida[0].severity, "critical");
  assert.match(caida[0].body, /502/);
  assert.equal(siteFindings([ok("/", { body: "<html></html>" })]).length, 1);
  assert.equal(siteFindings([ok("/", { body: "Fierros ... Application error: a server-side exception" })]).length, 1);
});

test("una página lenta avisa sólo desde la segunda vez seguida", () => {
  const [lenta] = siteFindings([ok("/calendario", { ms: 14_000 })]);
  assert.equal(lenta.consecutive, 2);
  assert.equal(lenta.severity, "medium");
});

const run = (conclusion, iso) => ({ conclusion, created_at: iso, html_url: "https://github.com/x/actions/runs/1" });
const NOW = "2026-09-24T12:00:00Z";

test("el sincronizador al día no produce hallazgos", () => {
  assert.deepEqual(syncFindings([run("success", "2026-09-24T09:00:00Z"), run("success", "2026-09-23T09:00:00Z")], NOW), []);
});

test("si la última corrida falló se avisa, aunque haya una exitosa reciente", () => {
  const out = syncFindings([run("failure", "2026-09-24T09:00:00Z"), run("success", "2026-09-23T09:00:00Z")], NOW);
  assert.deepEqual(out.map((f) => f.key), ["sync:falló"]);
});

test("si la última corrida exitosa tiene más de 30 h, el sincronizador dejó de correr", () => {
  const out = syncFindings([run("success", "2026-09-22T09:00:00Z")], NOW);
  assert.equal(out[0].key, "sync:atrasado");
  assert.match(out[0].body, /51 h/);
  assert.equal(syncFindings([], NOW)[0].key, "sync:atrasado");
});

test("la home tiene que salir del caché: más de 3 s avisa (desde la segunda vez seguida); otras páginas aguantan hasta 10 s", () => {
  const [lenta] = siteFindings([ok("/", { ms: 3_500 })]);
  assert.equal(lenta.key, "sitio-lento:/");
  assert.equal(lenta.consecutive, 2);
  assert.deepEqual(siteFindings([ok("/", { ms: 2_900 }), ok("/calendario", { ms: 5_000 })]), []);
});

const salud = (over = {}) => ({
  sirviendo: { versionId: 12, origin: "sync", generatedAt: "2026-09-24T11:00:00Z", createdAt: "2026-09-24T11:01:00Z", servedFrom: "store" },
  almacen: { ultimaVersion: 12, createdAt: "2026-09-24T11:01:00Z", origin: "sync" },
  edadMin: 59,
  fallas: [],
  pendientes: [],
  ...over,
});

test("un sitio con la versión al día no produce hallazgos de salud, aunque la versión sea vieja", () => {
  assert.deepEqual(saludFindings(salud(), NOW), []);
  assert.deepEqual(saludFindings(salud({ edadMin: 4000 }), NOW), []);
});

test("/api/salud sin respuesta es un hallazgo", () => {
  assert.deepEqual(saludFindings(null, NOW).map((f) => f.key), ["salud:no-responde"]);
});

test("servir el respaldo avisa", () => {
  const out = saludFindings(salud({ sirviendo: { ...salud().sirviendo, servedFrom: "snapshot", versionId: null, error: "Sin DATABASE_URL" } }), NOW);
  assert.ok(out.some((f) => f.key === "salud:respaldo" && /snapshot/.test(f.body)));
});

test("el almacén con una versión más nueva sólo avisa pasados 10 min", () => {
  const nueva = (createdAt) => salud({ almacen: { ultimaVersion: 13, createdAt, origin: "hot" } });
  assert.deepEqual(saludFindings(nueva("2026-09-24T11:55:00Z"), NOW), [], "hace 5 min: la invalidación puede estar en camino");
  const [f] = saludFindings(nueva("2026-09-24T11:40:00Z"), NOW);
  assert.equal(f.key, "salud:version-vieja");
  assert.match(f.body, /versión 13/);
});

test("pendientes: sólo los de más de 60 min, con el nombre de la sesión", () => {
  const out = saludFindings(
    salud({ pendientes: [{ categoria: "f1", sesion: "Marina Bay · Carrera", terminoHaceMin: 90 }, { categoria: "tn", sesion: "Rosario · Serie", terminoHaceMin: 30 }] }),
    NOW,
  );
  assert.equal(out.length, 1);
  assert.match(out[0].title, /Marina Bay · Carrera/);
});
