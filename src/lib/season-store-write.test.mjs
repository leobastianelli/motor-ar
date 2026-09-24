import { test } from "node:test";
import assert from "node:assert/strict";
import { writeVersion, MAX_ATTEMPTS } from "./season-store-write.mjs";

const res = [{ pos: 1, driver: "A" }];
const raw = (events, generatedAt = "2026-03-01T00:00:00Z") => ({ generatedAt, events, standings: {}, meta: {}, failures: [] });
const ev = (id, results) => ({ id, seriesId: "f1", name: id, sessions: [{ id: `${id}-s`, kind: "carrera", name: "Carrera", start: "2026-03-01T15:00:00Z", ...(results ? { results } : {}) }] });
const row = (id, r, origin = "sync") => ({ id, origin, body: JSON.stringify(r) });

/** `sql` falso con la tabla en memoria; `before(n)` deja colar otro escritor justo antes de la inserción número n. */
function fakeSql(rows, before = () => {}) {
  const inserts = [];
  const sql = async (strings, ...values) => {
    const q = strings.join("?");
    if (q.includes("SELECT id, origin")) {
      const last = rows.at(-1);
      return last ? [{ id: last.id, origin: last.origin, createdAt: "c", body: last.body }] : [];
    }
    if (q.includes("INSERT INTO season_versions")) {
      before(inserts.length);
      inserts.push(values);
      const [parent, origin, , , body] = values;
      const max = rows.at(-1)?.id ?? null;
      if (max !== parent) return [];
      const id = (max ?? 0) + 1;
      rows.push({ id, origin, body });
      return [{ id }];
    }
    if (q.includes("DELETE FROM")) return [];
    throw new Error(`consulta inesperada: ${q}`);
  };
  return { sql, inserts };
}

test("escribe una versión hija de la última", async () => {
  const rows = [row(1, raw([ev("e1")]))];
  const { sql } = fakeSql(rows);
  const out = await writeVersion(sql, { raw: raw([ev("e1"), ev("e2")]), parentId: 1, origin: "sync" });
  assert.deepEqual([out.unchanged, out.id, rows.length], [false, 2, 2]);
});

test("sin cambios no escribe (aunque cambie generatedAt)", async () => {
  const rows = [row(1, raw([ev("e1")]))];
  const { sql, inserts } = fakeSql(rows);
  const out = await writeVersion(sql, { raw: raw([ev("e1")], "2027-01-01T00:00:00Z"), parentId: 1, origin: "sync" });
  assert.deepEqual([out.unchanged, out.id, inserts.length], [true, 1, 0]);
});

test("carrera: otro escritor entra antes de insertar y su dato se conserva", async () => {
  const rows = [row(1, raw([ev("e1")]))];
  const { sql } = fakeSql(rows, (n) => {
    if (n === 0) rows.push(row(2, raw([ev("e1", res)]), "hot"));
  });
  const out = await writeVersion(sql, { raw: raw([ev("e1"), ev("e2")]), parentId: 1, origin: "sync" });
  assert.deepEqual([out.unchanged, out.id], [false, 3]);
  const saved = JSON.parse(rows.at(-1).body);
  assert.deepEqual(saved.events.map((e) => e.id), ["e1", "e2"]);
  assert.deepEqual(saved.events[0].sessions[0].results, res);
});

test("si la versión nueva ya lo incluía todo, no escribe", async () => {
  const rows = [row(1, raw([ev("e1")])), row(2, raw([ev("e1", res)]), "hot")];
  const { sql } = fakeSql(rows);
  const out = await writeVersion(sql, { raw: raw([ev("e1")]), parentId: 1, origin: "sync" });
  assert.deepEqual([out.unchanged, out.id], [true, 2]);
});

test("se rinde con error tras agotar los intentos", async () => {
  const rows = [row(1, raw([ev("e1")]))];
  let n = 1;
  const { sql } = fakeSql(rows, () => rows.push(row(++n, raw([ev("e1"), ev(`x${n}`)]), "hot")));
  await assert.rejects(writeVersion(sql, { raw: raw([ev("e1"), ev("e2")]), parentId: 1, origin: "sync" }), /otro escritor/);
  assert.equal(n, 1 + MAX_ATTEMPTS);
});

test("tabla vacía: primera versión sin padre", async () => {
  const rows = [];
  const { sql } = fakeSql(rows);
  const out = await writeVersion(sql, { raw: raw([ev("e1")]), parentId: null, origin: "seed" });
  assert.equal(out.id, 1);
});
