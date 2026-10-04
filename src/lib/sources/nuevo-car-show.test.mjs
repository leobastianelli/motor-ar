import assert from "node:assert/strict";
import { test } from "node:test";
import { seriesById } from "../../data/series.ts";
import { protectSeason } from "./guard.mjs";
import { calendarioHtml, DOCS_CLASE, fakeIo, NOW, resultadosHtml } from "./fixtures/nuevo-car-show/io.mjs";
import { carryOver, HEADERS, keepPreviousNuevoCarShow, nuevoCarShowSeason, parseCalendario, parseResultados, sedeDeNoticia, tipoDeDocumento } from "./nuevo-car-show.mjs";
import { CLASES } from "./nuevo-car-show-clases.mjs";

const run = (io = fakeIo(), previous, opts = {}) => nuevoCarShowSeason(io, previous, { windowDays: 400, now: NOW, ...opts });
const sesion = (event, classId, key) => event.sessions.find((s) => s.id === `${event.id}-${classId}-${key}`);

test("calendario real: diez fechas, con el día de la carrera y la sede como los escribe el sitio", () => {
  const cal = parseCalendario(calendarioHtml());
  assert.equal(cal.length, 10);
  assert.deepEqual(cal[0], { round: 1, day: "2026-03-08", venue: "San Jorge" });
  assert.deepEqual(cal[7], { round: 8, day: "2026-10-04", venue: "San Jorge" });
  assert.deepEqual(cal[8], { round: 9, day: "2026-11-08", venue: "A Confirmar" });
  assert.deepEqual(parseCalendario("<h2>otra cosa</h2>"), []);
});

test("noticia de sede confirmada", () => {
  assert.deepEqual(sedeDeNoticia("LA FECHA 9 DEL CAMPEONATO TIENE SEDE CONFIRMADA: EL NUEVO CAR SHOW VUELVE A CONCORDIA"), { round: 9, venue: "CONCORDIA" });
  assert.equal(sedeDeNoticia("SAN JORGE SE PREPARA PARA RECIBIR EL GRAN PREMIO"), null);
});

test("página de resultados: un PDF por rótulo y las fechas todavía sin documentos figuran vacías", () => {
  const fechas = parseResultados(resultadosHtml(DOCS_CLASE));
  assert.equal(fechas.length, 10);
  assert.deepEqual(fechas.map((f) => f.round), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(fechas[1].docs.length, 7);
  assert.deepEqual(fechas[0].docs[0], { label: "Final", url: "https://nuevocarshow.com.ar/wp-content/uploads/2026/03/FINAL-CLASE-3.pdf" });
  assert.equal(fechas[3].docs.length, 0);
});

test("rótulos de los PDF → sesión (los reales del sitio)", () => {
  const casos = [
    ["Final", "final", "final", "Final"],
    ["Final Titulares", "final", "final", "Final"],
    ["Final 2", "final", "final2", "Final 2"],
    ["100 Millas - Parte 1", "final", "100m-parte1", "100 Millas · Parte 1"],
    ["100 Millas - Final", "final", "100m-parte2", "100 Millas · Final"],
    ["3ra Serie", "serie", "serie3", "3ª Serie"],
    ["1ra Clasificación", "clasificacion", "clasi1", "1ª Clasificación"],
    ["Clasificación Titulares", "clasificacion", "clasi", "Clasificación"],
    ["General Clasificación", "clasificacion", "clasi-general", "Clasificación general"],
    ["Clasificación General", "clasificacion", "clasi-general", "Clasificación general"],
    ["1er Entrenamiento", "practica", "ent1", "1° Entrenamiento"],
    ["2do Entrenamiento", "practica", "ent2", "2° Entrenamiento"],
    ["Entrenamiento", "practica", "ent", "Entrenamiento"],
    ["Entrenamiento Domingo", "practica", "ent-domingo", "Entrenamiento del domingo"],
    ["Entrenamiento Sábado", "practica", "ent-sabado", "Entrenamiento del sábado"],
    ["Entrenamiento Libre 3", "practica", "entlibre3", "Entrenamiento libre 3"],
    ["1ra Tanda Libre", "practica", "tanda1", "1ª Tanda libre"],
  ];
  for (const [label, kind, key, name] of casos) {
    const t = tipoDeDocumento(label);
    assert.deepEqual([t.kind, t.key, t.name], [kind, key, name], label);
  }
  // Los resúmenes (generales de entrenamientos y tandas) y los invitados (no suman puntos) no son sesiones.
  for (const label of ["General Entrenamientos", "General Tandas Libres", "General Entrenamientos Libres", "Final Invitados", "Clasificación Invitados", "Entrenamiento Invitados"]) {
    assert.equal(tipoDeDocumento(label), null, label);
  }
});

test("categoría y clases: sello con contraste suficiente y ids propios", () => {
  const s = seriesById["nuevo-car-show"];
  assert.equal(s.classes.length, 5);
  assert.deepEqual(s.classes.map((c) => c.id), ["clase1", "clase2", "clase3", "tc4000", "fiat600"]);
  const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = (h) => 0.2126 * lin(parseInt(h.slice(1, 3), 16)) + 0.7152 * lin(parseInt(h.slice(3, 5), 16)) + 0.0722 * lin(parseInt(h.slice(5, 7), 16));
  for (const color of [s.color, ...s.classes.map((c) => c.color)]) assert.ok(1.05 / (lum(color) + 0.05) >= 4.5, `${color}: contraste con texto blanco`);
  // Ningún color de esta categoría repite el de otra categoría ni el de otra clase.
  const otros = new Set(Object.values(seriesById).filter((x) => x.id !== s.id).flatMap((x) => [x.color, ...(x.classes ?? []).map((c) => c.color)]));
  for (const color of [s.color, ...s.classes.map((c) => c.color)]) assert.ok(!otros.has(color), `${color} ya se usa`);
  assert.equal(new Set(s.classes.map((c) => c.color)).size, 5);
});

test("arma las diez fechas con sedes, ids y sesiones por clase", async () => {
  const { events, meta } = await run();
  assert.deepEqual(events.map((e) => e.id), Array.from({ length: 10 }, (_, i) => `nuevo-car-show-2026-${i + 1}`));
  assert.ok(events.every((e) => e.seriesId === "nuevo-car-show"));
  assert.equal(meta.nuevoCarShow.errors.length, 0);
  assert.deepEqual(meta.nuevoCarShow.rounds, [1, 2, 3]);
  // Sedes con las ciudades que usa el resto del sitio, para "Corren el mismo finde".
  assert.deepEqual(events.map((e) => e.circuit.city), ["San Jorge", "Paraná", "San Nicolás", "San Jorge", "Rafaela", "Termas de Río Hondo", "San Nicolás", "San Jorge", "A confirmar", "Rafaela"]);
  assert.equal(events[1].name, "Fecha 2 · Paraná");
  assert.equal(events[8].circuit.name, "A confirmar");
});

test("sesiones de la fecha 2 de una clase: tipo, nombre, hora real de la planilla y resultados", async () => {
  const { events } = await run();
  const f2 = events[1];
  const clase3 = f2.sessions.filter((s) => s.classId === "clase3");
  assert.deepEqual(
    clase3.map((s) => `${s.kind}|${s.name}`),
    ["practica|1° Entrenamiento Clase 3", "clasificacion|1ª Clasificación Clase 3", "clasificacion|Clasificación general Clase 3", "serie|Serie Clase 3", "final|Final Clase 3"],
  );
  const final = sesion(f2, "clase3", "final");
  assert.equal(final.start, "2026-04-19T13:50:00-03:00");
  assert.equal(final.timeKnown, true);
  assert.equal(final.timeStatus, "confirmed");
  assert.equal(final.durationMin, 30);
  assert.deepEqual(final.timeSources.map((t) => [t.name, t.url]), [["Nuevo Car Show (planilla de tiempos oficial)", "https://nuevocarshow.com.ar/wp-content/uploads/2026/04/C3-FINAL-RECT-OK.pdf"]]);
  assert.equal(final.resultsSource.url, "https://nuevocarshow.com.ar/wp-content/uploads/2026/04/C3-FINAL-RECT-OK.pdf");
  // Gana la planilla rectificada, no el PDF original del mismo rótulo.
  assert.equal(final.results[0].driver, "Nahuel Della Santina");
  assert.equal(final.results.length, 18);
  assert.deepEqual(final.results.slice(0, 2).map((r) => [r.pos, r.number, r.team, r.gap, r.laps]), [[1, "2", "VW Gol Trend", "23:11.865", 12], [2, "48", "Fiat Argo", "+2.985", 12]]);
  assert.deepEqual(final.results.at(-1), { pos: 18, positionText: "NC", status: "No clasificado", number: "11", driver: "Andres Maugeri", team: "Toyota Etios", gap: "" });
  // Un mismo PDF colgado de dos rótulos: sólo queda el que coincide con el número que imprime la planilla.
  assert.ok(sesion(f2, "clase3", "ent1"));
  assert.equal(sesion(f2, "clase3", "ent2"), undefined);
  // La clasificación general no trae hora propia: va con la última clasificación del día, sin horario.
  const general = sesion(f2, "clase3", "clasi-general");
  assert.equal(general.timeKnown, false);
  assert.equal(general.start, sesion(f2, "clase3", "clasi1").start);
  assert.equal(general.timeSources, undefined);
  // Orden cronológico.
  assert.deepEqual(clase3.map((s) => s.start), [...clase3.map((s) => s.start)].sort());
});

test("fecha 1 (PDF de otro generador, fecha mes/día): hora correcta y nombres unificados con las fechas siguientes", async () => {
  const { events } = await run();
  const final1 = sesion(events[0], "clase3", "final");
  assert.equal(final1.start, "2026-03-08T13:50:00-03:00");
  assert.equal(final1.durationMin, 40);
  // "VALENTIN BALESTRINI" (fecha 1, nombre primero) y "BALESTRINI Valentin" (fecha 2) son una sola persona, mostrada "Nombre Apellido".
  assert.equal(final1.results[0].driver, "Valentin Balestrini");
  const nombres = events.flatMap((e) => e.sessions.filter((s) => s.classId === "clase3").flatMap((s) => (s.results ?? []).map((r) => r.driver)));
  assert.equal(new Set(nombres.filter((n) => /Balestrini/.test(n) && !n.includes("/"))).size, 1);
  assert.ok(nombres.includes("Andrés Cief"), "con tilde, aunque en la fecha 1 venga sin ella");
  assert.ok(!nombres.some((n) => /^[A-ZÁÉÍÓÚ]{3,} /.test(n)), "nunca mayúsculas sostenidas");
});

test("Gran Carrera de la fecha 3: autos de dos pilotos y sólo la planilla de titulares", async () => {
  const { events } = await run();
  const f3 = events[2].sessions.filter((s) => s.classId === "clase3");
  assert.ok(f3.some((s) => s.id.endsWith("final")));
  assert.ok(!f3.some((s) => /invitad/i.test(s.name)));
  const final = f3.find((s) => s.kind === "final");
  assert.deepEqual(final.results[0].driver, "F. Sanchez / G. Melian");
  assert.equal(final.results.at(-1).positionText, "NE");
  assert.equal(final.results.at(-1).status, "No largó");
});

test("fechas sin planillas: una final por clase, con el día de la carrera y sin hora inventada", async () => {
  const { events } = await run();
  for (const e of events.slice(3)) {
    assert.equal(e.sessions.length, 5, `fecha ${e.round}`);
    assert.deepEqual(e.sessions.map((s) => [s.kind, s.timeKnown]), CLASES.map(() => ["final", false]));
    assert.ok(e.sessions.every((s) => !s.results && s.start.endsWith("T12:00:00-03:00")));
  }
  assert.equal(events[7].sessions[0].start, "2026-10-04T12:00:00-03:00");
  assert.deepEqual(events[7].sessions.map((s) => s.name), ["Final Clase 1", "Final Clase 2", "Final Clase 3", "Final TC 4000", "Final Fiat 600"]);
});

test("pide al sitio con User-Agent de navegador, Accept y Accept-Language (sin eso responde 403)", async () => {
  const io = fakeIo();
  await run(io);
  assert.ok(io.calls.json.length >= 12);
  for (const c of [...io.calls.json, ...io.calls.bytes]) {
    assert.match(c.headers["User-Agent"], /Mozilla\/5\.0/);
    assert.match(c.headers["Accept-Language"], /es-AR/);
    assert.ok(c.headers.Accept);
  }
  assert.equal(HEADERS["User-Agent"], io.calls.json[0].headers["User-Agent"]);
});

test("la sede de la fecha 9 se completa con la noticia del sitio, pero sólo si es una sede conocida", async () => {
  const { events } = await run(fakeIo({ posts: ["LA FECHA 9 DEL CAMPEONATO TIENE SEDE CONFIRMADA: EL NUEVO CAR SHOW VUELVE A CONCORDIA"] }));
  assert.equal(events[8].circuit.city, "Concordia");
  assert.equal(events[8].name, "Fecha 9 · Concordia");
  const raro = await run(fakeIo({ posts: ["LA FECHA 9 DEL CAMPEONATO TIENE SEDE CONFIRMADA: EL NUEVO CAR SHOW VUELVE A UN LUGAR DESCONOCIDO"] }));
  assert.equal(raro.events[8].circuit.city, "A confirmar");
});

test("ventana: una fecha vieja que ya está guardada no vuelve a pedirse, y el resto de lo guardado se conserva", async () => {
  const primera = await run();
  const io = fakeIo();
  // Hoy es 4/10: las fechas 1 a 3 quedan fuera de la ventana de 21 días y la versión anterior ya tiene sus resultados.
  const segunda = await run(io, { events: primera.events, standings: {}, meta: {} }, { windowDays: 21, now: new Date("2026-10-04T15:00:00Z") });
  assert.equal(io.calls.bytes.length, 0);
  assert.deepEqual(segunda.events.slice(0, 3).map((e) => e.sessions.filter((s) => s.results?.length).length), primera.events.slice(0, 3).map((e) => e.sessions.filter((s) => s.results?.length).length));
  assert.equal(sesion(segunda.events[1], "clase3", "final").results[0].driver, "Nahuel Della Santina");
});

test("mismo PDF que ya se leyó: no se vuelve a descargar, aunque la fecha esté dentro de la ventana", async () => {
  const primera = await run();
  const io = fakeIo();
  const segunda = await run(io, { events: primera.events, standings: {}, meta: {} });
  assert.equal(io.calls.bytes.length, 0, "todas las sesiones con resultados se reutilizan");
  assert.equal(segunda.meta.nuevoCarShow.pdfs, 0);
  assert.deepEqual(segunda.events[1].sessions.map((s) => s.id), primera.events[1].sessions.map((s) => s.id));
  // Si el sitio sube una planilla rectificada (otra dirección), se lee la nueva.
  const rect = { ...DOCS_CLASE, 2: { docs: [["Final", "04/C3-FINAL-RECT-OK.pdf"], ["1ra Serie", "04/C3-SERIE-1.pdf"]] } };
  const io2 = fakeIo({ clases: { clase3: rect } });
  await run(io2, { events: primera.events, standings: {}, meta: {} });
  assert.equal(io2.calls.bytes.length, 0);
});

test("las fuentes nunca se achican: si el sitio dejó de publicar planillas, se conservan las de antes", async () => {
  const primera = await run();
  const vacia = Object.fromEntries(CLASES.map((c) => [c.id, {}]));
  const segunda = await run(fakeIo({ clases: vacia }), { events: primera.events, standings: {}, meta: {} });
  for (const [a, b] of primera.events.map((e, i) => [e, segunda.events[i]])) {
    assert.deepEqual(b.sessions.filter((s) => s.results?.length).map((s) => s.id), a.sessions.filter((s) => s.results?.length).map((s) => s.id), `fecha ${a.round}`);
  }
  // La red de seguridad general del sitio tampoco deja pasar una fecha con menos resultados.
  const guardada = protectSeason(segunda.events, { events: primera.events });
  assert.equal(guardada.events.length, primera.events.length);
});

test("un PDF ilegible no tira la temporada: queda anotado y las demás sesiones se cargan", async () => {
  const { events, meta } = await run(fakeIo({ failing: new Set(["04/C3-SERIE-1.pdf"]) }));
  assert.ok(meta.nuevoCarShow.errors.some((e) => /Clase 3 fecha 2 1ra Serie/.test(e)));
  assert.equal(sesion(events[1], "clase3", "serie1"), undefined);
  assert.ok(sesion(events[1], "clase3", "final").results.length);
});

test("una página de resultados que falla: se anota y las otras clases siguen", async () => {
  const { events, meta } = await run(fakeIo({ sin: new Set(["resultados-clase-2-2026"]) }));
  assert.ok(meta.nuevoCarShow.errors.some((e) => /resultados Clase 2/.test(e)));
  assert.ok(sesion(events[1], "clase3", "final").results.length);
  assert.equal(sesion(events[1], "clase2", "final").results, undefined);
});

test("si el calendario del sitio falla: con datos guardados la fuente falla (se conserva lo anterior); sin nada guardado, calendario embebido", async () => {
  const anterior = (await run()).events;
  await assert.rejects(run(fakeIo({ sin: new Set(["calendario"]) }), { events: anterior, standings: {}, meta: {} }), /503/);
  await assert.rejects(run(fakeIo({ calendario: calendarioHtml().slice(0, 600) }), { events: anterior, standings: {}, meta: {} }), /calendario del sitio/);
  const { events, meta } = await run(fakeIo({ sin: new Set(["calendario"]) }));
  assert.equal(events.length, 10);
  assert.equal(meta.nuevoCarShow.calendarioEstatico, true);
  assert.ok(meta.nuevoCarShow.errors.some((x) => /calendario 2026 embebido/.test(x)));
  assert.equal(events[7].sessions[0].start, "2026-10-04T12:00:00-03:00");
  assert.ok(events[7].sessions.every((x) => x.timeKnown === false));
  const parcial = anterior.slice(0, 2);
  assert.equal(keepPreviousNuevoCarShow(parcial, { events: anterior }).length, 10);
});

test("carryOver: no pisa resultados con una sesión vacía y no mezcla fechas", () => {
  const con = { id: "e-1", round: 1, sessions: [{ id: "a", kind: "final", name: "Final", start: "2026-03-08T13:50:00-03:00", timeKnown: true, results: [{ pos: 1, driver: "X" }], resultsSource: { url: "u" } }] };
  const sin = { ...con, sessions: [{ id: "a", kind: "final", name: "Final", start: "2026-03-08T12:00:00-03:00", timeKnown: false }] };
  const r = carryOver(sin, con);
  assert.equal(r.sessions[0].results[0].driver, "X");
  assert.equal(r.sessions[0].start, "2026-03-08T13:50:00-03:00");
  assert.equal(r.sessions[0].timeKnown, true);
  // Una sesión guardada de otro fin de semana (el id cambió de significado) no se pega.
  const otra = { ...con, sessions: [{ ...con.sessions[0], start: "2026-07-12T13:50:00-03:00" }] };
  assert.equal(carryOver(sin, otra).sessions[0].results, undefined);
});
