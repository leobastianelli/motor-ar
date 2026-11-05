import assert from "node:assert/strict";
import { test } from "node:test";
import { driverModified, lastDoneEnd, latestDone } from "./lastmod.mjs";

const session = (start, results = [{ pos: 1 }]) => ({ start, durationMin: 60, results });
const NOW = "2026-10-20T00:00:00Z";
const CAP = Date.parse("2026-10-10T00:00:00Z");

const e1 = { id: "a", sessions: [session("2026-09-05T12:00:00Z"), session("2026-09-06T12:00:00Z")] };
const e2 = { id: "b", sessions: [session("2026-10-04T12:00:00Z")] };
const futuro = { id: "c", sessions: [session("2026-11-04T12:00:00Z", [])] };

test("una fecha vale por el fin de su última sesión terminada", () => {
  assert.equal(lastDoneEnd(e1, NOW), Date.parse("2026-09-06T13:00:00Z"));
  assert.equal(lastDoneEnd(futuro, NOW), null);
});

test("el piloto lleva la fecha de la última sesión de las fechas en que corrió, no la de la temporada", () => {
  assert.deepEqual(driverModified({ results: [{ event: e1 }, { event: e1 }] }, NOW, CAP), new Date("2026-09-06T13:00:00Z"));
  assert.deepEqual(driverModified({ results: [{ event: e1 }, { event: e2 }] }, NOW, CAP), new Date("2026-10-04T13:00:00Z"));
});

test("con tope en la versión de los datos y sin fecha si no terminó nada", () => {
  assert.deepEqual(latestDone([e2], NOW, Date.parse("2026-10-01T00:00:00Z")), new Date("2026-10-01T00:00:00Z"));
  assert.equal(driverModified({ results: [] }, NOW, CAP), null);
  assert.equal(latestDone([futuro], NOW, CAP), null);
});
