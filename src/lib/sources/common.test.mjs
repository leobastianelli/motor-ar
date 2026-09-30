import assert from "node:assert/strict";
import { test } from "node:test";
import { properName, repairMojibake } from "./common.mjs";

// Lo que dejó la sincronización del 19/9/2026: APAT sirvió los nombres leídos como Windows-1252 y "Nombre Propio" pasó la "Ã" a minúscula.
test("repara la lectura rota aunque la 'Ã' haya pasado a minúscula", () => {
  assert.equal(repairMojibake("Andrã‰s Calderã“n"), "Andrés Calderón");
  assert.equal(repairMojibake("Donzino Mã\u0081ximo"), "Donzino Máximo");
  assert.equal(repairMojibake("Leonel Pernã­a"), "Leonel Pernía");
  assert.equal(repairMojibake("Matã­as Muã‘oz M."), "Matías Muñoz M.");
  assert.equal(repairMojibake("Josã©"), "José");
});

test("repara la forma en mayúsculas, la de tres bytes y la leída mal dos veces", () => {
  assert.equal(repairMojibake("OberÃ¡"), "Oberá");
  assert.equal(repairMojibake("CALDERÃ“N"), "CALDERÓN");
  assert.equal(repairMojibake("Kimi RÃ¤ikkÃ¶nen"), "Kimi Räikkönen");
  assert.equal(repairMojibake("itâ€™s"), "it’s");
  assert.equal(repairMojibake("ÃƒÂ¡"), "á");
});

test("una página con partes bien escritas y partes rotas se repara entera", () => {
  // Antes se reparaba todo el texto o nada: un solo "Nicolás" bien escrito dejaba sin reparar a todos los demás.
  assert.equal(repairMojibake("<td>Jaime, Nicolás</td><td>CALDERÃ“N ANDRÃ‰S</td>"), "<td>Jaime, Nicolás</td><td>CALDERÓN ANDRÉS</td>");
});

test("no toca texto bien escrito", () => {
  for (const ok of ["São Paulo", "Nicolás Jaime", "irmã dela", "“irmã”", "Grande Prêmio", "12°"]) assert.equal(repairMojibake(ok), ok);
});

test("properName repara antes de pasar a 'Nombre Propio'", () => {
  assert.equal(properName("DONZINO MÃ\u0081XIMO"), "Donzino Máximo");
  assert.equal(properName("CALDERÃ“N, ANDRÃ‰S"), "Andrés Calderón");
});

test("parseJsonBody explica qué llegó cuando la fuente devuelve HTML en vez de JSON", async () => {
  const { parseJsonBody } = await import("./common.mjs");
  assert.deepEqual(parseJsonBody('[{"a":1}]', "SoloTC"), [{ a: 1 }]);
  assert.throws(() => parseJsonBody("<!DOCTYPE html><html><head><title>Just a moment...</title></head></html>", "SoloTC"), /SoloTC no devolvió JSON sino HTML «Just a moment\.\.\.»/);
  assert.throws(() => parseJsonBody("", "SoloTC"), /respuesta vacía/);
});
