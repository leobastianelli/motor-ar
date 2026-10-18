import assert from "node:assert/strict";
import test from "node:test";
import { acerto, comparar } from "./comparar.mjs";

const base = { slug: "a", nacio: 1980, provincia: "Córdoba", region: "Centro", categorias: ["TC", "TN"], titulos: 2, corre2026: true };
const con = (cambios) => ({ ...base, slug: "b", ...cambios });

test("nacio: mismo año es verde sin flecha", () => {
  assert.deepEqual(comparar(con({ nacio: 1980 }), base).nacio, { estado: "verde", flecha: null });
});

test("nacio: borde de 5 años es amarillo y 6 es gris; la flecha apunta al del día", () => {
  assert.deepEqual(comparar(con({ nacio: 1975 }), base).nacio, { estado: "amarillo", flecha: "arriba" });
  assert.deepEqual(comparar(con({ nacio: 1985 }), base).nacio, { estado: "amarillo", flecha: "abajo" });
  assert.deepEqual(comparar(con({ nacio: 1974 }), base).nacio, { estado: "gris", flecha: "arriba" });
  assert.deepEqual(comparar(con({ nacio: 1986 }), base).nacio, { estado: "gris", flecha: "abajo" });
});

test("provincia: igual verde, misma región amarillo, otra región gris", () => {
  assert.equal(comparar(con({ provincia: "Córdoba" }), base).provincia.estado, "verde");
  assert.equal(comparar(con({ provincia: "Santa Fe", region: "Centro" }), base).provincia.estado, "amarillo");
  assert.equal(comparar(con({ provincia: "Salta", region: "NOA" }), base).provincia.estado, "gris");
  assert.equal(comparar(con({ provincia: "Santa Fe", region: undefined }), base).provincia.estado, "amarillo");
  assert.equal(comparar(con({ provincia: "Exterior", region: "Exterior" }), base).provincia.flecha, null);
});

test("categorías: mismo conjunto (sin importar el orden) verde, solapado amarillo, disjunto gris", () => {
  assert.equal(comparar(con({ categorias: ["TN", "TC"] }), base).categorias.estado, "verde");
  assert.equal(comparar(con({ categorias: ["TC"] }), base).categorias.estado, "amarillo");
  assert.equal(comparar(con({ categorias: ["TC", "TN", "Rally"] }), base).categorias.estado, "amarillo");
  assert.equal(comparar(con({ categorias: ["F1"] }), base).categorias.estado, "gris");
  assert.equal(comparar(con({ categorias: [] }), base).categorias.flecha, null);
});

test("títulos: mismo número verde; distinto gris con flecha", () => {
  assert.deepEqual(comparar(con({ titulos: 2 }), base).titulos, { estado: "verde", flecha: null });
  assert.deepEqual(comparar(con({ titulos: 0 }), base).titulos, { estado: "gris", flecha: "arriba" });
  assert.deepEqual(comparar(con({ titulos: 9 }), base).titulos, { estado: "gris", flecha: "abajo" });
});

test("corre en 2026: igual verde, distinto gris, nunca flecha", () => {
  assert.deepEqual(comparar(con({ corre2026: true }), base).corre2026, { estado: "verde", flecha: null });
  assert.deepEqual(comparar(con({ corre2026: false }), base).corre2026, { estado: "gris", flecha: null });
});

test("acertó sólo si es el mismo slug", () => {
  assert.equal(acerto(base, base), true);
  assert.equal(acerto(con({}), base), false);
});
