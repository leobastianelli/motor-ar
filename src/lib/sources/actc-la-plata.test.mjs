import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { actcTiming, chooseDocs, classify, pageSeries, parseListing, withoutMisread } from "./actc-timing.mjs";

// Páginas reales de tiempos.actc.org.ar (La Plata, 17/10/2026), sin scripts ni estilos. Ese día el portal cargó la fecha 9 del TC Pista Pick Up
// en la pestaña "TCM" (bloque acc-1), y las Pick Up clasificaron por cortes eliminatorios (CL1, CL2, CL3) antes de la clasificación final.
const fx = (name) => readFileSync(new URL(`./fixtures/actc/${name}`, import.meta.url), "utf8");
const LISTING = fx("listado-la-plata-2026-10-17.html");
const PAGES = Object.fromEntries([1020, 1022, 1023, 1024, 1025].map((id) => [id, `la-plata-${id}.html`]));

const io = (pages = PAGES) => ({
  text: async () => LISTING,
  bytes: async (url) => {
    const id = url.match(/\/resultados\/(\d+)\/ver/)?.[1];
    if (!pages[id]) throw new Error(`404 ${url}`);
    return Buffer.from(fx(pages[id]));
  },
  sleep: async () => {},
});

const evento = (id, seriesId, round, sessions) => ({
  id,
  seriesId,
  round,
  name: `Fecha ${round} · La Plata`,
  sessions: sessions.map(([name, kind, day = "2026-10-17"]) => ({ id: `${id}-${name}`, kind, name, start: `${day}T15:00:00-03:00`, timeKnown: true, durationMin: 30 })),
});
const tcppk = () => evento("tcppk-2026-9", "tc-pista-pick-up", 9, [["Clasificación", "clasificacion"], ["Final", "final", "2026-10-18"]]);
const tcpk = () => evento("tcpk-2026-9", "tc-pick-up", 9, [["Clasificación", "clasificacion"], ["Final", "final", "2026-10-18"]]);
const tcm = () => evento("tcm-2026-10", "tc-mouras", 10, [["Clasificación", "clasificacion"], ["Final", "final", "2026-10-18"]]);
const sesion = (event, name) => event.sessions.find((s) => s.name === name);
const conResultados = (event, name, url, results) => ({
  ...event,
  sessions: event.sessions.map((s) => (s.name === name ? { ...s, results, resultsSource: { name: "ACTC · tiempos oficiales", url, status: "provisional" } } : s)),
});
const OPTS = { windowDays: 100000, delayMs: 0 };

test("un corte de la clasificación (CL1, CL2, CL3) o un grupo no es la clasificación; la clasificación final sí", () => {
  assert.equal(classify("CLASIFICACION CL1"), null);
  assert.equal(classify("CLASIFICACION parciales cl2"), null);
  assert.equal(classify("CL3 PARCIALES CLASIFICACION TC PICK UP"), null);
  assert.equal(classify("GRUPOS CLASIFICACION TC MOURAS"), null);
  assert.deepEqual(classify("CLASIFICACION TC PISTA PICK UP"), { kind: "clasificacion", name: "Clasificación" });
  assert.deepEqual(classify("CLASIFICACION"), { kind: "clasificacion", name: "Clasificación" });
  // Con sólo los cortes publicados (el TC Pick Up a media clasificación), no hay clasificación que mostrar.
  const docs = parseListing(LISTING).filter((d) => d.seriesId === "tc-pick-up");
  assert.equal(chooseDocs(docs, { provisional: true }).get("Clasificación"), undefined);
});

test("la etiqueta de la página dice la categoría, aunque el listado la ponga en otra pestaña", () => {
  assert.equal(pageSeries(fx("la-plata-1020.html")), "tc-pista-pick-up");
  assert.equal(pageSeries(fx("la-plata-1023.html")), "tc-pick-up");
  assert.equal(pageSeries(fx("la-plata-1025.html")), null, "el PDF de los comisarios no trae etiqueta");
  assert.equal(pageSeries("<span>🏷 TC PISTA MOURAS</span>"), "tc-pista-mouras");
  const tab = parseListing(LISTING).find((d) => d.id === 1025);
  assert.equal(tab.seriesId, "tc-mouras", "así lo publicó el portal");
});

test("La Plata: la clasificación del TC Pista Pick Up va a su fecha y no a la del TC Mouras, aunque ya estuviera guardada ahí", async () => {
  // Lo que había quedado guardado: la clasificación del TC Pista Pick Up en el TC Mouras y el CL1 del TC Pick Up como clasificación.
  const mal = conResultados(tcm(), "Clasificación", "https://tiempos.actc.org.ar/resultados/1025/ver", [
    { pos: 1, number: "67", driver: "Santiago Biagi", team: "Toyota", gap: "1:29.812" },
    { pos: 2, number: "144", driver: "Faustino Cifre", team: "Ford", gap: "+0.074" },
    { pos: 3, number: "132", driver: "Tomas Pellandino", team: "Ford", gap: "+0.314" },
  ]);
  const cl1 = conResultados(tcpk(), "Clasificación", "https://tiempos.actc.org.ar/resultados/1023/ver", [
    { pos: 1, number: "11", driver: "Gaston Mazzacane", team: "Foton", gap: "1:28.456" },
    { pos: 2, number: "107", driver: "Tobías Martínez", team: "Chevrolet", gap: "+0.066" },
    { pos: 3, number: "68", driver: "Julián Santero", team: "Ford", gap: "+0.185" },
  ]);
  const previous = { events: [mal, cl1, tcppk()], meta: {} };
  const result = await actcTiming(io(), [mal, cl1, tcppk()], previous, OPTS);
  const [m, k, p] = result.events;

  assert.equal(sesion(m, "Clasificación").results, undefined, "el TC Mouras no tiene la clasificación de otra categoría");
  assert.equal(sesion(k, "Clasificación").results, undefined, "el TC Pick Up no muestra un corte como si fuera la clasificación");
  const q = sesion(p, "Clasificación");
  assert.equal(q.resultsSource.url, "https://tiempos.actc.org.ar/resultados/1025/ver");
  assert.equal(q.results[0].driver, "Santiago Biagi");
  assert.equal(q.results.length, 14);

  assert.equal(result.meta.retagged[1025].to, "tc-pista-pick-up");
  assert.ok(result.misread.includes("tc-mouras https://tiempos.actc.org.ar/resultados/1025/ver"));
  assert.ok(result.misread.includes("tc-pick-up https://tiempos.actc.org.ar/resultados/1023/ver"));

  // La red de seguridad final trabaja con la temporada anterior: sin lo mal leído, no lo repone.
  const limpio = withoutMisread(previous, result.misread);
  assert.equal(sesion(limpio.events[0], "Clasificación").results, undefined);
  assert.equal(sesion(limpio.events[1], "Clasificación").results, undefined);
});

test("lo reasignado se recuerda: cuando la fecha deja de ser reciente, el documento no vuelve a la pestaña equivocada", async () => {
  const previous = { events: [], meta: { timing: { retagged: { 1025: { from: "tc-mouras", to: "tc-pista-pick-up" } } } } };
  // Sin páginas para confirmar los bloques (como si no fueran recientes): vale lo guardado.
  const result = await actcTiming(io({ 1025: PAGES[1025] }), [tcm(), tcppk()], previous, { windowDays: 0, delayMs: 0 });
  const [m, p] = result.events;
  assert.equal(sesion(m, "Clasificación").results, undefined);
  assert.equal(sesion(p, "Clasificación").results[0].driver, "Santiago Biagi");
});
