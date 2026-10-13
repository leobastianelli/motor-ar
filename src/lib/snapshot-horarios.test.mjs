import assert from "node:assert/strict";
import { test } from "node:test";
import { deps, events } from "./prueba-temporada.mjs";
import { fechasDeCategoria } from "./snapshot.mjs";
import { createTimeViews } from "./tiempo.mjs";

// /horarios/<categoría> dice cuál es la próxima fecha y la próxima sesión: con el recorte (las 3 primeras fechas sin terminar) tiene que dar lo mismo.
const proxima = (list, now) => {
  const views = createTimeViews({ events: list, ...deps });
  const next = [...list].sort((a, b) => Date.parse(a.sessions[0].start) - Date.parse(b.sessions[0].start)).find((e) => views.getNextSession(e, now));
  return { fecha: next?.id, sesion: next ? views.getNextSession(next, now)?.id : undefined };
};

test("la próxima fecha y la próxima sesión con el recorte son las de la temporada entera", () => {
  const ids = [...new Set(events.map((e) => e.seriesId))];
  let n = 0;
  for (let t = Date.parse("2026-01-02T00:00:00-03:00"); t < Date.parse("2026-12-31T00:00:00-03:00"); t += 29 * 3600_000) {
    const now = new Date(t).toISOString();
    for (const id of ids) {
      const todas = events.filter((e) => e.seriesId === id);
      const recorte = fechasDeCategoria(todas, now, { pasadas: 0 });
      for (const horas of [0, 0.25, 3]) {
        const cuando = new Date(t + horas * 3600_000).toISOString();
        assert.deepEqual(proxima(recorte, cuando), proxima(todas, cuando), `${id} a las ${cuando} con el recorte de las ${now}`);
        n++;
      }
    }
  }
  assert.ok(n > 3000);
});
