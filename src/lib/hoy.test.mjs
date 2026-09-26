import assert from "node:assert/strict";
import { test } from "node:test";
import { descripcionHoy, diaDeHoy, sesionesDelDia, tituloHoy } from "./hoy.mjs";

const f1 = { short: "F1", name: "Fórmula 1" };
const tc = { short: "TC", name: "Turismo Carretera" };

const item = (id, start, series, city = "San Nicolás", timeKnown = true) => ({
  session: { id: `${id}-s`, start, durationMin: 60, timeKnown },
  event: { id, circuit: { city } },
  series,
  status: "upcoming",
});

// Sábado 26/09/2026 con dos categorías, más una fecha de martes y una de viernes.
const ITEMS = [
  item("f1-malasia", "2026-09-26T07:00:00-03:00", f1, "Sepang"),
  item("tc-sannicolas", "2026-09-26T10:00:00-03:00", tc),
  item("tc-otra-sesion", "2026-09-26T14:00:00-03:00", tc),
  item("tn-martes", "2026-09-29T12:00:00-03:00", { short: "TN", name: "TC Nacional" }),
  item("f1-viernes", "2026-10-02T09:00:00-03:00", f1, "Suzuka"),
];

test("sesionesDelDia: sólo las del día, ordenadas por hora", () => {
  const rows = sesionesDelDia(ITEMS, "2026-09-26");
  assert.deepEqual(rows.map((r) => r.event.id), ["f1-malasia", "tc-sannicolas", "tc-otra-sesion"]);
});

test("sábado con varias categorías: hoy trae todo lo del día, corrido o por correr", () => {
  const dia = diaDeHoy(ITEMS, "2026-09-26T08:30:00-03:00");
  assert.equal(dia.isToday, true);
  assert.equal(dia.key, "2026-09-26");
  assert.deepEqual(dia.items.map((r) => r.event.id), ["f1-malasia", "tc-sannicolas", "tc-otra-sesion"]);
});

test("lunes sin nada: no es hoy, y trae el próximo día con actividad (el martes de TN, no el sábado pasado)", () => {
  const dia = diaDeHoy(ITEMS, "2026-09-28T12:00:00-03:00");
  assert.equal(dia.isToday, false);
  assert.equal(dia.key, "2026-09-29");
  assert.deepEqual(dia.items.map((r) => r.event.id), ["tn-martes"]);
});

test("martes con la fecha de TN: sí es hoy", () => {
  const dia = diaDeHoy(ITEMS, "2026-09-29T12:00:00-03:00");
  assert.equal(dia.isToday, true);
  assert.deepEqual(dia.items.map((r) => r.event.id), ["tn-martes"]);
});

test("día sin nada cargado ese día ni antes: busca hacia adelante, nunca hacia atrás", () => {
  const dia = diaDeHoy(ITEMS, "2026-09-27T12:00:00-03:00"); // domingo, sin sesiones propias
  assert.equal(dia.isToday, false);
  assert.equal(dia.key, "2026-09-29");
});

test("sin nada futuro cargado: no hay día", () => {
  const dia = diaDeHoy(ITEMS, "2026-12-31T12:00:00-03:00");
  assert.equal(dia.key, undefined);
  assert.deepEqual(dia.items, []);
  assert.equal(dia.isToday, false);
});

test("medianoche argentina: una sesión de las 23:50 y otra de las 00:10 quedan en días distintos", () => {
  const items = [item("noche", "2026-09-26T23:50:00-03:00", tc), item("madrugada", "2026-09-27T00:10:00-03:00", tc)];
  assert.deepEqual(sesionesDelDia(items, "2026-09-26").map((r) => r.event.id), ["noche"]);
  assert.deepEqual(sesionesDelDia(items, "2026-09-27").map((r) => r.event.id), ["madrugada"]);
});

test("título y descripción de un sábado con carreras", () => {
  const dia = diaDeHoy(ITEMS, "2026-09-26T08:30:00-03:00");
  const titulo = tituloHoy(dia);
  assert.ok(titulo.length <= 56, titulo);
  assert.match(titulo, /hoy/i);
  const desc = descripcionHoy(dia);
  assert.ok(desc.length <= 158, desc);
  assert.match(desc, /F1 en Sepang/);
});

test("título y descripción de un día sin nada hoy", () => {
  const vacio = diaDeHoy(ITEMS, "2026-09-27T12:00:00-03:00");
  assert.equal(vacio.isToday, false);
  const titulo = tituloHoy(vacio);
  assert.ok(titulo.length <= 56, titulo);
  const desc = descripcionHoy(vacio);
  assert.ok(desc.length <= 158, desc);
  assert.match(desc, /no hay carreras/i);
});

test("sin nada cargado en absoluto: título y descripción no rompen", () => {
  const dia = diaDeHoy([], "2026-09-26T08:30:00-03:00");
  assert.equal(tituloHoy(dia).length > 0, true);
  assert.equal(descripcionHoy(dia).length > 0, true);
});
