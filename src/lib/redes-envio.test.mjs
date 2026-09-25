import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { enviarBorradores, olvidarConocidos } from "./redes-envio.mjs";

// La memoria de claves ya enviadas es por instancia (módulo): cada prueba arranca de cero.
beforeEach(() => olvidarConocidos());

const series = [{ id: "f1", name: "Fórmula 1", short: "F1", scope: "internacional" }];
const drivers = [{ slug: "franco-colapinto", name: "Franco Colapinto", seriesId: "f1", team: "Alpine" }];
const catalog = { drivers, series, broadcasts: {} };

const row = (pos, driver) => ({ pos, driver, team: "X", gap: "" });
const podium = [row(1, "George Russell"), row(2, "Andrea Kimi Antonelli"), row(3, "Isack Hadjar")];
const session = () => ({ id: "f1-16-q", kind: "clasificacion", name: "Clasificación", start: "2026-10-03T08:00:00Z", timeKnown: true, durationMin: 60, results: podium });
const event = () => ({ id: "f1-2026-16", seriesId: "f1", round: 16, name: "GP de Malasia", circuit: { name: "Sepang", city: "Sepang", country: "Malasia" }, source: "Jolpica", sessions: [session()] });
const raw = () => ({ events: [event()], standings: {}, meta: {} });
// Sábado 3/10 a las 06:30 hora argentina: la clasificación (05:00 argentina) terminó hace 30 min.
const NOW = "2026-10-03T09:30:00Z";

/** `sql` falso con la tabla `redes_enviados` en memoria. */
function fakeSql(claimed = new Set()) {
  const deletes = [];
  const sql = async (strings, ...values) => {
    const q = strings.join("?");
    if (q.includes("INSERT INTO redes_enviados")) {
      const [clave] = values;
      if (claimed.has(clave)) return [];
      claimed.add(clave);
      return [{ clave }];
    }
    if (q.includes("DELETE FROM redes_enviados")) {
      deletes.push(values[0]);
      claimed.delete(values[0]);
      return [];
    }
    throw new Error(`consulta inesperada: ${q}`);
  };
  return { sql, claimed, deletes };
}

test("sin candidatos: no toca sql ni credenciales", async () => {
  let calls = 0;
  const sql = async () => { calls++; return []; };
  const out = await enviarBorradores({ raw: raw(), now: "2026-01-01T00:00:00Z", catalog, events: [], sql });
  assert.deepEqual(out, { candidatos: [], enviados: [], simulado: false, errores: [] });
  assert.equal(calls, 0);
});

test("con credenciales: reserva antes de mandar y devuelve lo enviado", async () => {
  const { sql, claimed } = fakeSql();
  const sent = [];
  const fetchImpl = async (url, opts) => { sent.push(JSON.parse(opts.body)); return { ok: true }; };
  const out = await enviarBorradores({ raw: raw(), now: NOW, catalog, events: raw().events, sql, creds: { token: "t", chatId: "c", fetchImpl } });
  assert.equal(out.candidatos.length, 1);
  assert.deepEqual(out.enviados, [{ key: "sesion:f1-16-q", kind: "resultado" }]);
  assert.equal(out.simulado, false);
  assert.equal(sent.length, 1);
  assert.ok(claimed.has("sesion:f1-16-q"));
});

test("ya reservado (otra llamada lo mandó primero): no manda de nuevo", async () => {
  const { sql } = fakeSql(new Set(["sesion:f1-16-q"]));
  let sent = 0;
  const fetchImpl = async () => { sent++; return { ok: true }; };
  const out = await enviarBorradores({ raw: raw(), now: NOW, catalog, events: raw().events, sql, creds: { token: "t", chatId: "c", fetchImpl } });
  assert.deepEqual(out.enviados, []);
  assert.equal(sent, 0);
});

test("sin credenciales de Telegram: simula y no reserva nada", async () => {
  const { sql, claimed } = fakeSql();
  const out = await enviarBorradores({ raw: raw(), now: NOW, catalog, events: raw().events, sql, creds: {} });
  assert.deepEqual(out.candidatos.length > 0, true);
  assert.equal(out.simulado, true);
  assert.equal(out.motivo, "sin TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID");
  assert.equal(claimed.size, 0);
});

test("--dry: muestra los candidatos, no reserva ni manda", async () => {
  const { sql, claimed } = fakeSql();
  let sent = 0;
  const fetchImpl = async () => { sent++; return { ok: true }; };
  const out = await enviarBorradores({ raw: raw(), now: NOW, catalog, events: raw().events, sql, dry: true, creds: { token: "t", chatId: "c", fetchImpl } });
  assert.equal(out.simulado, true);
  assert.equal(out.motivo, "--dry");
  assert.equal(sent, 0);
  assert.equal(claimed.size, 0);
});

test("Telegram falla: libera la reserva para reintentar y lo cuenta como error", async () => {
  const { sql, claimed } = fakeSql();
  const fetchImpl = async () => ({ ok: false, status: 500 });
  const out = await enviarBorradores({ raw: raw(), now: NOW, catalog, events: raw().events, sql, creds: { token: "t", chatId: "c", fetchImpl } });
  assert.equal(out.enviados.length, 0);
  assert.equal(out.errores.length, 1);
  assert.match(out.errores[0], /sesion:f1-16-q/);
  assert.equal(claimed.size, 0);
});

test("sin sql (sin DATABASE_URL) pero con credenciales: manda sin poder deduplicar entre llamadas", async () => {
  const sent = [];
  const fetchImpl = async (url, opts) => { sent.push(JSON.parse(opts.body)); return { ok: true }; };
  const out = await enviarBorradores({ raw: raw(), now: NOW, catalog, events: raw().events, sql: null, creds: { token: "t", chatId: "c", fetchImpl } });
  assert.equal(out.enviados.length, 1);
  assert.equal(sent.length, 1);
});

test("una clave ya enviada no se vuelve a consultar en la base en la llamada siguiente (Neon puede dormir)", async () => {
  const { sql } = fakeSql();
  let queries = 0;
  const counting = async (...args) => { queries++; return sql(...args); };
  const fetchImpl = async () => ({ ok: true });
  const args = { raw: raw(), now: NOW, catalog, events: raw().events, sql: counting, creds: { token: "t", chatId: "c", fetchImpl } };
  const first = await enviarBorradores(args);
  assert.equal(first.enviados.length, 1);
  assert.equal(queries, 1);
  const second = await enviarBorradores(args);
  assert.deepEqual(second, { candidatos: [], enviados: [], simulado: false, errores: [] });
  assert.equal(queries, 1);
});

