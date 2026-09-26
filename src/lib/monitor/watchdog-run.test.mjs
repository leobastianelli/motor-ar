// Pruebas de la orquestación compartida (runWatchdog/deliverWatchdog): con fetch falso, sin red ni Neon ni Telegram de verdad.
import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyState } from "./alerts.mjs";
import { deliverWatchdog, runWatchdog } from "./watchdog-run.mjs";

const NOW = "2026-09-26T12:00:00Z";
const SITE = "https://example.test";

/** fetch falso: responde según la URL pedida. `pages` mapea path → { ok, status, body }; por defecto todo 200 con "Fierros". */
function fakeFetch({ pages = {}, salud = null, syncRuns = null, syncOk = true } = {}) {
  const calls = [];
  const impl = async (url) => {
    calls.push(url);
    if (url.includes("api.github.com")) {
      if (!syncOk) return { ok: false, status: 500, text: async () => "", json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ workflow_runs: syncRuns ?? [] }) };
    }
    const path = url.replace(SITE, "");
    const page = pages[path] ?? {};
    const status = page.status ?? 200;
    const ok = page.ok ?? status < 400;
    let body = page.body;
    if (body === undefined) {
      if (path === "/api/salud") body = JSON.stringify(salud ?? {});
      else if (path === "/") body = "<h1>Fierros</h1>";
      else body = "";
    }
    return { ok, status, text: async () => body };
  };
  return { impl, calls };
}

test("sitio sano, sin token de GitHub: no hay hallazgos y anota que no se vigiló el sincronizador", async () => {
  const { impl } = fakeFetch({ salud: { sirviendo: { servedFrom: "store" }, almacen: {}, pendientes: [] } });
  const { findings, send, resolved, notes, probed } = await runWatchdog({ site: SITE, now: NOW, state: emptyState(), fetchImpl: impl, dry: true });
  assert.deepEqual(findings, []);
  assert.deepEqual(send, []);
  assert.deepEqual(resolved, []);
  assert.equal(probed.length, 4);
  assert.match(notes[0], /sin token de GitHub/);
});

test("una página caída produce un hallazgo crítico y se avisa (nuevo)", async () => {
  const { impl } = fakeFetch({ pages: { "/calendario": { ok: false, status: 502 } }, salud: { sirviendo: { servedFrom: "store" }, almacen: {}, pendientes: [] } });
  const { findings, send } = await runWatchdog({ site: SITE, now: NOW, state: emptyState(), fetchImpl: impl, dry: true });
  assert.ok(findings.some((f) => f.key === "sitio:/calendario"));
  assert.equal(send.length, 1);
  assert.equal(send[0].kind, "nuevo");
});

test("con token de GitHub revisa el sincronizador y agrega sus hallazgos", async () => {
  const runs = [{ conclusion: "failure", created_at: "2026-09-26T09:00:00Z", html_url: "https://x/1" }];
  const { impl, calls } = fakeFetch({ salud: { sirviendo: { servedFrom: "store" }, almacen: {}, pendientes: [] }, syncRuns: runs });
  const { findings, notes } = await runWatchdog({ site: SITE, now: NOW, state: emptyState(), fetchImpl: impl, githubToken: "t", githubRepo: "a/b", dry: true });
  assert.ok(findings.some((f) => f.key === "sync:falló"));
  assert.deepEqual(notes, []);
  assert.ok(calls.some((u) => u.includes("api.github.com/repos/a/b")));
});

test("si la API de GitHub falla, se anota en notes y no rompe la corrida", async () => {
  const { impl } = fakeFetch({ salud: { sirviendo: { servedFrom: "store" }, almacen: {}, pendientes: [] }, syncOk: false });
  const { findings, notes } = await runWatchdog({ site: SITE, now: NOW, state: emptyState(), fetchImpl: impl, githubToken: "t", githubRepo: "a/b", dry: true });
  assert.match(notes[0], /No se pudo leer las corridas del sincronizador/);
  assert.ok(!findings.some((f) => f.key.startsWith("sync:")));
});

test("un problema que ya se había avisado y sigue, sin due, no se vuelve a avisar", async () => {
  const { impl } = fakeFetch({ pages: { "/calendario": { ok: false, status: 502 } }, salud: { sirviendo: { servedFrom: "store" }, almacen: {}, pendientes: [] } });
  const first = await runWatchdog({ site: SITE, now: NOW, state: emptyState(), fetchImpl: impl, dry: true });
  const second = await runWatchdog({ site: SITE, now: "2026-09-26T12:05:00Z", state: first.state, fetchImpl: impl, dry: true });
  assert.equal(second.send.length, 0);
});

test("deliverWatchdog sin nada para avisar no llama a Telegram", async () => {
  const result = await deliverWatchdog({ send: [], resolved: [] }, { token: "t", chatId: "c" });
  assert.deepEqual(result, { sent: 0, text: null });
});

test("deliverWatchdog sin credenciales simula el envío", async () => {
  const send = [{ key: "sitio:/", severity: "critical", title: "El sitio no responde bien: /", body: "x", kind: "nuevo" }];
  const result = await deliverWatchdog({ send, resolved: [] }, {});
  assert.equal(result.sent, 0);
  assert.equal(result.simulated, true);
  assert.match(result.text, /El sitio no responde bien/);
});
