import assert from "node:assert/strict";
import { test } from "node:test";
import { borradores, sessionDraft, xLength, X_LIMIT } from "./redes-core.mjs";
import { momentoDeCategoria } from "./momento.mjs";
import { buildCalendar } from "./ics.mjs";

// Dónde se anuncia un ganador de la ACTC: si el resultado es provisorio, el texto lo dice (docs/plan-datos/tc-provisorios.md).
const series = [{ id: "tc-pick-up", name: "TC Pick Up", short: "TCPK", scope: "nacional" }];
const catalog = { drivers: [], series, broadcasts: {} };
const row = (pos, driver, number) => ({ pos, driver, number: String(number), team: "", gap: "" });
const rows = [row(1, "Hernan Palazzo", 119), row(2, "Diego Ciantini", 115), row(3, "Otto Fritzler", 256)];
const SRC = { name: "ACTC · tiempos oficiales", url: "https://tiempos.actc.org.ar/resultados/961/ver" };
const final = (src) => ({ id: "tcpk-f8-final", kind: "final", name: "Final", start: "2026-09-27T14:10:00-03:00", timeKnown: true, durationMin: 40, results: rows, resultsSource: src });
const event = (s) => ({ id: "tc-pick-up-2026-f8", seriesId: "tc-pick-up", round: 8, name: "Fecha 8 · Balcarce", circuit: { name: "Juan Manuel Fangio", city: "Balcarce", country: "Argentina" }, source: "ACTC", sessions: [s] });

// 27/09 17:30 AR: la final terminó a las 14:50.
const NOW = "2026-09-27T20:30:00Z";
const season = (events) => ({ events, standings: {}, meta: {} });

test("borrador de la final con resultado provisorio: dice '(provisorio)' al lado del ganador", () => {
  const [d] = borradores(season([event(final({ ...SRC, status: "provisional" }))]), NOW, { catalog });
  assert.equal(d.key, "sesion:tcpk-f8-final:provisorio");
  assert.match(d.text, /Ganó Hernan Palazzo \(provisorio\); 2\.º Diego Ciantini, 3\.º Otto Fritzler\./);
  assert.ok(xLength(d.text) <= X_LIMIT);
});

test("borrador de la final oficial: sin marca y con la clave de siempre", () => {
  const [d] = borradores(season([event(final(SRC))]), NOW, { catalog });
  assert.equal(d.key, "sesion:tcpk-f8-final");
  assert.doesNotMatch(d.text, /provisorio/);
});

test("ya salió el provisorio y el oficial cambió el podio: hay borrador oficial (clave distinta, no queda tapado)", () => {
  const cambio = { ...SRC, provisional: { podium: [] }, note: "Oficial: Diego Ciantini pasó del 2.º al 5.º por un recargo de 5 s" };
  const enviados = { "sesion:tcpk-f8-final:provisorio": true };
  const [d] = borradores(season([event(final(cambio))]), NOW, { catalog, enviados });
  assert.equal(d.key, "sesion:tcpk-f8-final");
  assert.doesNotMatch(d.text, /provisorio/);
});

test("ya salió el provisorio y el oficial no cambió nada: no se repite la noticia", () => {
  const igual = { ...SRC, provisional: { podium: [] }, note: "Oficial" };
  const enviados = { "sesion:tcpk-f8-final:provisorio": true };
  assert.deepEqual(borradores(season([event(final(igual))]), NOW, { catalog, enviados }), []);
});

test("sessionDraft provisorio: entra en 280 caracteres aunque el nombre sea largo", () => {
  const long = [row(1, "Juan Bautista de Benedictis Gutierrez", 1), row(2, "Maximiliano Alejandro Fernandez Pereyra", 2), row(3, "Facundo Nicolas Rodriguez Castellano", 3)];
  const s = { ...final({ ...SRC, status: "provisional" }), results: long };
  const d = sessionDraft({ event: event(s), session: s, series: series[0], leader: null, argentines: [] });
  assert.ok(d && xLength(d.text) <= X_LIMIT);
  assert.match(d.text, /\(provisorio\)/);
});

test("el momento marca al ganador como provisorio (página, home y calendarios lo dicen)", () => {
  const m = momentoDeCategoria([event(final({ ...SRC, status: "provisional" }))], NOW);
  assert.equal(m.ultimaFecha?.carrera?.provisorio ?? m.fecha?.carrera?.provisorio, true);
  const oficial = momentoDeCategoria([event(final(SRC))], NOW);
  assert.equal(oficial.ultimaFecha?.carrera?.provisorio ?? oficial.fecha?.carrera?.provisorio, undefined);
});

test("calendario (ICS): 'Ganador (provisorio)' en la descripción de la sesión", () => {
  const base = { uid: "u", category: "TCPK", sessionName: "Final", city: "Balcarce", location: "Autódromo", start: "2026-09-27T14:10:00-03:00", durationMin: 40, timeKnown: true, eventUrl: "https://www.somosfierros.ar/eventos/x", hasResults: true, ganador: { name: "Hernan Palazzo" } };
  const prov = buildCalendar({ name: "t", sessions: [{ ...base, provisorio: true }], dtstamp: "2026-09-27T20:30:00Z" });
  const unfolded = prov.replace(/\r\n[ \t]/g, "");
  assert.match(unfolded, /Ganador \(provisorio\): Hernan Palazzo\./);
  const oficial = buildCalendar({ name: "t", sessions: [base], dtstamp: "2026-09-27T20:30:00Z" }).replace(/\r\n[ \t]/g, "");
  assert.match(oficial, /Ganador: Hernan Palazzo\./);
});
