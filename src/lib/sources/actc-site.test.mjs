import assert from "node:assert/strict";
import { test } from "node:test";
import { actcDriver, nextWeekday, normalizeActcNote, parseActcStandings, publishedDay } from "./actc-site.mjs";
import { parseSchedule } from "./schedule-notes.mjs";

// Texto de la nota real de la ACTC "Cronograma para el fin de semana" (TC Mouras y TC Pista Mouras, La Plata, 14/08/2026).
const NOTE = `Prensa ACTC · 14/08/2026TCM
Cronograma para el fin de semana en La Plata:
SÁBADO
TCPM | 10:40 a 11:00 Hs. 1er. Entrenamiento, (Todos Juntos) 20 min.
TCM | 11:05 a 11:25 Hs. 1er. Entrenamiento,(Todos Juntos) 20 min.
TCPM| 13:08 a 13:28 Hs. 2do. Entrenamiento,(Todos Juntos) 20 min.
TCM | 13:33 a 13:53 Hs. 2do. Entrenamiento,(Todos Juntos) 20 min.
TCPM | 15:16 a 15:24 Hs. Clasificación,(Grupo Único) 8 min.
TCM | 15:29 a 15:37 Hs. Clasificación,(Grupo Único) 8 min.
DOMINGO
TCPM | 10:00 Hs. Serie Única , 5 vueltas.
TCM | 10:25 Hs. Serie Única , 5 vueltas.
-Transmisión de TV Pública de 12 a 16 horas
TCPM| 12:10 a 12:30 Hs. FINAL , 12 vueltas o 20 minutos máximo.
TCM | 12:45 a 13:10 Hs. FINAL, 14 vueltas o 25 minutos máximo.`;

test("la fecha de publicación sale de la firma de la nota", () => {
  assert.equal(publishedDay(NOTE), "2026-08-14");
  assert.equal(publishedDay("sin firma, pero 2026-09-21 en el código"), "2026-09-21");
  assert.equal(publishedDay("nada"), null);
});

test("SÁBADO y DOMINGO se ubican en el primer día así desde la publicación (viernes 14/08)", () => {
  assert.equal(nextWeekday("2026-08-14", 6), "2026-08-15");
  assert.equal(nextWeekday("2026-08-14", 0), "2026-08-16");
  assert.equal(nextWeekday("2026-08-14", 5), "2026-08-14");
  assert.throws(() => nextWeekday(null, 6));
});

test("la nota de la ACTC se convierte en sesiones con hora por categoría", () => {
  const sessions = parseSchedule(normalizeActcNote(NOTE, "2026-08-14"), { year: 2026 });
  assert.equal(sessions.length, 10);
  const find = (seriesId, name, date) => sessions.find((s) => s.seriesId === seriesId && s.name === name && s.date === date);
  assert.equal(find("tc-pista-mouras", "1° Entrenamiento", "2026-08-15").start, "10:40");
  assert.equal(find("tc-mouras", "2° Entrenamiento", "2026-08-15").start, "13:33");
  assert.equal(find("tc-mouras", "Clasificación", "2026-08-15").end, "15:37");
  assert.equal(find("tc-pista-mouras", "Final", "2026-08-16").start, "12:10");
  // Se llama igual que en los resultados ("Serie única"), así no se duplica la sesión.
  assert.equal(find("tc-mouras", "Serie única", "2026-08-16").start, "10:25");
  assert.equal(find("tc-mouras", "Final", "2026-08-16").end, "13:10");
  // El TCM y el TCPM no se confunden con el TC ni entre sí.
  assert.equal(sessions.filter((s) => s.seriesId === "tc").length, 0);
});

test("una nota sin nada reconocible no produce sesiones", () => {
  assert.equal(parseSchedule(normalizeActcNote("Se viene la fecha en Balcarce. Entradas a la venta.", "2026-09-21"), { year: 2026 }).length, 0);
});

test("el nombre y las victorias del campeonato se leen de 'APELLIDO, NOMBRE n'", () => {
  assert.deepEqual(actcDriver("WERNER, MARIANO 2"), { driver: "Mariano Werner", wins: 2 });
  assert.deepEqual(actcDriver("MAZZACANE, GASTÓN"), { driver: "Gastón Mazzacane", wins: 0 });
  assert.deepEqual(actcDriver("TADEI, GUSTAVO (H)"), { driver: "Gustavo (h) Tadei", wins: 0 });
});

const TABLE = `<table><tr><th>Pos</th><th>N°</th><th>Piloto</th><th>Marca</th><th>Total</th><th>16/08 Rosario</th><th>26/07 LA PLATA</th></tr><tr><td></td><td></td><td></td><td></td><td>Pts</td><td>Pts</td><td>Pts</td></tr></table>
<table><tr><td>1</td><td>3</td><td>WERNER, MARIANO <sup>2</sup></td><td></td><td>268</td><td>38</td><td>2 <sup>47</sup></td></tr>
<tr><td>2</td><td>256</td><td>FRITZLER, OTTO 1</td><td></td><td>257</td><td>36</td><td>34.5</td></tr>
<tr><td>3</td><td>1</td><td>CANAPINO, AGUSTÍN</td><td></td><td>225.5</td><td>-</td><td>1</td></tr></table>`;

test("la tabla de campeonato trae filas y cuántas fechas cubre", () => {
  const parsed = parseActcStandings(TABLE);
  assert.equal(parsed.asOfRound, 2);
  assert.deepEqual(
    parsed.rows.map((r) => [r.pos, r.driver, r.points]),
    [[1, "Mariano Werner", 268], [2, "Otto Fritzler", 257], [3, "Agustín Canapino", 225.5]],
  );
});

test("una página sin tabla de campeonato no inventa una vacía", () => {
  assert.equal(parseActcStandings("<html>mantenimiento</html>"), null);
  assert.equal(parseActcStandings("<table><tr><th>Pos</th></tr></table>"), null);
});
