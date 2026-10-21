import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { buildDriverIndex } from "./driver-index.mjs";
import { formulaNacionalSeason, parseCalendar, parseCircuit, parseHeading, parsePilots, parseStandings, parseTiempos, plain, properName, resolveDay, resultRows } from "./formula-nacional.mjs";
import { protectSeason, protectStandings } from "./guard.mjs";

// Fixtures: HTML real de formulanacional.com.ar bajado el 21/10/2026 (sin menú ni scripts). La página de tiempos de la fecha 5 (Toay) trae
// tres fechas mal escritas por el sitio ("7 de agosto de 2016", "8 de noviembre 2025"); la de la fecha 8 todavía no tiene datos.
const read = (name) => fs.readFileSync(new URL(`./fixtures/formula-nacional/${name}`, import.meta.url), "utf8");
const BASE = "https://formulanacional.com.ar";
const PAGES = {
  [`${BASE}/carreras.php?evento=calendario`]: "calendario.html",
  [`${BASE}/equipos.php?accion=pilotos`]: "pilotos.html",
  [`${BASE}/estadisticas.php?accion=posiciones`]: "posiciones.html",
  [`${BASE}/estadisticas.php?accion=por_fecha`]: "por-fecha.html",
  [`${BASE}/carreras.php?accion=tiempos&id=547`]: "tiempos-1-el-zonda.html",
  [`${BASE}/carreras.php?accion=tiempos&id=548`]: "tiempos-2-concordia.html",
  [`${BASE}/carreras.php?accion=tiempos&id=552`]: "tiempos-5-toay.html",
  [`${BASE}/carreras.php?accion=tiempos&id=553`]: "tiempos-8-general-roca.html",
  [`${BASE}/carreras.php?accion=historial&id=547`]: "historial-1-el-zonda.html",
  [`${BASE}/carreras.php?accion=historial&id=548`]: "historial-2-concordia.html",
  [`${BASE}/carreras.php?accion=historial&id=549`]: "historial-3-toay.html",
  [`${BASE}/carreras.php?accion=historial&id=551`]: "historial-6-junin.html",
  [`${BASE}/carreras.php?accion=historial&id=552`]: "historial-3-toay.html",
  [`${BASE}/carreras.php?accion=historial&id=554`]: "historial-3-toay.html",
  [`${BASE}/carreras.php?accion=historial&id=553`]: "historial-8-general-roca.html",
  [`${BASE}/carreras.php?accion=historial&id=555`]: "historial-9-a-confirmar.html",
};

/** `io` falso: responde desde los fixtures (lo que no está, cae como una página sin datos) y anota qué se pidió. */
function fakeIo({ fail = [], only } = {}) {
  const calls = [];
  const sleeps = [];
  return {
    calls,
    sleeps,
    sleep: async (ms) => void sleeps.push(ms),
    text: async (url) => {
      calls.push(url);
      if (fail.some((f) => url.includes(f))) throw new Error(`falla ${url}`);
      if (only && !only.some((o) => url.includes(o)) && /tiempos|historial/.test(url)) throw new Error(`404 ${url}`);
      const file = PAGES[url];
      if (!file) throw new Error(`sin fixture para ${url}`);
      return read(file);
    },
  };
}

const NOW = new Date("2026-10-21T12:00:00-03:00");
const END = { 1: { y: 2026, m: 4, d: 12 }, 2: { y: 2026, m: 5, d: 3 }, 5: { y: 2026, m: 8, d: 9 }, 8: { y: 2026, m: 11, d: 1 } };

test("el calendario trae las diez fechas con su último día y el lugar tal cual lo escribe el sitio", () => {
  const cal = parseCalendar(read("calendario.html"));
  assert.equal(cal.length, 10);
  assert.deepEqual(cal.map((c) => [c.round, c.end.d, c.end.m]), [[1, 12, 4], [2, 3, 5], [3, 7, 6], [4, 28, 6], [5, 9, 8], [6, 6, 9], [7, 11, 10], [8, 1, 11], [9, 22, 11], [10, 13, 12]]);
  assert.equal(cal[0].place, "El Zonda Eduardo Copello");
  assert.equal(cal[2].place, "La Pampa");
  assert.equal(cal[3].place, "San Nicolás");
  assert.equal(cal[5].place, "Junín");
  assert.equal(cal[8].place, "A confirmar");
  assert.equal(cal[1].siteId, "548");
});

test("el circuito sale de la página de historial; una sede a confirmar no inventa nada", () => {
  assert.deepEqual(parseCircuit(read("historial-2-concordia.html")), { name: "Autódromo Concordia", city: "Concordia", province: "Entre Ríos" });
  assert.deepEqual(parseCircuit(read("historial-3-toay.html")), { name: "Autódromo de Toay", city: "Toay", province: "La Pampa" });
  assert.deepEqual(parseCircuit(read("historial-8-general-roca.html")), { name: "Autódromo Parque Ciudad Gral. Roca", city: "General Roca", province: "Río Negro" });
  assert.equal(parseCircuit(read("historial-9-a-confirmar.html")), null);
});

test("los pilotos traen equipo y número de auto; los nombres pierden las mayúsculas del apellido", () => {
  const pilots = parsePilots(read("pilotos.html"));
  assert.equal(pilots.size, 26);
  const campra = [...pilots.values()].find((p) => p.name === "Tomás Campra");
  assert.deepEqual(campra, { name: "Tomás Campra", number: "2", team: "Giavedoni Motor Sport" });
  assert.equal(properName("Daniella ORÉ"), "Daniella Oré");
  assert.equal(properName("Juan Cruz FARIAS"), "Juan Cruz Farias");
  assert.equal(plain("Aut&oacute;dromo&nbsp;N&ordm; 1 <b>x</b>"), "Autódromo Nº 1 x");
});

test("el campeonato de pilotos: posición, piloto y total; la página fecha por fecha agrega los puntos de cada una", () => {
  const rows = parseStandings(read("posiciones.html"));
  assert.deepEqual(rows.slice(0, 3).map((r) => [r.pos, r.driver, r.points]), [[1, "Tomás Campra", 269], [2, "Renzo Sabatini", 161], [3, "Bautista Faccioli", 139]]);
  assert.deepEqual(rows[0].perRound, []);
  const porFecha = parseStandings(read("por-fecha.html"));
  assert.deepEqual(porFecha[0].perRound.slice(0, 8), [47, 51, 9, 42, 32, 51, 37, 0]);
  // El total de la tabla es la suma de sus fechas (sin descartes) para todos los pilotos.
  for (const r of porFecha) assert.equal(r.perRound.reduce((a, b) => a + b, 0), r.points, r.driver);
});

test("el encabezado de una sesión se lee con día, hora de inicio y de fin", () => {
  assert.deepEqual(parseHeading("Carrera&nbsp;1 Sábado 2 de mayo de 2026, 15:10 a 15:30hs,15 min. + 1 vta"), {
    title: "Carrera 1", weekday: "sabado", day: 2, month: 5, year: 2026, start: { h: 15, min: 10 }, end: { h: 15, min: 30 },
  });
  assert.equal(parseHeading("Practica Oficial 1 (todos juntos)&nbsp;Viernes 1 de mayo de 2026: 16:50 a 17:20hs").title, "Practica Oficial 1 (todos juntos)");
  assert.equal(parseHeading("Gral. Entrenamientos Sábado 11 de abril de 2026, 12:35hs").end, null);
});

test("un mes o un año mal escrito no mueve la sesión: manda el día del mes junto con el día de la semana", () => {
  const end = { y: 2026, m: 8, d: 9 };
  const bad = parseHeading("Clasificación Sábado 8 de noviembre 2025, 11:40 a 11:55hs.");
  assert.deepEqual(resolveDay(bad, end), { day: { y: 2026, m: 8, d: 8 }, repaired: true });
  assert.deepEqual(resolveDay(parseHeading("Carrera Sábado 8 de agosto de 2026, 15:40 a 16:00hs."), end), { day: { y: 2026, m: 8, d: 8 }, repaired: false });
  // Un día que no cae en el fin de semana, o cuyo día de la semana no coincide, no se ubica: no se inventa.
  assert.equal(resolveDay(parseHeading("Carrera Sábado 20 de agosto de 2026, 15:40 a 16:00hs."), end), null);
  assert.equal(resolveDay(parseHeading("Carrera Lunes 8 de agosto de 2026, 15:40 a 16:00hs."), end), null);
});

test("fecha 2 (Concordia): dos carreras, con hora, vueltas, diferencias y grilla; las prácticas generales no se repiten", () => {
  const pilots = parsePilots(read("pilotos.html"));
  const t = parseTiempos(read("tiempos-2-concordia.html"), END[2]);
  assert.deepEqual(t.problems, []);
  assert.deepEqual(t.repairs, []);
  assert.deepEqual(t.sessions.map((s) => [s.slug, s.name, s.kind]), [
    ["p1", "Práctica oficial 1", "practica"],
    ["p2", "Práctica oficial 2", "practica"],
    ["q", "Clasificación", "clasificacion"],
    ["r1", "Carrera 1", "carrera"],
    ["r2", "Carrera 2", "carrera"],
  ]);
  const [, , q, r1, r2] = t.sessions;
  assert.equal(r1.start, "2026-05-02T15:10:00-03:00");
  assert.equal(r1.durationMin, 20);
  assert.equal(r2.start, "2026-05-03T11:45:00-03:00");

  const rows1 = resultRows(r1, pilots);
  assert.equal(rows1.length, 8);
  assert.deepEqual(rows1.slice(0, 3).map((r) => [r.pos, r.driver, r.gap]), [[1, "Tomás Campra", "16:29.230"], [2, "Renzo Sabatini", "+0.233"], [3, "Alejandro Guttlein", "+9.720"]]);
  assert.equal(rows1[0].team, "Giavedoni Motor Sport");
  assert.equal(rows1[0].number, "2");
  assert.equal(rows1[0].grid, 6);
  // Daniella Oré da 10 vueltas contra 12 del ganador: se muestra la diferencia en vueltas, no el 0.000 de la tabla.
  assert.equal(rows1[7].gap, "+2 vueltas");
  assert.equal(rows1[7].laps, 10);

  assert.equal(resultRows(r2, pilots)[0].driver, "Tomás Campra");
  assert.equal(resultRows(q, pilots)[0].gap, "1:16.000");
  assert.equal(resultRows(q, pilots)[1].gap, "+0.336");
});

test("fecha 1 (El Zonda): una sola carrera se llama 'Carrera' y es la del domingo", () => {
  const t = parseTiempos(read("tiempos-1-el-zonda.html"), END[1]);
  assert.deepEqual(t.sessions.map((s) => s.slug), ["tl", "p1", "p2", "q", "r"]);
  assert.equal(t.sessions[0].name, "Tanda libre");
  assert.equal(t.sessions[0].start, "2026-04-10T17:20:00-03:00");
  assert.equal(t.sessions.at(-1).name, "Carrera");
  assert.equal(t.sessions.at(-1).start, "2026-04-12T10:55:00-03:00");
});

test("fecha 5 (Toay): las tres fechas mal escritas por el sitio se corrigen por el día de la semana y quedan anotadas", () => {
  const t = parseTiempos(read("tiempos-5-toay.html"), END[5]);
  assert.deepEqual(t.problems, []);
  assert.equal(t.repairs.length, 3);
  assert.match(t.repairs.join("|"), /noviembre 2025.*sábado 8\/8/);
  const starts = Object.fromEntries(t.sessions.map((s) => [s.slug, s.start]));
  assert.equal(starts.tl, "2026-08-07T15:40:00-03:00");
  assert.equal(starts.q, "2026-08-08T11:40:00-03:00");
  assert.equal(starts.r2, "2026-08-09T10:55:00-03:00");
});

test("una fecha sin datos de tiempos no tiene sesiones", () => {
  const t = parseTiempos(read("tiempos-8-general-roca.html"), END[8]);
  assert.deepEqual(t.sessions, []);
  assert.deepEqual(t.problems, []);
});

test("la temporada: calendario completo, horarios reales, ganadores y campeonato", async () => {
  const io = fakeIo();
  const { events, standings, meta } = await formulaNacionalSeason(io, undefined, { windowDays: 400, delayMs: 7, now: NOW });
  assert.equal(events.length, 10);
  assert.deepEqual(events.map((e) => e.name), ["Fecha 1 · San Juan", "Fecha 2 · Concordia", "Fecha 3 · Toay", "Fecha 4 · San Nicolás", "Fecha 5 · Toay", "Fecha 6 · Junín", "Fecha 7 · Toay", "Fecha 8 · General Roca", "Fecha 9 · A confirmar", "Fecha 10 · A confirmar"]);
  assert.ok(events.every((e) => e.seriesId === "formula-nacional" && e.id.startsWith("formula-nacional-2026-")));

  // Concordia: Campra ganó las dos carreras; el circuito y la provincia salen del historial.
  const concordia = events[1];
  assert.deepEqual(concordia.circuit, { name: "Autódromo Concordia", city: "Concordia", country: "Argentina", flag: "AR", province: "Entre Ríos" });
  const races = concordia.sessions.filter((s) => s.kind === "carrera");
  assert.deepEqual(races.map((s) => s.results[0].driver), ["Tomás Campra", "Tomás Campra"]);
  assert.ok(concordia.sessions.every((s) => s.timeKnown === true));
  assert.equal(races[0].resultsSource.url, `${BASE}/carreras.php?accion=tiempos&id=548`);

  // El historial escribe "Lugar Junin" sin tilde: el nombre de la fecha y de la ciudad usan el del calendario.
  assert.equal(events[5].circuit.city, "Junín");
  assert.equal(events[5].circuit.name, "Autódromo Eusebio Marcilla");

  // Toay (fecha 5): Sabatini ganó la carrera 1.
  assert.equal(events[4].sessions.find((s) => s.name === "Carrera 1").results[0].driver, "Renzo Sabatini");
  assert.equal(events[4].circuit.name, "Autódromo de Toay");

  // General Roca (31/10 y 1/11) todavía sin sesiones publicadas: formato fijo del finde, cada sesión en su día (sábado / domingo) y sin hora.
  assert.deepEqual(events[7].sessions.map((s) => [s.name, s.start.slice(0, 10), s.timeKnown]), [
    ["Práctica oficial 1", "2026-10-31", false], ["Práctica oficial 2", "2026-10-31", false], ["Clasificación", "2026-10-31", false],
    ["Carrera 1", "2026-10-31", false], ["Carrera 2", "2026-11-01", false],
  ]);
  assert.equal(events[7].circuit.name, "Autódromo Parque Ciudad Gral. Roca");
  // Las dos últimas fechas siguen sin sede.
  assert.equal(events[8].circuit.name, "A confirmar");
  assert.equal(events[9].sessions.at(-1).start, "2026-12-13T12:00:00-03:00");
  assert.equal(events[9].sessions[0].start.slice(0, 10), "2026-12-12");

  const rows = standings["formula-nacional"];
  assert.deepEqual(rows[0], { pos: 1, driver: "Tomás Campra", team: "Giavedoni Motor Sport", points: 269 });
  assert.equal(meta["formula-nacional"].standingsAsOfRound, 7);
  assert.equal(meta["formula-nacional"].standingsLabel, "Pilotos");
  assert.match(meta["formula-nacional"].notes.join("|"), /Fecha 5/);
  assert.deepEqual(meta.formulaNacional.errors.filter((e) => !/404|sin fixture/.test(e)), []);
  assert.ok(io.sleeps.length >= 5 && io.sleeps.every((ms) => ms === 7), "pausa entre pedidos");
});

test("una fecha vieja que ya tiene resultados no se vuelve a pedir; las recientes sí", async () => {
  const first = await formulaNacionalSeason(fakeIo(), undefined, { windowDays: 400, delayMs: 0, now: NOW });
  const io = fakeIo();
  const again = await formulaNacionalSeason(io, { events: first.events }, { windowDays: 21, delayMs: 0, now: NOW });
  const asked = io.calls.filter((u) => /tiempos/.test(u)).map((u) => u.match(/id=(\d+)/)[1]);
  // Con ventana de 21 días vuelven a pedirse las fechas de las últimas semanas y las que vienen, y las que nunca tuvieron resultados; no las cerradas.
  assert.ok(["553", "554", "555", "556"].every((id) => asked.includes(id)));
  assert.ok(!asked.includes("547") && !asked.includes("548") && !asked.includes("552"), "El Zonda, Concordia y Toay (fecha 5) ya están cerradas");
  assert.deepEqual(again.events[1], first.events[1]);
});

test("si la página de tiempos falla, la fecha conserva lo que ya tenía y la falla queda anotada", async () => {
  const first = await formulaNacionalSeason(fakeIo(), undefined, { windowDays: 400, delayMs: 0, now: NOW });
  const io = fakeIo({ fail: ["tiempos&id=552"] });
  const again = await formulaNacionalSeason(io, { events: first.events }, { windowDays: 400, delayMs: 0, now: NOW });
  assert.deepEqual(again.events[4].sessions, first.events[4].sessions);
  assert.match(again.meta.formulaNacional.errors.join("|"), /fecha 5.*falla/);
});

test("el calendario vacío (otro HTML, bloqueo) corta la fuente en vez de borrar la categoría", async () => {
  const io = { ...fakeIo(), text: async () => "<html><title>Just a moment...</title></html>" };
  await assert.rejects(() => formulaNacionalSeason(io, undefined, { delayMs: 0 }), /calendario no trajo fechas.*Just a moment/);
});

test("la red de seguridad: si hoy el sitio devuelve menos, la temporada no pierde fechas ni resultados", async () => {
  const full = await formulaNacionalSeason(fakeIo(), undefined, { windowDays: 400, delayMs: 0, now: NOW });
  // Hoy el sitio responde con la mitad del calendario y sin tiempos.
  const poorIo = { ...fakeIo(), text: async (url) => (/calendario/.test(url) ? read("calendario.html").split('class="box-fechas"').slice(0, 4).join('class="box-fechas"') : read(PAGES[url] ?? "pilotos.html")) };
  const poor = await formulaNacionalSeason(poorIo, undefined, { windowDays: 400, delayMs: 0, now: NOW }).catch(() => ({ events: [], standings: { "formula-nacional": [] }, meta: {} }));
  const guarded = protectSeason(poor.events, { events: full.events });
  assert.equal(guarded.events.filter((e) => e.seriesId === "formula-nacional").length, 10);
  assert.ok(guarded.events.find((e) => e.round === 2).sessions.some((s) => s.results?.length));
  const standings = { "formula-nacional": [] };
  protectStandings(standings, {}, { standings: full.standings, meta: full.meta });
  assert.equal(standings["formula-nacional"][0].driver, "Tomás Campra");
});

test("los pilotos de la Fórmula Nacional entran al índice con un perfil, y el que ya corría en otra categoría se une al mismo", async () => {
  const { events } = await formulaNacionalSeason(fakeIo(), undefined, { windowDays: 400, delayMs: 0, now: NOW });
  const tcEvent = {
    id: "tc-2026-1", seriesId: "tc", sessions: [{ id: "x", kind: "final", name: "Final", start: "2026-03-01T12:00:00-03:00", results: [{ pos: 1, driver: "Campra Tomas", team: "Ford", number: "9", gap: "" }] }],
  };
  const index = buildDriverIndex({ events: [...events, tcEvent], standings: {}, meta: {} });
  const campra = index.drivers.filter((d) => d.key === "campra tomas");
  assert.equal(campra.length, 1, "un solo perfil");
  assert.deepEqual(campra[0].series.sort(), ["formula-nacional", "tc"]);
  assert.equal(campra[0].numbers["formula-nacional"], "2");
  assert.equal(campra[0].teams["formula-nacional"], "Giavedoni Motor Sport");
  assert.equal(campra[0].name, "Tomás Campra");
  assert.ok(index.drivers.some((d) => d.name === "Renzo Sabatini" && d.series.includes("formula-nacional")));
});
