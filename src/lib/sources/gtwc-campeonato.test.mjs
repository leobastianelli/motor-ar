import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { classStandings, parseStandings } from "./gtwc-official.mjs";

// Tablas oficiales de pilotos por clase (gt-world-challenge-europe.com/standings, 17/10/2026, después de la carrera de Portimão): la Silver Cup
// de la temporada completa (0_82), del Endurance (42_82) y del Sprint (43_82), y la Bronze del Sprint (43_80).
const fx = (code) => readFileSync(new URL(`./fixtures/gtwc/standings-2026-${code}.html`, import.meta.url), "utf8");

test("la tabla de la Silver Cup: Montenegro y Lismont, mismo auto, en una fila; qué fechas ya están sumadas", () => {
  const sprint = parseStandings(fx("43_82_drivers"));
  assert.deepEqual(sprint.rows[0], { pos: 1, driver: "Matisse Lismont / Ignacio Montenegro", points: 123 });
  assert.equal(sprint.rounds.length, 5);
  assert.equal(sprint.scored, 5, "el Sprint terminó en Barcelona");

  const general = parseStandings(fx("0_82_drivers"));
  assert.deepEqual(general.rows[0], { pos: 1, driver: "Ignacio Montenegro / Matisse Lismont", points: 211 });
  assert.equal(general.rounds.length, 10);
  assert.equal(general.scored, 9, "la clasificación de Portimão ya suma, la carrera todavía no");

  const endurance = parseStandings(fx("42_82_drivers"));
  assert.equal(endurance.rows[0].driver, "Ignacio Montenegro / Amaury Cordeel / Matisse Lismont");
  assert.equal(endurance.scored, 4);
});

test("cada tabla dice si está al día con las carreras corridas; una clase sin puntos en una fecha no la atrasa", async () => {
  const pages = { "0_82": "0_82_drivers", "42_82": "42_82_drivers", "43_82": "43_82_drivers", "43_80": "43_80_drivers" };
  const io = {
    sleep: async () => {},
    text: async (url) => {
      const code = url.match(/filter_standing_type=(\d+_\d+)_drivers/)[1];
      if (!pages[code]) throw new Error(`404 ${url}`);
      return fx(pages[code]);
    },
  };
  // Cinco fechas de Sprint y cinco de Endurance con la carrera corrida (Portimão incluida).
  const fecha = (id) => ({ id, seriesId: "gt3", sessions: [{ kind: "carrera", results: [{ pos: 1, driver: "X" }] }] });
  const events = [1, 2, 3, 4, 5].flatMap((n) => [fecha(`gt3-2026-s${n}`), fecha(`gt3-2026-e${n}`)]);
  const errors = [];
  const tablas = await classStandings(io, events, { meta: { gt3: { argentines: ["Ignacio Montenegro"] } } }, { delayMs: 0, errors });
  const tabla = (cup, cls) => tablas.find((t) => t.cup === cup && t.class === cls);

  assert.equal(tabla("sprint", "Silver Cup").status, "oficial");
  assert.equal(tabla("sprint", "Silver Cup").scoredRounds, 5);
  assert.equal(tabla("sprint", "Bronze Cup").status, "oficial", "la Bronze no sumó en una fecha, pero el Sprint está completo");
  assert.equal(tabla("general", "Silver Cup").status, "atrasada", "la carrera de Portimão todavía no está en la tabla oficial");
  assert.equal(tabla("endurance", "Silver Cup").status, "atrasada");
  assert.ok(tabla("general", "Silver Cup").rows.some((r) => r.driver.includes("Montenegro")));
  assert.equal(errors.length, 5, "las tablas que no están en las páginas de prueba se informan");
});
