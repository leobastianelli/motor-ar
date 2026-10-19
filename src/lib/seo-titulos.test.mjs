import assert from "node:assert/strict";
import { test } from "node:test";
import { momentoDeCategoria, momentoDeEvento, momentoDePiloto } from "./momento.mjs";
import { descripcionHorario, descripcionMomento, descripcionPiloto, DESCRIPCION_MAX, TITULO_MAX, tituloCategoria, tituloEvento, diasDe, tituloHorario, tituloPiloto } from "./seo-titulos.mjs";
import { driverKey } from "./sources/driver-index.mjs";

const row = (pos, driver, extra = {}) => ({ pos, driver, team: "X", gap: "", ...extra });
const ses = (id, name, kind, start, extra = {}) => ({ id, name, kind, start, durationMin: 60, ...extra });
const colapinto = (pos, extra) => row(pos, "Franco Colapinto", { driverSlug: "franco-colapinto", ...extra });

// Baku: jueves a sábado (horas UTC; Argentina = UTC-3).
const baku = (results = {}) => ({
  id: "f1-15",
  seriesId: "f1",
  name: "GP de Azerbaiyán",
  circuit: { city: "Baku" },
  broadcasts: [],
  sessions: [
    ses("p1", "Práctica 1", "practica", "2026-09-24T08:30:00Z", { results: results.p1 }),
    ses("p2", "Práctica 2", "practica", "2026-09-24T12:00:00Z", { results: results.p2 }),
    ses("p3", "Práctica 3", "practica", "2026-09-25T08:30:00Z"),
    ses("q", "Clasificación", "clasificacion", "2026-09-25T12:00:00Z"),
    ses("r", "Carrera", "carrera", "2026-09-26T11:00:00Z", { durationMin: 120, results: results.r }),
  ],
});
const madrid = (results) => ({
  id: "f1-14",
  seriesId: "f1",
  name: "GP de España",
  circuit: { city: "Madrid" },
  broadcasts: [],
  sessions: [ses("m-r", "Carrera", "carrera", "2026-09-13T13:00:00Z", { durationMin: 120, results })],
});
const F1 = { id: "f1", name: "Fórmula 1", short: "F1", scope: "internacional" };
const TC = { id: "tc", name: "Turismo Carretera", short: "TC", scope: "nacional" };
const opts = { argentineSlugs: ["franco-colapinto"] };
const keys = [driverKey("Franco Colapinto")];
const ganaAntonelli = [row(1, "Kimi Antonelli")];
const conP2 = { p1: [row(1, "George Russell"), colapinto(18)], p2: [row(1, "George Russell"), colapinto(11)] };
const carrera = [row(1, "Max Verstappen"), colapinto(9)];

// Los cuatro momentos que pide el plan.
const MARTES = "2026-09-18T15:00:00Z"; // entre semana: la fecha anterior ya pasó hace más de 72 h y la próxima falta más de 72 h
const JUEVES = "2026-09-24T14:00:00Z"; // P1 y P2 hechas, quedan tres sesiones
const MIERCOLES = "2026-09-23T15:00:00Z"; // antes de la primera sesión (Baku empieza el jueves)
const SABADO = "2026-09-26T05:00:00Z"; // el día de la carrera
const LUNES = "2026-09-28T15:00:00Z";

const cat = (now, events = [madrid(ganaAntonelli), baku(conP2)]) => momentoDeCategoria(events, now, opts);
const conCarrera = [madrid(ganaAntonelli), baku({ ...conP2, r: carrera })];

test("categoría: martes, viernes, sábado y lunes cambian el título", () => {
  assert.equal(tituloCategoria(F1, 2026, cat(MARTES, [madrid(ganaAntonelli), baku()]), MARTES), "Fórmula 1 2026: horarios, resultados y campeonato");
  assert.equal(tituloCategoria(F1, 2026, cat(MIERCOLES), MIERCOLES), "Fórmula 1: GP de Azerbaiyán, horarios y resultados");
  assert.match(tituloCategoria(F1, 2026, cat(SABADO), SABADO), /^Fórmula 1 hoy: GP de Azerbaiyán/);
  assert.equal(tituloCategoria(F1, 2026, cat(LUNES, conCarrera), LUNES), "Fórmula 1: resultados del GP de Azerbaiyán y campeonato");
});

test('"hoy" y "en vivo" sólo si es cierto', () => {
  assert.doesNotMatch(tituloCategoria(F1, 2026, cat(MIERCOLES), MIERCOLES), /hoy|en vivo/);
  assert.doesNotMatch(tituloCategoria(F1, 2026, cat(MARTES), MARTES), /hoy|en vivo/);
  const vivo = "2026-09-24T08:45:00Z";
  assert.match(tituloCategoria(F1, 2026, cat(vivo), vivo), /en vivo/);
});

test("categoría nacional: nombra el lugar", () => {
  const tc = { id: "tc-6", seriesId: "tc", name: "Fecha 6 · Concepción Del Uruguay", circuit: { city: "Concepción del Uruguay" }, broadcasts: [], sessions: [ses("c", "Final", "final", "2026-09-27T17:00:00Z")] };
  const now = "2026-09-26T12:00:00Z";
  const t = tituloCategoria(TC, 2026, momentoDeCategoria([tc], now), now);
  assert.match(t, /^(TC|Turismo Carretera)/);
  assert.match(t, /Concepción del Uruguay/);
});

test("categoría: todos los títulos entran en el largo", () => {
  for (const now of [MARTES, MIERCOLES, SABADO, LUNES]) {
    const t = tituloCategoria(F1, 2026, cat(now), now);
    assert.ok(t.length <= TITULO_MAX, `${t} (${t.length})`);
  }
});

test("evento: horarios antes, resultados y ganador después", () => {
  assert.equal(tituloEvento(F1, baku(), 2026, momentoDeEvento(baku(conP2), MIERCOLES, opts)), "GP de Azerbaiyán 2026: horarios en Argentina y dónde ver");
  const conGanador = baku({ ...conP2, r: carrera });
  assert.equal(tituloEvento(F1, conGanador, 2026, momentoDeEvento(conGanador, LUNES, opts)), "GP de Azerbaiyán 2026: resultados y ganador");
  const vivo = "2026-09-24T08:45:00Z";
  assert.match(tituloEvento(F1, baku(), 2026, momentoDeEvento(baku(), vivo, opts)), /en vivo/);
});

test("evento nacional: nombra la categoría y el lugar", () => {
  const ev = { id: "tc-5", seriesId: "tc", name: "Fecha 5 · Calafate", circuit: { city: "Calafate" }, broadcasts: [], sessions: [ses("c", "Final", "final", "2026-09-27T17:00:00Z")] };
  assert.equal(tituloEvento(TC, ev, 2026, momentoDeEvento(ev, MARTES)), "TC en Calafate 2026: horarios en Argentina y dónde ver");
});

test("piloto: hoy y ciudad en el fin de semana, cuándo corre entre semana", () => {
  const evs = [madrid(ganaAntonelli), baku(conP2)];
  assert.equal(tituloPiloto("Franco Colapinto", 2026, momentoDePiloto(evs, JUEVES, keys), JUEVES, true), "Franco Colapinto hoy: horarios en Baku y resultados");
  assert.equal(tituloPiloto("Franco Colapinto", 2026, momentoDePiloto(evs, MIERCOLES, keys), MIERCOLES, true), "Franco Colapinto: horarios en Baku y resultados");
  assert.equal(tituloPiloto("Franco Colapinto", 2026, momentoDePiloto([madrid(ganaAntonelli), baku()], MARTES, keys), MARTES, true), "Franco Colapinto: cuándo corre, resultados y campeonato");
  assert.equal(tituloPiloto("Franco Colapinto", 2026, momentoDePiloto(conCarrera, LUNES, keys), LUNES, true), "Franco Colapinto: cuándo corre, resultados y campeonato");
  // Si no sabemos que corre esa fecha, no lo decimos.
  assert.match(tituloPiloto("Agustín Bonomo", 2026, momentoDePiloto(evs, MIERCOLES, keys), MIERCOLES, false), /cuándo corre/);
});

test("títulos: acentos, nombres largos y sin datos", () => {
  const gp = { name: "Gran Premio de la Ciudad de México", circuit: { city: "Ciudad de México" }, id: "x", seriesId: "f1", broadcasts: [], sessions: [ses("r", "Carrera", "carrera", "2026-10-25T20:00:00Z")] };
  const t = tituloEvento(F1, gp, 2026, momentoDeEvento(gp, "2026-10-01T12:00:00Z"));
  assert.match(t, /^GP de la Ciudad de México 2026/);
  assert.ok(!t.includes("undefined") && !t.includes("[object"), t);
  assert.equal(tituloPiloto("Nicolás Varrone", 2026, momentoDePiloto([], MARTES, keys), MARTES, false), "Nicolás Varrone: cuándo corre, resultados y campeonato");
  assert.equal(tituloCategoria(F1, 2026, momentoDeCategoria([], MARTES), MARTES), "Fórmula 1 2026: horarios, resultados y campeonato");
});

test("descripción de la categoría un fin de semana: carrera, resultado de la P2, argentino y dónde ver", () => {
  const d = descripcionMomento(F1, cat(JUEVES), { broadcasts: [{ name: "Fox Sports" }, { name: "Disney+" }], fallback: "x" });
  assert.match(d, /^GP de Azerbaiyán \(Baku\): Carrera el sábado 26 a las 08:00 \(hora argentina\)\./);
  assert.match(d, /Práctica 2: ganó Russell, Colapinto 11\.º\./);
  assert.match(d, /Dónde verlo: Fox Sports, Disney\+\./);
  assert.ok(d.length <= DESCRIPCION_MAX, `${d.length}`);
});

test("descripción: resultados, entre semana y sin datos", () => {
  const res = descripcionMomento(F1, cat(LUNES, conCarrera), { fallback: "x" });
  assert.match(res, /^GP de Azerbaiyán\. Carrera: ganó Verstappen, Colapinto 9\.º\./);
  const entre = descripcionMomento(F1, cat(MARTES, [madrid(ganaAntonelli), baku()]), { fallback: "x" });
  assert.match(entre, /^Fórmula 1: próxima fecha, GP de Azerbaiyán\./);
  assert.match(entre, /Última fecha, GP de España\. Carrera: ganó Antonelli\./);
  assert.equal(descripcionMomento(F1, momentoDeCategoria([], MARTES), { fallback: "Sin datos" }), "Sin datos");
});

test("descripción de una categoría nacional: el lugar en vez del nombre de la fecha, y hora a confirmar sin inventar", () => {
  const tc = (id, name, city, kind, start, results) => ({ id, seriesId: "tc", name, circuit: { city }, broadcasts: [], sessions: [ses(id, "Final", kind, start, { results, timeKnown: false })] });
  const ev = [tc("a", "Fecha 11 · San Luis", "San Luis", "final", "2026-09-20T15:00:00Z", [row(1, "Agustín Canapino")]), tc("b", "Fecha 12 · San Nicolas", "San Nicolas", "final", "2026-10-04T15:00:00Z")];
  const d = descripcionMomento(TC, momentoDeCategoria(ev, "2026-09-26T12:00:00Z"), { fallback: "x" });
  assert.match(d, /^Turismo Carretera: próxima fecha, San Nicolas. Final el domingo 4, horario a confirmar. Última fecha, San Luis. Final: ganó Canapino./);
  assert.doesNotMatch(d, /Fecha 1|·/);
});

test("descripción del piloto: su posición y lo que sigue", () => {
  const evs = [madrid(ganaAntonelli), baku(conP2)];
  const m = momentoDePiloto(evs, JUEVES, keys);
  const d = descripcionPiloto("Franco Colapinto", m, { broadcasts: [{ name: "Fox Sports" }], fallback: "Base.", corre: true });
  assert.match(d, /^Franco Colapinto en GP de Azerbaiyán: Práctica 1: Colapinto 18\.º\. Práctica 2: Colapinto 11\.º\./);
  assert.match(d, /Práctica 3 el viernes 25 a las 05:30/);
  assert.ok(d.length <= DESCRIPCION_MAX, `${d.length}`);
  assert.equal(descripcionPiloto("X", m, { fallback: "Base.", corre: false }), "Base.");
});

// ---- Página de horarios ----

const nacional = (id, name, city, sessions, round = 13) => ({ id, seriesId: id, name, round, circuit: { city }, broadcasts: [], sessions });
const ahora = "2026-10-20T15:00:00Z";
const horario = (series, events, now = ahora) => {
  const m = momentoDeCategoria(events, now, opts);
  return { titulo: tituloHorario(series, m), descripcion: descripcionHorario(series, m, { fallback: "FALLBACK" }) };
};
const rosario = nacional("tc", "Fecha 13 · Rosario", "Rosario", [ses("c", "Clasificación", "clasificacion", "2026-10-24T15:00:00Z"), ses("f", "Final", "final", "2026-10-25T18:00:00Z")]);
const TCPK = { id: "tc-pick-up", name: "TC Pick Up", short: "TC Pick Up", scope: "nacional" };
const TC2000 = { id: "tc2000", name: "TC2000", short: "TC2000", scope: "nacional" };
const CBA = { id: "cordoba-pista", name: "Córdoba Pista", short: "Córdoba Pista", scope: "zonal" };

test("días en formato argentino", () => {
  assert.equal(diasDe({ start: "2026-10-25T18:00:00Z", end: "2026-10-25T19:00:00Z" }), "25/10");
  assert.equal(diasDe({ start: "2026-10-24T15:00:00Z", end: "2026-10-25T19:00:00Z" }), "24 y 25/10");
  assert.equal(diasDe({ start: "2026-10-23T14:00:00Z", end: "2026-10-25T19:00:00Z" }), "23 al 25/10");
  assert.equal(diasDe({ start: "2026-10-30T14:00:00Z", end: "2026-11-02T14:00:00Z" }), "30/10 al 2/11");
  // una sesión que termina pasada la medianoche no suma un día
  assert.equal(diasDe({ start: "2026-10-24T15:00:00Z", end: "2026-10-25T03:20:00Z" }), "24/10");
});

test("horarios, nacional con lugar: sin 'en Argentina', con el lugar, los días y el nombre largo si entra", () => {
  const { titulo, descripcion } = horario(TC, [rosario]);
  assert.equal(titulo, "Horarios Turismo Carretera (TC) en Rosario: 24 y 25/10");
  assert.ok(titulo.length <= TITULO_MAX, titulo);
  assert.doesNotMatch(titulo + descripcion, /en Argentina/);
  assert.match(descripcion, /^Horarios de Turismo Carretera\. Próxima fecha: Rosario, 24 y 25\/10\. Final el domingo 25 a las 15:00/);
  assert.doesNotMatch(descripcion, /hora argentina/);
});

test('horarios, nacional con lugar "A CONFIRMAR": no se nombra, queda "próxima fecha" y los días', () => {
  const pk = nacional("tc-pick-up", "Fecha 9 · A CONFIRMAR", "A CONFIRMAR", [ses("s", "Clasificación", "clasificacion", "2026-11-07T15:00:00Z", { timeKnown: false }), ses("f", "Final", "final", "2026-11-08T15:00:00Z", { timeKnown: false })], 9);
  const { titulo, descripcion } = horario(TCPK, [pk]);
  assert.equal(titulo, "Horarios TC Pick Up: próxima fecha, 7 y 8/11");
  assert.doesNotMatch(titulo + descripcion, /CONFIRMAR/);
  assert.match(descripcion, /Próxima fecha: 7 y 8\/11\. Final el domingo 8, horario a confirmar\./);
  // lugar vacío: igual
  pk.circuit.city = "";
  pk.name = "Fecha 9";
  assert.equal(horario(TCPK, [pk]).titulo, "Horarios TC Pick Up: próxima fecha, 7 y 8/11");
});

test("horarios, internacional: 'en Argentina', el GP y los días", () => {
  const { titulo, descripcion } = horario(F1, [baku()], MIERCOLES);
  assert.equal(titulo, "Horarios F1 en Argentina: GP de Azerbaiyán, 24 al 26/9");
  assert.ok(titulo.length <= TITULO_MAX, titulo);
  assert.match(descripcion, /^Horarios de Fórmula 1 en Argentina\./);
  assert.match(descripcion, /Carrera el sábado 26 a las 08:00 \(hora argentina\)/);
});

test("horarios, sin próxima fecha: no inventa ninguna", () => {
  const nac = horario(TC2000, [], ahora);
  assert.equal(nac.titulo, "Horarios TC2000: calendario y dónde verlo");
  assert.equal(nac.descripcion, "FALLBACK");
  assert.equal(horario(F1, [madrid(ganaAntonelli)], LUNES).titulo, "Horarios F1 en Argentina: cada sesión y dónde verla");
});

test('horarios: nunca "hoy" ni "este finde" (la página puede servirse vieja)', () => {
  const { titulo, descripcion } = horario(F1, [madrid(ganaAntonelli), baku(conP2)], SABADO);
  assert.doesNotMatch(titulo + descripcion, /\bhoy\b|este finde|en vivo/i);
  assert.equal(titulo, "Horarios F1 en Argentina: GP de Azerbaiyán, 24 al 26/9");
});

test("horarios: no repite el día cuando el nombre de la sesión ya lo dice", () => {
  const cba = nacional("cordoba-pista", "Fecha 8 · Alta Gracia", "Alta Gracia", [ses("s", "Series y finales (domingo)", "final", "2026-10-25T15:00:00Z", { timeKnown: false })], 8);
  const { titulo, descripcion } = horario(CBA, [cba]);
  assert.equal(titulo, "Horarios Córdoba Pista en Alta Gracia: 25/10");
  assert.match(descripcion, /Series y finales \(domingo\) el 25, horario a confirmar\./);
  assert.doesNotMatch(descripcion, /domingo\)[^.]*domingo/);
});

test("horarios: ningún título pasa el largo", () => {
  for (const [now, ev] of [[MARTES, [madrid(ganaAntonelli), baku()]], [MIERCOLES], [SABADO], [LUNES, conCarrera]]) {
    for (const s of [F1, { id: "wec", name: "FIA WEC", short: "WEC", scope: "internacional" }, { id: "gt3", name: "GT World Challenge Europe", short: "GTWC", scope: "internacional" }, { id: "imsa", name: "IMSA WeatherTech SportsCar Championship", short: "IMSA", scope: "internacional" }]) {
      const t = tituloHorario(s, momentoDeCategoria(ev ?? [madrid(ganaAntonelli), baku(conP2)], now, opts));
      assert.ok(t.length <= TITULO_MAX, t);
    }
  }
});
