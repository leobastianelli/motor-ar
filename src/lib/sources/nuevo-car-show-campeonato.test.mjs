import assert from "node:assert/strict";
import { test } from "node:test";
import { fakeIo, NOW, tablaOficialHtml } from "./fixtures/nuevo-car-show/io.mjs";
import { nuevoCarShowSeason } from "./nuevo-car-show.mjs";
import { calcularClase, campeonatosDeNuevoCarShow, parseTablaOficial, puntosDeFecha, validar } from "./nuevo-car-show-campeonato.mjs";

const fila = (pos, number, driver, extra = {}) => ({ pos, number: String(number), driver, team: "", gap: "", ...extra });
const ses = (kind, name, results, start = "2026-04-19T12:00:00-03:00") => ({ id: `${kind}-${name}`, classId: "clase3", kind, name, start, results });
const evento = (round, sessions, start = "2026-04-19T12:00:00-03:00") => ({ id: `nuevo-car-show-2026-${round}`, seriesId: "nuevo-car-show", round, name: `Fecha ${round}`, sessions: sessions.map((s) => ({ ...s, start: s.start ?? start })) });

// Fecha 1 (50 % más, pero con 4 autos en la final vale la mitad), fecha 2 (siete autos: puntaje completo, con un excluido y un no clasificado).
const F1 = evento(1, [
  ses("clasificacion", "Clasificación general Clase 3", [fila(1, 20, "P20"), fila(2, 10, "P10"), fila(3, 30, "P30"), fila(4, 40, "P40")]),
  ses("final", "Final Clase 3", [fila(1, 10, "P10"), fila(2, 20, "P20"), fila(3, 30, "P30"), fila(4, 40, "P40")]),
], "2026-03-08T12:00:00-03:00");
const F2 = evento(2, [
  ses("clasificacion", "Clasificación general Clase 3", [10, 20, 30, 40, 50, 60, 70].map((n, i) => fila(i + 1, n, `P${n}`))),
  ses("serie", "Serie Clase 3", [10, 20, 30, 40, 50, 60, 70].map((n, i) => fila(i + 1, n, `P${n}`, { laps: 5 }))),
  ses("final", "Final Clase 3", [
    fila(1, 20, "P20", { laps: 12 }), fila(2, 10, "P10", { laps: 12 }), fila(3, 30, "P30", { laps: 12 }), fila(4, 40, "P40", { laps: 12 }), fila(5, 50, "P50", { laps: 12 }),
    fila(6, 60, "P60", { positionText: "EX", status: "Excluido" }), fila(7, 70, "P70", { positionText: "NC", status: "No clasificado", laps: 4 }),
  ]),
]);

test("puntos de una fecha común: asistencia, pole, series y final; excluidos y no clasificados sólo cobran la asistencia", () => {
  const p = puntosDeFecha(F2.sessions, 2);
  const pts = Object.fromEntries([...p].map(([n, d]) => [n, d.pts]));
  assert.deepEqual(pts, { 10: 32, 20: 35, 30: 26, 40: 23, 50: 20, 60: 1, 70: 1 });
  assert.equal(p.get("20").win, true);
  assert.equal(p.get("10").win, false);
});

test("primera fecha: 50 % más; con menos de 6 autos en la final, series, pole y final valen la mitad (la asistencia no)", () => {
  const pts = Object.fromEntries([...puntosDeFecha(F1.sessions, 1)].map(([n, d]) => [n, d.pts]));
  assert.deepEqual(pts, { 10: 24, 20: 21, 30: 18, 40: 16.5 });
});

test("la última fecha del calendario también vale 50 % más", () => {
  const solo = puntosDeFecha(F2.sessions, 10);
  assert.equal(solo.get("20").pts, 1.5 + 4 * 1.5 + 30 * 1.5);
});

test("tabla de una clase: suma de las fechas con final, desempate por victorias", () => {
  const calc = calcularClase([F1, F2], "clase3");
  assert.equal(calc.asOfRound, 2);
  assert.deepEqual(calc.rounds, [1, 2]);
  assert.deepEqual(calc.rows.map((r) => [r.pos, r.driver, r.points, r.wins]), [
    [1, "P10", 56, 1], // empatan en puntos y victorias: por orden alfabético
    [2, "P20", 56, 1],
    [3, "P30", 44, 0],
    [4, "P40", 39.5, 0],
    [5, "P50", 20, 0],
    [6, "P60", 1, 0],
    [7, "P70", 1, 0],
  ]);
  assert.equal(calcularClase([F1], "tc4000"), null, "otra clase sin finales");
  assert.equal(calcularClase([evento(3, [ses("final", "Final", undefined)])], "clase3"), null);
});

test("un auto de dos pilotos suma al titular (el primero) si hay un piloto de la clase con ese apellido e inicial", () => {
  const e = evento(2, [
    ses("final", "Final Clase 3", [fila(1, 4, "F. Sanchez / G. Melian", { laps: 12 }), fila(2, 77, "A. Cief / M. Vitali", { laps: 12 })]),
    ses("serie", "Serie", [fila(1, 4, "Franco Sanchez")]),
  ]);
  const calc = calcularClase([e, evento(3, [ses("final", "Final", [fila(1, 77, "Andrés Cief", { laps: 12 })])])], "clase3");
  assert.deepEqual(calc.rows.map((r) => r.driver).sort(), ["Andrés Cief", "Franco Sanchez"]);
});

// Tabla oficial que coincide con el cálculo de F1 + F2 (celdas: asistencia, clasificación, serie, final; "--" o ausentes las vacías).
const OFICIAL_OK = {
  1: [["10", "A, A", "1.5", "--", "22.5"], ["20", "B, B", "1.5", "0.75", "18.75"], ["30", "C, C", "1.5", "--", "16.5"], ["40", "D, D", "1.5", "--", "15"]],
  2: [["10", "P10", "1", "1", "5", "25"], ["20", "P20", "1", "--", "4", "30"], ["30", "P30", "1", "--", "3", "22"], ["40", "P40", "1", "--", "2", "20"], ["50", "P50", "1", "--", "1", "18"], ["60", "P60", "1", "--", "--", "--"], ["70", "P70", "1"], ["99", "SIN PUNTOS", "--", "--", "--", "--"]],
};

test("tabla oficial: el total de cada fecha es la suma de las celdas, aunque falten columnas; las fechas sin puntos no cuentan", () => {
  const o = parseTablaOficial(tablaOficialHtml(OFICIAL_OK));
  assert.deepEqual(o.fechas.map((f) => f.round), [1, 2]);
  assert.equal(o.fechas[0].totals.get("10"), 24);
  assert.equal(o.fechas[0].totals.get("20"), 21);
  assert.equal(o.fechas[1].totals.get("10"), 32);
  assert.equal(o.fechas[1].totals.get("70"), 1);
  assert.equal(o.fechas[1].totals.has("99"), false);
  assert.deepEqual(parseTablaOficial("<p>otra cosa</p>").fechas, []);
});

test("validación: coincide en todas las fechas que cubre la oficial, o no", () => {
  const calc = calcularClase([F1, F2], "clase3");
  const ok = validar(calc, parseTablaOficial(tablaOficialHtml(OFICIAL_OK)));
  assert.deepEqual([ok.ok, ok.hasta, ok.difs.length], [true, 2, 0]);
  // La oficial cubre sólo la fecha 1: alcanza con que coincida ahí.
  assert.deepEqual([validar(calc, parseTablaOficial(tablaOficialHtml({ 1: OFICIAL_OK[1] }))).ok, validar(calc, parseTablaOficial(tablaOficialHtml({ 1: OFICIAL_OK[1] }))).hasta], [true, 1]);
  // Una diferencia de medio punto en un solo piloto de una sola fecha alcanza para no coincidir.
  const mal = { ...OFICIAL_OK, 2: OFICIAL_OK[2].map((r) => (r[0] === "30" ? ["30", "P30", "1", "--", "3", "21.5"] : r)) };
  const v = validar(calc, parseTablaOficial(tablaOficialHtml(mal)));
  assert.equal(v.ok, false);
  assert.deepEqual(v.difs, [{ round: 2, number: "30", calculado: 26, oficial: 25.5 }]);
  // Un piloto que la oficial no tiene (por ejemplo un invitado) también es una diferencia.
  const sin60 = { ...OFICIAL_OK, 2: OFICIAL_OK[2].filter((r) => r[0] !== "60") };
  assert.deepEqual(validar(calc, parseTablaOficial(tablaOficialHtml(sin60))).difs.map((d) => [d.round, d.number, d.calculado, d.oficial]), [[2, "60", 1, 0]]);
  // Una tabla oficial vacía no valida nada.
  assert.equal(validar(calc, { fechas: [] }).ok, false);
});

const oficiales = (rondas) => ({ clase3: parseTablaOficial(tablaOficialHtml(rondas)) });
const ahora = new Date("2026-04-21T15:00:00Z");

test("se publica ('calculado') sólo si el cálculo coincide con la tabla oficial", () => {
  const r = campeonatosDeNuevoCarShow([F1, F2], { oficiales: oficiales(OFICIAL_OK), now: ahora });
  assert.equal(r.clase3.status, "calculado");
  assert.equal(r.clase3.asOfRound, 2);
  assert.equal(r.clase3.validatedThrough, 2);
  assert.equal(r.clase3.rows[0].points, 56);
  assert.equal(r.clase3.rows.length, 7);
  // Las clases sin resultados no inventan nada.
  assert.deepEqual(r.clase1, { status: "sin-campeonato", reason: "Todavía no hay resultados de la final de ninguna fecha." });
});

test("si no coincide: 'Sin campeonato publicado' con el motivo, sin tabla ni filas", () => {
  const mal = { ...OFICIAL_OK, 2: OFICIAL_OK[2].map((r) => (r[0] === "30" ? ["30", "P30", "1", "--", "3", "21.5"] : r)) };
  const r = campeonatosDeNuevoCarShow([F1, F2], { oficiales: oficiales(mal), now: ahora });
  assert.equal(r.clase3.status, "sin-campeonato");
  assert.equal(r.clase3.rows, undefined);
  assert.match(r.clase3.reason, /no coincide con la tabla oficial en 1 de las 2 fechas/);
  assert.match(r.clase3.reason, /auto 30 de la fecha 2: 26 contra 25,5 puntos/);
});

test("sin tabla oficial legible no se publica nada sin verificar", () => {
  assert.match(campeonatosDeNuevoCarShow([F1, F2], { oficiales: { clase3: null }, now: ahora }).clase3.reason, /No pudimos leer la tabla oficial/);
  assert.match(campeonatosDeNuevoCarShow([F1, F2], { oficiales: {}, now: ahora }).clase3.reason, /No pudimos leer la tabla oficial/);
});

test("fechas ya corridas sin resultados de la final: la tabla estaría atrasada y no se muestra", async () => {
  const { events } = await nuevoCarShowSeason(fakeIo(), undefined, { windowDays: 400, now: NOW });
  const hoy = new Date("2026-10-04T15:00:00Z"); // fecha 8 es hoy: todavía no se espera nada
  const r = campeonatosDeNuevoCarShow(events, { oficiales: oficiales(OFICIAL_OK), now: hoy });
  assert.equal(r.clase3.status, "sin-campeonato");
  assert.equal(r.clase3.reason, "Faltan los resultados de la final de las fechas 4, 5, 6 y 7 (la primera se corrió el 21/06): el sitio oficial todavía no los publicó y sin ellos la tabla estaría atrasada.");
  // Al día siguiente de una fecha todavía no es atraso (el sitio publica con demora): entra recién unos días después.
  const temprano = campeonatosDeNuevoCarShow(events, { oficiales: {}, now: new Date("2026-05-18T12:00:00Z") });
  assert.doesNotMatch(temprano.clase3.reason ?? "", /Faltan los resultados/);
  const r2 = campeonatosDeNuevoCarShow(events, { oficiales: {}, now: new Date("2026-06-25T12:00:00Z") });
  assert.match(r2.clase3.reason, /Faltan los resultados de la final de la fecha 4 \(se corrió el 21\/06\)/);
});

test("una tabla ya publicada no se reemplaza por otra con menos pilotos o de una fecha anterior", () => {
  const previa = { status: "calculado", asOfRound: 2, validatedThrough: 2, rows: Array.from({ length: 9 }, (_, i) => ({ pos: i + 1, driver: `X${i}`, team: "", points: 10 - i, wins: 0 })) };
  const r = campeonatosDeNuevoCarShow([F1, F2], { oficiales: oficiales(OFICIAL_OK), previous: { clase3: previa }, now: ahora });
  assert.equal(r.clase3, previa);
  // Pero si hoy no coincide con la oficial, lo que se muestra es la verdad de hoy, no una tabla vieja.
  const mal = { ...OFICIAL_OK, 2: [["10", "P10", "5"]] };
  assert.equal(campeonatosDeNuevoCarShow([F1, F2], { oficiales: oficiales(mal), previous: { clase3: previa }, now: ahora }).clase3.status, "sin-campeonato");
});
