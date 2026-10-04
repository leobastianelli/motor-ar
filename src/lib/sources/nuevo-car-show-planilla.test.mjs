import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { buildPdf } from "./fixtures/nuevo-car-show/pdf.mjs";
import { duracionDe, filasDe, inicioDe } from "./nuevo-car-show.mjs";
import { leerPlanilla, repararTildes } from "./nuevo-car-show-planilla.mjs";

// Planillas reales del Nuevo Car Show (PDF del cronometraje, recortadas a unas pocas filas). Se arma un PDF con cada una para probar todo el camino.
const FX = JSON.parse(fs.readFileSync(new URL("./fixtures/nuevo-car-show/planillas.json", import.meta.url), "utf8"));
const leer = (key, mode) => leerPlanilla(buildPdf(FX[key], mode));
const nombre = (raw) => raw;

test("final rectificada de la fecha 2 (Clase 3): filas, no clasificados y hora de la sesión", () => {
  const p = leer("c3-f2-final-rect");
  assert.equal(p.completa, true);
  assert.equal(p.filas.length, 18);
  assert.deepEqual(p.fechaHora, { a: 19, b: 4, anio: 2026, hh: 13, mm: 50, ampm: false });
  const [ganador, segundo] = p.filas;
  assert.deepEqual(
    { pos: ganador.posText, n: ganador.number, name: ganador.name, laps: ganador.laps, total: ganador.total, make: ganador.make },
    { pos: "1", n: "2", name: "DELLA SANTINA Nahuel", laps: "12", total: "23:11.865", make: "VW Gol Trend" },
  );
  assert.equal(segundo.gap1, "2.985");
  // Los que no cubrieron el 75 % (9 vueltas) vienen después de "No clasificado" y sin posición.
  assert.deepEqual(p.filas.filter((f) => f.nc).map((f) => f.number), ["13", "9", "777", "110", "4", "99", "11"]);
  assert.equal(p.filas.at(-1).name, "MAUGERI Andres");
  assert.equal(p.filas.at(-1).laps, "", "el que no dio ninguna vuelta no tiene vueltas ni tiempo");
});

test("la planilla de la fecha 1 (PDF Creator Pilot) usa encabezados en inglés, nombres 'NOMBRE APELLIDO' y fecha mes/día con AM/PM", () => {
  const p = leer("c3-f1-final-us", "creator");
  assert.equal(p.filas[0].name, "VALENTIN BALESTRINI");
  assert.equal(p.filas[1].gap1, "1.147");
  assert.equal(p.filas.find((f) => f.nc).gap1, "7 Laps");
  assert.deepEqual(p.fechaHora, { a: 3, b: 8, anio: 2026, hh: 13, mm: 50, ampm: true });
  // 3/8/2026 01:50 PM es el 8 de marzo (fecha 1, San Jorge), no el 3 de agosto.
  assert.equal(inicioDe(p.fechaHora, "2026-03-08"), "2026-03-08T13:50:00-03:00");
});

test("el mismo PDF da las mismas filas con cualquiera de los tres generadores", () => {
  const a = leer("c3-f2-serie1", "gs9").filas;
  assert.deepEqual(leer("c3-f2-serie1", "gs10").filas, a);
  assert.deepEqual(leer("c3-f2-serie1", "creator").filas, a);
  assert.equal(a.length, 6);
});

test("excluidos (EX) y los que no largaron (NE) conservan su estado, en la sección de no clasificados", () => {
  const p = leer("c1-f2-serie3-ex-ne");
  const estados = p.filas.filter((f) => f.posText).map((f) => `${f.posText}:${f.number}`).filter((x) => /^[A-Z]/.test(x));
  assert.deepEqual(estados, ["NE:29", "EX:70"]);
  const filas = filasDe(p.filas, "serie", nombre);
  assert.equal(filas.length, 13);
  assert.deepEqual(filas.slice(0, 3).map((f) => [f.pos, f.number, f.gap]), [[1, "81", "9:04.196"], [2, "28", "+1.015"], [3, "311", "+6.583"]]);
  const ne = filas.find((f) => f.number === "29");
  const ex = filas.find((f) => f.number === "70");
  assert.deepEqual([ne.positionText, ne.status, ne.gap], ["NE", "No largó", ""]);
  assert.deepEqual([ex.positionText, ex.status, ex.gap], ["EX", "Excluido", ""]);
  // Quien dio vueltas pero no cubrió el 75 %: "NC", con las vueltas de atraso.
  const nc = filas.find((f) => f.number === "15");
  assert.deepEqual([nc.positionText, nc.status, nc.gap], ["NC", "No clasificado", "+5 vueltas"]);
  assert.equal(filas.find((f) => f.number === "9").status, "No clasificado");
  assert.equal(filas[0].laps, 5);
});

test("clasificación: el excluido no tiene gap, y la posición sigue el orden de la planilla", () => {
  const filas = filasDe(leer("c3-f2-clasi1-ex").filas, "clasificacion", nombre);
  assert.deepEqual(filas.map((f) => f.pos), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(filas.slice(0, 3).map((f) => f.gap), ["1:42.703", "+0.117", "+0.296"]);
  assert.deepEqual([filas.at(-1).positionText, filas.at(-1).status, filas.at(-1).gap], ["EX", "Excluido", ""]);
  assert.equal(filas[0].laps, undefined, "en la clasificación las vueltas no se muestran");
});

test("autos de dos pilotos y 'no largó' en la Gran Carrera de la fecha 3", () => {
  const filas = filasDe(leer("c3-f3-final-titulares").filas, "final", nombre);
  assert.equal(filas[0].driver, "SANCHEZ F./ MELIAN G.");
  assert.equal(filas.at(-1).positionText, "NE");
});

test("la clasificación general no trae hora: se lee la tabla y la fecha queda vacía", () => {
  const p = leer("c3-f2-clasi-gral");
  assert.equal(p.fechaHora, null);
  assert.equal(p.filas[0].name, "GIORDANO Gastón");
  assert.equal(p.filas[1].gap1, "0.432");
});

test("entrenamiento con otro formato de columnas (Mejor Tpo / Dif. al 1°): el gap sale de la planilla", () => {
  const filas = filasDe(leer("c3-f6-ent1").filas, "practica", nombre);
  assert.deepEqual(filas.map((f) => f.gap), ["2:05.928", "+0.236", "+1.046", "+1.494"]);
  assert.equal(filas[0].team, "Toyota Etios");
});

test("fecha: día/mes salvo que la planilla esté en formato estadounidense, y siempre dentro del fin de semana de la fecha", () => {
  assert.equal(inicioDe({ a: 19, b: 4, anio: 2026, hh: 13, mm: 50, ampm: false }, "2026-04-19"), "2026-04-19T13:50:00-03:00");
  // 7/9 sin AM/PM puede ser 7 de septiembre o 9 de julio: manda el día de la carrera (13/09).
  assert.equal(inicioDe({ a: 12, b: 9, anio: 2026, hh: 9, mm: 5, ampm: false }, "2026-09-13"), "2026-09-12T09:05:00-03:00");
  assert.equal(inicioDe({ a: 9, b: 12, anio: 2026, hh: 9, mm: 5, ampm: false }, "2026-09-13"), "2026-09-12T09:05:00-03:00");
  // Una fecha que no cae en el fin de semana (error de tipeo del cronometrista) no se inventa: sin hora.
  assert.equal(inicioDe({ a: 18, b: 3, anio: 2026, hh: 13, mm: 0, ampm: false }, "2026-04-19"), null);
  assert.equal(inicioDe(null, "2026-04-19"), null);
});

test("duración de la sesión según el encabezado", () => {
  assert.equal(duracionDe(["Carrera (30:00 o 12 Vueltas) iniciado a 13:59:52"]), 30);
  assert.equal(duracionDe(["Race (40:00 or 17 Laps) started at 14:10:21"]), 40);
  assert.equal(duracionDe(["Carrera (55:37 o 24 Vueltas) iniciado a 15:20:00"]), 56);
  assert.equal(duracionDe(["Práctica (10:00 Tiempo) iniciado a 9:44:31"]), 10);
  assert.equal(duracionDe(["Carrera (5 Vueltas) iniciado a 9:02:17"]), null);
});

test("tildes que la planilla escribe con la codificación DOS", () => {
  assert.equal(repararTildes("SCAGLIA Mat¡as"), "SCAGLIA Matías");
  assert.equal(repararTildes("PALERMO Juan Jos‚"), "PALERMO Juan José");
  assert.equal(repararTildes("MU¥OZ Pablo"), "MUÑOZ Pablo");
  assert.equal(repararTildes("Ni¤o"), "Niño");
  assert.equal(repararTildes("¡Hola"), "¡Hola", "sin letra antes, no es una tilde");
});

test("un PDF que no es una planilla no devuelve filas inventadas", () => {
  const p = leerPlanilla(buildPdf([{ y: 700, runs: [{ x: 10, size: 9, text: "CRONOGRAMA DE ACTIVIDADES" }] }]));
  assert.equal(p.completa, false);
  assert.deepEqual(p.filas, []);
});
