import assert from "node:assert/strict";
import { test } from "node:test";
import { itemListData, seasonEventSummaryData, sessionEventData, sportsEventData } from "./json-ld-core.mjs";

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

// Lo que Search Console marca en "Eventos": `location` es obligatorio (sin él, el elemento no es válido);
// `description`, `image` y `organizer` son recomendados. Valen para cada evento, también los anidados y los de una lista.
const completo = (data, nombre) => {
  assert.equal(data.location?.["@type"], "Place", `${nombre}: location`);
  assert.equal(data.location.address["@type"], "PostalAddress", `${nombre}: dirección`);
  assert.equal(data.location.address.addressCountry, circuit.country);
  assert.ok(data.description, `${nombre}: description`);
  assert.match(data.image, /^https:\/\/www\.somosfierros\.ar\/eventos\/.+\/opengraph-image$/, `${nombre}: image`);
  assert.equal(data.organizer?.name, series.org, `${nombre}: organizer`);
  assert.ok(data.startDate && data.eventStatus, `${nombre}: fecha y estado`);
};

test("seasonEventSummaryData: evento completo para la lista del calendario, con enlace a la fecha", () => {
  const e = event();
  const data = seasonEventSummaryData(e, series, "2026-10-01T00:00:00Z", SITE);
  assert.ok(data.name.includes(e.name) && data.name.includes(series.name));
  assert.equal(data.url, `${SITE}/eventos/${e.id}`);
  assert.equal(data.startDate, e.sessions[0].start);
  assert.equal(data.eventStatus, "https://schema.org/EventScheduled");
  completo(data, "resumen");
  assert.equal(seasonEventSummaryData(e, series, "2026-10-05T00:00:00Z", SITE).eventStatus, "https://schema.org/EventCompleted");
});

test("cada subEvent y cada sesión suelta de /hoy es un evento completo", () => {
  const e = event();
  const data = sportsEventData(e, series, "d", "2026-10-01T00:00:00Z", SITE);
  completo(data, "fecha");
  for (const sub of data.subEvent) completo(sub, "subEvent");
  const suelta = sessionEventData(e.sessions[0], e, series, "2026-10-01T00:00:00Z", SITE);
  completo(suelta, "sesión de /hoy");
  assert.equal(suelta.name, "Fórmula 1 · Clasificación");
  assert.equal(suelta.url, `${SITE}/eventos/${e.id}`);
});

test("organizer sin web conocida: sólo el nombre", () => {
  const data = sportsEventData(event(), { name: "Procar4000", org: "Zonal" }, "d", "2026-10-01T00:00:00Z", SITE);
  assert.deepEqual(data.organizer, { "@type": "Organization", name: "Zonal" });
});
