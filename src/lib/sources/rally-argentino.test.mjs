import assert from "node:assert/strict";
import { test } from "node:test";
import { campeonatosDeRally, marcaDe, parseCampeonato } from "./rally-argentino-campeonato.mjs";
import { CLASES, claseDeTexto } from "./rally-argentino-clases.mjs";
import { nombrePropio, tripulacion } from "./rally-argentino-nombres.mjs";
import {
  carreraCerrada,
  diferenciaDe,
  esLaFecha,
  filasDe,
  firmaDe,
  parseCalendario,
  parseFechas,
  porClase,
  rallyArgentinoSeason,
  sedeDe,
  tiempoDe,
} from "./rally-argentino.mjs";

// ---------------------------------------------------------------------------------------------------------------- nombres y clases

test("nombres: el apellido en mayúsculas de la API pasa a Nombre Apellido y el apóstrofo es siempre el común", () => {
  assert.equal(nombrePropio("Federico VILLAGRA"), "Federico Villagra");
  assert.equal(nombrePropio("Augusto D'AGOSTINI"), "Augusto D'Agostini");
  assert.equal(nombrePropio("Augusto D´Agostini"), "Augusto D'Agostini"); // la tabla del campeonato usa un acento agudo
  assert.equal(nombrePropio("Federico  Villagra"), "Federico Villagra"); // dos espacios
  assert.equal(nombrePropio("Genaro GONZÁLEZ"), "Genaro González");
  assert.equal(nombrePropio("Juan Pablo DEL RIEGO"), "Juan Pablo Del Riego");
  assert.equal(nombrePropio("Nicolás González"), "Nicolás González"); // ya bien escrito: no se toca
  assert.equal(tripulacion("Federico VILLAGRA", "Diego CURLETTO"), "Federico Villagra / Diego Curletto");
});

test("clases: la API y las tablas escriben distinto, se reconocen por su forma", () => {
  for (const [texto, id] of [["RC2", "rc2"], ["Copa RC2", "copa-rc2"], ["COPA RC2", "copa-rc2"], ["rc2copa", "copa-rc2"], ["RCMR", "maxi-rally"], ["mrally", "maxi-rally"], ["Maxi Rally", "maxi-rally"], ["copatoyota", "copa-toyota"], ["Copa Toyota", "copa-toyota"], ["RC3", "rc3"], ["rc4", "rc4"], ["rc5", "rc5"]]) {
    assert.equal(claseDeTexto(texto), id, texto);
  }
  assert.equal(claseDeTexto("Junior"), null);
  assert.equal(claseDeTexto(""), null);
  assert.equal(CLASES.length, 7);
});

// ---------------------------------------------------------------------------------------------------------------- tiempos y filas

const piloto = (nro, nombre, navegante, clase, total, extra = {}) => ({ nro: String(nro), piloto: nombre, navegante, vehiculo: "Skoda Fabia RS Rally2", clase, finalizo: "Si", totalSegundos: total, tiempoNetoSegundos: total, penalizacionesSegundos: 0, ...extra });

test("tiempos: décimas, horas sólo cuando hacen falta, diferencia con el líder", () => {
  assert.equal(tiempoDe(4934.647), "1:22:14.6");
  assert.equal(tiempoDe(3204.6999999999994), "53:24.7");
  assert.equal(tiempoDe(60), "1:00.0");
  assert.equal(diferenciaDe(4962.259, 4934.647), "+27.6");
  assert.equal(diferenciaDe(4999.192999999999, 4934.647), "+1:04.5");
  assert.equal(diferenciaDe(4934.647 + 3723.5, 4934.647), "+1:02:03.5");
});

test("filas: la diferencia sale del tiempo total (con penalizaciones), no del neto, y el orden de la fuente se respeta", () => {
  const pilotos = [
    piloto(3, "Federico VILLAGRA", "Diego CURLETTO", "RC2", 4934.647),
    // El neto de Baldoni (4932,259) es menor que el de Villagra, pero con los 30 s de penalización llega segundo.
    piloto(1, "Miguel BALDONI", "Gustavo FRANCHELLO", "RC2", 4962.259, { tiempoNetoSegundos: 4932.259, penalizacionesSegundos: 30 }),
    piloto(6, "Diego MICELI", "Sergio DAPARTE", "COPA RC2", 5005.597),
  ];
  const rows = filasDe(pilotos);
  assert.deepEqual(rows.map((r) => [r.pos, r.number, r.driver, r.gap]), [
    [1, "3", "Federico Villagra / Diego Curletto", "1:22:14.6"],
    [2, "1", "Miguel Baldoni / Gustavo Franchello", "+27.6"],
    [3, "6", "Diego Miceli / Sergio Daparte", "+1:11.0"],
  ]);
  assert.equal(rows[0].team, "Skoda Fabia RS Rally2");
  assert.equal(rows[0].class, "RC2"); // la general lleva la clase de cada fila
  assert.equal(rows[2].class, "Copa RC2");
});

test("clases: la posición dentro de la clase es el orden de llegada entre los de esa clase, y la diferencia es con el líder de la clase", () => {
  const pilotos = [
    piloto(3, "Federico VILLAGRA", "Diego CURLETTO", "RC2", 4934.647),
    piloto(6, "Diego MICELI", "Sergio DAPARTE", "COPA RC2", 5005.597),
    piloto(10, "Rodrigo DISALVO", "Andrés PISSACO", "Copa RC2", 5051.576), // la API escribe la clase con distinta capitalización
    piloto(50, "Nicolás GONZÁLEZ", "Gerónimo BORDIGNON", "RCMR", 5167.759),
  ];
  const clases = porClase(pilotos);
  assert.deepEqual(Object.keys(clases), ["rc2", "copa-rc2", "maxi-rally"]);
  const copa = filasDe(clases["copa-rc2"], { claseId: "copa-rc2" });
  assert.deepEqual(copa.map((r) => [r.pos, r.driver, r.gap]), [
    [1, "Diego Miceli / Sergio Daparte", "1:23:25.6"],
    [2, "Rodrigo Disalvo / Andrés Pissaco", "+46.0"],
  ]);
  assert.equal(copa[0].class, undefined); // en su propia clase no hace falta aclararla
});

test("filas: quien no terminó va después de los que terminaron, sin diferencia, con su estado", () => {
  const rows = filasDe([piloto(1, "Uno UNO", "Dos DOS", "RC2", 100), piloto(2, "Tres TRES", "Cuatro CUATRO", "RC2", 0, { finalizo: "No" }), piloto(3, "Cinco CINCO", "Seis SEIS", "RC2", 120)]);
  assert.deepEqual(rows.map((r) => [r.pos, r.number, r.status ?? "", r.gap]), [
    [1, "1", "", "1:40.0"],
    [2, "3", "", "+20.0"],
    [3, "2", "Abandonó", ""],
  ]);
  assert.equal(rows[2].positionText, "R");
});

// ---------------------------------------------------------------------------------------------------------------- carrera cerrada

test("carrera cerrada: todos los tramos en un estado final y alguno corrido", () => {
  const t = (estado) => ({ estado });
  assert.equal(carreraCerrada([t("Cancelado"), t("Finalizado"), t("Finalizado")]), true);
  assert.equal(carreraCerrada([t("Finalizado"), t("Suspendido"), t("Interrumpido")]), true);
  assert.equal(carreraCerrada([t("Finalizado"), t("En curso")]), false);
  assert.equal(carreraCerrada([t("Finalizado"), t("Pendiente")]), false);
  assert.equal(carreraCerrada([t("Finalizado"), t("Algo nuevo")]), false); // un estado desconocido deja la carrera abierta
  assert.equal(carreraCerrada([t("Cancelado"), t("Cancelado")]), false); // nada corrido
  assert.equal(carreraCerrada([]), false);
  assert.equal(carreraCerrada(undefined), false);
});

// ---------------------------------------------------------------------------------------------------------------- calendario

test("calendario: todos los formatos de fecha del sitio", () => {
  const f = (text) => {
    const r = parseFechas(text);
    return r && `${r.start.m}/${r.start.d}-${r.end.m}/${r.end.d}`;
  };
  assert.equal(f("27/02 - 01/03"), "2/27-3/1");
  assert.equal(f("31/07 - 02/08"), "7/31-8/2");
  assert.equal(f("17 - 19 Abril"), "4/17-4/19");
  assert.equal(f("22 - 24 de Mayo"), "5/22-5/24");
  assert.equal(f("26 - 28 de Junio"), "6/26-6/28");
  assert.equal(f("04 - 06 de septiembre"), "9/4-9/6");
  assert.equal(f("02 - 04 de octubre"), "10/2-10/4");
  assert.equal(f("11 - 13 de diciembre"), "12/11-12/13");
  assert.equal(f("28 Feb - 02 Mar"), "2/28-3/2");
  assert.equal(f("13 de diciembre"), "12/13-12/13");
  assert.equal(f("30 - 02 de enero"), null); // sin mes de cierre no se adivina
  assert.equal(f("sin fecha"), null);
  assert.equal(f("40/13 - 41/13"), null);
});

const tarjeta = (id, fecha, titulo, resultados) => `
  <div class="masonry-item col-lg-6 col-md-12 pb-4"><div class="blog-post">
    <div class="wt-post-info"><div class="wt-post-meta mb-0"><p class="post-date mb-0">${fecha}</p></div>
    <div class="wt-post-title"><h4 class=""><a href="calendario-ampliar.php?id_carrera=${id}">${titulo}</a></h4></div>
    <div><a href="calendario-ampliar.php?id_carrera=${id}" class="th-btn-rally">AMPLIAR</a>
    <a href="${resultados}" class="th-btn-rally">RESULTADOS <i></i></a></div></div></div></div>`;
const CALENDARIO = `<html><body>${tarjeta(208, "27/02 - 01/03", "Rally Pagos del Tuyú - Madariaga", "https://rallyargentino.com/tiempos/2026-carrera-01/index.html")}${tarjeta(213, "04 - 06 de septiembre", "Rally de San Francisco - Córdoba", "https://tiemposonline.rallyargentino.com/tiempos/2026-carrera-06")}${tarjeta(214, "02 - 04 de octubre", "Rally de Entre R&iacute;os - Diamante y Valle Mar&iacute;a", "https://tiemposonline.rallyargentino.com/")}${tarjeta(215, "06 - 08 de noviembre", "Rally de Traslasierra - Villa Dolores y Mina Clavero", "")}</body></html>`;

test("calendario: fechas, título, número de carrera de los resultados y sede", () => {
  const rounds = parseCalendario(CALENDARIO);
  assert.deepEqual(rounds.map((r) => [r.round, r.id, r.name, r.raceNo, r.published]), [
    [1, 208, "Rally Pagos del Tuyú", 1, true],
    [2, 213, "Rally de San Francisco", 6, true], // la fecha 2 de este calendario recortado es la carrera 6: manda la dirección de resultados
    [3, 214, "Rally de Entre Ríos", null, false], // la fecha en curso enlaza sólo a la portada de los tiempos
    [4, 215, "Rally de Traslasierra", null, false],
  ]);
  assert.equal(rounds[2].title, "Rally de Entre Ríos - Diamante y Valle María");
  assert.deepEqual(sedeDe(214, rounds[2].title), { name: "Diamante y Valle María", city: "Diamante y Valle María", country: "Argentina", flag: "AR", province: "Entre Ríos" });
  assert.equal(sedeDe(999, "Rally de Algo - Lugar Nuevo").city, "Lugar Nuevo"); // una fecha que no conocemos sale del título
  assert.equal(esLaFecha(rounds[2], "Rally de Entre Ríos"), true);
  assert.equal(esLaFecha(rounds[1], "Rally de Entre Ríos"), false);
  assert.equal(esLaFecha(rounds[2], ""), false);
});

// ---------------------------------------------------------------------------------------------------------------- campeonato

const tabla = (id, filas) => `
  <table class="table" id="tbl_campeonato_${id}"><thead><tr><th>POS</th><th></th><th>PILOTO</th><th>MARCA</th>${[1, 2, 3, 4].map((n) => `<th>${n}°</th>`).join("")}<th>&nbsp;</th><th>TOTAL</th></tr></thead>
  <tbody>${filas
    .map(
      ([pos, nombre, marca, pts, total]) => `<tr class="spacio "></tr><tr class="">
      <td class="x"><strong> &nbsp; ${pos}</strong></td><td class="x"><div class="foto"></div></td>
      <td class="x">&nbsp;<span class="texto"><strong>${nombre}</strong></span></td>
      <td class="x"><img src="assets/img/elementos/${marca}.gif"</td>
      ${pts.map((p) => `<td class="x">${p}</td>`).join("")}<td class="x">&nbsp;</td><td class="x"><strong>${total}</strong></td></tr>`,
    )
    .join("")}</tbody></table>`;

const CAMPEONATO = `<html>${tabla("rc2", [[1, "Federico  Villagra", "skoda", [58, 76, 58, 0], 192], [2, "Miguel Baldoni", "skoda", [47, "62.5", 46, 0], "155.5"], [3, "Augusto D´Agostini", "skoda", [44, 43, 38, 0], 125]])}${tabla("rc2copa", [[1, "Diego Miceli", "skoda", [59, "71.5", 0, 0], "130.5"]])}${tabla("copatoyota", [])}${tabla("mrally", [[1, "Nicolás González", "vw", [57, 66, 61, 33], 217]])}</html>`;

test("campeonato: tabla por clase, decimales, nombres normalizados, marca del ícono y última fecha con puntos", () => {
  const t = parseCampeonato(CAMPEONATO);
  assert.deepEqual(Object.keys(t), ["rc2", "copa-rc2", "copa-toyota", "maxi-rally"]);
  assert.deepEqual(t.rc2.rows, [
    { pos: 1, driver: "Federico Villagra", team: "Skoda", points: 192 },
    { pos: 2, driver: "Miguel Baldoni", team: "Skoda", points: 155.5 },
    { pos: 3, driver: "Augusto D'Agostini", team: "Skoda", points: 125 },
  ]);
  assert.equal(t.rc2.asOfRound, 3); // la 4.ª columna está en 0: todavía no se corrió
  assert.equal(t["copa-rc2"].asOfRound, 2);
  assert.equal(t["maxi-rally"].asOfRound, 4);
  assert.equal(t["maxi-rally"].rows[0].team, "VW");
  assert.deepEqual(t["copa-toyota"].rows, []); // tabla vacía
  assert.equal(t.rc2.rounds, 4);
  assert.equal(marcaDe('<img src="assets/img/elementos/citroen.gif"'), "Citroen");
  assert.equal(marcaDe(""), "");
});

test("campeonato: estado oficial con la fecha hasta la que llega; sin puntos o sin tabla es 'sin campeonato' con el motivo", () => {
  const c = campeonatosDeRally(parseCampeonato(CAMPEONATO));
  assert.equal(c.rc2.status, "oficial");
  assert.equal(c.rc2.asOfRound, 3);
  assert.equal(c.rc2.source.url, "https://www.rallyargentino.com/campeonato-pilotos.php");
  assert.equal(c["copa-toyota"].status, "sin-campeonato");
  assert.match(c["copa-toyota"].reason, /Todavía no hay puntos/);
  assert.equal(c.rc3.status, "sin-campeonato"); // la página no trae su tabla
  assert.equal(Object.keys(c).length, 7);
});

test("campeonato: nunca se achica (menos pilotos, una fecha menos o una página rota conservan la tabla anterior)", () => {
  const before = campeonatosDeRally(parseCampeonato(CAMPEONATO));
  const roto = campeonatosDeRally(null, { previous: before });
  assert.equal(roto.rc2, before.rc2);
  const menos = campeonatosDeRally({ rc2: { rows: before.rc2.rows.slice(0, 2), asOfRound: 3, rounds: 4 } }, { previous: before });
  assert.equal(menos.rc2, before.rc2);
  const atras = campeonatosDeRally({ rc2: { rows: before.rc2.rows, asOfRound: 2, rounds: 4 } }, { previous: before });
  assert.equal(atras.rc2, before.rc2);
  const mas = campeonatosDeRally({ rc2: { rows: before.rc2.rows, asOfRound: 4, rounds: 4 } }, { previous: before });
  assert.equal(mas.rc2.asOfRound, 4);
});

// ---------------------------------------------------------------------------------------------------------------- sincronización

const tramos = (...estados) => estados.map((estado, i) => ({ pe: String(i), etapa: "1", estado }));
const general = (estados, pilotos) => ({ exito: true, datos: { pilotosClasificados: pilotos, tramos: tramos(...estados) } });
const PILOTOS_6 = [piloto(3, "Federico VILLAGRA", "Diego CURLETTO", "RC2", 4934.647), piloto(6, "Diego MICELI", "Sergio DAPARTE", "COPA RC2", 5005.597), piloto(50, "Nicolás GONZÁLEZ", "Gerónimo BORDIGNON", "RCMR", 5167.759)];
const PILOTOS_7 = [piloto(3, "Federico VILLAGRA", "Diego CURLETTO", "RC2", 5552.646), piloto(10, "Rodrigo DISALVO", "Andrés PISSACO", "COPA RC2", 5722.168)];

/** io de mentira: responde por pedazo de dirección; lo que no está devuelve 404 como la API real. */
function fakeIo(respuestas, pedidos = []) {
  const buscar = (url) => Object.entries(respuestas).reverse().find(([k]) => url.includes(k))?.[1];
  const text = async (url) => {
    pedidos.push(url);
    const r = buscar(url);
    if (r === undefined) throw new Error(`No se pudo descargar ${url}: HTTP 404`);
    if (r instanceof Error) throw r;
    return typeof r === "string" ? r : JSON.stringify(r);
  };
  return { text, json: async (url) => JSON.parse(await text(url)), sleep: async () => {} };
}
const cabecera = (nombre) => ({ exito: true, datos: { nombre, subtitulo: "x" } });
const respuestas = (extra = {}) => ({
  "calendario.php": CALENDARIO,
  "campeonato-pilotos.php": CAMPEONATO,
  "cabecera-dashboard": cabecera("Rally de Entre Ríos"),
  "historico/2026-carrera-06/v2/clasificacion-final/general": general(["Finalizado", "Finalizado"], PILOTOS_6),
  "api/v2/clasificacion-final/general": general(["Cancelado", "Finalizado", "Finalizado"], PILOTOS_7),
  ...extra,
});
const NOW = new Date("2026-10-04T18:00:00-03:00"); // domingo de la fecha 3 del calendario recortado (Entre Ríos)
const general_ = (e) => e.sessions.find((s) => s.id.endsWith("-general"));

test("temporada: fecha en curso ya cerrada = provisoria el último día; la histórica es oficial; la que la API no tiene queda 'sin leer'", async () => {
  const out = await rallyArgentinoSeason(fakeIo(respuestas()), undefined, { now: NOW });
  assert.deepEqual(out.events.map((e) => e.id), ["rally-argentino-2026-1", "rally-argentino-2026-2", "rally-argentino-2026-3", "rally-argentino-2026-4"]);
  const [uno, dos, tres, cuatro] = out.events;
  // Fecha 1: publicada en el calendario, pero la API devuelve 404.
  assert.equal(general_(uno).resultsUnread, true);
  assert.equal(general_(uno).results, undefined);
  assert.match(out.meta.rallyArgentino.ignored[0], /fecha 1/);
  assert.deepEqual(out.meta.rallyArgentino.errors, []); // el 404 conocido no es una falla de la fuente
  // Fecha 2: histórico oficial (carrera 06 según el enlace), una final por clase y la general.
  assert.equal(general_(dos).resultsSource.status, undefined);
  assert.equal(general_(dos).resultsSource.url, "https://tiemposonline.rallyargentino.com/tiempos/2026-carrera-06");
  assert.deepEqual(dos.sessions.filter((s) => s.classId).map((s) => [s.classId, s.results[0].driver]), [["rc2", "Federico Villagra / Diego Curletto"], ["copa-rc2", "Diego Miceli / Sergio Daparte"], ["maxi-rally", "Nicolás González / Gerónimo Bordignon"]]);
  assert.equal(general_(dos).results.length, 3);
  // Fecha 3: la carrera en curso, cerrada, el último día: provisoria.
  assert.equal(general_(tres).resultsSource.status, "provisional");
  assert.equal(general_(tres).results[0].driver, "Federico Villagra / Diego Curletto");
  assert.equal(tres.sessions.find((s) => s.classId === "copa-rc2").results[0].driver, "Rodrigo Disalvo / Andrés Pissaco");
  // Fecha 4: todavía no empezó.
  assert.equal(general_(cuatro).results, undefined);
  assert.equal(general_(cuatro).resultsUnread, undefined);
  // Horarios: sólo el día, nunca una hora inventada. La general es la última sesión (la carrera principal).
  for (const e of out.events) {
    assert.ok(e.sessions.every((s) => s.timeKnown === false));
    assert.equal(e.sessions.at(-1).id.endsWith("-general"), true);
  }
  assert.deepEqual(tres.sessions.map((s) => s.start.slice(0, 10)), ["2026-10-03", "2026-10-04", "2026-10-04", "2026-10-04", "2026-10-04"]);
  assert.equal(tres.circuit.city, "Diamante y Valle María");
  // Campeonato de cada clase, de la tabla oficial.
  assert.equal(out.meta["rally-argentino"].clases.rc2.status, "oficial");
});

test("temporada: la carrera terminada sigue provisoria hasta que la API la archiva en el histórico", async () => {
  const despues = new Date("2026-10-05T10:00:00-03:00");
  const sinArchivar = await rallyArgentinoSeason(fakeIo(respuestas()), undefined, { now: despues });
  assert.equal(general_(sinArchivar.events[2]).resultsSource.status, "provisional");
  const archivada = respuestas({ "historico/2026-carrera-03/v2/clasificacion-final/general": general(["Finalizado", "Finalizado"], PILOTOS_7) });
  const out = await rallyArgentinoSeason(fakeIo(archivada), undefined, { now: despues });
  assert.equal(general_(out.events[2]).resultsSource.status, undefined);
  assert.equal(general_(out.events[2]).results.length, 2);
});

test("temporada: la carrera en curso con un tramo sin terminar no publica clasificación", async () => {
  const abierta = respuestas({ "api/v2/clasificacion-final/general": general(["Finalizado", "En curso", "Pendiente"], PILOTOS_7) });
  const out = await rallyArgentinoSeason(fakeIo(abierta), undefined, { now: NOW });
  assert.equal(general_(out.events[2]).results, undefined);
  assert.equal(out.events[2].sessions.filter((s) => s.classId).length, 0);
});

test("temporada: no se pega la clasificación de otra carrera a la fecha en curso (cabecera nueva, clasificación vieja)", async () => {
  // La cabecera ya nombra la carrera de hoy, pero /v2/ todavía devuelve la clasificación de la anterior.
  const vieja = respuestas({ "api/v2/clasificacion-final/general": general(["Finalizado", "Finalizado"], PILOTOS_6) });
  const out = await rallyArgentinoSeason(fakeIo(vieja), undefined, { now: NOW });
  assert.equal(general_(out.events[2]).results, undefined);
  assert.match(out.meta.rallyArgentino.errors[0], /idéntica a la de otra fecha/);
});

test("temporada: una fecha vieja con resultados oficiales guardados no se vuelve a pedir; si la fuente falla, lo guardado se conserva", async () => {
  const primera = await rallyArgentinoSeason(fakeIo(respuestas()), undefined, { now: NOW });
  const pedidos = [];
  // Dentro de 40 días la fecha 2 (terminó el 6/9) ya es vieja: sólo se pide lo reciente; la fecha 1 (nunca legible) tampoco se vuelve a intentar.
  const despues = await rallyArgentinoSeason(fakeIo(respuestas(), pedidos), { events: primera.events, standings: {}, meta: primera.meta }, { now: new Date("2026-11-13T10:00:00-03:00") });
  assert.equal(pedidos.some((u) => u.includes("2026-carrera-01")), false);
  assert.equal(pedidos.some((u) => u.includes("2026-carrera-06")), false);
  assert.deepEqual(despues.events[1].sessions, primera.events[1].sessions);
  assert.equal(general_(despues.events[0]).resultsUnread, true);
  // La API se cae: la fecha 2 conserva sus resultados.
  const caida = await rallyArgentinoSeason(fakeIo(respuestas({ "historico/2026-carrera-06": new Error("HTTP 503"), "v2/clasificacion-final/general": new Error("HTTP 503") })), { events: primera.events, standings: {}, meta: primera.meta }, { now: NOW });
  assert.equal(general_(caida.events[1]).results.length, 3);
  assert.equal(general_(caida.events[2]).results.length, 2); // la provisoria de la fecha 3 también
  assert.ok(caida.meta.rallyArgentino.errors.some((e) => /503/.test(e)));
});

test("temporada: si la tabla del campeonato falla se conserva la anterior y queda anotado", async () => {
  const primera = await rallyArgentinoSeason(fakeIo(respuestas()), undefined, { now: NOW });
  const out = await rallyArgentinoSeason(fakeIo(respuestas({ "campeonato-pilotos.php": new Error("HTTP 500") })), { events: primera.events, standings: {}, meta: primera.meta }, { now: NOW });
  assert.equal(out.meta["rally-argentino"].clases.rc2.status, "oficial");
  assert.equal(out.meta["rally-argentino"].clases.rc2.rows.length, 3);
  assert.ok(out.meta.rallyArgentino.errors.some((e) => /campeonato/.test(e)));
});

test("temporada: sin calendario no hay fuente (se conserva todo lo anterior)", async () => {
  await assert.rejects(rallyArgentinoSeason(fakeIo(respuestas({ "calendario.php": "<html></html>" })), undefined, { now: NOW }), /no trae ninguna fecha/);
});

test("firma: dos clasificaciones distintas no comparten firma", () => {
  assert.notEqual(firmaDe(filasDe(PILOTOS_6)), firmaDe(filasDe(PILOTOS_7)));
  assert.equal(firmaDe(undefined), "");
});
