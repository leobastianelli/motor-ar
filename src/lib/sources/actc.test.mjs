import assert from "node:assert/strict";
import { test } from "node:test";
import { fixCityAccents } from "./actc.mjs";

test("San Nicolás: la ACTC lo publica sin tilde y se corrige (la fecha 12 de TC del 4/10)", () => {
  assert.equal(fixCityAccents("San Nicolas"), "San Nicolás");
  assert.equal(fixCityAccents("SAN NICOLAS"), "San Nicolás");
  assert.equal(fixCityAccents("Ciudad San Nicolas"), "Ciudad San Nicolás");
});

test("otras ciudades argentinas conocidas que la ACTC publica sin tilde", () => {
  assert.equal(fixCityAccents("Rio Cuarto"), "Río Cuarto");
  assert.equal(fixCityAccents("Autódromo Ciudad de Rio Cuarto"), "Autódromo Ciudad de Río Cuarto");
  assert.equal(fixCityAccents("Parana"), "Paraná");
  assert.equal(fixCityAccents("Ciudad de Parana"), "Ciudad de Paraná");
  assert.equal(fixCityAccents("Albardon"), "Albardón");
  assert.equal(fixCityAccents("Termas De Rio Hondo"), "Termas de Río Hondo");
});

test("no toca nombres ya bien escritos ni ciudades no argentinas", () => {
  assert.equal(fixCityAccents("San Nicolás"), "San Nicolás");
  assert.equal(fixCityAccents("Buenos Aires"), "Buenos Aires");
  assert.equal(fixCityAccents("Las Vegas"), "Las Vegas");
});
