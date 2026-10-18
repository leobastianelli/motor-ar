import assert from "node:assert/strict";
import test from "node:test";
import { dia, diasEntre, fechaArgentina, fechaValida, segundosHastaFinDelDia, sumarDias } from "./dia.mjs";

test("la fecha argentina es UTC-3: a las 02:59 UTC todavía es el día anterior", () => {
  assert.equal(fechaArgentina(new Date("2026-10-20T02:59:59Z")), "2026-10-19");
  assert.equal(fechaArgentina(new Date("2026-10-20T03:00:00Z")), "2026-10-20");
  assert.equal(fechaArgentina(new Date("2026-10-20T23:59:59-03:00")), "2026-10-20");
});

test("el juego #1 es el día de lanzamiento y el número sube de a uno", () => {
  assert.deepEqual(dia(new Date("2026-10-20T15:00:00Z"), "2026-10-20"), { fecha: "2026-10-20", numero: 1 });
  assert.equal(dia(new Date("2026-10-21T03:00:00Z"), "2026-10-20").numero, 2);
  assert.equal(dia(new Date("2026-10-21T02:59:00Z"), "2026-10-20").numero, 1);
  assert.equal(dia(new Date("2026-10-19T15:00:00Z"), "2026-10-20").numero, 0);
  assert.equal(dia(new Date("2027-01-01T15:00:00Z"), "2026-10-20").numero, 74);
});

test("aritmética de fechas", () => {
  assert.equal(sumarDias("2026-12-31", 1), "2027-01-01");
  assert.equal(sumarDias("2028-02-28", 1), "2028-02-29");
  assert.equal(diasEntre("2026-10-20", "2026-10-27"), 7);
});

test("fechaValida rechaza lo que no es una fecha de calendario", () => {
  assert.equal(fechaValida("2026-10-20"), true);
  assert.equal(fechaValida("2026-02-30"), false);
  assert.equal(fechaValida("2026-1-2"), false);
  assert.equal(fechaValida("hoy"), false);
  assert.equal(fechaValida(undefined), false);
});

test("segundos hasta las 00:00 argentinas", () => {
  assert.equal(segundosHastaFinDelDia(new Date("2026-10-20T02:00:00Z")), 3600);
  assert.equal(segundosHastaFinDelDia(new Date("2026-10-20T03:00:00Z")), 86400);
});
