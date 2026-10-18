import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sumarDias } from "./dia.mjs";
import { esCandidato, hash, pilotoDelDia } from "./rotacion.mjs";

const pilotos = JSON.parse(readFileSync(new URL("./fixtures/pilotos-muestra.json", import.meta.url), "utf8"));
const INICIO = "2026-10-20";
const pista = (n) => ({ texto: `Pista ${n}`, fuente: "https://example.test/f" });
const conPistas = (desde) => ({ desde, pistas: [pista(1), pista(2)] });
const pistas = Object.fromEntries(pilotos.slice(0, 5).map((p) => [p.slug, conPistas("2026-10-01")]));
const dias = (n, from = INICIO) => Array.from({ length: n }, (_, i) => sumarDias(from, i));
const salen = (ps, n, semilla = "s") => dias(n).map((d) => pilotoDelDia(d, pilotos, ps, semilla, INICIO)?.slug);

test("el hash es determinista", () => {
  assert.equal(hash("a|2026-10-20|x"), hash("a|2026-10-20|x"));
  assert.notEqual(hash("a|2026-10-20|x"), hash("b|2026-10-20|x"));
});

test("es estable: la misma fecha y semilla dan el mismo piloto", () => {
  assert.deepEqual(salen(pistas, 12), salen(pistas, 12));
});

test("no repite hasta agotar y después vuelve a empezar", () => {
  const todos = salen(pistas, 15);
  for (let ciclo = 0; ciclo < 3; ciclo++) {
    const vuelta = todos.slice(ciclo * 5, ciclo * 5 + 5);
    assert.equal(new Set(vuelta).size, 5, `ciclo ${ciclo}: ${vuelta}`);
  }
});

test("la semilla cambia el orden", () => {
  assert.notDeepEqual(salen(pistas, 5, "uno"), salen(pistas, 5, "dos"));
});

test("sumar un piloto con desde futuro no cambia días pasados ni el de hoy", () => {
  const antes = salen(pistas, 6);
  const hoy = dias(6)[5];
  const nuevo = { ...pistas, [pilotos[5].slug]: conPistas(hoy) }; // desde == hoy: todavía no cuenta hoy
  const nuevoFuturo = { ...nuevo, [pilotos[6].slug]: conPistas("2027-01-01") };
  assert.deepEqual(salen(nuevoFuturo, 6), antes);
});

test("necesita las 2 pistas completas y desde anterior al día", () => {
  const f = "2026-10-20";
  assert.equal(esCandidato("pepe-pruebas", f, { "pepe-pruebas": conPistas("2026-10-19") }), true);
  assert.equal(esCandidato("pepe-pruebas", f, { "pepe-pruebas": conPistas("2026-10-20") }), false);
  assert.equal(esCandidato("pepe-pruebas", f, { "pepe-pruebas": { desde: "2026-10-01", pistas: [pista(1)] } }), false);
  assert.equal(esCandidato("pepe-pruebas", f, { "pepe-pruebas": { desde: "2026-10-01", pistas: [pista(1), { texto: "x", fuente: "" }] } }), false);
  assert.equal(esCandidato("pepe-pruebas", f, {}), false);
});

test("sin candidatos o antes del lanzamiento devuelve null", () => {
  assert.equal(pilotoDelDia("2026-10-25", pilotos, {}, "s", INICIO), null);
  assert.equal(pilotoDelDia("2026-10-19", pilotos, pistas, "s", INICIO), null);
});

test("un día sin candidatos no rompe los siguientes", () => {
  const tardio = Object.fromEntries(Object.entries(pistas).map(([k]) => [k, conPistas("2026-10-22")]));
  const r = salen(tardio, 5);
  assert.deepEqual(r.slice(0, 3), [undefined, undefined, undefined]);
  assert.ok(r[3] && r[4] && r[3] !== r[4]);
});
