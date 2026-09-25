import assert from "node:assert/strict";
import { test } from "node:test";
import { translateRaceName } from "./f1.mjs";

test("traduce un GP normal", () => {
  assert.equal(translateRaceName("Singapore Grand Prix"), "GP de Singapur");
  assert.equal(translateRaceName("Azerbaijan Grand Prix"), "GP de Azerbaiyán");
});

test("una fecha corrida en un país distinto al habitual queda en castellano con la aclaración", () => {
  assert.equal(translateRaceName("Bahrain Grand Prix in Malaysia"), "GP de Baréin (en Malasia)");
});

test("si no reconoce ni el GP ni el país reubicado, devuelve el nombre original sin inventar", () => {
  assert.equal(translateRaceName("Imaginary Grand Prix in Nowhere"), "Imaginary Grand Prix in Nowhere");
});
