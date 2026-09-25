import assert from "node:assert/strict";
import { test } from "node:test";
import { claimDispatch } from "./pulso-dispatch.mjs";

const MIN = 60_000;

/** `sql` falso con la fila `pulso_estado` en memoria; interpreta la misma consulta que emite claimDispatch. */
function fakeSql(lastDispatchAt) {
  let row = { id: 1, last_dispatch_at: lastDispatchAt };
  const sql = async (strings, ...values) => {
    const q = strings.join("?");
    if (!q.includes("UPDATE pulso_estado")) throw new Error(`consulta inesperada: ${q}`);
    const [now, , lockMinutes] = values;
    const nowMs = Date.parse(now);
    const lastMs = row.last_dispatch_at ? Date.parse(row.last_dispatch_at) : null;
    if (lastMs !== null && !(lastMs < nowMs - lockMinutes * MIN)) return [];
    row = { ...row, last_dispatch_at: now };
    return [{ last_dispatch_at: now }];
  };
  return { sql, get: () => row };
}

test("nunca se disparó: se reserva", async () => {
  const { sql, get } = fakeSql(null);
  assert.equal(await claimDispatch(sql, "2026-09-24T18:00:00Z"), true);
  assert.equal(get().last_dispatch_at, "2026-09-24T18:00:00Z");
});

test("se disparó hace 44 min: todavía no (con el candado de 45)", async () => {
  const { sql } = fakeSql("2026-09-24T18:00:00Z");
  assert.equal(await claimDispatch(sql, "2026-09-24T18:44:00Z"), false);
});

test("se disparó hace 46 min: se puede reservar de nuevo", async () => {
  const { sql, get } = fakeSql("2026-09-24T18:00:00Z");
  assert.equal(await claimDispatch(sql, "2026-09-24T18:46:00Z"), true);
  assert.equal(get().last_dispatch_at, "2026-09-24T18:46:00Z");
});

test("candado configurable: pasaron 10 min, alcanza con un candado de 5 pero no de 15", async () => {
  assert.equal(await claimDispatch(fakeSql("2026-09-24T18:00:00Z").sql, "2026-09-24T18:10:00Z", { lockMinutes: 5 }), true);
  assert.equal(await claimDispatch(fakeSql("2026-09-24T18:00:00Z").sql, "2026-09-24T18:10:00Z", { lockMinutes: 15 }), false);
});
