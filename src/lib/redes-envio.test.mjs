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
    if (q.includes("SELECT clave FROM redes_enviados")) {
      return values[0].filter((k) => claimed.has(k)).map((clave) => ({ clave }));
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
  assert.deepEqual(out.enviados, [{ key: "sesion:f1-2026-16:clasificacion:clasificacion", kind: "resultado" }]);
  assert.equal(out.simulado, false);
  assert.equal(sent.length, 1);
  assert.ok(claimed.has("sesion:f1-2026-16:clasificacion:clasificacion"));
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
  assert.match(out.errores[0], /sesion:f1-2026-16:clasificacion:clasificacion/);
  assert.equal(claimed.size, 0);
});

test("sin sql (sin DATABASE_URL) pero con credenciales: manda sin poder deduplicar entre llamadas", async () => {
  const sent = [];
  const fetchImpl = async (url, opts) => { sent.push(JSON.parse(opts.body)); return { ok: true }; };
  const out = await enviarBorradores({ raw: raw(), now: NOW, catalog, events: raw().events, sql: null, creds: { token: "t", chatId: "c", fetchImpl } });
  assert.equal(out.enviados.length, 1);
  assert.equal(sent.length, 1);
});

test("agenda del viernes (con placa): se manda como foto adjunta, no como enlace de texto", async () => {
  const { sql } = fakeSql();
  const race = { id: "f1-16-r", kind: "carrera", name: "Carrera", start: "2026-10-04T07:00:00Z", timeKnown: true, durationMin: 120 };
  const viernesEvent = { ...event(), sessions: [session(), race] };
  const llamadas = [];
  const fetchImpl = async (url) => { llamadas.push(url); return { ok: true }; };
  // Viernes 2/10 a las 09:00 hora argentina.
  const viernes9 = "2026-10-02T12:00:00Z";
  const out = await enviarBorradores({ raw: { events: [viernesEvent], standings: {}, meta: {} }, now: viernes9, catalog, events: [viernesEvent], sql, creds: { token: "t", chatId: "c", fetchImpl } });
  const agenda = out.enviados.find((d) => d.kind === "agenda");
  assert.ok(agenda, "generó el borrador de agenda");
  assert.ok(llamadas.some((u) => u.endsWith("/sendPhoto")), "usa sendPhoto para la agenda con placa");
  assert.equal(llamadas.some((u) => u.endsWith("/sendMessage")), false, "no hace falta el mensaje de texto: la foto salió bien");
});

test("resumen del domingo (con carrusel): primero el álbum de placas y después el mensaje con el botón", async () => {
  const { sql } = fakeSql();
  const tc = { id: "tc-12", seriesId: "tc", round: 12, name: "Fecha 12", circuit: { city: "San Nicolás" }, source: "ACTC (calendario)", sessions: [{ id: "f", kind: "final", name: "Final", start: "2026-10-04T14:00:00-03:00", timeKnown: true, durationMin: 40, results: [row(1, "Ignacio Faín"), row(2, "Facundo Chapur"), row(3, "Julián Santero")] }] };
  const cat = { drivers, series: [...series, { id: "tc", name: "Turismo Carretera", short: "TC", code: "TC", scope: "nacional", color: "#16658f" }], broadcasts: {} };
  const llamadas = [];
  const fetchImpl = async (url, init) => { llamadas.push([url, JSON.parse(init.body)]); return { ok: true }; };
  const out = await enviarBorradores({ raw: { events: [tc], standings: {}, meta: {} }, now: "2026-10-04T23:30:00Z", catalog: cat, events: [tc], sql, creds: { token: "t", chatId: "c", fetchImpl } });
  assert.ok(out.enviados.some((d) => d.key === "resumen:2026-10-04"));
  // El resumen va primero (el borrador de la final también sale, pero después): álbum y mensaje del resumen, juntos.
  assert.deepEqual(llamadas.slice(0, 2).map(([u]) => u.split("/").pop()), ["sendMediaGroup", "sendMessage"]);
  assert.equal(llamadas[0][1].media.length, 2);
  assert.equal(llamadas[0][1].media[0].media, "https://www.somosfierros.ar/placa/resumen/1?domingo=2026-10-04");
  assert.ok(llamadas[1][1].reply_markup.inline_keyboard[0][0].url.startsWith("https://x.com/intent/post"));
  assert.match(llamadas[1][1].text, /Carrusel: 2 placas/);
});

test("resumen del domingo: si el álbum falla, igual sale el mensaje (con los enlaces antes) y no es un error", async () => {
  const tc = { id: "tc-12", seriesId: "tc", round: 12, name: "Fecha 12", circuit: { city: "San Nicolás" }, source: "ACTC (calendario)", sessions: [{ id: "f", kind: "final", name: "Final", start: "2026-10-04T14:00:00-03:00", timeKnown: true, durationMin: 40, results: [row(1, "Ignacio Faín")] }] };
  const cat = { drivers, series: [{ id: "tc", name: "Turismo Carretera", short: "TC", code: "TC", scope: "nacional", color: "#16658f" }], broadcasts: {} };
  const llamadas = [];
  const fetchImpl = async (url) => { llamadas.push(url.split("/").pop()); return url.endsWith("/sendMediaGroup") ? { ok: false, status: 400 } : { ok: true }; };
  const out = await enviarBorradores({ raw: { events: [tc], standings: {}, meta: {} }, now: "2026-10-04T23:30:00Z", catalog: cat, events: [tc], sql: null, creds: { token: "t", chatId: "c", fetchImpl } });
  assert.deepEqual(llamadas.slice(0, 3), ["sendMediaGroup", "sendMessage", "sendMessage"], "álbum fallido, enlaces como texto y el mensaje del resumen");
  assert.equal(out.errores.length, 0);
  assert.ok(out.enviados.some((d) => d.kind === "resumen"));
});

test("una clave ya enviada no se vuelve a consultar en la base en la llamada siguiente (Neon puede dormir)", async () => {
  const { sql } = fakeSql();
  let queries = 0;
  const counting = async (...args) => { queries++; return sql(...args); };
  const fetchImpl = async () => ({ ok: true });
  const args = { raw: raw(), now: NOW, catalog, events: raw().events, sql: counting, creds: { token: "t", chatId: "c", fetchImpl } };
  const first = await enviarBorradores(args);
  assert.equal(first.enviados.length, 1);
  assert.equal(queries, 2); // una consulta de lo ya enviado + la reserva
  const second = await enviarBorradores(args);
  assert.deepEqual(second, { candidatos: [], enviados: [], simulado: false, errores: [] });
  assert.equal(queries, 2);
});

// TC Pista, San Nicolás, 4/10/2026: clasificaciones, series y la carrera de F1 ya enviadas ocupaban los 8 lugares por corrida y la final,
// novena, no salía nunca.
test("los ya enviados no ocupan el tope por corrida: lo nuevo sale aunque haya más de 8 enviados en la ventana", async () => {
  const sesiones = Array.from({ length: 10 }, (_, i) => ({ ...session(), id: `q${i}`, name: `Clasificación ${i}`, start: `2026-10-03T0${i % 10}:00:00Z`, durationMin: 10 }));
  const ev = { ...event(), sessions: sesiones };
  const r = { events: [ev], standings: {}, meta: {} };
  const ya = new Set(sesiones.slice(0, 9).map((s) => `sesion:${s.id}`)); // claves viejas (por id): también cuentan como enviadas
  const { sql } = fakeSql(ya);
  const fetchImpl = async () => ({ ok: true });
  const out = await enviarBorradores({ raw: r, now: "2026-10-03T12:00:00Z", catalog, events: r.events, sql, creds: { token: "t", chatId: "c", fetchImpl } });
  assert.deepEqual(out.enviados, [{ key: "sesion:f1-2026-16:clasificacion:clasificacion-9", kind: "resultado" }]);
});

