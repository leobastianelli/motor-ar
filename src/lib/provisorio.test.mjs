import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PROVISIONAL,
  PROVISIONAL_LABEL,
  describeOfficialChange,
  isProvisional,
  penaltiesFrom,
  podiumSnapshot,
  provisionalSuffix,
  reconcileSession,
  resultsStatus,
} from "./provisorio.mjs";

const row = (pos, number, driver, extra = {}) => ({ pos, number: String(number), driver, team: "", gap: "", ...extra });
const session = (results, src = {}, extra = {}) => ({
  id: "s",
  kind: "final",
  name: "Final",
  start: "2026-09-27T12:00:00-03:00",
  durationMin: 30,
  results,
  resultsSource: { name: "ACTC · tiempos oficiales", url: "https://tiempos.actc.org.ar/resultados/961/ver", ...src },
  ...extra,
});

// Final de TC Pick Up, Balcarce 27/09/2026 (planilla 961 contra PDF 963).
const PROV = session(
  [row(1, 119, "Hernan Palazzo"), row(2, 115, "Diego Ciantini"), row(3, 256, "Otto Fritzler"), row(4, 112, "Lucas Valle"), row(5, 121, "Omar Martinez")],
  { status: PROVISIONAL },
);
const OFICIAL = session(
  [row(1, 119, "Hernan Palazzo"), row(2, 256, "Otto Fritzler"), row(3, 112, "Lucas Valle"), row(4, 121, "Omar Martinez"), row(5, 115, "Diego Ciantini"), row(18, 3, "Werner")],
  { url: "https://tiempos.actc.org.ar/resultados/963/ver" },
);
const OBS = [
  'EXCLUIDO POR TECNICA TC PICK UP N°3 (WERNER) COMPRESION',
  '5" DE RECARGO TC PICK UP N°115 (CIANTINI) POR SOBREPASO INDEBIDO A LA TC PICK UP N°214 (MANGONI)',
  '10" DE RECARGO TC PICK UP N°1 (CANAPINO) POR NO HACER CHICANA PARA INGRESAR A BOXES',
  "HORA 16:44",
];

test("isProvisional: sólo con status provisional; el oficial es la ausencia del campo", () => {
  assert.equal(isProvisional(PROV), true);
  assert.equal(isProvisional(OFICIAL), false);
  assert.equal(isProvisional({ results: [] }), false);
  assert.equal(provisionalSuffix(PROV), " (provisorio)");
  assert.equal(provisionalSuffix(OFICIAL), "");
});

test("penaltiesFrom: el auto sancionado es el primero que se nombra, con segundos y tipo", () => {
  assert.deepEqual(penaltiesFrom(OBS), [
    { number: "3", kind: "excluido" },
    { number: "115", kind: "recargo", seconds: 5 },
    { number: "1", kind: "recargo", seconds: 10 },
  ]);
  assert.deepEqual(penaltiesFrom(["PASE Y SIGA AUTO N°15 (GOYA) POR MANIOBRA PELIGROSA AL AUTO N° 88(OROZA)", "20 SEGUNDO TC PISTA PICK UP N°15(GOYA) POR POR EXCESO DE VELOCIDAD EN BOXES"]), [
    { number: "15", kind: "sancion" },
    { number: "15", kind: "recargo", seconds: 20 },
  ]);
  assert.deepEqual(penaltiesFrom(["HORA 15:58", "sin número de auto"]), []);
});

test("podiumSnapshot: sólo clasificados del 1 al 3, con número", () => {
  const s = session([row(1, 7, "A"), row(2, 8, "B", { positionText: "EX" }), row(3, 9, "C"), row(4, 10, "D")]);
  assert.deepEqual(podiumSnapshot(s).podium.map((p) => p.number), ["7", "9"]);
});

test("reconcileSession: un provisorio nunca pisa un oficial", () => {
  assert.equal(reconcileSession(PROV, OFICIAL), OFICIAL);
});

test("reconcileSession: un oficial reemplaza al provisorio y arrastra su podio", () => {
  const kept = reconcileSession(OFICIAL, PROV);
  assert.equal(kept.results, OFICIAL.results);
  assert.equal(isProvisional(kept), false);
  assert.deepEqual(kept.resultsSource.provisional.podium.map((p) => p.number), ["119", "115", "256"]);
});

test("reconcileSession: un oficial que reemplaza a otro oficial conserva el podio provisorio que ya traía", () => {
  const first = reconcileSession(OFICIAL, PROV);
  const rectified = session([row(1, 119, "Hernan Palazzo"), row(2, 256, "Otto Fritzler")], { url: "https://tiempos.actc.org.ar/resultados/970/ver" });
  const kept = reconcileSession(rectified, first);
  assert.equal(kept.resultsSource.url.endsWith("/970/ver"), true);
  assert.equal(kept.resultsSource.provisional.podium.length, 3);
});

test("reconcileSession: un provisorio con menos filas no achica al provisorio anterior, y uno con más lo reemplaza", () => {
  const short = session(PROV.results.slice(0, 3), { status: PROVISIONAL });
  assert.equal(reconcileSession(short, PROV), PROV);
  const long = session([...PROV.results, row(6, 126, "Thomas Ricciardi")], { status: PROVISIONAL });
  assert.equal(reconcileSession(long, PROV), long);
});

test("reconcileSession: sin nada nuevo vale lo guardado, y sin nada guardado vale lo nuevo", () => {
  assert.equal(reconcileSession({ ...OFICIAL, results: [] }, OFICIAL), OFICIAL);
  assert.equal(reconcileSession(PROV, undefined), PROV);
  assert.equal(reconcileSession(PROV, { ...OFICIAL, results: [] }), PROV);
});

test("describeOfficialChange: dice quién cayó y por qué (recargo) y quién quedó excluido", () => {
  const snapshot = podiumSnapshot(PROV);
  assert.equal(describeOfficialChange(OFICIAL, snapshot, penaltiesFrom(OBS)), "Oficial: Diego Ciantini pasó del 2.º al 5.º por un recargo de 5 s");
  const ppk = session([row(1, 107, "Sganga"), row(2, 144, "Cifre"), row(3, 14, "Goya N."), row(4, 15, "Goya J."), row(11, 133, "Alberti")]);
  const ppkSnapshot = { podium: [{ pos: 1, number: "107", driver: "Sganga" }, { pos: 2, number: "144", driver: "Cifre" }, { pos: 3, number: "133", driver: "Alberti" }] };
  assert.equal(describeOfficialChange(ppk, ppkSnapshot, [{ number: "133", kind: "excluido" }]), "Oficial: Alberti (3.º en el provisorio) fue excluido");
});

test("describeOfficialChange: podio igual es sólo 'Oficial'; cambio sin sanción que lo explique, 'cambió el podio' (o el ganador)", () => {
  assert.equal(describeOfficialChange(PROV, podiumSnapshot(PROV), []), "Oficial");
  assert.equal(describeOfficialChange(OFICIAL, podiumSnapshot(PROV), []), "Oficial: cambió el podio");
  const otroGanador = session([row(1, 115, "Diego Ciantini"), row(2, 119, "Hernan Palazzo"), row(3, 256, "Otto Fritzler")]);
  assert.equal(describeOfficialChange(otroGanador, podiumSnapshot(PROV), []), "Oficial: cambió el ganador");
  assert.equal(describeOfficialChange(OFICIAL, undefined, OBS), "Oficial");
});

test("resultsStatus: provisorio con la advertencia; después de una semana, que el portal no publicó el oficial", () => {
  const cerca = resultsStatus(PROV, "2026-09-27T20:00:00Z");
  assert.deepEqual(cerca, { kind: "provisional", text: PROVISIONAL_LABEL });
  assert.match(PROVISIONAL_LABEL, /Provisorio · sujeto a revisión de los comisarios/);
  const lejos = resultsStatus(PROV, "2026-10-09T20:00:00Z");
  assert.equal(lejos.kind, "provisional");
  assert.match(lejos.text, /no se publicó/);
});

test("resultsStatus: oficial sin pasado provisorio no dice nada; con pasado dice 'Oficial' y lo que cambió", () => {
  assert.equal(resultsStatus(OFICIAL, "2026-09-27T20:00:00Z"), null);
  assert.equal(resultsStatus({ ...OFICIAL, resultsSource: { name: "F1", url: "u" } }, "2026-09-27T20:00:00Z"), null);
  const conNota = reconcileSession({ ...OFICIAL, resultsSource: { ...OFICIAL.resultsSource, note: "Oficial: algo" } }, PROV);
  assert.deepEqual(resultsStatus(conNota, "2026-09-28T20:00:00Z"), { kind: "official", text: "Oficial: algo" });
  const sinNota = reconcileSession(OFICIAL, PROV);
  assert.equal(resultsStatus(sinNota, "2026-09-28T20:00:00Z").text, "Oficial");
});
