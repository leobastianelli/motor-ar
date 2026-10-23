import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { CLASES, claseDeTexto } from "./cordoba-pista-clases.mjs";
import { cordobaPistaSeason, filasDe, keepPreviousCordobaPista, ORG } from "./cordoba-pista.mjs";
import { protectSeason } from "./guard.mjs";
import { mismoNombre, nombreVisible } from "./cordoba-pista-nombres.mjs";
import { seriesById } from "../../data/series.ts";
import { FIXTURE, fakeIo, NOW } from "./fixtures/cordoba-pista/io.mjs";

const run = (io = fakeIo(), previous) => cordobaPistaSeason(io, previous, { windowDays: 400, now: NOW });
const finalesDe = (event, classId) => event.sessions.filter((s) => s.classId === classId && s.kind === "final" && s.results?.length);
const ganador = (s) => s.results[0].driver;

test("reconoce las 6 fechas de Córdoba Pista entre los eventos de la organización y descarta los demás", async () => {
  const { events, meta } = await run();
  assert.deepEqual(events.map((e) => e.round), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(events.map((e) => e.id), [1, 2, 3, 4, 5, 6].map((n) => `cordoba-pista-2026-${n}`));
  assert.ok(events.every((e) => e.seriesId === "cordoba-pista"));
  assert.equal(meta.cordobaPista.errors.length, 0);
  // Sedes: como las escribe el resto del sitio (mismas ciudades que la ACTC, para "Corren el mismo finde").
  assert.deepEqual(events.map((e) => e.circuit.city), ["Alta Gracia", "Río Cuarto", "Alta Gracia", "Río Cuarto", "Alta Gracia", "Río Cuarto"]);
});

test("fecha 6 de Río Cuarto: los ganadores de la final de cada clase", async () => {
  const { events } = await run();
  const f6 = events.find((e) => e.round === 6);
  const esperado = { tc4000: "Rasetto", tcp4000: "Martinbianco", tch: "Gutierrez", clase3: "Pacciaroni", fiat: "Pavon", fiat128: "Ronga" };
  for (const [classId, apellido] of Object.entries(esperado)) {
    const finales = finalesDe(f6, classId);
    assert.equal(finales.length, 1, `${classId}: una final`);
    assert.match(ganador(finales[0]), new RegExp(apellido), `${classId}: ${ganador(finales[0])}`);
  }
  // Fórmula Renault Plus corre dos finales: la del sábado la ganó Olmos y la del domingo (la que anuncia la prensa) Della Santina.
  const frp = finalesDe(f6, "frplus");
  assert.equal(frp.length, 2);
  assert.deepEqual(frp.map((s) => s.name), ["Final 1 FR Plus", "Final 2 FR Plus"]);
  assert.match(ganador(frp[0]), /Olmos/);
  assert.match(ganador(frp[1]), /Della Santina/);
});

test("los nombres salen como 'Nombre Apellido' y una misma persona no se parte en dos", async () => {
  const { events } = await run();
  const f6 = events.find((e) => e.round === 6);
  assert.equal(ganador(finalesDe(f6, "tc4000")[0]), "Genaro Rasetto");
  assert.equal(ganador(finalesDe(f6, "fiat128")[0]), "Exequiel Ronga");
  // "D SANTINA Bautista" (fecha 5) y "DELLA SANTINA Bautista": una sola persona.
  const nombres = new Set(events.flatMap((e) => e.sessions.filter((s) => s.classId === "frplus").flatMap((s) => s.results ?? []).map((r) => r.driver)));
  assert.equal([...nombres].filter((n) => /Santina/.test(n)).length, 1, [...nombres].filter((n) => /Santina/.test(n)).join(", "));
  // Errata de una letra ("STANGUET" / "ESTANGUET") y orden distinto ("A DIEGO MARTINEZ").
  const fiat = new Set(events.flatMap((e) => e.sessions.filter((s) => s.classId === "fiat").flatMap((s) => s.results ?? []).map((r) => r.driver)));
  assert.equal([...fiat].filter((n) => /nguet/i.test(n)).length, 1, [...fiat].filter((n) => /nguet/i.test(n)).join(", "));
  assert.equal([...fiat].filter((n) => /Strazz?olini/i.test(n)).length, 1);
  assert.ok(mismoNombre("MARTINEZ DIEGO A.", "Diego A Martinez"));
  assert.ok(!mismoNombre("VIEL Rodrigo", "VIEL Gonzalo"));
  assert.ok(!mismoNombre("MARTINEZ Ulises", "MARTINEZ Ayrton"));
  assert.equal(nombreVisible("BOSIO, Luciano"), "Luciano Bosio");
  assert.equal(nombreVisible("DELLA SANTINA Bautista"), "Bautista Della Santina");
  assert.equal(nombreVisible("MARTINEZ DIEGO A."), "Diego A. Martinez");
  // Nunca mayúsculas sostenidas en lo que se muestra.
  for (const n of nombres) assert.notEqual(n, n.toUpperCase());
});

test("no hay sesiones con fecha 1970 ni resúmenes 'Entrenamiento gral', y cada una lleva su clase y su hora real", async () => {
  const { events } = await run();
  for (const e of events) {
    for (const s of e.sessions) {
      assert.ok(Date.parse(s.start) > Date.parse("2026-01-01"), `${s.id}: ${s.start}`);
      assert.ok(!/gral/i.test(s.name), s.name);
      assert.ok(CLASES.some((c) => c.id === s.classId), `${s.id}: clase ${s.classId}`);
      assert.equal(s.timeKnown, true);
      assert.ok(s.timeSources?.[0]?.url.startsWith("https://speedhive.mylaps.com/events/"));
    }
  }
});

test("la final combinada de la fecha 5 ('FINAL TC PISTA 4000 Y TC 4000') se reparte entre las dos clases", async () => {
  const { events } = await run();
  const f5 = events.find((e) => e.round === 5);
  const tc = finalesDe(f5, "tc4000");
  const tcp = finalesDe(f5, "tcp4000");
  assert.equal(tc.length, 1);
  assert.equal(tcp.length, 1);
  assert.equal(tc[0].results.length + tcp[0].results.length, 23);
  // Cada clase con sus pilotos (Ricardo Vanini, padre e hijo, corre en las dos con el número 17).
  const repetidos = tcp[0].results.filter((r) => tc[0].results.some((x) => x.driver === r.driver)).map((r) => r.driver);
  assert.deepEqual(repetidos, []);
  assert.deepEqual(tc[0].results.filter((r) => /Vanini/.test(r.driver)).map((r) => r.driver), ["Ricardo Vanini (h)"]);
  assert.deepEqual(tcp[0].results.filter((r) => /Vanini/.test(r.driver)).map((r) => r.driver), ["Ricardo Vanini (p)"]);
  assert.match(ganador(tc[0]), /Rasetto/);
});

test("un piloto que no da el 75 % de las vueltas figura 'NC' y el descalificado 'DSQ' (como en el PDF oficial)", async () => {
  const { events } = await run();
  const f6 = events.find((e) => e.round === 6);
  const castro = finalesDe(f6, "fiat128")[0].results.find((r) => /Castro/.test(r.driver));
  assert.equal(castro.positionText, "NC");
  const f3 = events.find((e) => e.round === 3);
  const terrier = finalesDe(f3, "tc4000")[0].results.find((r) => /Terrier/.test(r.driver));
  assert.equal(terrier.positionText, "DSQ");
  assert.equal(terrier.status, "Descalificado");
});

test("filasDe: mejor vuelta en clasificación, tiempo total en carrera, diferencias y vueltas", () => {
  const c = {
    rows: [
      { position: 2, startNumber: "9", name: "B", numberOfLaps: 11, status: "Normal", difference: { lapsBehind: 0, timeDifference: "00.288" } },
      { position: 1, startNumber: "4", name: "A", numberOfLaps: 12, totalTime: "17:34.329", bestTime: "01:21.507", status: "Normal", difference: { lapsBehind: 0, timeDifference: "00.000" } },
      { position: 3, startNumber: "7", name: "C", numberOfLaps: 11, status: "Normal", difference: { lapsBehind: 1, timeDifference: "" } },
    ],
  };
  const carrera = filasDe(c, "final", (n) => n);
  assert.deepEqual(carrera.map((r) => [r.pos, r.driver, r.gap, r.laps]), [[1, "A", "17:34.329", 12], [2, "B", "+0.288", 11], [3, "C", "+1 vuelta", 11]]);
  assert.equal(filasDe(c, "clasificacion", (n) => n)[0].gap, "1:21.507");
});

// ——— "Las fuentes nunca se achican" ———

const total = (events) => events.reduce((n, e) => n + e.sessions.filter((s) => s.results?.length).length, 0);

test("no se achica: si Speedhive trae menos fechas o resultados que antes, se conserva lo anterior", async () => {
  const primera = await run();
  const antes = total(primera.events);
  assert.ok(antes > 100, `sesiones con resultados: ${antes}`);
  const previous = { events: primera.events, standings: {}, meta: primera.meta };

  // 1. La lista ya no trae la fecha 6 ni la 3 (se renombró o se borró): siguen estando con todos sus resultados.
  const sinFechas = await run(fakeIo({ without: new Set([3727601, 3545860]) }), previous);
  assert.equal(sinFechas.events.length, 6);
  assert.equal(total(sinFechas.events), antes);

  // 2. Algunas clasificaciones fallan o vienen vacías: no se pierden los resultados ya guardados.
  const fallan = await run(fakeIo({ failing: new Set(Object.keys(FIXTURE.classifications).slice(0, 40).map(Number)) }), previous);
  assert.equal(total(fallan.events), antes);
  const vacias = await run(fakeIo({ emptyResults: true }), previous);
  assert.equal(total(vacias.events), antes);

  // 3. Speedhive caído por completo: la temporada (season.mjs) usa `keepPreviousCordobaPista`.
  await assert.rejects(run(fakeIo({ fail: true }), previous));
  assert.equal(keepPreviousCordobaPista([], previous).length, 6);

  // 4. Y la red de seguridad general (guard.mjs) no tiene nada que restaurar.
  const guardado = protectSeason(sinFechas.events, previous, NOW.getTime());
  assert.deepEqual(guardado.warnings, []);

  // 5. El campeonato tampoco se achica: con resultados vacíos se mantiene la tabla calculada.
  assert.equal(vacias.meta["cordoba-pista"].clases.tc4000.status, "calculado");
  assert.equal(vacias.meta["cordoba-pista"].clases.tc4000.rows.length, primera.meta["cordoba-pista"].clases.tc4000.rows.length);
});

test("una fecha nueva toma el número siguiente y las anteriores conservan el suyo", async () => {
  const primera = await run();
  const nueva = JSON.parse(JSON.stringify(FIXTURE));
  const copia = JSON.parse(JSON.stringify(FIXTURE.events[3727601]));
  copia.id = 3800000;
  copia.startDate = "2026-10-24";
  copia.name = "CUALQUIER NOMBRE NUEVO";
  copia.sessions.groups = copia.sessions.groups.map((g) => ({ ...g, sessions: g.sessions.map((s) => ({ ...s, id: s.id + 9000000, startTime: s.startTime.replace("2026-09-2", "2026-10-2") })) }));
  nueva.list.unshift({ id: 3800000, name: copia.name, startDate: "2026-10-24", sport: "Car" });
  nueva.events[3800000] = copia;
  const io = fakeIo();
  const base = io.json;
  io.json = async (url) => {
    if (url.includes(`/organizations/${ORG}/events`)) return nueva.list;
    let m;
    if ((m = url.match(/\/events\/3800000\?/))) return copia;
    if ((m = url.match(/\/sessions\/(\d+)\/classification/)) && Number(m[1]) > 9000000) return { rows: [] };
    return base(url);
  };
  const { events } = await run(io, { events: primera.events, standings: {}, meta: primera.meta });
  assert.deepEqual(events.map((e) => e.round), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(events.find((e) => e.round === 7).circuit.city, "Río Cuarto");
  assert.equal(events.find((e) => e.round === 6).speedhiveEventId, 3727601);
});

// ——— Clases con el mismo nombre en otras categorías: nada choca ———

test("la Clase 3 de Córdoba Pista no choca con la del TN: ids de clase, de sesión, de campeonato y filtros propios", async () => {
  const { events, meta } = await run();
  const snapshot = JSON.parse(fs.readFileSync(new URL("../../data/season-2026.json", import.meta.url), "utf8"));
  const tn = snapshot.events.filter((e) => e.seriesId === "tn");

  // Los ids de las clases son de la categoría: ninguno coincide con el id de otra categoría del sitio.
  for (const c of CLASES) assert.equal(seriesById[c.id], undefined, `la clase ${c.id} coincide con una categoría`);
  assert.equal(new Set(CLASES.map((c) => c.id)).size, CLASES.length);
  assert.equal(new Set(CLASES.map((c) => c.code)).size, CLASES.length);
  assert.ok(seriesById["cordoba-pista"].classes.some((c) => c.id === "clase3"));
  assert.equal(seriesById.tn.classes, undefined);

  // Los ids de sesión de Córdoba Pista llevan el id de la fecha y de la clase: no hay ninguno repetido, ni dentro de la categoría ni contra el TN.
  const cp = events.flatMap((e) => e.sessions.map((s) => s.id));
  assert.equal(new Set(cp).size, cp.length, "ids de sesión repetidos");
  assert.ok(events.every((e) => e.sessions.every((s) => s.id.startsWith(`${e.id}-${s.classId}-`))));
  const ids = new Set(cp);
  for (const e of tn) for (const s of e.sessions) assert.ok(!ids.has(s.id), `id compartido con el TN: ${s.id}`);
  assert.ok(!events.some((e) => tn.some((t) => t.id === e.id)));

  // Hay sesiones con el mismo nombre visible ("Final Clase 3") en las dos categorías, y aun así son distinguibles: sólo la de Córdoba Pista lleva
  // `classId`, y un filtro por (categoría, clase) no trae las del TN.
  const cp3 = events.flatMap((e) => e.sessions).filter((s) => s.classId === "clase3");
  assert.ok(cp3.some((s) => s.name === "Final Clase 3"));
  assert.ok(tn.flatMap((e) => e.sessions).some((s) => s.name === "Final Clase 3" || /Clase 3/.test(s.name)));
  assert.ok(tn.flatMap((e) => e.sessions).every((s) => s.classId === undefined));
  const filtro = (evs, seriesId, classId) => evs.filter((e) => e.seriesId === seriesId).flatMap((e) => e.sessions).filter((s) => s.classId === classId);
  assert.equal(filtro([...events, ...tn], "tn", "clase3").length, 0);
  assert.equal(filtro([...events, ...tn], "cordoba-pista", "clase3").length, cp3.length);

  // El campeonato de la clase vive bajo la categoría (meta["cordoba-pista"].clases.clase3): no pisa la tabla ni el meta del TN.
  assert.ok(meta["cordoba-pista"].clases.clase3);
  assert.equal(meta.tn, undefined);
  assert.deepEqual(Object.keys(meta["cordoba-pista"].clases).sort(), CLASES.map((c) => c.id).sort());
  assert.equal(claseDeTexto("CLASE 3 "), "clase3");
});

test("claseDeTexto reconoce los nombres que usó el cronometraje (con errores de tipeo incluidos)", () => {
  const casos = {
    "TC 4000": "tc4000", "TCP 4000": "tcp4000", "TC PISTA 4000": "tcp4000", "TURISMO FIAT": "fiat", "TURISMO FIAT ": "fiat", "FIAT UNO": "fiat",
    "TURISMO FIAT 128": "fiat128", "T FIAT 128": "fiat128", "T. FIAT 128": "fiat128", "Tursimo FIAT 128": "fiat128", "T.C.H.": "tch", "T.C.H": "tch", TCH: "tch",
    "CLASE 3": "clase3", "T.Clase 3 1,6": "clase3", "FORMULA R PLUS": "frplus", "FORMULA R. PLUS": "frplus", "FORMULA RENAULT PLUS": "frplus", "Formula R.Plus": "frplus",
  };
  for (const [text, id] of Object.entries(casos)) assert.equal(claseDeTexto(text), id, text);
  for (const no of ["KARTING", "CLASE 1", "REGIONAL A", ""]) assert.equal(claseDeTexto(no), null, no);
});

// ——— Fechas 7 a 9: día y sede confirmados (APICER, 9/10/2026: la 7 y la 8 en jornada doble); la 7 y la 8 con el cronograma de Puntal, la 9 sin horarios hasta Speedhive ———

test("las fechas 7, 8 y 9 se cargan con fecha confirmada; la 7 y la 8 con horarios provisorios por clase, la 9 a confirmar", async () => {
  const { dateStatus } = await import("../monitor/checks.mjs");
  const manual = JSON.parse(fs.readFileSync(new URL("../../data/manual-overrides.json", import.meta.url), "utf8"));
  const tentativas = manual.newEvents.filter((e) => e.seriesId === "cordoba-pista");
  assert.deepEqual(tentativas.map((e) => e.id), ["cordoba-pista-2026-7", "cordoba-pista-2026-8", "cordoba-pista-2026-9"]);
  // La 7 arranca el viernes 23 con los primeros entrenamientos (cronograma de Puntal, 20/10/2026).
  const esperado = [["2026-10-23", "2026-10-24", "Alta Gracia"], ["2026-10-25", "2026-10-25", "Alta Gracia"], ["2026-12-12", "2026-12-13", "Río Cuarto"]];
  tentativas.forEach((e, i) => {
    assert.equal(e.round, 7 + i);
    assert.equal(dateStatus(e).status, "confirmed", e.id);
    assert.ok(e.dateConfirmed);
    assert.doesNotMatch(e.name, /confirmar/i);
    assert.deepEqual([e.sessions[0].start.slice(0, 10), e.sessions.at(-1).start.slice(0, 10), e.circuit.city], esperado[i]);
    assert.match(e.source, /confirmados por APICER el 9\/10\/2026.*Speedhive/);
  });
  // Fechas 7 y 8: sesiones por clase con el id que les daría Speedhive (`<evento>-<clase>-<tipo>[n]`), provisorias y citando a Puntal.
  const clases = ["tc4000", "tcp4000", "fiat", "fiat128", "tch", "clase3", "frplus"];
  const corregidas = { "cordoba-pista-2026-8-tch-final": "12:15", "cordoba-pista-2026-8-fiat128-final": "12:50", "cordoba-pista-2026-8-tc4000-final": "13:25" };
  for (const e of tentativas.slice(0, 2)) {
    assert.equal(new Set(e.sessions.map((s) => s.id)).size, e.sessions.length, `${e.id}: ids repetidos`);
    assert.deepEqual([...new Set(e.sessions.map((s) => s.classId))].sort(), [...clases].sort(), `${e.id}: las siete clases`);
    for (const c of clases) assert.ok(e.sessions.some((s) => s.classId === c && s.kind === "final"), `${e.id}: final de ${c}`);
    for (const s of e.sessions) {
      assert.match(s.id, new RegExp(`^${e.id}-(${clases.join("|")})-(practica|clasificacion|final)(-super)?[12]?$`), s.id);
      // Las tres finales que Puntal tenía mal o en duda las corrige el cronograma oficial de Córdoba Pista en Instagram (22/10/2026).
      const fuente = corregidas[s.id] ? /^https:\/\/www\.instagram\.com\/cordobapista\// : /^https:\/\/www\.puntal\.com\.ar\/cordoba-pista\/el-oscar-cabalen-recibe-al-cordoba-pista/;
      assert.match(s.timeSources[0].url, fuente, s.id);
      assert.equal(s.timeSources[0].start, s.start);
      if (s.timeKnown) assert.equal(s.timeStatus, "tentative", s.id);
    }
    assert.equal(e.sessions.filter((s) => s.classId === "frplus" && s.kind === "final").length, e.id.endsWith("-7") ? 2 : 1);
  }
  // Puntal ponía la final del Histórico y la del Fiat 128 del domingo a 5 minutos (12.15 y 12.20) y la del TC 4000 a la hora de la apertura de
  // boxes (13.15): el cronograma oficial las corrige y el domingo queda entero con hora.
  const f8 = tentativas[1].sessions;
  assert.deepEqual(f8.filter((s) => !s.timeKnown).map((s) => s.id), []);
  for (const [id, hora] of Object.entries(corregidas)) assert.equal(f8.find((s) => s.id === id).start, `2026-10-25T${hora}:00-03:00`, id);
  for (const s of tentativas[2].sessions) {
    assert.equal(s.timeKnown, false, `${s.id}: sin horario`);
    assert.match(s.timeSources[0].url, /^https:\/\/cordobapista\.com\/se-definio-las-ultimas-fechas-de-la-temporada-2026/);
    assert.equal(s.classId, undefined);
  }
  // Cuando Speedhive trae la fecha, gana la fuente: mismo id que la carga manual (createSeason en data.ts: "si una fuente trae el mismo id, gana la fuente").
  const { events } = await run();
  assert.ok(!events.some((e) => tentativas.some((t) => t.id === e.id)), "la fixture no tiene fechas 7 a 9");
  assert.equal(events.at(-1).id, "cordoba-pista-2026-6");
});

test("homónimos: las fechas guardadas con el nombre viejo que no se vuelven a pedir también quedan (h) y (p)", async () => {
  // Lo que pasó en producción: la base tenía "Ricardo Vanini" en todas las fechas y la sincronización sólo vuelve a pedir las recientes.
  const completa = await run();
  const viejo = (e) => ({ ...e, sessions: e.sessions.map((s) => ({ ...s, results: s.results?.map((r) => ({ ...r, driver: r.driver.replace(/ \((h|p)\)$/, "") })) })) });
  const guardada = { events: completa.events.map(viejo), standings: {}, meta: {} };
  const corta = await cordobaPistaSeason(fakeIo(), guardada, { windowDays: 20, now: NOW });
  const vanini = corta.events.flatMap((e) => e.sessions).flatMap((s) => (s.results ?? []).filter((r) => /Vanini/.test(r.driver)).map((r) => `${s.classId}: ${r.driver}`));
  assert.ok(vanini.length > 20);
  assert.deepEqual([...new Set(vanini)].sort(), ["tc4000: Ricardo Vanini (h)", "tcp4000: Ricardo Vanini (p)"]);
  const puntos = (m) => m.meta["cordoba-pista"].clases.tc4000.rows.find((r) => r.driver === "Ricardo Vanini (h)")?.points;
  assert.equal(puntos(corta), puntos(completa));
  assert.equal(keepPreviousCordobaPista([], guardada).flatMap((e) => e.sessions).flatMap((s) => s.results ?? []).filter((r) => r.driver === "Ricardo Vanini").length, 0);
});

test("homónimos: Ricardo Vanini sale (h) en TC 4000 y (p) en TC Pista 4000 en todas las sesiones, también al volver a sincronizar con lo guardado", async () => {
  const primera = await run();
  const segunda = await run(fakeIo(), { events: primera.events, standings: {}, meta: primera.meta });
  for (const { events } of [primera, segunda]) {
    const vanini = events.flatMap((e) => e.sessions).flatMap((s) => (s.results ?? []).filter((r) => /Vanini/.test(r.driver)).map((r) => [s.classId, r.driver]));
    assert.ok(vanini.length > 20);
    assert.deepEqual([...new Set(vanini.map(([c, d]) => `${c}: ${d}`))].sort(), ["tc4000: Ricardo Vanini (h)", "tcp4000: Ricardo Vanini (p)"]);
  }
  // El campeonato calculado de cada clase tiene su Vanini, con los mismos puntos de antes.
  const filas = (m, c) => m.meta["cordoba-pista"].clases[c].rows.filter((r) => /Vanini/.test(r.driver));
  assert.deepEqual(filas(primera, "tc4000").map((r) => r.driver), ["Ricardo Vanini (h)"]);
  assert.deepEqual(filas(segunda, "tc4000").map((r) => [r.driver, r.points]), filas(primera, "tc4000").map((r) => [r.driver, r.points]));
  if (primera.meta["cordoba-pista"].clases.tcp4000.rows) assert.ok(filas(primera, "tcp4000").every((r) => r.driver === "Ricardo Vanini (p)"));
});
