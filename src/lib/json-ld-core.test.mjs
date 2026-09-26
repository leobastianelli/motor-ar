import assert from "node:assert/strict";
import { test } from "node:test";
import { itemListData, seasonEventSummaryData, sportsEventData } from "./json-ld-core.mjs";

const SITE = "https://www.somosfierros.ar";
const series = { name: "Fórmula 1", org: "FIA", orgUrl: "https://fia.com" };
const circuit = { name: "Sepang", city: "Sepang", province: "", country: "Malasia" };

const session = (over = {}) => ({ id: "f1-16-q", kind: "clasificacion", name: "Clasificación", start: "2026-10-03T08:00:00Z", timeKnown: true, durationMin: 60, ...over });
const event = (over = {}) => ({ id: "f1-2026-16", name: "GP de Malasia", circuit, sessions: [session()], ...over });

test("SportsEvent: campos obligatorios y subEvent por cada sesión", () => {
  const q = session({ results: [{ pos: 1, driver: "George Russell" }] });
  const r = session({ id: "f1-16-r", kind: "carrera", name: "Carrera", start: "2026-10-04T07:00:00Z", durationMin: 120 });
  const e = event({ sessions: [q, r] });
  const data = sportsEventData(e, series, "descripción", "2026-10-03T09:30:00Z", SITE);

  assert.equal(data["@type"], "SportsEvent");
  assert.ok(data.name.includes(series.name) && data.name.includes(e.name));
  assert.equal(data.description, "descripción");
  assert.equal(data.startDate, q.start);
  assert.equal(data.endDate, r.start);
  assert.equal(data.location["@type"], "Place");
  assert.equal(data.organizer.name, series.org);
  assert.equal(data.organizer.url, series.orgUrl);
  assert.ok(Array.isArray(data.competitor) && data.competitor.length === 1, "hay resultados: se listan los competidores");

  assert.equal(data.subEvent.length, 2);
  const [subQ, subR] = data.subEvent;
  assert.equal(subQ["@type"], "SportsEvent");
  assert.equal(subQ.name, "Clasificación");
  assert.equal(subQ.startDate, q.start);
  assert.equal(subQ.endDate, new Date(Date.parse(q.start) + q.durationMin * 60_000).toISOString());
  // La clasificación terminó a las 09:00, y "ahora" es 09:30: ya pasó.
  assert.equal(subQ.eventStatus, "https://schema.org/EventCompleted");
  // La carrera es el 4/10: todavía no llegó.
  assert.equal(subR.eventStatus, "https://schema.org/EventScheduled");
});

test("SportsEvent: sin resultados no hay competitor/performer", () => {
  const data = sportsEventData(event(), series, "d", "2026-10-03T00:00:00Z", SITE);
  assert.equal(data.competitor, undefined);
  assert.equal(data.performer, undefined);
});

test("subEvent: sesión sin horario confirmado lleva sólo el día, sin hora de relleno", () => {
  const s = session({ timeKnown: false, start: "2026-10-04T12:00:00Z" });
  const data = sportsEventData(event({ sessions: [s] }), series, "d", "2026-10-01T00:00:00Z", SITE);
  const [sub] = data.subEvent;
  assert.equal(sub.startDate, "2026-10-04");
  assert.equal(sub.endDate, "2026-10-04");
  assert.doesNotMatch(sub.startDate, /T/);
});

test("ItemList: posición 1-based y el item tal como se pasó", () => {
  const items = [{ a: 1 }, { a: 2 }];
  const list = itemListData(items);
  assert.equal(list["@type"], "ItemList");
  assert.deepEqual(
    list.itemListElement.map((x) => x.position),
    [1, 2],
  );
  assert.equal(list.itemListElement[0]["@type"], "ListItem");
  assert.deepEqual(list.itemListElement[0].item, items[0]);
});

test("seasonEventSummaryData: nombre, enlace a la fecha y cuándo es", () => {
  const e = event();
  const data = seasonEventSummaryData(e, SITE);
  assert.equal(data.name, e.name);
  assert.equal(data.url, `${SITE}/eventos/${e.id}`);
  assert.equal(data.startDate, e.sessions[0].start);
});
