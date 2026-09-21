import assert from "node:assert/strict";
import { test } from "node:test";
import { siteFindings, syncFindings } from "./watchdog-checks.mjs";

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
