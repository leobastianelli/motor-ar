import assert from "node:assert/strict";
import { test } from "node:test";
import { datosPortada } from "./portada.mjs";
import { deps, driversAbroad, events, igual } from "./prueba-temporada.mjs";
import { fechasDeLaPortada, recortarFecha, recortarSesion } from "./snapshot.mjs";
import { createTimeViews, eventDoneAt, sessionDoneAt } from "./tiempo.mjs";
import { sessionStatus } from "./session-status.mjs";

test("la temporada de prueba trae lo que hace falta", () => {
  assert.ok(events.length > 100);
  assert.ok(driversAbroad.length >= 3);
  assert.ok(events.some((e) => e.sessions.some((s) => s.results?.some((r) => r.driverSlug))));
});

// Lo que la portada ve de cada fecha y sesión, sin lo que el recorte deja afuera a propósito (tablas viejas, campos que no se muestran).
const normalizar = (valor) =>
  JSON.parse(
    JSON.stringify(valor, function (key, v) {
      if (v?.sessions && v?.seriesId) return { id: v.id, seriesId: v.seriesId, name: v.name, round: v.round, city: v.circuit?.city, sessions: v.sessions.map((s) => s.id) };
      if (key === "session" && v?.id) return recortarSesion(v, true);
      return v;
    }),
  );

const portada = (list, now) => normalizar(datosPortada(createTimeViews({ events: list, ...deps }), now, deps));

test("el recorte de la portada da lo mismo que la temporada entera, a cualquier hora de los 15 minutos siguientes", () => {
  const first = Date.parse("2026-01-02T00:00:00-03:00");
  const last = Date.parse("2026-12-31T00:00:00-03:00");
  let checked = 0;
  // Una barrida completa (cada 7 h, toda la temporada) tarda dos minutos y pasó entera al escribir esto; en `npm test` se muestrea cada 131 h
  // y, aparte, cada 3 h el fin de semana del 3 al 5 de octubre (el más cargado: F1, TC, TN, Rally, Córdoba Pista, Car Show).
  const horas = [];
  for (let t = first; t < last; t += 131 * 3600_000) horas.push(t);
  for (let t = Date.parse("2026-10-03T06:00:00-03:00"); t < Date.parse("2026-10-06T00:00:00-03:00"); t += 3 * 3600_000) horas.push(t);
  for (const t of horas) {
    const now = new Date(t).toISOString();
    const recorte = fechasDeLaPortada(events, now, deps);
    for (const offset of [0, 14 * 60_000]) {
      const cuando = new Date(t + offset).toISOString();
      igual(portada(recorte, cuando), portada(events, cuando), `la portada difiere a las ${cuando} con el recorte de las ${now}`);
      checked++;
    }
  }
  assert.ok(checked > 100);
});

test("la portada recortada sigue siendo correcta una hora y media después (pestaña abierta)", () => {
  for (const base of ["2026-10-03T12:00:00-03:00", "2026-10-04T09:00:00-03:00", "2026-10-05T10:00:00-03:00", "2026-09-26T08:00:00-03:00"]) {
    const recorte = fechasDeLaPortada(events, base, deps);
    for (const minutos of [20, 45, 90]) {
      const cuando = new Date(Date.parse(base) + minutos * 60_000).toISOString();
      igual(portada(recorte, cuando), portada(events, cuando), `difiere a las ${cuando}`);
    }
  }
});

test("el recorte es chico: una fracción de la temporada", () => {
  const now = "2026-10-03T12:00:00-03:00";
  const recorte = fechasDeLaPortada(events, now, deps);
  const full = JSON.stringify(events).length;
  const small = JSON.stringify(recorte).length;
  assert.ok(small < full / 5, `el recorte pesa ${small} de ${full} bytes`);
});

test("recortar una fecha conserva sus sesiones y sólo la tabla de las que se pidan", () => {
  const e = events.find((x) => x.sessions.some((s) => s.results?.length));
  const conTabla = e.sessions.find((s) => s.results?.length);
  const out = recortarFecha(e, (s) => s.id === conTabla.id);
  assert.equal(out.sessions.length, e.sessions.length);
  assert.ok(out.sessions.find((s) => s.id === conTabla.id).results.length > 0);
  assert.ok(out.sessions.filter((s) => s.id !== conTabla.id).every((s) => !s.results));
});

test("sessionDoneAt es exactamente el instante en que sessionStatus pasa a 'done'", () => {
  for (const e of events) {
    for (const s of e.sessions) {
      const at = sessionDoneAt(s);
      assert.equal(sessionStatus(s, new Date(at).toISOString()), "done");
      assert.notEqual(sessionStatus(s, new Date(at - 1).toISOString()), "done");
    }
    const all = eventDoneAt(e);
    assert.ok(e.sessions.every((s) => sessionStatus(s, new Date(all).toISOString()) === "done"));
  }
});
