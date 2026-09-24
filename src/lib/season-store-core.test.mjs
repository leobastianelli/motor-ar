import { test } from "node:test";
import assert from "node:assert/strict";
import { createReader, summarize } from "./season-store-core.mjs";

const fallback = { generatedAt: "2026-01-01T00:00:00Z", events: [], standings: {}, meta: {} };
const meta = (id) => ({ id, origin: "sync", generatedAt: `g${id}`, createdAt: `c${id}` });
const make = (over = {}) => {
  const calls = { latest: 0, body: [] };
  let current = 1;
  const reader = createReader({
    fallback,
    latest: async () => { calls.latest++; if (over.latest) return over.latest(); return meta(current); },
    body: async (id) => { calls.body.push(id); if (over.body) return over.body(id); return JSON.stringify({ ...fallback, marker: id }); },
  });
  return { reader, calls, bump: () => current++ };
};

test("mismo id no vuelve a pedir el cuerpo", async () => {
  const { reader, calls } = make();
  const a = await reader();
  const b = await reader();
  assert.deepEqual(calls.body, [1]);
  assert.equal(a.raw, b.raw);
  assert.equal(b.source.servedFrom, "store");
  assert.equal(b.source.versionId, 1);
});

test("id nuevo pide el cuerpo nuevo", async () => {
  const { reader, calls, bump } = make();
  await reader();
  bump();
  const r = await reader();
  assert.deepEqual(calls.body, [1, 2]);
  assert.equal(r.raw.marker, 2);
  assert.equal(r.source.versionId, 2);
});

test("falla sin memo devuelve la instantánea marcada", async () => {
  const { reader } = make({ latest: () => { throw new Error("neon caído"); } });
  const r = await reader();
  assert.equal(r.raw, fallback);
  assert.equal(r.source.servedFrom, "snapshot");
  assert.equal(r.source.versionId, null);
  assert.equal(r.source.error, "neon caído");
});

test("falla con memo devuelve el memo marcado", async () => {
  let fail = false;
  const { reader } = make({ latest: () => { if (fail) throw new Error("neon caído"); return meta(1); } });
  const ok = await reader();
  fail = true;
  const r = await reader();
  assert.equal(r.raw, ok.raw);
  assert.equal(r.source.servedFrom, "memo");
  assert.equal(r.source.versionId, 1);
  assert.equal(r.source.error, "neon caído");
});

test("falla el cuerpo de una versión nueva: sigue el memo anterior, marcado", async () => {
  let broken = false;
  const { reader, bump } = make({ body: (id) => { if (broken) throw new Error("timeout"); return JSON.stringify({ ...fallback, marker: id }); } });
  await reader();
  bump();
  broken = true;
  const r = await reader();
  assert.equal(r.source.servedFrom, "memo");
  assert.equal(r.source.versionId, 1);
});

test("dos lectores con el mismo id devuelven los mismos datos", async () => {
  const a = await make().reader();
  const b = await make().reader();
  assert.deepEqual(a.raw, b.raw);
  assert.equal(a.source.versionId, b.source.versionId);
});

test("summarize cuenta eventos, sesiones con resultados y failures", () => {
  const s = summarize({
    events: [
      { seriesId: "f1", sessions: [{ results: [{}] }, { results: [] }] },
      { seriesId: "f1", sessions: [{}] },
      { seriesId: "tc", sessions: [{ results: [{}] }] },
    ],
    failures: ["x"],
  });
  assert.deepEqual(s, { series: { f1: { events: 2, sessionsWithResults: 1 }, tc: { events: 1, sessionsWithResults: 1 } }, failures: ["x"] });
});
