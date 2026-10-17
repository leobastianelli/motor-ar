import assert from "node:assert/strict";
import { test } from "node:test";
import { CAMPEONES } from "./tc2000-campeones.mjs";
import { applyCampeones } from "./tc2000.mjs";

const wikiEvent = (round, day) => ({
  id: `tc2000-2026-${round}`,
  seriesId: "tc2000",
  round,
  name: `Fecha ${round} · X`,
  circuit: { name: "X", city: "X", country: "Argentina", flag: "AR", province: "X" },
  sessions: [{ id: `tc2000-2026-${round}-race`, kind: "carrera", name: "Carrera", start: `${day}T12:00:00-03:00`, timeKnown: false, durationMin: 50 }],
  source: "Wikipedia · Temporada 2026 de TC2000",
});

const junin = { raceDay: "2026-09-06", round: 8, city: "Junín", circuit: "Autódromo Eusebio Marcilla", province: "Buenos Aires", raceTime: "13:00", pole: "Matías Rossi", winner: "Gabriel Ponce de León" };
const sanJuan = { raceDay: "2026-09-27", round: 8, city: "San Juan", circuit: "Autódromo El Zonda Eduardo Copello", province: "San Juan", pole: "Emiliano Stang", winner: "Lucas Carabajal" };

test("dos fines de semana con el mismo número votado son dos fechas, no una pisada por la otra", () => {
  // Wikipedia llega hasta la fecha 6; las notas de Junín votaron "octava" por error (la de San Juan sí es la octava).
  const wiki = [1, 2, 3, 4, 5, 6].map((r) => wikiEvent(r, `2026-0${r + 2}-0${r}`));
  const events = applyCampeones(wiki, [junin, sanJuan]);

  assert.deepEqual(events.map((e) => e.id), ["1", "2", "3", "4", "5", "6", "7", "8"].map((r) => `tc2000-2026-${r}`));
  const [seven, eight] = events.slice(6);
  assert.equal(seven.circuit.city, "Junín");
  assert.equal(seven.sessions.at(-1).results[0].driver, "Gabriel Ponce de León");
  assert.match(seven.sessions.at(-1).start, /^2026-09-06/);
  assert.equal(eight.circuit.city, "San Juan");
  assert.equal(eight.sessions.at(-1).results[0].driver, "Lucas Carabajal");
  assert.match(eight.sessions.at(-1).start, /^2026-09-27/);
  // Los resultados de Junín no se le pegan a San Juan.
  assert.equal(eight.sessions.some((s) => s.results?.some((r) => r.driver === "Gabriel Ponce de León")), false);
  assert.ok(eight.source.includes(CAMPEONES));
});

test("por número sólo se une con un evento cercano en el calendario", () => {
  const wiki = [wikiEvent(1, "2026-03-15")];
  const events = applyCampeones(wiki, [{ ...sanJuan, round: 1 }]);
  assert.equal(events.length, 2);
  assert.equal(events[0].circuit.city, "X");
});

test("Campeones: títulos como «resistió y se llevó la carrera» y «con su primera pole» cuentan como ganador y pole", async () => {
  const { parseWeekends } = await import("./tc2000-campeones.mjs");
  const post = (date, title, text) => ({ date, title, text, link: `https://campeones.com.ar/${encodeURIComponent(title)}` });
  const weekends = parseWeekends([
    post("2026-10-11T22:48:58.000Z", "Vivian resistió y se llevó la carrera del TC2000 en La Pampa", "En el autódromo «Provincia de La Pampa», Franco Vivian (Chevrolet Tracker) ganó la novena fecha de Turismo Competición 2000."),
    post("2026-10-10T19:46:23.000Z", "TC2000: Traut, con su primera «pole» en el cierre de la clasificación pampeana", "Nicolás Traut estampó el «1» en el circuito corto de Toay."),
  ]);
  assert.equal(weekends.length, 1);
  assert.equal(weekends[0].raceDay, "2026-10-11");
  assert.equal(weekends[0].city, "Toay");
  assert.equal(weekends[0].winner, "Franco Vivian");
  assert.equal(weekends[0].pole, "Nicolás Traut");
});
