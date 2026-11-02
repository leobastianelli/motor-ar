import assert from "node:assert/strict";
import { test } from "node:test";
import { apatSeason, parseResultSessions, resultsOpen } from "./apat.mjs";
import { apatUnread, apatWeekendEvents } from "./apat-evidence.mjs";
import { carryOver } from "./speedhive-tn.mjs";
import { keepSessionData } from "./guard.mjs";

const table = (driver, stamp = "31/10/2026 19:13") =>
  `<table><tbody><tr><td>1</td><td>7</td><td><strong>${driver}</strong></td><td>Equipo</td><td></td><td>1:30.000</td><td></td></tr></tbody></table><span>${stamp}</span>`;
// Misma estructura que apat.org.ar/resultados/c2/2026-11-01: títulos h2 de grupo y h3 de sesión.
const section = (title, driver) => `<h3>${title}</h3>${driver ? table(driver) : ""}`;
const pageC2 = (...sections) => `<h2>CLASIFICACIONES</h2>${sections.join("")}`;
const names = (html, klass = "c2") => parseResultSessions(html, klass, "2026-11-01").map((s) => s.name);

test("Clase 2: se leen las dos clasificaciones y la general no se suma", () => {
  const html = pageC2(section("1º CLASIFICACIÓN C2", "PEREZ JUAN"), section("2º CLASIFICACIÓN C2", "GOMEZ ANA"), section("GENERAL CLASIFICACIÓN C2", "PEREZ JUAN"));
  assert.deepEqual(names(html), ["Clasificación 1 Clase 2", "Clasificación 2 Clase 2"]);
});

test("Clase 3: la general es la clasificación de la fecha", () => {
  assert.deepEqual(names(pageC2(section("GENERAL CLASIFICACIÓN C3", "PEREZ JUAN")), "c3"), ["Clasificación Clase 3"]);
});

test("las sesiones aparecen a medida que APAT las publica", () => {
  assert.deepEqual(names(pageC2(section("1º CLASIFICACIÓN C2", "PEREZ JUAN"))), ["Clasificación 1 Clase 2"]);
  assert.deepEqual(names(pageC2(section("1º CLASIFICACIÓN C2"))), []);
});

test("resultsOpen: se leen desde el viernes, no recién cuando terminó el domingo", () => {
  assert.equal(resultsOpen("2026-11-01", new Date("2026-10-30T02:59:00Z")), false); // jueves 23:59 en Argentina
  assert.equal(resultsOpen("2026-11-01", new Date("2026-10-30T03:00:00Z")), true); // viernes 00:00
  assert.equal(resultsOpen("2026-11-01", new Date("2026-10-31T16:00:00Z")), true); // sábado: lo que falló en Concordia
});

const calendar = '<table><tbody><tr><td>11</td><td>01/11/2026</td><td><a href="/circuitos/tecnica/concordia">Autódromo Ciudad de Concordia</a></td><td></td><td></td></tr></tbody></table>';
const io = (pages) => ({
  sleep: async () => {},
  text: async (url) => {
    if (url.includes("/carreras/calendario")) return calendar;
    if (url.includes("/campeonato/ranking/")) return "<table><tbody></tbody></table>";
    return pages[url.match(/resultados\/(c\d)/)[1]] ?? "";
  },
});

test("apatSeason: un sábado de carrera ya trae lo publicado, aunque la final no se haya corrido", async () => {
  const pages = { c2: `<h3>1º ENTRENAMIENTO C2</h3>${table("PEREZ JUAN")}`, c3: "" };
  const { events } = await apatSeason(io(pages), undefined, { now: new Date("2026-10-31T16:00:00Z") });
  const practice = events[0].sessions.find((s) => s.name === "1° Entrenamiento Clase 2");
  assert.equal(practice.results[0].driver, "Perez Juan");
  assert.ok(events[0].sessions.some((s) => s.name === "Final Clase 2" && !s.results));
});

test("apatSeason: lejos de la fecha no pide la página de resultados", async () => {
  let asked = 0;
  const base = io({});
  const { events } = await apatSeason({ ...base, text: async (url) => (url.includes("/resultados/") && asked++, base.text(url)) }, undefined, { now: new Date("2026-10-20T16:00:00Z") });
  assert.equal(asked, 0);
  assert.equal(events[0].sessions.length, 2);
});

test("renombrar a Clasificación 1 no deja la sesión vieja como fantasma", async () => {
  const pages = { c2: pageC2(section("1º CLASIFICACIÓN C2", "PEREZ JUAN"), section("2º CLASIFICACIÓN C2", "GOMEZ ANA")), c3: "" };
  const { events } = await apatSeason(io(pages), undefined, { now: new Date("2026-11-02T14:00:00Z") });
  const old = { id: events[0].id, seriesId: "tn", sessions: [{ id: "tn-2026-11-c2-clasificacio-n-clase-2", kind: "clasificacion", name: "Clasificación Clase 2", start: "2026-10-31T12:00:00-03:00", results: [{ pos: 1, driver: "Juan Perez" }] }] };
  const { event, restored } = keepSessionData(events[0], old);
  assert.equal(restored, 0);
  assert.deepEqual(event.sessions.filter((s) => s.kind === "clasificacion").map((s) => s.name), ["Clasificación 1 Clase 2", "Clasificación 2 Clase 2"]);
});

test("carryOver: una sesión de Speedhive no se suma si APAT ya la trae con otro id", () => {
  const source = { name: "Speedhive · cronometraje (provisorio)", url: "x" };
  const start = "2026-10-10T15:10:00-03:00";
  const event = { id: "tn-2026-10", seriesId: "tn", sessions: [{ id: "apat", kind: "clasificacion", name: "Clasificación 1 Clase 2", start, results: [{ pos: 1, driver: "A" }] }] };
  const old = { sessions: [{ id: "speedhive", kind: "clasificacion", name: "Clasificación 1 Clase 2", start, results: [{ pos: 1, driver: "A" }], resultsSource: source }] };
  assert.equal(carryOver(event, old).sessions.length, 1);
});

const concordia = (sessions = []) => ({ id: "tn-2026-11", seriesId: "tn", name: "Fecha 11 · Concordia", sessions: [{ id: "f", kind: "final", name: "Final Clase 2", start: "2026-11-01T12:00:00-03:00" }, ...sessions] });

test("apatWeekendEvents: de viernes a lunes de esa fecha", () => {
  const events = [concordia()];
  assert.equal(apatWeekendEvents(events, "2026-10-30T02:59:00Z").length, 0);
  assert.equal(apatWeekendEvents(events, "2026-10-30T03:00:00Z").length, 1);
  assert.equal(apatWeekendEvents(events, "2026-11-03T02:59:00Z").length, 1);
  assert.equal(apatWeekendEvents(events, "2026-11-03T03:00:00Z").length, 0);
});

test("apatUnread: avisa sólo lo publicado que no tenemos; fuera del finde no pide nada", async () => {
  const fetchText = async (url) => (url.includes("/c2/") ? pageC2(section("1º CLASIFICACIÓN C2", "PEREZ JUAN"), section("2º CLASIFICACIÓN C2", "GOMEZ ANA")) : "");
  const have = { id: "c1", kind: "clasificacion", name: "Clasificación 1 Clase 2", start: "2026-10-31T12:00:00-03:00", results: [{ pos: 1, driver: "A" }] };
  const unread = await apatUnread([concordia([have])], "2026-10-31T23:00:00Z", fetchText);
  assert.deepEqual(unread.map((u) => u.key), ["tn:tn-2026-11:Clasificación 2 Clase 2"]);
  assert.deepEqual(await apatUnread([concordia()], "2026-10-20T23:00:00Z", () => assert.fail("no debería pedir")), []);
});
