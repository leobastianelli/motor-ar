import assert from "node:assert/strict";
import { test } from "node:test";
import { relativeDayInfo } from "./session-status.mjs";

// Jueves 24/09/2026 a las 23:00 hora argentina.
const NOW = "2026-09-25T02:00:00Z";

test("menos de 3 h: minutos", () => {
  assert.deepEqual(relativeDayInfo("2026-09-25T02:45:00Z", NOW), { kind: "minutes", amount: 45, future: true });
});

test("menos de 3 h: horas", () => {
  assert.deepEqual(relativeDayInfo("2026-09-25T04:00:00Z", NOW), { kind: "hours", amount: 2, future: true });
});

test("mismo día calendario argentino, más de 3 h: hoy", () => {
  // 10:00 AR del jueves: mismo día calendario que "ahora" (jueves 23:00 AR), aunque ya pasó.
  assert.deepEqual(relativeDayInfo("2026-09-24T13:00:00Z", NOW), { kind: "today" });
});

test("mañana", () => {
  // Viernes 25/09 a la mañana: un día calendario después del jueves.
  assert.deepEqual(relativeDayInfo("2026-09-25T12:00:00Z", NOW), { kind: "tomorrow" });
});

test("pasado mañana: una carrera del sábado 08:00 vista el jueves a la noche", () => {
  // Esto es lo que estaba mal: con horas/24 esto redondeaba a "en 1 día" o "en 2 días" en vez de "pasado mañana".
  assert.deepEqual(relativeDayInfo("2026-09-26T11:00:00Z", NOW), { kind: "day-after-tomorrow" });
});

test("más de dos días: en N días", () => {
  assert.deepEqual(relativeDayInfo("2026-09-29T11:00:00Z", NOW), { kind: "days", amount: 5, future: true });
});

test("pasado: hace N días", () => {
  assert.deepEqual(relativeDayInfo("2026-09-20T11:00:00Z", NOW), { kind: "days", amount: 4, future: false });
});

test("ayer", () => {
  assert.deepEqual(relativeDayInfo("2026-09-23T13:00:00Z", NOW), { kind: "yesterday" });
});
