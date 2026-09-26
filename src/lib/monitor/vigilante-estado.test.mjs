import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyState } from "./alerts.mjs";
import { guardarVigilanteEstado, leerVigilanteEstado } from "./vigilante-estado.mjs";

/** `sql` falso con la fila `vigilante_estado` en memoria. */
function fakeSql(estadoInicial = null) {
  let row = estadoInicial ? { id: 1, estado: estadoInicial } : null;
  const sql = async (strings, ...values) => {
    const q = strings.join("?");
    if (q.includes("SELECT estado FROM vigilante_estado")) return row ? [{ estado: row.estado }] : [];
    if (q.includes("INSERT INTO vigilante_estado")) {
      row = { id: 1, estado: JSON.parse(values[0]) };
      return [];
    }
    throw new Error(`consulta inesperada: ${q}`);
  };
  return { sql, get: () => row };
}

test("sin fila todavía: devuelve emptyState()", async () => {
  const { sql } = fakeSql();
  assert.deepEqual(await leerVigilanteEstado(sql), emptyState());
});

test("con una fila guardada: la devuelve tal cual", async () => {
  const guardado = { alerts: { "sitio:/": { active: true } }, fails: {}, lastSummary: null };
  const { sql } = fakeSql(guardado);
  assert.deepEqual(await leerVigilanteEstado(sql), guardado);
});

test("guardar y volver a leer: round-trip", async () => {
  const { sql, get } = fakeSql();
  const estado = { alerts: { "sync:atrasado": { active: true, level: 1 } }, fails: { "sync:atrasado": 1 }, lastSummary: "2026-09-26T06:00:00Z" };
  await guardarVigilanteEstado(sql, estado);
  assert.deepEqual(get().estado, estado);
  assert.deepEqual(await leerVigilanteEstado(sql), estado);
});
