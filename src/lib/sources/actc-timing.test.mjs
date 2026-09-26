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
