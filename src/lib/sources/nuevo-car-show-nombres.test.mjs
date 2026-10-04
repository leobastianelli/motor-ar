import assert from "node:assert/strict";
import { test } from "node:test";
import { claveDeNombre, nombresDeClase } from "./nuevo-car-show-nombres.mjs";

const v = (crudos, raw) => nombresDeClase(crudos).get(raw);

test('"APELLIDO Nombre" → "Nombre Apellido", con apellidos compuestos y varios nombres', () => {
  assert.equal(v(["DELLA SANTINA Nahuel"], "DELLA SANTINA Nahuel"), "Nahuel Della Santina");
  assert.equal(v(["GUAZZERONI Juan Emilio"], "GUAZZERONI Juan Emilio"), "Juan Emilio Guazzeroni");
  assert.equal(v(["FEDERICI DI PALMA Juan Cruz"], "FEDERICI DI PALMA Juan Cruz"), "Juan Cruz Federici Di Palma");
  assert.equal(v(["SERRA Román (M)"], "SERRA Román (M)"), "Román Serra", "se saca la marca entre paréntesis");
});

test("la fecha 1 escribe 'NOMBRE APELLIDO' en mayúsculas: se ordena con los nombres de las otras fechas y, si no hay, con los nombres de pila conocidos", () => {
  const crudos = ["VALENTIN BALESTRINI", "BALESTRINI Valentin", "ENZO RAUL TENTELLA", "NAHUEL DELLA SANTINA", "DELLA SANTINA Nahuel"];
  const m = nombresDeClase(crudos);
  assert.equal(m.get("VALENTIN BALESTRINI"), "Valentin Balestrini");
  assert.equal(m.get("BALESTRINI Valentin"), "Valentin Balestrini");
  assert.equal(m.get("ENZO RAUL TENTELLA"), "Enzo Raul Tentella");
  assert.equal(m.get("NAHUEL DELLA SANTINA"), "Nahuel Della Santina");
  assert.equal(m.get("NAHUEL DELLA SANTINA"), m.get("DELLA SANTINA Nahuel"));
});

test("una misma persona con y sin tilde, con una errata de una letra o con un segundo nombre de más es un solo piloto, con la escritura más completa", () => {
  const m = nombresDeClase(["SCAGLIA Matias", "SCAGLIA Matías", "BONELLIO Nicolás", "BONELLO Nicolás", "TENTELLA Enzo", "ENZO RAUL TENTELLA"]);
  assert.equal(m.get("SCAGLIA Matias"), "Matías Scaglia");
  assert.equal(m.get("SCAGLIA Matías"), "Matías Scaglia");
  assert.equal(m.get("BONELLIO Nicolás"), m.get("BONELLO Nicolás"));
  assert.equal(m.get("TENTELLA Enzo"), "Enzo Raul Tentella");
});

test("dos pilotos distintos del mismo apellido no se juntan", () => {
  const m = nombresDeClase(["RIVOSECCHI Giuliano", "RIVOSECCHI Javier", "MARTINEZ Sergio", "MARTINEZ Tomás"]);
  assert.notEqual(m.get("RIVOSECCHI Giuliano"), m.get("RIVOSECCHI Javier"));
  assert.notEqual(m.get("MARTINEZ Sergio"), m.get("MARTINEZ Tomás"));
});

test("autos de dos pilotos: 'I. Apellido / I. Apellido', también con iniciales dobles", () => {
  assert.equal(v(["JUSID M./ GRINOVERO F."], "JUSID M./ GRINOVERO F."), "M. Jusid / F. Grinovero");
  assert.equal(v(["CERRI J.M / JUAREZ F."], "CERRI J.M / JUAREZ F."), "J.M. Cerri / F. Juarez");
  assert.equal(v(["CANAVESIO / BEATINI"], "CANAVESIO / BEATINI"), "Canavesio / Beatini");
});

test("clave para comparar nombres sin tildes ni orden", () => {
  assert.equal(claveDeNombre("Matías Scaglia"), claveDeNombre("SCAGLIA Matias"));
});
