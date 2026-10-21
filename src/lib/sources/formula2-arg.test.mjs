import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { filasDe, formula2ArgSeason, nombreDe, parseCalendario, parseCampeonato, parseFecha, parsePilotos, tipoDeSesion } from "./formula2-arg.mjs";
import { buildDriverIndex } from "./driver-index.mjs";

// Páginas reales de formula2.com.ar (bajadas el 21/10/2026): calendario, fichas, campeonato y las fechas 1 (Viedma), 3 (C. del Uruguay, con una
// exclusión), 8 (Paraná, con "SALVADOR AUDISIO" al revés) y 9 (San Luis, sin tabla de clasificación).
const fixture = (name) => fs.readFileSync(new URL(`./fixtures/formula2-arg/${name}.html`, import.meta.url), "utf8");
const PAGES = {
  "https://formula2.com.ar/calendario-2026/": fixture("calendario-2026"),
  "https://formula2.com.ar/pilotos/": fixture("pilotos"),
  "https://formula2.com.ar/campeonato-de-pilotos-2026/": fixture("campeonato-de-pilotos-2026"),
  "https://formula2.com.ar/fecha-1-2026/": fixture("fecha-1-2026"),
  "https://formula2.com.ar/fecha-3-2026/": fixture("fecha-3-2026"),
  "https://formula2.com.ar/fecha-8-2026/": fixture("fecha-8-2026"),
  "https://formula2.com.ar/fecha-9-2026/": fixture("fecha-9-2026"),
};
const NOW = new Date("2026-10-21T15:00:00Z");
const fakeIo = (pages = PAGES, asked = []) => ({
  async text(url) {
    asked.push(url);
    if (!(url in pages)) throw new Error(`404 al pedir ${url}`);
    if (pages[url] instanceof Error) throw pages[url];
    return pages[url];
  },
  sleep: async () => {},
});
const run = (pages, previous, options) => formula2ArgSeason(fakeIo(pages), previous, { now: NOW, delayMs: 0, windowDays: 400, ...options });
const session = (event, kind) => event.sessions.find((s) => s.kind === kind);

test("calendario: las 12 fechas, con el día de la final y la sede como la escribe la ACTC", () => {
  const cal = parseCalendario(PAGES["https://formula2.com.ar/calendario-2026/"]);
  assert.equal(cal.length, 12);
  assert.deepEqual(cal[0], { round: 1, month: 3, day: 8, venue: "Viedma" });
  assert.deepEqual(cal[4], { round: 5, month: 5, day: 31, venue: "Alta Gracia" });
  assert.deepEqual(cal[10], { round: 11, month: 10, day: 25, venue: "Rosario" });
  assert.deepEqual(cal[11], { round: 12, month: 12, day: 6, venue: "La Plata" });
});

test("tipos de sesión por el título de la tabla", () => {
  assert.equal(tipoDeSesion("FINAL"), "final");
  assert.equal(tipoDeSesion("CARRERA CLASIFICATORIA"), "serie");
  assert.equal(tipoDeSesion("CLASIFICACIÓN"), "clasificacion");
  assert.equal(tipoDeSesion("CLASIFICACION"), "clasificacion");
  assert.equal(tipoDeSesion("1ER ENTRENAMIENTO"), "practica");
  assert.equal(tipoDeSesion("PREMIACIÓN"), null);
});

test("fecha 1: tres tablas (final, clasificatoria, clasificación) con sus filas", () => {
  const page = parseFecha(PAGES["https://formula2.com.ar/fecha-1-2026/"]);
  assert.deepEqual(page.sections.map((s) => [s.kind, s.rows.length]), [["final", 12], ["serie", 11], ["clasificacion", 12]]);
  assert.deepEqual(page.unknown, []);
  assert.deepEqual(page.sections[0].rows[0], { pos: "1", number: "7", raw: "VIDELA LAUTARO", laps: "12", time: "18:58.599", diff: "" });
  // La clasificación no tiene columna de vueltas.
  assert.deepEqual(page.sections[2].rows[1], { pos: "2", number: "44", raw: "CARAM SEBASTIAN", laps: "", time: "1:33.260", diff: "0.071" });
});

test("fecha 9 no publicó la tabla de clasificación: sólo final y clasificatoria", () => {
  const page = parseFecha(PAGES["https://formula2.com.ar/fecha-9-2026/"]);
  assert.deepEqual(page.sections.map((s) => s.kind), ["final", "serie"]);
});

test("nombres: 'APELLIDO NOMBRE' pasa a 'Nombre Apellido', con nombres compuestos, erratas y acentos", () => {
  assert.equal(nombreDe("LEONARDELLI JUAN PABLO"), "Juan Pablo Leonardelli");
  assert.equal(nombreDe("PAGOLA  JOAQUIN"), "Joaquín Pagola");
  assert.equal(nombreDe("GUTIERREZ FACUNDOF"), "Facundo Gutiérrez");
  assert.equal(nombreDe("DE LA ROSA MARTIN"), "Martin De La Rosa");
  assert.equal(nombreDe("VIDELA"), "Videla");
});

test("filas: tiempo del primero, diferencias, vueltas de atraso, exclusión y autos sin tiempo", () => {
  const rows = (kind) => parseFecha(PAGES["https://formula2.com.ar/fecha-3-2026/"]).sections.find((s) => s.kind === kind).rows;
  const nombres = new Map([["44", "Sebastián Caram"]]);
  const serie = filasDe(rows("serie"), "serie", nombres, new Map([["44", "LR Team"]]));
  assert.equal(serie[0].gap, serie[0].gap.match(/^\d+:\d{2}\.\d{3}$/)?.[0]);
  assert.match(serie[1].gap, /^\+\d+\.\d{3}$/);
  const ultimo = serie.at(-1);
  assert.deepEqual(ultimo, { pos: serie.length, positionText: "EX", status: "Excluido", number: "44", driver: "Sebastián Caram", team: "LR Team", gap: "" });
  const atrasados = serie.filter((r) => r.gap.endsWith("vueltas"));
  assert.ok(atrasados.length >= 2);
  assert.match(atrasados[0].gap, /^\+\d+ vueltas$/);
  // Sin vueltas ni tiempo: no se inventa nada.
  const sinTiempo = filasDe([{ pos: "2", number: "5", raw: "MONTI IGNACIO", laps: "--", time: "--", diff: "--" }], "final", new Map(), new Map());
  assert.deepEqual(sinTiempo[0], { pos: 1, status: "Sin vueltas", number: "5", driver: "Ignacio Monti", team: "", gap: "" });
  assert.equal(filasDe([{ pos: "12", number: "1", raw: "ALAUX VALENTINO", laps: "", time: "", diff: "" }], "clasificacion", new Map(), new Map())[0].status, "Sin tiempo");
  assert.equal(filasDe([{ pos: "3", number: "5", raw: "X Y", laps: "3", time: "5:00.000", diff: "1 Vuelta" }, { pos: "3", number: "5", raw: "X Y", laps: "3", time: "5:00.000", diff: "1 Vuelta" }], "final", new Map(), new Map())[1].gap, "+1 vuelta");
});

test("equipos de las fichas: por número, sin los nombres (que vienen al revés)", () => {
  const teams = parsePilotos(PAGES["https://formula2.com.ar/pilotos/"]);
  assert.equal(teams.get("7"), "Martinez Competicion");
  assert.equal(teams.get("5"), "Aimar Motorsport");
  assert.equal(teams.size, 14);
});

test("campeonato: puntos con coma decimal, victorias y el rótulo (9/12)", () => {
  const camp = parseCampeonato(PAGES["https://formula2.com.ar/campeonato-de-pilotos-2026/"]);
  assert.equal(camp.rows.length, 17);
  assert.deepEqual(camp.rows[0], { pos: 1, number: "7", raw: "VIDELA LAUTARO", points: 415.5, wins: 4 });
  assert.deepEqual(camp.label, { done: 9, total: 12 });
  assert.equal(camp.rows.reduce((n, r) => n + r.wins, 0), 10);
});

test("temporada: 12 fechas, tres sesiones por fecha, ganadores como en el sitio y lo que falta, sin datos", async () => {
  const season = await run();
  assert.equal(season.events.length, 12);
  assert.ok(season.events.every((e) => e.seriesId === "f2-arg" && e.sessions.map((s) => s.kind).join() === "clasificacion,serie,final"));
  const [f1, , f3, , , , , f8, f9, f10, f11] = season.events;
  assert.equal(f1.name, "Fecha 1 · Viedma");
  assert.equal(f1.sessions[0].start, "2026-03-08T12:00:00-03:00");
  assert.equal(f1.sessions.every((s) => s.timeKnown === false), true);
  assert.equal(f3.circuit.city, "Concepción del Uruguay");
  assert.equal(season.events[1].circuit.city, "Centenario"); // Neuquén: la ACTC lo pone en Centenario, igual que el TC
  assert.equal(session(f1, "final").results[0].driver, "Lautaro Videla");
  assert.equal(session(f1, "clasificacion").results[0].driver, "Franco Ledesma");
  assert.equal(session(f1, "serie").results[0].driver, "Sebastián Caram");
  assert.equal(session(f3, "final").results[0].driver, "Franco Ledesma");
  assert.equal(session(f8, "final").results[0].driver, "Juan Pablo Leonardelli");
  assert.equal(session(f9, "serie").results[0].driver, "Valentino Alaux");
  assert.equal(session(f9, "final").results[0].driver, "Federico Piper");
  assert.equal(session(f9, "clasificacion").results, undefined);
  assert.equal(session(f1, "final").resultsSource.url, "https://formula2.com.ar/fecha-1-2026/");
  // Fechas 2, 4-7 y 10 no tienen fixture (404): quedan sin resultados, y la 11 y 12 todavía no se corrieron.
  assert.equal(f10.sessions.some((s) => s.results), false);
  assert.equal(f11.sessions.some((s) => s.results), false);
  // Una misma persona con un único nombre, aunque la fuente lo escriba al revés ("SALVADOR AUDISIO" en la fecha 8).
  const nombres = new Set(season.events.flatMap((e) => e.sessions.flatMap((s) => (s.results ?? []).map((r) => `${r.number}|${r.driver}`))));
  assert.ok(nombres.has("33|Salvador Audisio"));
  assert.equal([...nombres].filter((n) => n.startsWith("33|")).length, 1);
  assert.ok(nombres.has("113|Facundo Gutiérrez"));
  assert.equal(session(f1, "final").results[0].team, "Martinez Competicion");
});

test("campeonato: 17 pilotos, líder Videla, y la tabla se toma tras la fecha 10 porque suma 10 victorias aunque diga (9/12)", async () => {
  const { standings, meta } = await run();
  const table = standings["f2-arg"];
  assert.equal(table.length, 17);
  assert.deepEqual(table[0], { pos: 1, driver: "Lautaro Videla", team: "Martinez Competicion", points: 415.5, wins: 4 });
  assert.equal(table[4].driver, "Juan Pablo Leonardelli"); // «LEONARDELLI JUAN P.» en el campeonato, con el nombre completo de los resultados
  assert.equal(table.at(-1).driver, "Iván Percara"); // «IVAN PERCARA»: el campeonato lo escribe al revés
  assert.equal(meta["f2-arg"].standingsAsOfRound, 10);
  assert.equal(meta["f2-arg"].standingsLabel, "Pilotos");
  assert.match(meta["f2-arg"].notes.join(" "), /\(9\/12\).*10 victorias/);
});

test("sólo se piden las fechas ya corridas, con pausa entre pedidos", async () => {
  const asked = [];
  const sleeps = [];
  const io = { ...fakeIo(PAGES, asked), sleep: async (ms) => sleeps.push(ms) };
  await formula2ArgSeason(io, undefined, { now: new Date("2026-04-01T15:00:00Z"), delayMs: 400, windowDays: 400 });
  assert.deepEqual(asked.filter((u) => u.includes("/fecha-")).map((u) => u.match(/fecha-(\d+)/)[1]), ["1", "2"]);
  assert.ok(sleeps.length >= 3 && sleeps.every((ms) => ms === 400));
});

test("las fechas fuera de la ventana no se vuelven a pedir: se toman de la versión anterior", async () => {
  const first = await run();
  const asked = [];
  const season = await formula2ArgSeason(fakeIo(PAGES, asked), { events: first.events, standings: first.standings, meta: first.meta }, { now: NOW, delayMs: 0, windowDays: 10 });
  // Sólo se vuelven a pedir las fechas que no tienen resultados cargados (acá, las que el fixture no trae).
  const pedidas = asked.filter((u) => u.includes("/fecha-")).map((u) => Number(u.match(/fecha-(\d+)/)[1]));
  assert.deepEqual(pedidas, [2, 4, 5, 6, 7, 10]);
  assert.equal(session(season.events[0], "final").results[0].driver, "Lautaro Videla");
});

test("guard: una página de fecha que hoy falla o viene vacía no borra los resultados ya cargados", async () => {
  const first = await run();
  const broken = { ...PAGES, "https://formula2.com.ar/fecha-1-2026/": new Error("HTTP 500"), "https://formula2.com.ar/fecha-3-2026/": "<html><body><h1>Fecha 3</h1></body></html>" };
  const season = await run(broken, { events: first.events, standings: first.standings, meta: first.meta });
  assert.equal(session(season.events[0], "final").results[0].driver, "Lautaro Videla");
  assert.equal(session(season.events[2], "final").results[0].driver, "Franco Ledesma");
  assert.match(season.meta["f2-arg"].errors.join(" "), /Fecha 1: HTTP 500/);
});

test("guard: un calendario con menos fechas que antes no achica la temporada", async () => {
  const first = await run();
  const corto = PAGES["https://formula2.com.ar/calendario-2026/"].replace(/<tr[^>]*>(?:(?!<\/tr>)[\s\S])*La Plata[\s\S]*?<\/tr>/, "");
  const season = await run({ ...PAGES, "https://formula2.com.ar/calendario-2026/": corto }, { events: first.events, standings: first.standings, meta: first.meta });
  assert.equal(parseCalendario(corto).length, 11);
  assert.equal(season.events.length, 12);
  assert.match(season.meta["f2-arg"].notes.join(" "), /dejó de traer 1 fechas/);
});

test("guard: un campeonato que hoy trae menos pilotos o viene vacío no pisa la tabla anterior", async () => {
  const first = await run();
  const camp = PAGES["https://formula2.com.ar/campeonato-de-pilotos-2026/"];
  for (const page of [camp.replace(/<tbody>[\s\S]*<\/tbody>/, "<tbody></tbody>"), camp.replace(/<tr class="row-18">[\s\S]*?<\/tr>/, "")]) {
    const season = await run({ ...PAGES, "https://formula2.com.ar/campeonato-de-pilotos-2026/": page }, { events: first.events, standings: first.standings, meta: first.meta });
    assert.equal(season.standings["f2-arg"].length, 17);
    assert.equal(season.meta["f2-arg"].standingsAsOfRound, 10);
    assert.match(season.meta["f2-arg"].errors.join(" "), /Campeonato/);
  }
});

test("una sección con título desconocido se anota y no rompe la fecha", async () => {
  const raro = PAGES["https://formula2.com.ar/fecha-1-2026/"].replace("» FINAL", "» PREMIACIÓN").replace("» CARRERA CLASIFICATORIA", "» FINAL");
  const { events, meta } = await run({ ...PAGES, "https://formula2.com.ar/fecha-1-2026/": raro });
  assert.match(meta["f2-arg"].notes.join(" "), /Fecha 1: sección «PREMIACIÓN» sin tipo conocido/);
  assert.equal(session(events[0], "final").results.length, 11); // la tabla de la clasificatoria, que ahora figura como FINAL
});

test("si el calendario no responde, la fuente falla (la temporada conserva lo anterior)", async () => {
  await assert.rejects(run({ ...PAGES, "https://formula2.com.ar/calendario-2026/": "<html></html>" }), /ninguna fecha/);
  await assert.rejects(run({}), /404/);
});

test("pilotos: los de la Fórmula 2 Argentina entran al índice, con su número y equipo, y se unen a quien ya corre en otra categoría", async () => {
  const { events } = await run();
  const tcMouras = { seriesId: "tc-mouras", sessions: [{ start: "2026-03-01T12:00:00-03:00", results: [{ pos: 1, driver: "Valentino Alaux", number: "9", team: "Ford" }] }] };
  const index = buildDriverIndex({ events: [tcMouras, ...events], meta: {} }, undefined);
  const by = new Map(index.drivers.map((d) => [d.slug, d]));
  assert.equal(index.drivers.filter((d) => d.series.includes("f2-arg")).length, 17);
  assert.deepEqual(by.get("valentino-alaux").series, ["tc-mouras", "f2-arg"]);
  assert.equal(by.get("valentino-alaux").numbers["f2-arg"], "1");
  assert.equal(by.get("lautaro-videla").teams["f2-arg"], "Martinez Competicion");
  // «Caram» termina como la marca «RAM»: la limpieza de marcas pegadas no se lo puede comer.
  assert.equal(by.get("sebastian-caram").name, "Sebastián Caram");
});
