import assert from "node:assert/strict";
import { test } from "node:test";
import { htmlToText, parseSchedule, scheduleSection } from "./schedule-notes.mjs";

// Sección "Cronograma" de la nota de SoloTC "TC Pick Up en Balcarce: horarios de TV y cronograma" (22/09/2026 20:41), tal como
// viene del API de WordPress. Escribe TCPU y TCPPU, y "sesión clasificatoria" en vez de "clasificación".
const SOLOTC_BALCARCE = `
<h2 class="wp-block-heading">Cronograma &#8211; TC Pick Up &#8211; Balcarce</h2>
<p class="wp-block-paragraph"><strong>Sábado 26 de septiembre</strong><br>9.05 a 9.45 – 1° Entrenamiento TCPPU (Todos juntos)</p>
<p class="wp-block-paragraph">9.50 a 10.20 – 1° Entrenamiento TCPU (Grupo A)<br>10.25 a 10.55 – 1° Entrenamiento TCPU (Grupo B)</p>
<p class="wp-block-paragraph">11.35 a 12.05 – 2° Entrenamiento TCPPU (Todos juntos)</p>
<p class="wp-block-paragraph">12.10 a 12.30 – 2° Entrenamiento TCPU (Grupo A)<br>12.35 a 12.55 – 2° Entrenamiento TCPU (Grupo B)</p>
<p class="wp-block-paragraph">15.20 a 15.30 – 1ª Sesión clasificatoria TCPPU (10 minutos)<br>15.37 a 15.45 – 2ª Sesión clasificatoria TCPPU (8 minutos)<br>15.52 a 16.00 – 3ª Sesión clasificatoria TCPPU (8 minutos)</p>
<p class="wp-block-paragraph">16.10 a 16.20 – 1ª Sesión clasificatoria TCPU (10 minutos)<br>16.27 a 16.35 – 2ª Sesión clasificatoria TCPU (8 minutos)<br>16.42 a 16.50 – 3ª Sesión clasificatoria TCPU (8 minutos)</p>
<p class="wp-block-paragraph"><strong>Domingo 27 de septiembre</strong><br>10.45 a 10.55 – 1ª Serie TCPPU – 5 vueltas<br>11.10 a 11.20 – 2ª Serie TCPPU – 5 vueltas</p>
<p class="wp-block-paragraph">11.35 a 11.45 – 1ª Serie TCPU – 5 vueltas<br>12.00 a 12.10 – 2ª Serie TCPU – 5 vueltas</p>
<p class="wp-block-paragraph">13.10 a 13.40 – Final TCPPU – 18 vueltas o 30 minutos<br>14.10 a 14.50 – Final TCPU – 20 vueltas o 40 minutos</p>`;

const read = (html) => parseSchedule(scheduleSection(htmlToText(html)), { year: 2026 });
const pick = (rows, seriesId, date, name) => rows.find((r) => r.seriesId === seriesId && r.date === date && r.name === name);

test("nota de SoloTC del 22/09 (TCPU y TCPPU): devuelve los horarios de las dos categorías", () => {
  const rows = read(SOLOTC_BALCARCE);
  const pista = rows.filter((r) => r.seriesId === "tc-pista-pick-up");
  const pick_ = rows.filter((r) => r.seriesId === "tc-pick-up");
  assert.equal(rows.length, pista.length + pick_.length, "no queda ninguna fila en otra categoría");
  // Cada categoría: 2 entrenamientos, la clasificación, 2 series y la final.
  assert.equal(pista.length, 6);
  assert.equal(pick_.length, 6);

  assert.equal(pick(rows, "tc-pista-pick-up", "2026-09-26", "1° Entrenamiento").start, "09:05");
  assert.equal(pick(rows, "tc-pick-up", "2026-09-26", "1° Entrenamiento").start, "09:50");
  assert.equal(pick(rows, "tc-pick-up", "2026-09-26", "1° Entrenamiento").end, "10:55", "los grupos A y B forman una sola sesión");
  assert.equal(pick(rows, "tc-pista-pick-up", "2026-09-26", "Clasificación").start, "15:20");
  assert.equal(pick(rows, "tc-pick-up", "2026-09-26", "Clasificación").start, "16:10");
  assert.equal(pick(rows, "tc-pista-pick-up", "2026-09-27", "Serie 1").start, "10:45");
  assert.equal(pick(rows, "tc-pista-pick-up", "2026-09-27", "Serie 2").start, "11:10");
  assert.equal(pick(rows, "tc-pick-up", "2026-09-27", "Serie 1").start, "11:35");
  assert.equal(pick(rows, "tc-pick-up", "2026-09-27", "Serie 2").start, "12:00");
  assert.equal(pick(rows, "tc-pista-pick-up", "2026-09-27", "Final").start, "13:10");
  assert.equal(pick(rows, "tc-pick-up", "2026-09-27", "Final").start, "14:10");
  assert.equal(pick(rows, "tc-pick-up", "2026-09-27", "Final").end, "14:50");
});

test("TCPU no se confunde con TCP (TC Pista), ni con TCPK, ni con TCPPU", () => {
  const one = (label) => parseSchedule(`Domingo 27 de septiembre\n13.00: ${label}`, { year: 2026 })[0]?.seriesId;
  assert.equal(one("Final TCPU"), "tc-pick-up");
  assert.equal(one("Final TCPPU"), "tc-pista-pick-up");
  assert.equal(one("Final TCPK"), "tc-pick-up");
  assert.equal(one("Final TCPPK"), "tc-pista-pick-up");
  assert.equal(one("Final TCP"), "tc-pista");
  assert.equal(one("Final TC Pista"), "tc-pista");
  assert.equal(one("Final TC"), "tc");
  assert.equal(one("Final TC Pick-Up"), "tc-pick-up");
  assert.equal(one("Final TC Pista Pick-Up"), "tc-pista-pick-up");
});
