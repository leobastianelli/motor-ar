import assert from "node:assert/strict";
import { test } from "node:test";
import { dayKey } from "./session-status.mjs";
import { deps, events, igual } from "./prueba-temporada.mjs";
import { fechasDeHoy } from "./snapshot.mjs";
import { createTimeViews } from "./tiempo.mjs";

// `/hoy` dibuja el día en el navegador sobre un recorte de los próximos días con actividad: a medianoche cambia solo.
const resumen = (dia) => ({ key: dia.key, isToday: dia.isToday, items: dia.items.map((i) => [i.session.id, i.status, i.series.id]) });

test("el día de hoy con el recorte es idéntico al de la temporada entera, mientras el día esté cubierto", () => {
  const todos = createTimeViews({ events, ...deps });
  let n = 0;
  for (let t = Date.parse("2026-01-02T00:00:00-03:00"); t < Date.parse("2026-12-31T00:00:00-03:00"); t += 61 * 3600_000) {
    const now = new Date(t).toISOString();
    const { fechas, cubreHasta } = fechasDeHoy(events, now);
    const recorte = createTimeViews({ events: fechas, ...deps });
    // Hasta 30 horas después (la pestaña abierta de un día para el otro) y mientras el día siga dentro de lo que cubre el recorte.
    for (const horas of [0, 6, 30]) {
      const cuando = new Date(t + horas * 3600_000).toISOString();
      if (dayKey(cuando) > cubreHasta) continue;
      igual(resumen(recorte.getToday(cuando)), resumen(todos.getToday(cuando)), `hoy a las ${cuando} con el recorte de las ${now}`);
      n++;
    }
  }
  assert.ok(n > 100);
});

test("el recorte de /hoy dice hasta qué día cubre", () => {
  const { fechas, cubreHasta } = fechasDeHoy(events, "2026-10-03T12:00:00-03:00");
  assert.ok(fechas.length > 5);
  assert.ok(cubreHasta >= "2026-10-03");
  // Si no queda nada hacia adelante, cubre el día de hoy y nada más.
  assert.deepEqual(fechasDeHoy(events, "2027-06-01T12:00:00-03:00"), { fechas: [], cubreHasta: "2027-06-01" });
});
