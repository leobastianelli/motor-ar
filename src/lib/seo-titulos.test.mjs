import assert from "node:assert/strict";
import { test } from "node:test";
import { momentoDeCategoria, momentoDeEvento, momentoDePiloto } from "./momento.mjs";
import { descripcionHorario, descripcionMomento, descripcionPiloto, DESCRIPCION_MAX, TITULO_MAX, tituloCategoria, tituloEvento, tituloHorario, tituloPiloto } from "./seo-titulos.mjs";
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
const F1 = { name: "Fórmula 1", short: "F1" };
const TC = { name: "Turismo Carretera", short: "TC" };
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

test("horarios: responde la búsqueda con la sigla, la fecha y la hora argentina, y 'hoy' sólo si hay sesión hoy", () => {
  assert.equal(tituloHorario(F1, cat(MIERCOLES), MIERCOLES), "Horario F1: GP de Azerbaiyán, en hora argentina");
  assert.equal(tituloHorario(F1, cat(SABADO), SABADO), "Horario F1 hoy: GP de Azerbaiyán, en hora argentina");
  assert.equal(tituloHorario(F1, cat(MARTES, [madrid(ganaAntonelli), baku()]), MARTES), "Horarios F1 en Argentina: GP de Azerbaiyán");
  // Después de la carrera, el título mira la próxima fecha, no la que terminó.
  const lunes = tituloHorario(F1, cat(LUNES, conCarrera), LUNES);
  assert.doesNotMatch(lunes, /hoy|Azerbaiyán/);
  assert.equal(lunes, "Horarios F1 en Argentina: cada sesión y dónde verla");
});

test("horarios: nombre largo (GT World Challenge) entra en el largo y no cambia de categoría", () => {
  const GT = { name: "GT World Challenge Europe", short: "GTWC" };
  const m = cat(MIERCOLES);
  const t = tituloHorario(GT, m, MIERCOLES);
  assert.ok(t.length <= TITULO_MAX, t);
  assert.match(t, /^Horarios? GT World Challenge Europe/);
});

test("horarios: ningún título pasa el largo en los cuatro momentos", () => {
  for (const [now, ev] of [[MARTES, [madrid(ganaAntonelli), baku()]], [MIERCOLES], [SABADO], [LUNES, conCarrera]]) {
    for (const s of [F1, TC, { name: "FIA WEC", short: "WEC" }, { name: "GT World Challenge Europe", short: "GTWC" }]) {
      const t = tituloHorario(s, cat(now, ev), now);
      assert.ok(t.length <= TITULO_MAX, t);
    }
  }
});

test("horarios: la descripción da la hora de la carrera en hora argentina, sin inventar", () => {
  const d = descripcionHorario(F1, cat(MIERCOLES), { broadcasts: [{ name: "Fox Sports" }, { name: "Disney+" }] });
  assert.match(d, /^Horarios de Fórmula 1 en Argentina\./);
  assert.match(d, /Carrera el sábado 26 a las 08:00 \(hora argentina\)/);
  assert.match(d, /Dónde verlo: Fox Sports, Disney\+/);
  assert.ok(d.length <= DESCRIPCION_MAX, d);
});

test("horarios: sin horario confirmado dice 'a confirmar' y no pone hora", () => {
  const sinHora = baku();
  for (const s of sinHora.sessions) s.timeKnown = false;
  const d = descripcionHorario(F1, cat(MIERCOLES, [madrid(ganaAntonelli), sinHora]));
  assert.match(d, /horario a confirmar/);
  assert.doesNotMatch(d, /\d\d:\d\d|hora argentina\)/);
});

test("horarios: sin nada por venir queda el texto de siempre", () => {
  const m = cat(LUNES, [madrid(ganaAntonelli)]);
  assert.equal(descripcionHorario(F1, m, { fallback: "FALLBACK" }), "FALLBACK");
});

test("horarios: fecha nacional sin GP nombra la ciudad, sin 'en' colgado", () => {
  const tc = { id: "tc-1", seriesId: "tc", name: "Fecha 11 · Rosario", circuit: { city: "Rosario" }, broadcasts: [], sessions: [ses("f", "Final", "final", "2026-10-25T18:00:00Z")] };
  const now = "2026-10-20T15:00:00Z";
  assert.equal(tituloHorario(TC, momentoDeCategoria([tc], now, opts), now), "Horarios TC en Argentina: próxima fecha, Rosario");
});
