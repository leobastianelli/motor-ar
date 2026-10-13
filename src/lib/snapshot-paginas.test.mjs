import assert from "node:assert/strict";
import { test } from "node:test";
import { momentoDeCategoria, momentoDeEvento, momentoDePiloto } from "./momento.mjs";
import { deps, drivers, events, igual, seriesById } from "./prueba-temporada.mjs";
import { fechasDeCategoria, fechasDeLosPilotos, recortarFecha, ultimosResultados } from "./snapshot.mjs";
import { dayStart } from "./session-status.mjs";
import { driverKey } from "./sources/driver-index.mjs";
import { createTimeViews } from "./tiempo.mjs";

// Las páginas de categoría, de piloto y de fecha dibujan el momento en el navegador a partir de un recorte de la temporada. Estas pruebas
// comparan lo que sale del recorte con lo que sale de la temporada entera, a distintas horas desde el momento del servidor.
const horasDeLaPrueba = () => {
  const horas = [];
  for (let t = Date.parse("2026-01-02T00:00:00-03:00"); t < Date.parse("2026-12-31T00:00:00-03:00"); t += 211 * 3600_000) horas.push(t);
  for (let t = Date.parse("2026-10-03T06:00:00-03:00"); t < Date.parse("2026-10-06T00:00:00-03:00"); t += 5 * 3600_000) horas.push(t);
  return horas;
};
const seriesIds = [...new Set(events.map((e) => e.seriesId))];
const argentinosDe = (id) => (seriesById[id].scope === "internacional" ? drivers.filter((d) => d.seriesId === id).map((d) => d.slug) : []);

test("el momento de cada categoría con el recorte es idéntico al de la temporada entera", () => {
  let n = 0;
  for (const t of horasDeLaPrueba()) {
    const now = new Date(t).toISOString();
    for (const id of seriesIds) {
      const todas = events.filter((e) => e.seriesId === id);
      const recorte = fechasDeCategoria(todas, now);
      const opts = { argentineSlugs: argentinosDe(id), failures: [] };
      for (const offset of [0, 14 * 60_000, 75 * 60_000]) {
        const cuando = new Date(t + offset).toISOString();
        igual(momentoDeCategoria(recorte, cuando, opts), momentoDeCategoria(todas, cuando, opts), `${id} a las ${cuando} con el recorte de las ${now}`);
        n++;
      }
    }
  }
  assert.ok(n > 1000);
});

test("el momento de una fecha y el de un piloto con el recorte son idénticos a los de la temporada entera", () => {
  const muestra = drivers.filter((d) => d.seriesId === "tc" || d.seriesId === "f1" || d.seriesId === "gt3");
  assert.ok(muestra.length >= 3);
  for (const t of horasDeLaPrueba().filter((_, i) => i % 3 === 0)) {
    const now = new Date(t).toISOString();
    for (const d of muestra) {
      const keys = [driverKey(d.name)];
      const todas = events.filter((e) => e.seriesId === d.seriesId);
      const recorte = fechasDeCategoria(todas, now, { keys: new Set(keys) });
      for (const offset of [0, 14 * 60_000]) {
        const cuando = new Date(t + offset).toISOString();
        igual(momentoDePiloto(recorte, cuando, keys), momentoDePiloto(todas, cuando, keys), `${d.slug} a las ${cuando}`);
      }
    }
    for (const e of events.filter((x) => x.seriesId === "f1").slice(0, 8)) {
      igual(momentoDeEvento(recortarFecha(e, () => true), now), momentoDeEvento(e, now), `${e.id} a las ${now}`);
    }
  }
});

test("el estado de los pilotos con el recorte es idéntico al de la temporada entera (también cuando corren en dos categorías)", () => {
  const todos = createTimeViews({ events, ...deps });
  for (const t of horasDeLaPrueba()) {
    const now = new Date(t).toISOString();
    const recorte = createTimeViews({ events: fechasDeLosPilotos(events, now, drivers), ...deps });
    for (const offset of [0, 14 * 60_000]) {
      const cuando = new Date(t + offset).toISOString();
      for (const d of drivers) {
        igual(recorte.getRunnerStatus(d, cuando), todos.getRunnerStatus(d, cuando), `${d.slug} a las ${cuando} con el recorte de las ${now}`);
      }
    }
  }
});

test("el último resultado de un piloto sale de los 3 más recientes con su hora de fin", () => {
  for (const piloto of drivers.filter((d) => ["agustin-canapino", "franco-colapinto", "julian-santero"].includes(d.slug))) {
    for (const t of horasDeLaPrueba()) {
      const now = new Date(t).toISOString();
      // Los datos tal como estaban a esa hora: una sesión que todavía no había empezado no tenía resultados.
      const alAhora = events.map((e) => ({ ...e, sessions: e.sessions.map((s) => ((s.timeKnown === false ? dayStart(s.start) : Date.parse(s.start)) <= t ? s : { ...s, results: undefined })) }));
      const cands = ultimosResultados(alAhora, piloto.slug, deps);
      const real = createTimeViews({ events: alAhora, ...deps }).getDriverResults(piloto.slug, now)[0];
      const elegido = cands.find((c) => c.doneAt <= t);
      assert.equal(elegido?.pos, real?.row.pos, `${piloto.slug} a las ${now}`);
      assert.equal(elegido?.session, real?.session.name);
    }
  }
});
