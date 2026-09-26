import assert from "node:assert/strict";
import { test } from "node:test";
import { autoNotes } from "./notas-auto.ts";

const row = (pos, driver, gap, extra = {}) => ({ pos, driver, team: "", gap, ...extra });
const session = (id, kind, name, start, results) => ({ id, kind, name, start, durationMin: 60, ...(results ? { results } : {}) });
const NOW = "2026-09-24T14:00:00Z";
const opts = { now: NOW, argentines: new Set(["franco-colapinto"]), tierOf: (id) => (id === "f1" ? 2 : 1), seriesName: (id) => ({ name: id, short: id.toUpperCase() }) };

const baku = {
  id: "f1-2026-15",
  seriesId: "f1",
  round: 15,
  name: "GP de Azerbaiyán",
  circuit: { name: "", city: "", country: "", flag: "" },
  broadcasts: [],
  sessions: [
    session("p1", "practica", "Práctica 1", "2026-09-24T08:30:00Z", [
      row(1, "George Russell", "1:45.387"),
      row(2, "Max Verstappen", "+0.400"),
      row(3, "Kimi Antonelli", "+0.5"),
      row(9, "Franco Colapinto", "+1.2", { driverSlug: "franco-colapinto" }),
    ]),
    session("p2", "practica", "Práctica 2", "2026-09-24T12:00:00Z", [row(1, "Kimi Antonelli", "1:44.9"), row(2, "George Russell", "+0.1"), row(3, "Max Verstappen", "+0.2")]),
    session("p3", "practica", "Práctica 3", "2026-09-25T08:30:00Z"),
  ],
};

test("una crónica por fecha, con lo que ya se corrió y sin mencionar lo que todavía no", () => {
  const [n, ...rest] = autoNotes([baku], opts);
  assert.equal(rest.length, 0);
  assert.equal(n.slug, "f1-2026-15-cronica");
  assert.equal(n.publishedAt, "2026-09-24");
  assert.equal(n.title, "GP de Azerbaiyán: Kimi Antonelli fue el más rápido en la práctica 2");
  assert.match(n.summary, /Práctica 1: 1\.º George Russell \(1:45\.387\), 2\.º Max Verstappen \(\+0\.400\), 3\.º Kimi Antonelli/);
  assert.match(n.summary, /Práctica 2: 1\.º Kimi Antonelli/);
  assert.doesNotMatch(n.summary, /Práctica 3/);
  assert.deepEqual(n.events, ["f1-2026-15"]);
  assert.equal(n.source.url, "/eventos/f1-2026-15");
});

test("destaca a los argentinos que no están entre los tres primeros", () => {
  const [n] = autoNotes([baku], opts);
  assert.match(n.summary, /Franco Colapinto fue 9\.º en la práctica 1/);
});

test("el título sigue a la sesión más importante y los días anteriores quedan en el detalle", () => {
  const event = {
    ...baku,
    sessions: [...baku.sessions.slice(0, 2), session("q", "clasificacion", "Clasificación", "2026-09-25T12:00:00Z", [row(1, "Lando Norris", "1:31.824"), row(2, "Kimi Antonelli", "1:31.835"), row(3, "Max Verstappen", "1:31.9")])],
  };
  const [n] = autoNotes([event], { ...opts, now: "2026-09-25T15:00:00Z" });
  assert.equal(n.publishedAt, "2026-09-25");
  assert.equal(n.title, "GP de Azerbaiyán: Lando Norris hizo el mejor tiempo en la clasificación");
  assert.equal(n.details.length, 1);
  assert.match(n.details[0], /^Jueves 24\/9: /);
});

test("las fechas viejas o sin resultados no generan nota, y las categorías argentinas van primero el mismo día", () => {
  const old = { ...baku, id: "f1-2026-1", sessions: [session("x", "carrera", "Carrera", "2026-09-01T12:00:00Z", [row(1, "A", "1:00")])] };
  const empty = { ...baku, id: "f1-2026-2", sessions: [session("y", "carrera", "Carrera", "2026-09-24T12:00:00Z")] };
  const tc = { ...baku, id: "tc-2026-11", seriesId: "tc", name: "San Luis", sessions: [session("f", "final", "Final", "2026-09-24T12:00:00Z", [row(1, "Mariano Werner", "20:00")])] };
  const notes = autoNotes([old, empty, baku, tc], opts);
  assert.deepEqual(notes.map((n) => n.slug), ["tc-2026-11-cronica", "f1-2026-15-cronica"]);
});

test("el título para buscadores nombra la categoría sin tocar el titular visible", () => {
  const [n] = autoNotes([baku], { ...opts, seriesName: () => ({ name: "Fórmula 1", short: "F1" }) });
  assert.equal(n.title, "GP de Azerbaiyán: Kimi Antonelli fue el más rápido en la práctica 2");
  assert.equal(n.seoTitle, "Fórmula 1, GP de Azerbaiyán: Kimi Antonelli fue el más rápido en la práctica 2");
  const f2 = { ...baku, id: "f2-2026-9", seriesId: "f2", name: "Baku" };
  const [m] = autoNotes([f2], { ...opts, seriesName: () => ({ name: "Fórmula 2", short: "F2" }) });
  assert.equal(m.seoTitle, "Fórmula 2 en Baku: Kimi Antonelli fue el más rápido en la práctica 2");
});

test("dos carreras principales en la misma fecha (F2): la crónica distingue la primera como 'Carrera principal 1', sin tocar el name guardado", () => {
  const r1 = session("carrera", "carrera", "Carrera principal", "2026-09-26T11:00:00Z", [row(1, "George Russell", ""), row(2, "Kimi Antonelli", "+0.5"), row(3, "Max Verstappen", "+0.8")]);
  const r2Sesion = session("carrera-2", "carrera", "Carrera principal 2", "2026-09-27T11:00:00Z");
  const eventoTrasR1 = { ...baku, id: "f2-2026-15", seriesId: "f2", sessions: [r1, r2Sesion] };
  const [prev] = autoNotes([eventoTrasR1], { ...opts, now: "2026-09-26T13:00:00Z" });
  assert.match(prev.summary, /Carrera principal 1: 1\.º George Russell/);
  assert.equal(r1.name, "Carrera principal");

  const r2 = { ...r2Sesion, results: [row(1, "Max Verstappen", ""), row(2, "George Russell", "+0.3"), row(3, "Kimi Antonelli", "+0.6")] };
  const eventoCompleto = { ...baku, id: "f2-2026-15", seriesId: "f2", sessions: [r1, r2] };
  const [n] = autoNotes([eventoCompleto], { ...opts, now: "2026-09-27T15:00:00Z" });
  assert.match(n.title, /carrera principal 2/);
});

test("crónica nacional: el lugar, sin el número de fecha", () => {
  const tn = { ...baku, id: "tn-2026-9", seriesId: "tn", name: "Fecha 9 · Rio Cuarto" };
  const [n] = autoNotes([tn], { ...opts, seriesName: () => ({ name: "TN APAT", short: "TN" }) });
  assert.equal(n.seoTitle, "TN APAT en Rio Cuarto: Kimi Antonelli fue el más rápido en la práctica 2");
});
