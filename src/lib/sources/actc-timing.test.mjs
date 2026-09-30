import assert from "node:assert/strict";
import { test } from "node:test";
import { parseResult } from "./actc-timing.mjs";

// Fragmento real de tiempos.actc.org.ar/resultados/945/ver (Clasificación TC Pick Up, Balcarce, 26/09/2026):
// la marca va en su propia celda ("FOTON", "VW"), pero al no estar en el diccionario de marcas quedaba
// pegada al nombre del piloto ("Mariano Werner Foton", "Marco Dianda Vw").
const CLASIFICACION_TCPK_BALCARCE = `
<table>
<tbody>
<tr class="driver-row" data-idx="0">
  <td class="rv-pos p1"><span class="medal medal-1">1</span></td>
  <td><span class="rv-nro">3</span></td>
  <td><span class="rv-driver">WERNER MARIANO</span></td>
  <td style="font-size:12px;color:var(--ink-3)">FOTON</td>
  <td><span class="rv-best pole">1:39.866</span></td><td><span class="rv-best ">—</span></td><td><span class="rv-best ">—</span></td>
  <td class="rv-gap">—</td>
  <td class="rv-gap">—</td>
  <td class="rv-sec">—</td>
  <td class="rv-sec">—</td>
  <td></td>
</tr>
<tr class="driver-row" data-idx="1">
  <td class="rv-pos p2"><span class="medal medal-2">2</span></td>
  <td><span class="rv-nro">110</span></td>
  <td><span class="rv-driver">AZAR DIEGO</span></td>
  <td style="font-size:12px;color:var(--ink-3)">TOYOTA</td>
  <td><span class="rv-best ">1:40.809</span></td><td><span class="rv-best ">—</span></td><td><span class="rv-best ">—</span></td>
  <td class="rv-gap">—</td>
  <td class="rv-gap">—</td>
  <td class="rv-sec">—</td>
  <td class="rv-sec">—</td>
  <td></td>
</tr>
<tr class="driver-row" data-idx="4">
  <td class="rv-pos ">5</td>
  <td><span class="rv-nro">147</span></td>
  <td><span class="rv-driver">DIANDA MARCO</span></td>
  <td style="font-size:12px;color:var(--ink-3)">VW</td>
  <td><span class="rv-best ">1:41.109</span></td><td><span class="rv-best ">—</span></td><td><span class="rv-best ">—</span></td>
  <td class="rv-gap">—</td>
  <td class="rv-gap">—</td>
  <td class="rv-sec">—</td>
  <td class="rv-sec">—</td>
  <td></td>
</tr>
</tbody>
</table>
`;

test("Foton (TC Pick Up) no queda pegado al nombre: va a `team`, no al `driver`", () => {
  const [werner] = parseResult(CLASIFICACION_TCPK_BALCARCE, "clasificacion", new Map());
  assert.equal(werner.driver, "Mariano Werner");
  assert.equal(werner.team, "Foton");
});

test("VW (TC Pick Up) tampoco queda pegado al nombre", () => {
  const [, , dianda] = parseResult(CLASIFICACION_TCPK_BALCARCE, "clasificacion", new Map());
  assert.equal(dianda.driver, "Marco Dianda");
  assert.equal(dianda.team, "Volkswagen");
});

test("una marca ya reconocida (Toyota) sigue funcionando igual", () => {
  const [, azar] = parseResult(CLASIFICACION_TCPK_BALCARCE, "clasificacion", new Map());
  assert.equal(azar.driver, "Diego Azar");
  assert.equal(azar.team, "Toyota");
});

// Serie única TC Mouras (Concepción del Uruguay, 1/3/2026, resultados/212/ver): el portal trae como "tiempo total" de los dos últimos autos
// un suelto de 5.850 y 6.118 con "+5" de diferencia (vueltas de atraso) y sin vueltas: antes salía "+-534.527".
const fila = (pos, nro, nombre, marca, total, dif, vtas) =>
  `<tr class="driver-row"><td>${pos}</td><td>${nro}</td><td>${nombre}</td><td>${marca}</td><td>${total}</td><td>${dif}</td><td>${vtas}</td></tr>`;
const SERIE_UNICA_TCM = `<table><tbody>
${fila(1, 176, "JAIME NICOLAS", "DODGE", "9:00.377", "—", 5)}
${fila(2, 141, "LUENGO FRANCISCO", "CHEVROLET", "9:00.754", "+0.377", 5)}
${fila(13, 78, "CIFRE ALAN DENIS", "FORD", "3:20.171", "+3", 2)}
${fila(14, 139, "ARRIGONI SANTIAGO", "DODGE", "5.850", "+5", "")}
${fila(15, 25, "TARTAGLINO JUAN", "FORD", "6.118", "+5", "")}
</tbody></table>`;

test("autos doblados con tiempo total inconsistente: vueltas de atraso, nunca una diferencia negativa", () => {
  const rows = parseResult(SERIE_UNICA_TCM, "serie", new Map());
  assert.deepEqual(rows.map((r) => r.gap), ["9:00.377", "+0.377", "+3 vueltas", "+5 vueltas", "+5 vueltas"]);
  assert.ok(rows.every((r) => !r.gap.includes("-")));
});

test("si el total es menor al del líder y no hay vueltas de atraso, no se muestra un número", () => {
  const rows = parseResult(`<table><tbody>${fila(1, 1, "AAA BBB", "FORD", "9:00.377", "—", 5)}${fila(2, 2, "CCC DDD", "FORD", "5.850", "—", "")}</tbody></table>`, "serie", new Map());
  assert.equal(rows[1].gap, "");
  assert.equal(rows[1].status, "Sin tiempo");
});
