import assert from "node:assert/strict";
import { test } from "node:test";
import { categoriaDe } from "./juego-categorias.mjs";

const cat = (t) => categoriaDe(t)?.cat ?? null;
const ignorada = (t) => categoriaDe(t)?.ignorada === true;

test("Turismo Carretera y TC, sin las variantes menores", () => {
  assert.equal(cat("Turismo Carretera"), "TC");
  assert.equal(cat("TC"), "TC");
  assert.equal(cat("TC (Turismo Carretera)"), "TC");
  assert.equal(cat("TC Mouras"), null);
  assert.ok(ignorada("TC Mouras"));
  assert.equal(cat("TC Pick Up"), null);
  assert.ok(ignorada("TC Pick Up"));
  assert.equal(cat("TC Pista Pick Up"), null);
});

test("TC Pista no es TC Pista Mouras", () => {
  assert.equal(cat("TC Pista"), "TC Pista");
  assert.equal(cat("TC Pista Mouras"), null);
  assert.ok(ignorada("TC Pista Mouras"));
});

test("TC2000 y sus nombres", () => {
  for (const t of ["TC 2000", "TC2000", "Turismo Competición 2000", "Súper TC 2000", "Súper TC2000", "STC2000", "Super TC 2000"]) {
    assert.equal(cat(t), "TC2000", t);
  }
});

test("Top Race y Top Race V6, no Top Race Series", () => {
  assert.equal(cat("Top Race"), "Top Race");
  assert.equal(cat("Top Race V6"), "Top Race");
  assert.equal(cat("TRV6"), "Top Race");
  assert.equal(cat("Top Race Series"), null);
  assert.ok(ignorada("Top Race Series"));
  assert.ok(ignorada("Top Race Junior"));
});

test("Turismo Nacional, cualquier clase", () => {
  assert.equal(cat("Turismo Nacional"), "TN");
  assert.equal(cat("Clase 3 del Turismo Nacional"), "TN");
  assert.equal(cat("Clase 2 del Turismo Nacional"), "TN");
  assert.equal(cat("Turismo Nacional Clase 3"), "TN");
});

test("Fórmula 1 sí, fórmulas menores no", () => {
  assert.equal(cat("Fórmula 1"), "F1");
  assert.equal(cat("F1"), "F1");
  assert.equal(cat("Campeonato Mundial de Fórmula 1"), "F1");
  assert.equal(cat("Fórmula 3"), null);
  assert.equal(cat("Fórmula Renault"), null);
  assert.ok(ignorada("Fórmula Renault Argentina"));
  assert.ok(ignorada("Fórmula 3 Sudamericana"));
  assert.equal(cat("Fórmula 2"), null);
});

test("Rally y Dakar son distintos", () => {
  assert.equal(cat("Rally Argentino"), "Rally");
  assert.equal(cat("Campeonato Mundial de Rally"), "Rally");
  assert.equal(cat("WRC"), "Rally");
  assert.equal(cat("Rally Dakar"), "Dakar");
  assert.equal(cat("Rally Dakar 2010"), "Dakar");
  assert.equal(cat("Dakar"), "Dakar");
});

test("lo desconocido devuelve null", () => {
  assert.equal(categoriaDe("Cosa rara"), null);
  assert.equal(categoriaDe(""), null);
});

test("categorías internacionales nuevas", () => {
  assert.equal(cat("IndyCar"), "IndyCar");
  assert.equal(cat("IndyCar Series"), "IndyCar");
  assert.equal(cat("Indy Lights"), null);
  assert.equal(cat("WTCC"), "Mundial de Turismos");
  assert.equal(cat("Campeonato Mundial de Turismos"), "Mundial de Turismos");
  assert.equal(cat("WTCR"), "Mundial de Turismos");
  assert.equal(cat("Copa Mundial de Turismos"), "Mundial de Turismos");
  assert.equal(cat("FIA TCR World Tour"), "Mundial de Turismos");
  assert.equal(cat("TCR South America"), null);
  assert.equal(cat("Campeonato Mundial de Resistencia"), "Resistencia");
  assert.equal(cat("24 Horas de Le Mans"), "Resistencia");
  assert.equal(cat("WEC"), "Resistencia");
});
