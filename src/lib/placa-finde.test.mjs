import assert from "node:assert/strict";
import { test } from "node:test";
import { ESCALAS, altoBloque, apellido, etiqueta, finde, horarios, medidas, paginar, placaFinde } from "./placa-finde.mjs";

const seriesById = {
  f1: { id: "f1", code: "F1", short: "F1", scope: "internacional", color: "#dc3e25" },
  tc: { id: "tc", code: "TC", short: "TC", scope: "nacional", color: "#16658f" },
  cp: { id: "cp", code: "CP", short: "Córdoba Pista", scope: "zonal", color: "#287e58" },
  ncs: { id: "ncs", code: "NCS", short: "Car Show", scope: "nacional", color: "#a21caf" },
};
const drivers = [{ name: "Franco Colapinto", seriesId: "f1" }];
const catalog = { seriesById, drivers };
const ses = (id, kind, name, start, timeKnown = true) => ({ id, kind, name, start, timeKnown, durationMin: 60 });

// Finde del 2 al 4 de octubre de 2026: F1 en Malasia y el TC en San Nicolás, con todas sus sesiones.
const F1 = { id: "f1-16", seriesId: "f1", round: 16, circuit: { city: "Kuala Lumpur" }, sessions: [
  ses("p1", "practica", "Práctica 1", "2026-10-02T04:30:00Z"),
  ses("p2", "practica", "Práctica 2", "2026-10-02T08:00:00Z"),
  ses("q", "clasificacion", "Clasificación", "2026-10-03T08:00:00Z"),
  ses("r", "carrera", "Carrera", "2026-10-04T07:00:00Z"),
] };
const TC = { id: "tc-12", seriesId: "tc", round: 12, circuit: { city: "San Nicolás" }, sessions: [
  ses("e1", "practica", "1° Entrenamiento", "2026-10-03T09:15:00-03:00"),
  ses("e2", "practica", "2° Entrenamiento", "2026-10-03T12:00:00-03:00"),
  ses("c", "clasificacion", "Clasificación", "2026-10-03T16:03:00-03:00"),
  ses("s1", "serie", "Serie 1", "2026-10-04T10:55:00-03:00"),
  ses("s2", "serie", "Serie 2", "2026-10-04T11:20:00-03:00"),
  ses("s3", "serie", "Serie 3", "2026-10-04T11:45:00-03:00"),
  ses("f", "final", "Final", "2026-10-04T14:00:00-03:00"),
] };
const JUEVES = "2026-10-01T15:00:00-03:00";

test("apellido: simple, compuesto y con dos nombres de pila", () => {
  assert.equal(apellido("Franco Colapinto"), "Colapinto");
  assert.equal(apellido("Ezequiel Pérez Companc"), "Pérez Companc");
  assert.equal(apellido("José María López"), "López");
});

test("etiqueta: nombres cortos, con la clase si la tiene", () => {
  assert.equal(etiqueta({ kind: "practica", name: "1° Entrenamiento Fiat 600" }, false), "Entren. 1 Fiat 600");
  assert.equal(etiqueta({ kind: "practica", name: "Práctica libre 2" }, true), "Práctica 2");
  assert.equal(etiqueta({ kind: "clasificacion", name: "2ª Clasificación Clase 3" }, false), "Clasif. 2 Clase 3");
  assert.equal(etiqueta({ kind: "practica", name: "Entrenamientos y clasificación (sábado)" }, false), "Entrenamientos y clasificación");
});

test("el finde del TC: están todas las sesiones, las series juntas en un renglón y en hora argentina", () => {
  const { bloques, rango } = finde([F1, TC], JUEVES, catalog);
  assert.equal(rango, "2 al 4 de octubre");
  const tc = bloques.filter((b) => b.series.id === "tc");
  assert.deepEqual(tc.map((b) => b.filas), [
    [
      { time: "09:15", label: "Entren. 1", tbc: false },
      { time: "12:00", label: "Entren. 2", tbc: false },
      { time: "16:03", label: "Clasificación", tbc: false },
    ],
    [
      { time: "10:55 · 11:20 · 11:45", label: "Series", tbc: false },
      { time: "14:00", label: "Final", tbc: false },
    ],
  ]);
  // La F1 del viernes a la madrugada argentina (01:30) y con el nombre del argentino.
  const vie = bloques.find((b) => b.day === "2026-10-02");
  assert.equal(vie.who, "Colapinto");
  assert.equal(vie.filas[0].time, "01:30");
});

test("orden del día: por la hora de la primera sesión; lo que no tiene hora, al final y dice «a confirmar»", () => {
  const cp = { id: "cp-7", seriesId: "cp", round: 7, circuit: { city: "Alta Gracia" }, sessions: [ses("x", "final", "Series y finales (domingo)", "2026-10-04T12:00:00-03:00", false)] };
  const dom = finde([F1, TC, cp], JUEVES, catalog).bloques.filter((b) => b.day === "2026-10-04");
  assert.deepEqual(dom.map((b) => b.series.id), ["f1", "tc", "cp"]);
  assert.deepEqual(dom.at(-1).filas, [{ time: "a confirmar", label: "Series y finales", tbc: true }]);
});

test("jornada doble: dos fechas el mismo día y lugar, un solo bloque que nombra las dos", () => {
  const cp = (round) => ({ id: `cp-${round}`, seriesId: "cp", round, circuit: { city: "Alta Gracia" }, sessions: [ses(`x${round}`, "practica", "Entrenamientos y clasificación (sábado)", "2026-10-03T12:00:00-03:00", false)] });
  const b = finde([cp(7), cp(8)], JUEVES, catalog).bloques;
  assert.equal(b.length, 1);
  assert.equal(b[0].lugar, "Alta Gracia · fechas 7 y 8");
});

test("muchas sesiones del mismo tipo: un renglón con el rango, sin perder ninguna; las tablas de resultado no son sesiones", () => {
  const sesiones = [
    ...Array.from({ length: 9 }, (_, i) => ses(`e${i}`, "practica", `${(i % 2) + 1}° Entrenamiento Clase ${i}`, `2026-10-03T${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}:00-03:00`)),
    ses("g", "clasificacion", "Clasificación general Clase 3", "2026-10-03T15:00:00-03:00", false),
  ];
  const filas = horarios(sesiones, false);
  assert.deepEqual(filas, [{ time: "08:00 a 12:00", label: "9 entrenamientos", tbc: false }, { time: "a confirmar", label: "Clasificación general Clase 3", tbc: true }]);
  const b = finde([{ id: "ncs-8", seriesId: "ncs", round: 8, circuit: { city: "San Jorge" }, sessions: sesiones }], JUEVES, catalog).bloques;
  assert.deepEqual(b[0].filas, [{ time: "08:00 a 12:00", label: "9 entrenamientos", tbc: false }]);
});

test("paginar: si no entra en una placa se parte en varias, sin perder bloques, y el día que sigue lo dice", () => {
  const muchos = Array.from({ length: 14 }, (_, i) => ({ ...TC, id: `tc-x${i}`, circuit: { city: `Lugar ${i}` } }));
  const datos = finde(muchos, JUEVES, catalog);
  const placas = paginar(datos, "feed");
  assert.ok(placas.length > 1);
  const enPlacas = placas.flatMap((p) => p.flatMap((d) => d.bloques));
  assert.equal(enPlacas.length, datos.bloques.length);
  const m = medidas("feed");
  for (const p of placas) {
    const alto = p.reduce((a, d) => a + m.diaAlto + d.bloques.reduce((x, b) => x + altoBloque(b, m), 0), 0);
    assert.ok(alto <= m.area, `una placa se pasa de alto: ${alto} > ${m.area}`);
  }
  assert.ok(placas.slice(1).some((p) => p[0].sigue));
  // La historia es más alta: nunca necesita más placas que el feed.
  assert.ok(paginar(datos, "historia").length <= placas.length);
});

test("antes de partir en otra placa se achica la letra; si con la más chica tampoco entra, se parte con la más grande que da esa cantidad", () => {
  const fechas = (n) => Array.from({ length: n }, (_, i) => ({ id: `tc-x${i}`, seriesId: "tc", round: i, circuit: { city: `Lugar ${i}` }, sessions: [ses(`f${i}`, "final", "Final", "2026-10-04T14:00:00-03:00")] }));
  const datos = (n) => finde(fechas(n), JUEVES, catalog);
  // Una cantidad que con la letra normal pide 2 placas y achicada entra en 1.
  const justo = [...Array(20).keys()].map((n) => n + 1).find((n) => paginar(datos(n), "feed", 1).length === 2 && paginar(datos(n), "feed", ESCALAS.at(-1)).length === 1);
  assert.ok(justo, "hay un caso que entra achicando");
  const p = placaFinde(fechas(justo), JUEVES, catalog, "feed");
  assert.equal(p.placas.length, 1);
  assert.ok(p.escala < 1);
  // Con poco, la letra normal.
  assert.equal(placaFinde([F1], JUEVES, catalog, "feed").escala, 1);
});

test("finde sin nada cargado: una placa vacía (la imagen lo dice), no un error", () => {
  const p = placaFinde([], JUEVES, catalog, "feed");
  assert.equal(p.placas.length, 1);
  assert.deepEqual(p.placas[0], []);
});
