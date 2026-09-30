import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyState, evaluate, summaryDue } from "./alerts.mjs";
import { compareStandings, dateIssues, tnDateConflicts, withConflicts, dateStatus, manualDiscarded, manualExpired, parseTc2000Home, pendingHours, resultsOverdue, sessionResultsMissing, sourceFailures, weekendWithoutAnyHour, staleStandings, visibleEvents } from "./checks.mjs";
import { chunk, renderAlerts, sendTelegram, sendTelegramPhoto } from "./telegram.mjs";

// Domingo 27/09/2026 (Balcarce, TC Pick Up): la carrera no tiene hora.
const sunday = (over = {}) => ({
  id: "tcpk-2026-8",
  seriesId: "tc-pick-up",
  round: 8,
  name: "Fecha 8 · Balcarce",
  circuit: { name: "Juan Manuel Fangio", city: "Balcarce" },
  source: "ACTC (calendario)",
  sessions: [{ id: "f", kind: "final", name: "Final", start: "2026-09-27T12:00:00-03:00", timeKnown: false, durationMin: 35 }],
  ...over,
});
const at = (day, hh) => `2026-09-${day}T${hh}:00:00-03:00`;
const tierOf = (id) => (id.startsWith("tc") ? 1 : 3);

test("una fecha oficial con sede está confirmada; una manual o sin sede, tentativa; en conflicto, conflicto", () => {
  assert.equal(dateStatus(sunday()).status, "confirmed");
  assert.equal(dateStatus(sunday({ circuit: { name: "", city: "" }, name: "Fecha 10 ·" })).status, "tentative");
  assert.equal(dateStatus(sunday({ source: "Carga manual · 0264Noticias" })).status, "tentative");
  assert.equal(dateStatus(sunday({ source: "Carga manual · calendario oficial de ligierjuniorformulachampionship.com" })).status, "confirmed");
  assert.equal(dateStatus(sunday({ dateConflict: "APAT dice 20/09 y Speedhive 21/09" })).status, "conflict");
  // Una carga manual puede declarar la fecha confirmada (sólo faltan los horarios).
  assert.equal(dateStatus(sunday({ source: "Carga manual · Fierros", dateConfirmed: true })).status, "confirmed");
});

test("una fecha manual confirmada sin horarios sí dispara el aviso de horarios pendientes", () => {
  const tc2000 = sunday({ id: "tc2000-2026-8", seriesId: "tc2000", source: "Carga manual · Fierros", dateConfirmed: true });
  assert.equal(pendingHours([tc2000], at("24", "12"))[0].key, "horarios:tc2000-2026-8");
});

test("los horarios pendientes empiezan a avisar 72 h antes y suben de nivel a las 48 h, a las 24 h y el mismo día", () => {
  const e = [sunday()];
  assert.equal(pendingHours(e, at("23", "12")).length, 0, "miércoles: todavía no");
  assert.equal(pendingHours(e, at("24", "12"))[0].level, 1, "jueves");
  assert.equal(pendingHours(e, at("25", "12"))[0].level, 2, "viernes");
  assert.equal(pendingHours(e, at("26", "12"))[0].level, 3, "sábado");
  const hoy = pendingHours(e, at("27", "08"))[0];
  assert.equal(hoy.level, 4);
  assert.equal(hoy.severity, "critical");
  assert.match(hoy.title, /HOY/);
});

test("sin fecha confirmada no se avisa por horarios, y con hora conocida tampoco", () => {
  assert.equal(pendingHours([sunday({ source: "Wikipedia" })], at("25", "12")).length, 0);
  const conHora = sunday({ sessions: [{ id: "f", kind: "final", name: "Final", start: "2026-09-27T13:05:00-03:00", timeKnown: true, durationMin: 35 }] });
  assert.equal(pendingHours([conHora], at("25", "12")).length, 0);
});

test("una fecha tentativa a menos de 14 días se avisa como fecha sin confirmar; a más de 14 días se calla", () => {
  const manual = sunday({ id: "tc2000-2026-8", seriesId: "tc2000", source: "Carga manual · 0264Noticias", name: "Fecha 8 · San Juan" });
  const issues = dateIssues([manual], at("21", "12"), { tierOf });
  assert.equal(issues.length, 1);
  assert.match(issues[0].title, /sin confirmar/);
  assert.equal(dateIssues([manual], "2026-08-01T12:00:00-03:00", { tierOf }).length, 0);
});

test("GT tiene dos campeonatos con numeración propia: no es una fecha repetida", () => {
  const gt = (id) => sunday({ id, seriesId: "gt3", round: 1 });
  assert.equal(dateIssues([gt("gt3-2026-s1"), gt("gt3-2026-e1")], at("21", "12")).filter((i) => i.key.startsWith("fecha-duplicada")).length, 0);
});

test("dos veces el mismo número de fecha en una categoría es un problema", () => {
  const a = sunday({ id: "tcm-2026-7" });
  const b = sunday({ id: "tcm-2026-7b" });
  assert.ok(dateIssues([a, b].map((e) => ({ ...e, seriesId: "tc-mouras", round: 7 })), at("21", "12")).some((i) => i.key.startsWith("fecha-duplicada")));
});

test("resultados: se avisa cuando pasaron 36 h y la fuente automática no publicó la carrera", () => {
  const corrida = sunday({ sessions: [{ id: "f", kind: "final", name: "Final", start: "2026-09-13T12:00:00-03:00", timeKnown: false, durationMin: 35 }] });
  const auto = new Set(["tc-pick-up"]);
  assert.equal(resultsOverdue([corrida], at("14", "10"), { autoSeries: auto }).length, 0);
  assert.equal(resultsOverdue([corrida], at("16", "10"), { autoSeries: auto }).length, 1);
  assert.equal(resultsOverdue([corrida], at("16", "10"), { autoSeries: new Set() }).length, 0);
});

test("resultados: un hueco de más de 30 días baja a información y lo dice", () => {
  const corrida = sunday({ sessions: [{ id: "f", kind: "final", name: "Final", start: "2026-09-13T12:00:00-03:00", timeKnown: false, durationMin: 35 }] });
  const auto = new Set(["tc-pick-up"]);
  const [reciente] = resultsOverdue([corrida], at("20", "10"), { autoSeries: auto });
  assert.equal(reciente.severity, "medium");
  const [viejo] = resultsOverdue([corrida], "2026-10-20T12:00:00-03:00", { autoSeries: auto });
  assert.equal(viejo.severity, "info");
  assert.equal(viejo.key, reciente.key);
  assert.match(viejo.body, /hueco viejo de la fuente/);
});

test("las fallas de fuente avisan desde la segunda vez; si hubo pérdida de datos, en el acto; las correcciones automáticas son sólo información", () => {
  const [suelta, perdida, corregido] = sourceFailures([
    "Speedhive TN: 500 al pedir la lista",
    "Se conservaron fechas que las fuentes dejaron de traer: tn 12",
    "Se descartaron resultados de 1 sesiones que todavía no se corrieron (eran de otra fecha)",
  ]);
  assert.equal(suelta.consecutive, 2);
  assert.equal(suelta.key, "fuente:Speedhive TN");
  assert.equal(perdida.consecutive, undefined);
  assert.equal(perdida.severity, "high");
  assert.match(perdida.title, /dejó de traer datos/);
  assert.equal(corregido.severity, "info");
  assert.match(corregido.title, /corregidos automáticamente/);
});

test("campeonato atrasado: la tabla llega a la fecha 11 y ya se corrieron 12", () => {
  const races = Array.from({ length: 12 }, (_, i) => ({ id: `tc-${i}`, seriesId: "tc", sessions: [{ kind: "final", results: [{ pos: 1 }] }] }));
  const out = staleStandings({ standings: {}, meta: {} }, { standings: { tc: { asOfRound: 11 } } }, races, { tierOf });
  assert.equal(out.length, 1);
  assert.match(out[0].body, /carga manual/);
  assert.equal(staleStandings({ standings: {}, meta: {} }, { standings: { tc: { asOfRound: 12 } } }, races).length, 0);
});

test("una carga manual de un evento terminado hace más de 2 días, sin sesiones propias, se marca para limpiar", () => {
  const vieja = sunday({ id: "tn-2026-9", sessions: [{ id: "f", kind: "final", name: "Final", start: "2026-09-13T12:00:00-03:00", timeKnown: true, durationMin: 35 }] });
  assert.equal(manualExpired([vieja], [vieja], { events: { "tn-2026-9": {} } }, at("21", "12")).length, 1);
  assert.equal(manualExpired([vieja], [vieja], { events: { "tn-2026-9": {} } }, at("14", "12")).length, 0);
});

test("carga manual vencida: si la fuente (sin la carga) ya trae la misma hora y los mismos resultados, avisa que se puede sacar", () => {
  const conManual = sunday({
    id: "tn-2026-9",
    sessions: [{ id: "f", kind: "final", name: "Final", start: "2026-09-13T12:00:00-03:00", timeKnown: true, durationMin: 35, results: [{ pos: 1 }] }],
  });
  const fuente = sunday({
    id: "tn-2026-9",
    sessions: [{ id: "f", kind: "final", name: "Final", start: "2026-09-13T12:00:00-03:00", timeKnown: true, durationMin: 35, results: [{ pos: 1 }] }],
  });
  const manual = { events: { "tn-2026-9": { sessions: [{ kind: "final", name: "Final", start: "2026-09-13T12:00:00-03:00", timeKnown: true, results: [{ pos: 1 }] }] } } };
  const out = manualExpired([conManual], [fuente], manual, at("21", "12"));
  assert.equal(out.length, 1);
  assert.equal(out[0].key, "manual-vencida:tn-2026-9");
  assert.match(out[0].title, /ya cumplida/);
});

test("carga manual vencida: si la fuente nunca trajo la hora o los resultados, NO avisa que se saque, avisa qué falta", () => {
  const conManual = sunday({
    id: "tn-2026-9",
    sessions: [{ id: "f", kind: "final", name: "Final", start: "2026-09-13T12:00:00-03:00", timeKnown: true, durationMin: 35, results: [{ pos: 1 }] }],
  });
  // La fuente sola nunca tuvo hora para esta sesión (timeKnown: false): ese dato sólo existe a mano.
  const fuenteSinHora = sunday({
    id: "tn-2026-9",
    sessions: [{ id: "f", kind: "final", name: "Final", start: "", timeKnown: false, durationMin: 35 }],
  });
  const manual = { events: { "tn-2026-9": { sessions: [{ kind: "final", name: "Final", start: "2026-09-13T12:00:00-03:00", timeKnown: true, results: [{ pos: 1 }] }] } } };
  const out = manualExpired([conManual], [fuenteSinHora], manual, at("21", "12"));
  assert.equal(out.length, 1);
  assert.equal(out[0].key, "manual-necesaria:tn-2026-9");
  assert.match(out[0].title, /necesaria/);
  assert.match(out[0].body, /la hora de "Final"/);
  assert.doesNotMatch(out[0].body, /se puede sacar/);
});

test("carga manual vencida: si la fuente nunca trajo esa sesión (no existe con ese tipo + nombre), tampoco avisa que se saque", () => {
  const conManual = sunday({
    id: "tn-2026-9",
    sessions: [{ id: "f", kind: "final", name: "Final Clase 2", start: "2026-09-13T12:00:00-03:00", timeKnown: true, durationMin: 35 }],
  });
  const fuenteSinEsaSesion = sunday({ id: "tn-2026-9", sessions: [{ id: "otra", kind: "final", name: "Final Clase 3", start: "2026-09-13T12:00:00-03:00", timeKnown: true, durationMin: 35 }] });
  const manual = { events: { "tn-2026-9": { sessions: [{ kind: "final", name: "Final Clase 2", start: "2026-09-13T12:00:00-03:00", timeKnown: true }] } } };
  const out = manualExpired([conManual], [fuenteSinEsaSesion], manual, at("21", "12"));
  assert.equal(out[0].key, "manual-necesaria:tn-2026-9");
  assert.match(out[0].body, /"Final Clase 2"/);
});

test("las cargas manuales se suman a lo que ve la gente, igual que en el sitio", () => {
  const out = visibleEvents([], { newEvents: [sunday({ id: "x" })] });
  assert.equal(out.length, 1);
  const patched = visibleEvents([sunday()], { events: { "tcpk-2026-8": { sessions: [{ kind: "final", name: "Final", start: "2026-09-27T13:05:00-03:00", timeKnown: true, durationMin: 35 }] } } });
  assert.equal(patched[0].sessions[0].timeKnown, true);
});

const PORTADA = `CAMPEONATO CON DESCARTE
CAMPEONATO DE PILOTOS
CAMPEONATO DE EQUIPOS
1°
Matias Rossi
128
2°
Emiliano Stang
97
3°
Gabriel P. de Leon
89
VER LISTA COMPLETA
1°
TOYOTA GAZOO Racing
225`;

test("la portada de TC2000 se lee (con sus entidades HTML) y se compara con la tabla manual", () => {
  assert.equal(parseTc2000Home(PORTADA.replace(/°/g, "&deg;").replace("Matias", "Mat&iacute;as"))[0].driver, "Matías Rossi");
  const oficial = parseTc2000Home(PORTADA);
  assert.deepEqual(oficial.map((r) => [r.pos, r.driver, r.points]), [[1, "Matias Rossi", 128], [2, "Emiliano Stang", 97], [3, "Gabriel P. de Leon", 89]]);
  const igual = [{ pos: 1, driver: "Matías Rossi", points: 128 }, { pos: 2, driver: "Emiliano Stang", points: 97 }, { pos: 3, driver: "Gabriel P. de Leon", points: 89 }];
  assert.equal(compareStandings(igual, oficial, { series: "tc2000", name: "TC2000" }).length, 0);
  // Variantes del nombre y empates ordenados distinto no son diferencias.
  const variantes = [{ pos: 2, driver: "Matías Rossi", points: 128 }, { pos: 1, driver: "Emiliano Stang", points: 97 }, { pos: 3, driver: "Gabriel Ponce de León", points: 89 }];
  assert.equal(compareStandings(variantes, oficial, { series: "tc2000", name: "TC2000" }).length, 0);
  const vieja = [{ pos: 1, driver: "Matías Rossi", points: 118 }, ...igual.slice(1)];
  const dif = compareStandings(vieja, oficial, { series: "tc2000", name: "TC2000" });
  assert.equal(dif.length, 1);
  assert.match(dif[0].body, /Rossi/);
});

// ——— Motor de avisos ———

const finding = (over = {}) => ({ key: "horarios:x", severity: "medium", level: 1, title: "Faltan horarios: X", body: "1 sesión sin hora.", tier: 1, ...over });

test("un problema nuevo se avisa una vez y no se repite antes de su enfriamiento", () => {
  const primera = evaluate([finding()], emptyState(), at("24", "12"));
  assert.equal(primera.send.length, 1);
  assert.equal(primera.send[0].kind, "nuevo");
  const enseguida = evaluate([finding()], primera.state, at("24", "18"));
  assert.equal(enseguida.send.length, 0, "medium enfría 24 h");
  const pasado = evaluate([finding()], primera.state, at("25", "13"));
  assert.equal(pasado.send.length, 1);
  assert.equal(pasado.send[0].kind, "recordatorio");
});

test("si el problema empeora, se avisa en el acto aunque no haya pasado el enfriamiento", () => {
  const a = evaluate([finding({ level: 1 })], emptyState(), at("24", "12"));
  const b = evaluate([finding({ level: 2, severity: "high" })], a.state, at("24", "13"));
  assert.equal(b.send.length, 1);
  assert.equal(b.send[0].kind, "sube");
});

test("cuando el problema desaparece se avisa 'resuelto' una sola vez", () => {
  const a = evaluate([finding()], emptyState(), at("24", "12"));
  const b = evaluate([], a.state, at("24", "18"));
  assert.deepEqual(b.resolved.map((r) => r.key), ["horarios:x"]);
  assert.equal(evaluate([], b.state, at("25", "18")).resolved.length, 0);
  // Si vuelve a aparecer, es un aviso nuevo.
  assert.equal(evaluate([finding()], b.state, at("26", "12")).send[0].kind, "nuevo");
});

test("una falla que pide dos corridas seguidas no avisa la primera vez, y si se cura entre medio, empieza de cero", () => {
  const f = finding({ key: "fuente:Speedhive", consecutive: 2, severity: "medium" });
  const uno = evaluate([f], emptyState(), at("24", "06"));
  assert.equal(uno.send.length, 0);
  const curada = evaluate([], uno.state, at("24", "12"));
  assert.equal(evaluate([f], curada.state, at("24", "18")).send.length, 0, "vuelve a contar desde uno");
  assert.equal(evaluate([f], uno.state, at("24", "18")).send.length, 1, "dos seguidas: avisa");
});

test("los avisos salen primero los graves, después lo argentino y después lo más cercano", () => {
  const out = evaluate(
    [finding({ key: "a", severity: "medium", tier: 3 }), finding({ key: "b", severity: "critical", tier: 3 }), finding({ key: "c", severity: "medium", tier: 1, hours: 50 }), finding({ key: "d", severity: "medium", tier: 1, hours: 10 })],
    emptyState(),
    at("24", "12"),
  );
  assert.deepEqual(out.send.map((f) => f.key), ["b", "d", "c", "a"]);
});

test("el resumen diario sale desde las 06:00 y una sola vez por día", () => {
  assert.equal(summaryDue(emptyState(), at("24", "05")), false);
  assert.equal(summaryDue(emptyState(), at("24", "06")), true);
  assert.equal(summaryDue({ lastSummary: at("24", "06") }, at("24", "12")), false);
  assert.equal(summaryDue({ lastSummary: at("24", "06") }, at("25", "07")), true);
});

// ——— Mensajes ———

test("el mensaje lleva los avisos, los resueltos y cómo pedir ayuda; sin novedades no hay mensaje", () => {
  assert.equal(renderAlerts({ send: [], resolved: [] }), null);
  const texto = renderAlerts({ send: [{ ...finding(), kind: "sube" }], resolved: [{ title: "Otra cosa" }] });
  assert.match(texto, /⏰ Faltan horarios: X ⬆️ sube de nivel/);
  assert.match(texto, /✅ Resuelto: Otra cosa/);
  assert.match(texto, /pegale este mensaje a Claude/);
});

test("un texto largo se corta en partes que entran en Telegram", () => {
  const largo = Array.from({ length: 400 }, (_, i) => `línea ${i} con bastante texto para ocupar lugar`).join("\n");
  const partes = chunk(largo);
  assert.ok(partes.length > 1);
  assert.ok(partes.every((p) => p.length <= 3800));
  assert.equal(partes.join("\n").replace(/\n+/g, "\n"), largo);
});

test("sin token no falla (queda simulado) y con token manda; el token nunca aparece en un error", async () => {
  const log = console.log;
  console.log = () => {};
  try {
    assert.equal((await sendTelegram("hola", {})).simulated, true);
  } finally {
    console.log = log;
  }
  const llamadas = [];
  const ok = await sendTelegram("hola", { token: "SECRETO", chatId: "42", fetchImpl: async (url, init) => (llamadas.push([url, JSON.parse(init.body)]), { ok: true }) });
  assert.equal(ok.sent, 1);
  assert.equal(llamadas[0][1].chat_id, "42");
  assert.equal("reply_markup" in llamadas[0][1], false, "los avisos del guardián siguen sin teclado");
  const teclado = { inline_keyboard: [[{ text: "Publicar en X", url: "https://x.com/intent/post?text=hola" }]] };
  await sendTelegram("hola", { token: "SECRETO", chatId: "42", replyMarkup: teclado, fetchImpl: async (url, init) => (llamadas.push([url, JSON.parse(init.body)]), { ok: true }) });
  assert.deepEqual(llamadas[1][1].reply_markup, teclado);
  await assert.rejects(sendTelegram("hola", { token: "SECRETO", chatId: "42", fetchImpl: async () => ({ ok: false, status: 401 }) }), (e) => !/SECRETO/.test(e.message) && /401/.test(e.message));
  await assert.rejects(sendTelegram("hola", { token: "SECRETO", chatId: "42", fetchImpl: async () => { throw new Error("fetch failed https://api.telegram.org/botSECRETO/sendMessage"); } }), (e) => !/SECRETO/.test(e.message));
});

test("sendTelegramPhoto: manda la foto con sendPhoto y el mismo botón; sin token, simula", async () => {
  const log = console.log;
  console.log = () => {};
  try {
    assert.equal((await sendTelegramPhoto("https://www.somosfierros.ar/placa/imagen", "hola", {})).simulated, true);
  } finally {
    console.log = log;
  }
  const llamadas = [];
  const teclado = { inline_keyboard: [[{ text: "Publicar en X", url: "https://x.com/intent/post?text=hola" }]] };
  const ok = await sendTelegramPhoto("https://www.somosfierros.ar/placa/imagen", "hola", {
    token: "SECRETO",
    chatId: "42",
    replyMarkup: teclado,
    fetchImpl: async (url, fetchInit) => (llamadas.push([url, JSON.parse(fetchInit.body)]), { ok: true }),
  });
  assert.equal(ok.sent, 1);
  assert.match(llamadas[0][0], /\/sendPhoto$/);
  assert.equal(llamadas[0][1].photo, "https://www.somosfierros.ar/placa/imagen");
  assert.equal(llamadas[0][1].caption, "hola");
  assert.deepEqual(llamadas[0][1].reply_markup, teclado);
});

test("sendTelegramPhoto: si sendPhoto falla, cae a sendMessage con el mismo texto", async () => {
  const llamadas = [];
  const out = await sendTelegramPhoto("https://www.somosfierros.ar/placa/imagen", "hola con enlace", {
    token: "SECRETO",
    chatId: "42",
    fetchImpl: async (url) => {
      llamadas.push(url);
      if (url.endsWith("/sendPhoto")) return { ok: false, status: 400 };
      return { ok: true };
    },
  });
  assert.equal(out.sent, 1);
  assert.equal(llamadas.length, 2);
  assert.match(llamadas[1], /\/sendMessage$/);
});

test("las fechas del TN se cruzan con Speedhive: coinciden dentro de un día o se marcan en conflicto", () => {
  const tn = (round, day) => ({ id: `tn-2026-${round}`, seriesId: "tn", round, sessions: [{ start: `${day}T12:00:00-03:00` }] });
  const events = [tn(9, "2026-09-20"), tn(10, "2026-10-11")];
  const speedhive = [
    { name: "APAT TN - FECHA 9 - RIO CUARTO", startDate: "2026-09-19T00:00:00" },
    { name: "APAT TN - FECHA 10 - X", startDate: "2026-10-18T00:00:00" },
    { name: "KARTING REGIONAL", startDate: "2026-09-19T00:00:00" },
  ];
  const conflicts = tnDateConflicts(events, speedhive);
  assert.deepEqual(Object.keys(conflicts), ["tn-2026-10"]);
  assert.match(conflicts["tn-2026-10"], /Speedhive 2026-10-18/);
  assert.equal(dateStatus(withConflicts(events, conflicts)[1]).status, "conflict");
});

test("resultados por sesión: se insiste a la media hora, sube a la hora y a las 3 horas, y no avisa de lo que no terminó", () => {
  const f1 = {
    id: "f1-2026-15",
    seriesId: "f1",
    round: 15,
    name: "GP de Azerbaiyán",
    circuit: { city: "Bakú" },
    sessions: [
      { id: "p1", kind: "practica", name: "Práctica 1", start: "2026-09-24T08:30:00Z", timeKnown: true, durationMin: 60 },
      { id: "p2", kind: "practica", name: "Práctica 2", start: "2026-09-24T12:00:00Z", timeKnown: true, durationMin: 60 },
    ],
  };
  const opts = { seriesIds: new Set(["f1"]) };
  const check = (iso) => sessionResultsMissing([f1], iso, opts);
  assert.equal(check("2026-09-24T09:40:00Z").length, 0, "la práctica 1 terminó hace 10 minutos");
  assert.equal(check("2026-09-24T10:05:00Z")[0].level, 1);
  assert.equal(check("2026-09-24T10:45:00Z")[0].level, 2);
  assert.equal(check("2026-09-24T13:00:00Z")[0].level, 3, "la práctica 1 terminó hace 3,5 horas");
  assert.match(check("2026-09-24T13:00:00Z")[0].body, /Práctica 1.*Práctica 2|Práctica 1/);
  assert.equal(sessionResultsMissing([f1], "2026-09-24T13:00:00Z", { seriesIds: new Set(["tn"]) }).length, 0);
  const done = { ...f1, sessions: f1.sessions.map((s) => ({ ...s, results: [{ pos: 1, driver: "X", team: "", gap: "" }] })) };
  assert.equal(sessionResultsMissing([done], "2026-09-24T13:00:00Z", opts).length, 0);
});

// ——— Fin de semana de la ACTC sin ningún horario ———

// Rosario, 26 y 27/09/2026: dos categorías sin un solo horario (todo en el relleno de las 12:00).
const rosario = (over = {}) => ({
  id: "tcm-2026-9",
  seriesId: "tc-mouras",
  round: 9,
  name: "Fecha 9 · Rosario",
  circuit: { name: "Juan Manuel Fangio", city: "Rosario" },
  source: "ACTC (calendario)",
  sessions: [
    { id: "q", kind: "clasificacion", name: "Clasificación", start: "2026-09-26T12:00:00-03:00", timeKnown: false, durationMin: 30 },
    { id: "f", kind: "final", name: "Final", start: "2026-09-27T12:00:00-03:00", timeKnown: false, durationMin: 35 },
  ],
  ...over,
});

test("el viernes avisa si una fecha ACTC del fin de semana no tiene ningún horario", () => {
  assert.equal(weekendWithoutAnyHour([rosario()], at("24", "20")).length, 0, "el jueves todavía no");
  const fri = weekendWithoutAnyHour([rosario()], at("25", "00"), { tierOf });
  assert.equal(fri.length, 1);
  assert.equal(fri[0].key, "sin-horarios:tcm-2026-9");
  assert.equal(fri[0].severity, "critical");
  assert.equal(fri[0].tier, 1);
  assert.match(fri[0].title, /Rosario/);
  assert.equal(weekendWithoutAnyHour([rosario()], at("25", "19")).length, 1);
  const sat = weekendWithoutAnyHour([rosario()], at("26", "09"));
  assert.equal(sat[0].level, 4, "el sábado ya es HOY");
  assert.match(sat[0].title, /HOY/);
  assert.equal(weekendWithoutAnyHour([rosario()], at("27", "23")).length, 1, "sigue hasta que termina el domingo");
  assert.equal(weekendWithoutAnyHour([rosario()], "2026-09-28T00:30:00-03:00").length, 0, "el lunes ya no");
});

test("no avisa si hay al menos un horario conocido, ni para categorías que no son de la ACTC, ni si la fecha no es de fin de semana", () => {
  const conUna = rosario({ sessions: rosario().sessions.map((s) => (s.id === "f" ? { ...s, start: "2026-09-27T14:10:00-03:00", timeKnown: true } : s)) });
  assert.equal(weekendWithoutAnyHour([conUna], at("25", "12")).length, 0);
  assert.equal(weekendWithoutAnyHour([rosario({ seriesId: "tn" })], at("25", "12")).length, 0);
  const martes = rosario({ sessions: [{ id: "x", kind: "final", name: "Final", start: "2026-09-29T12:00:00-03:00", timeKnown: false, durationMin: 35 }] });
  assert.equal(weekendWithoutAnyHour([martes], at("25", "12")).length, 0);
});

// ——— Cargas manuales descartadas ———

test("una carga manual que no se puede mostrar queda como hallazgo, no en silencio", () => {
  const rows = [{ pos: 1, driver: "A", team: "", gap: "" }];
  const fuente = sunday({ sessions: [{ id: "u", kind: "serie", name: "Serie única", start: "2026-09-27T12:00:00-03:00", timeKnown: true, durationMin: 20, results: rows }] });
  const manual = { events: { [fuente.id]: { sessions: [{ kind: "serie", name: "Serie 2", start: "2026-09-27T12:00:00-03:00", timeKnown: true, durationMin: 20 }] } } };
  const out = manualDiscarded([fuente], manual);
  assert.equal(out.length, 1);
  assert.match(out[0].title, /Serie 2/);
  assert.equal(out[0].severity, "info");
  // El caso real: la Serie 2 manual no se descarta aunque la fuente ya tenga resultados de la Serie 1.
  const conSerie1 = sunday({ sessions: [{ id: "s1", kind: "serie", name: "Serie 1", start: "2026-09-27T12:00:00-03:00", timeKnown: false, durationMin: 20, results: rows }] });
  assert.equal(manualDiscarded([conSerie1], manual).length, 0);
  assert.equal(visibleEvents([conSerie1], manual)[0].sessions.length, 2);
});
