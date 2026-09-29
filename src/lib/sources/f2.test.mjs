import assert from "node:assert/strict";
import { test } from "node:test";
import { f2Season } from "./f2.mjs";

// Wikipedia (recortada): dos fechas. La 12 (Baku) tuvo TRES carreras (sprint y dos principales), la 13 (Lusail) todavía no se corrió.
// La tabla de campeonato tiene una columna por carrera: 3 de Baku + 2 de Lusail.
const WIKI = `
== Entries ==
{|
|-
! Team !! No. !! Driver !! Rounds
|}
== Race calendar ==
{|
|-
! Rnd !! Circuit !! Sprint !! Feature
|-
| 12 || Baku City Circuit, Baku, Azerbaijan || 25 September || 26 September
|-
| 13 || Lusail International Circuit, Lusail, Qatar || 28 November || 29 November
|}
== Drivers' Championship standings ==
{|
|-
! Pos !! Driver !! BAK1 !! BAK2 !! BAK3 !! LUS1 !! LUS2 !! Points
|-
| 1 || Alex Dunne || 3 || 1 || 2 || – || – || 40
|-
| 2 || Rafael Câmara || 1 || 4 || 1 || – || – || 35
|}
`;

const ld = (name, start, end) => `{"@id":"https://www.fiaformula2.com/en/racing/2026/baku#${name.replace(/ /g, "")}","name":"${name} - Azerbaijan Grand Prix","description":"x","startDate":"${start}","endDate":"${end}"}`;
const BAKU_PAGE = [
  ld("Practice", "2026-09-24T07:00:00Z", "2026-09-24T07:45:00Z"),
  ld("Qualifying", "2026-09-24T11:00:00Z", "2026-09-24T11:30:00Z"),
  ld("Race", "2026-09-25T07:00:00Z", "2026-09-25T07:45:00Z"),
  ld("Race", "2026-09-25T11:00:00Z", "2026-09-25T12:05:00Z"),
  ld("Race", "2026-09-26T07:00:00Z", "2026-09-26T08:05:00Z"),
].join(",");
const LIST_PAGE = `<a href="/en/racing/2026/baku">Baku</a>`;

const io = {
  wiki: async () => WIKI,
  text: async (url) => (url.endsWith("/2026") ? LIST_PAGE : url.endsWith("/baku") ? BAKU_PAGE : ""),
  sleep: async () => {},
};

test("una fecha con dos carreras principales no corre las columnas de la tabla de las fechas siguientes", async () => {
  const { events, meta } = await f2Season(io);
  const baku = events.find((e) => e.id === "f2-2026-12");
  const lusail = events.find((e) => e.id === "f2-2026-13");
  const ids = (e) => e.sessions.map((s) => s.id);
  assert.ok(ids(baku).includes("f2-2026-12-carrera-2"), "el cronograma oficial trae la segunda principal de Baku");

  assert.equal(baku.sessions.find((s) => s.id === "f2-2026-12-sprint").results[0].driver, "Rafael Câmara");
  assert.equal(baku.sessions.find((s) => s.id === "f2-2026-12-carrera").results[0].driver, "Alex Dunne");
  // La tercera columna (segunda principal) no se pega a ninguna sesión desde acá: la traen los resultados oficiales de la FIA.
  assert.equal(baku.sessions.find((s) => s.id === "f2-2026-12-carrera-2").results, undefined);

  // Lusail no se corrió: ninguna de sus sesiones puede tener resultados (antes heredaba la segunda principal de Baku).
  assert.deepEqual(lusail.sessions.filter((s) => s.results?.length).map((s) => s.id), []);
  assert.equal(meta.f2.standingsAsOfRound, 1);
});
