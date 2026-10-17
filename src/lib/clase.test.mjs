import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fraseEnClase, puestoCorto, puestoEnClase } from "./clase.mjs";
import { autoNotes } from "./notas-auto.ts";
import { sessionDraft, xLength } from "./redes-core.mjs";

// 3 Horas de Portimão (GT World Challenge Europe, 17/10/2026), resultados oficiales: el BMW #30 de Team WRT (Cordeel / Lismont / Montenegro)
// terminó 5.º en la general y ganó la Silver Cup; el Mercedes #17 ganó la general. Pérez Companc, 25.º en la general, fue 8.º en la Silver.
const portimao = JSON.parse(readFileSync(new URL("./fixtures/gt3-portimao-2026.json", import.meta.url), "utf8"));
const carrera = portimao.sessions.find((s) => s.kind === "carrera");
const clasificacion = portimao.sessions.find((s) => s.kind === "clasificacion");
const fila = (s, nombre) => s.results.find((r) => r.driver.includes(nombre));

test("en una carrera multiclase el puesto que vale es el de la clase, con la general como contexto", () => {
  assert.deepEqual(puestoEnClase(carrera.results, fila(carrera, "Montenegro")), { pos: 1, class: "Silver Cup", overall: 5 });
  assert.deepEqual(puestoEnClase(carrera.results, fila(carrera, "Companc")), { pos: 8, class: "Silver Cup", overall: 25 });
  assert.equal(fraseEnClase(carrera.results, fila(carrera, "Montenegro"), "carrera"), "ganó en la Silver Cup (5.º en la general)");
  assert.equal(fraseEnClase(clasificacion.results, fila(clasificacion, "Montenegro"), "clasificacion"), "hizo la pole de la Silver Cup (15.º en la general)");
  assert.equal(puestoCorto(carrera.results, fila(carrera, "Montenegro")), "1.º en Silver Cup · 5.º en la general");
  // Una sesión de una sola clase (F1, TC) sigue igual.
  const unaClase = [{ pos: 1, driver: "A" }, { pos: 2, driver: "B" }];
  assert.equal(puestoEnClase(unaClase, unaClase[1]), null);
  assert.equal(puestoCorto(unaClase, unaClase[1]), "2.º");
});

test("el borrador de Portimão dice que Montenegro ganó en la Silver Cup, no que terminó 5.º, y entra en un posteo", () => {
  const argentines = [
    { driver: { name: "Ignacio Montenegro" }, row: fila(carrera, "Montenegro") },
    { driver: { name: "Ezequiel Pérez Companc" }, row: fila(carrera, "Companc") },
  ];
  const draft = sessionDraft({ event: portimao, session: carrera, series: { short: "GTWC", scope: "internacional" }, leader: null, argentines });
  assert.ok(draft, "tiene que salir un borrador");
  assert.ok(xLength(draft.text) <= 280);
  assert.match(draft.text, /Montenegro ganó en Silver Cup \(5\.º gral\.\)/);
  assert.match(draft.text, /Companc terminó 8\.º en Silver Cup \(25\.º gral\.\)/);
  assert.match(draft.text, /· General/, "el podio que se muestra es el de la general y lo dice");
  assert.match(draft.text, /Aron \/ Götz \/ Schiller/, "la tripulación ganadora con sus tres apellidos, no sólo el último");
  assert.doesNotMatch(draft.text, /terminó 5\.º/);
});

test("la crónica de Portimão titula con la Silver Cup de Montenegro y lo nombra con su clase", () => {
  const [nota] = autoNotes([portimao], {
    now: "2026-10-17T21:00:00Z",
    argentines: new Set(["ignacio-montenegro", "ezequiel-perez-companc"]),
    tierOf: () => 2,
    seriesName: () => ({ name: "GT World Challenge Europe", short: "GTWC" }),
  });
  assert.equal(nota.title, "Endurance Cup · 3 Horas de Portimão: Amaury Cordeel / Matisse Lismont / Ignacio Montenegro ganaron en la Silver Cup");
  assert.match(nota.summary, /Ignacio Montenegro ganaron en la Silver Cup en la 3 Horas de Portimão \(5\.º en la general\)/);
  assert.match(nota.summary, /terminaron 8\.º en la Silver Cup en la 3 Horas de Portimão \(25\.º en la general\)/);
  assert.doesNotMatch(nota.summary, /fue 5\.º/);
});
