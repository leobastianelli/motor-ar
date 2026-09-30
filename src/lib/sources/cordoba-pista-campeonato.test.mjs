import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { calcularClase, campeonatosDeCordobaPista, CLASES_VALIDADAS, puntosDeFecha, REGLAMENTO, SIN_CAMPEONATO } from "./cordoba-pista-campeonato.mjs";
import { CLASES } from "./cordoba-pista-clases.mjs";
import { cordobaPistaSeason } from "./cordoba-pista.mjs";
import { mismoNombre } from "./cordoba-pista-nombres.mjs";
import { fakeIo, NOW } from "./fixtures/cordoba-pista/io.mjs";

// VALIDACIÓN: el campeonato calculado contra las tablas oficiales que publica la FRAD después de cada fecha (PDF "CAMPEONATO CORDOBA PISTA",
// fradcba.com.ar), piloto por piloto. La tabla de cordobapista.com va 1 a 3 fechas atrasada y no sirve para esto.
const OFICIAL = JSON.parse(fs.readFileSync(new URL("./fixtures/cordoba-pista/oficial-frad.json", import.meta.url), "utf8")).fechas;
const { events } = await cordobaPistaSeason(fakeIo(), undefined, { windowDays: 400, now: NOW });
const hasta = (n) => events.filter((e) => e.round <= n);

// Erratas y abreviaturas de los PDF oficiales ("SI NATALE", "CAMARGO CAMARGO", "PAVON PAVON Ariel" por Pavón Luis, #99).
const ALIAS = [
  [/^SI NATALE/i, "Di Natale"],
  [/^CAMARGO CAMARGO/i, "Camargo Juan"],
  [/^PAVON PAVON Ariel/i, "Luis Pavon"],
];
const nombreOficial = (n) => ALIAS.find(([re]) => re.test(n))?.[1] ?? n;

/** Compara una tabla calculada con la oficial: [{ piloto, oficial, calculado }] de todo lo que no coincide. */
function diferencias(classId, fecha) {
  const calc = calcularClase(hasta(fecha), classId);
  const pool = new Map(calc.rows.map((r) => [r.driver, r.points]));
  const out = [];
  for (const o of OFICIAL[fecha][classId]) {
    const nombre = nombreOficial(o.name);
    const k = [...pool.keys()].find((x) => mismoNombre(x, nombre)) ?? [...pool.keys()].find((x) => x.includes(nombre));
    // Quien perdió todos los puntos de un fin de semana (descalificado) figura en la tabla oficial con 0; el cálculo no lo lista.
    if (k === undefined) o.points > 0 && out.push({ piloto: o.name, oficial: o.points, calculado: undefined });
    else {
      if (pool.get(k) !== o.points) out.push({ piloto: o.name, oficial: o.points, calculado: pool.get(k) });
      pool.delete(k);
    }
  }
  // Quien el cálculo trae con puntos y la tabla oficial no tiene también es una diferencia.
  for (const [k, v] of pool) if (v > 0) out.push({ piloto: k, oficial: undefined, calculado: v });
  return out;
}

for (const classId of ["tc4000", "tcp4000"]) {
  test(`${classId}: el campeonato calculado coincide piloto por piloto con la tabla oficial de la FRAD de las 6 fechas`, () => {
    for (const fecha of [1, 2, 3, 4, 5, 6]) assert.deepEqual(diferencias(classId, fecha), [], `${classId}, tras la fecha ${fecha}`);
  });
}

test("TC 4000 tras la fecha 5: la tabla completa (los valores que publicó la FRAD)", () => {
  const esperado = [["Marconi", 121], ["Longo", 119], ["Terrier", 111], ["Vaschetti", 105], ["Rasetto", 103], ["Vanini", 80], ["Zafra", 78], ["Vidal", 67], ["Necochea", 60], ["Santoni", 57], ["Corral", 53], ["Martinez", 53], ["Margara", 50], ["Buchholz", 37], ["Angiorama", 17], ["Peiretti", 13]];
  const { rows, asOfRound } = calcularClase(hasta(5), "tc4000");
  assert.equal(asOfRound, 5);
  assert.equal(rows.length, esperado.length);
  esperado.forEach(([apellido, puntos], i) => {
    assert.match(rows[i].driver, new RegExp(apellido), `puesto ${i + 1}`);
    assert.equal(rows[i].points, puntos, rows[i].driver);
  });
});

test("TC Pista 4000 tras la fecha 5: líderes y totales de la FRAD", () => {
  const { rows } = calcularClase(hasta(5), "tcp4000");
  assert.deepEqual(rows.slice(0, 5).map((r) => [r.driver.split(" ").at(-1), r.points]), [["Soave", 127], ["Vendrame", 122], ["Saby", 117], ["Martinez", 104], ["Minudri", 104]]);
});

test("Turismo Fiat y Fiat 128: el cálculo coincide con la FRAD hasta la fecha 5, y la diferencia de la fecha 6 es de medio punto en la fecha con puntaje al 50 %", () => {
  // Fiat: exacto en las fechas 1 a 5; en la 6 (6 autos, puntaje al 50 %) Viel Gonzalo figura con 112 y el cálculo da 111,5.
  for (const fecha of [1, 2, 3, 4, 5]) assert.deepEqual(diferencias("fiat", fecha), [], `fiat, tras la fecha ${fecha}`);
  assert.deepEqual(diferencias("fiat", 6), [{ piloto: "VIEL Gonzalo", oficial: 112, calculado: 111.5 }]);
  // Fiat 128: desde la fecha 1 hay 0,5 de diferencia para Robledo (con 6 autos), y en la 6 otros dos pilotos.
  assert.deepEqual(diferencias("fiat128", 1).map((d) => [d.piloto, d.oficial, d.calculado]), [["ROBLEDO Claudio", 6, 6.5]]);
  assert.deepEqual(diferencias("fiat128", 6).map((d) => d.piloto).sort(), ["MAHL Claudio", "PAGLIERO German", "ROBLEDO Claudio"]);
  for (const d of diferencias("fiat128", 6)) assert.equal(Math.abs(d.oficial - d.calculado), 0.5, d.piloto);
});

test("qué clases se muestran: sólo las que el cálculo reproduce; el resto, 'Sin campeonato publicado' con su motivo", () => {
  const c = campeonatosDeCordobaPista(events);
  assert.deepEqual(Object.keys(c), CLASES.map((x) => x.id));
  for (const id of ["tc4000", "tcp4000"]) {
    assert.equal(c[id].status, "calculado", id);
    assert.equal(c[id].asOfRound, 6);
    assert.equal(c[id].validatedThrough, CLASES_VALIDADAS[id].validadoHasta);
    assert.ok(c[id].rows.length >= 16);
  }
  for (const id of ["fiat", "fiat128", "tch", "clase3", "frplus"]) {
    assert.equal(c[id].status, "sin-campeonato", id);
    assert.equal(c[id].rows, undefined);
    assert.ok(c[id].reason.length > 20 && c[id].reason === SIN_CAMPEONATO[id], id);
  }
  assert.match(REGLAMENTO.url, /^https:\/\/fradcba\.com\.ar\/reglamentos\//);
});

test("una clase validada con una fecha sin resultados no se publica (faltarían puntos)", () => {
  const sinFecha3 = events.map((e) => (e.round === 3 ? { ...e, sessions: e.sessions.map((s) => (s.classId === "tc4000" ? { ...s, results: undefined } : s)) } : e));
  const c = campeonatosDeCordobaPista(sinFecha3);
  assert.equal(c.tc4000.status, "sin-campeonato");
  assert.match(c.tc4000.reason, /fecha 3/);
  assert.equal(c.tcp4000.status, "calculado");
});

test("el campeonato calculado no se achica: si hoy trae menos filas o una fecha anterior, se conserva la tabla de antes", () => {
  const antes = campeonatosDeCordobaPista(events);
  const sinNada = campeonatosDeCordobaPista([], { previous: antes });
  assert.deepEqual(sinNada.tc4000, antes.tc4000);
  const hastaLa5 = campeonatosDeCordobaPista(hasta(5), { previous: antes });
  assert.equal(hastaLa5.tc4000.asOfRound, 6);
});

test("reglas del reglamento en una fecha simple (puntos por final, series, presentación, pole, 75 % y descalificación)", () => {
  const fila = (driver, pos, laps, extra = {}) => ({ pos, driver, number: String(pos), team: "", gap: "", laps, ...extra });
  const nombres = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
  const q = { kind: "clasificacion", name: "Clasificación X", results: nombres.map((n, i) => fila(n, i + 1, 4)) };
  const serie = { kind: "serie", name: "Serie X", results: nombres.map((n, i) => fila(n, i + 1, 6)) };
  const final = { kind: "final", name: "Final X", results: [...nombres.slice(0, 7).map((n, i) => fila(n, i + 1, 12)), fila("H", 8, 8, { positionText: "NC", status: "No clasificado" }), fila("I", 9, 12, { positionText: "DSQ", status: "Descalificado" })] };
  const p = puntosDeFecha([q, serie, final]);
  // A: presentación 4 + pole 1 + serie (única: 6) + final 25.
  assert.equal(p.get("A").pts, 4 + 1 + 6 + 25);
  assert.equal(p.get("A").win, true);
  // B: 4 + serie 2.º (6) + final 2.º (20); G: 4 + serie 7.º (3) + final 7.º (11).
  assert.equal(p.get("B").pts, 4 + 6 + 20);
  assert.equal(p.get("G").pts, 4 + 3 + 11);
  // H: no cubrió el 75 % de la final (8 de 12): sólo presentación y serie 8.º (3).
  assert.equal(p.get("H").pts, 4 + 3);
  // I: descalificado sólo de la final: conserva presentación y serie 9.º (2).
  assert.equal(p.get("I").pts, 4 + 2);
  // Con menos de 8 autos en la clasificación, series, final y pole valen la mitad; la presentación no.
  const chica = puntosDeFecha([{ ...q, results: q.results.slice(0, 6) }, { ...serie, results: serie.results.slice(0, 6) }, { ...final, results: final.results.slice(0, 6) }]);
  assert.equal(chica.get("A").pts, 4 + 0.5 + 3 + 12.5);
  // La última fecha del calendario vale 50 % más.
  assert.equal(puntosDeFecha([q, serie, final], { ultima: true }).get("A").pts, (4 + 1 + 6 + 25) * 1.5);
});
