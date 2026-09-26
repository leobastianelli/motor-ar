import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCalendar, buildEvent, escapeText, foldLine } from "./ics.mjs";

const base = {
  uid: "tc-2026-8-clasificacion",
  category: "TC",
  sessionName: "Clasificación",
  city: "San Nicolás",
  location: "Autódromo de San Nicolás, San Nicolás",
  start: "2026-10-04T14:05:00Z",
  durationMin: 45,
  timeKnown: true,
  eventUrl: "https://www.somosfierros.ar/eventos/tc-2026-8",
};

test("escapeText escapa barra, punto y coma, coma y saltos de línea", () => {
  assert.equal(escapeText("a; b, c\\d"), "a\\; b\\, c\\\\d");
  assert.equal(escapeText("línea 1\nlínea 2"), "línea 1\\nlínea 2");
  assert.equal(escapeText("línea 1\r\nlínea 2"), "línea 1\\nlínea 2");
});

test("escapeText escapa la barra invertida antes que el resto (no queda doble escapada)", () => {
  // Si escapara ";" antes que "\\", el "\\;" resultante de un ";" original se volvería a escapar mal.
  assert.equal(escapeText("a\\;b"), "a\\\\\\;b");
});

test("foldLine no toca una línea corta", () => {
  const line = "SUMMARY:TC · Clasificación · San Nicolás";
  assert.equal(foldLine(line), line);
});

test("foldLine pliega a 75 octetos por línea física y no corta un acento a la mitad", () => {
  const longCity = "á".repeat(40); // cada "á" son 2 bytes UTF-8: fuerza el plegado en medio de caracteres multibyte.
  const line = `LOCATION:${longCity}`;
  const folded = foldLine(line);
  const physicalLines = folded.split("\r\n");
  assert.ok(physicalLines.length > 1, "una línea larga tiene que plegarse en más de una línea física");
  for (const [i, physical] of physicalLines.entries()) {
    const bytes = Buffer.byteLength(physical, "utf8");
    assert.ok(bytes <= 75, `línea física ${i} mide ${bytes} octetos, más de 75`);
    if (i > 0) assert.equal(physical[0], " ", "las líneas de continuación empiezan con un espacio");
  }
  // Reconstruir el valor original (quitando el CRLF + espacio de plegado) tiene que dar la línea sin plegar.
  const unfolded = folded.replace(/\r\n /g, "");
  assert.equal(unfolded, line);
  // Ningún carácter multibyte quedó partido: decodificar cada trozo por separado no debe producir el carácter de reemplazo.
  for (const physical of physicalLines) assert.ok(!physical.includes("�"));
});

test("buildEvent arma un VEVENT con UID estable (<id>@somosfierros.ar), DTSTAMP y DTSTART/DTEND en UTC con Z", () => {
  const lines = buildEvent(base, "2026-09-26T12:00:00Z");
  assert.equal(lines[0], "BEGIN:VEVENT");
  assert.equal(lines.at(-1), "END:VEVENT");
  assert.ok(lines.includes("UID:tc-2026-8-clasificacion@somosfierros.ar"));
  assert.ok(lines.includes("DTSTAMP:20260926T120000Z"));
  assert.ok(lines.includes("DTSTART:20261004T140500Z"));
  // Fin = inicio + durationMin (45 min).
  assert.ok(lines.includes("DTEND:20261004T145000Z"));
  assert.ok(lines.some((l) => l.startsWith("SUMMARY:TC · Clasificación · San Nicolás")));
  assert.ok(lines.some((l) => l.startsWith("URL:https://www.somosfierros.ar/eventos/tc-2026-8")));
});

test("el UID es estable: no depende de dtstamp ni de ningún otro campo variable", () => {
  const a = buildEvent(base, "2026-09-26T12:00:00Z");
  const b = buildEvent(base, "2026-09-27T08:00:00Z");
  const uidOf = (lines) => lines.find((l) => l.startsWith("UID:"));
  assert.equal(uidOf(a), uidOf(b));
});

test("sesión sin hora confirmada: evento de día completo con «(horario a confirmar)» en el título", () => {
  const lines = buildEvent({ ...base, timeKnown: false, start: "2026-10-04T00:00:00-03:00" }, "2026-09-26T12:00:00Z");
  assert.ok(lines.includes("DTSTART;VALUE=DATE:20261004"));
  // Fin exclusivo: el día siguiente.
  assert.ok(lines.includes("DTEND;VALUE=DATE:20261005"));
  assert.ok(lines.some((l) => l.startsWith("SUMMARY:TC · Clasificación (horario a confirmar) · San Nicolás")));
  assert.ok(!lines.some((l) => l.startsWith("DTSTART:")));
});

test("horario tentativo: se aclara en la descripción, pero el evento tiene hora (no es de día completo)", () => {
  const lines = buildEvent({ ...base, timeStatus: "tentative" }, "2026-09-26T12:00:00Z");
  assert.ok(lines.includes("DTSTART:20261004T140500Z"));
  const desc = lines.find((l) => l.startsWith("DESCRIPTION:"));
  assert.ok(desc.includes("tentativo"));
});

test("sesión terminada con resultados: la descripción trae el ganador y los argentinos con su posición", () => {
  const lines = buildEvent(
    {
      ...base,
      hasResults: true,
      ganador: { name: "Mariano Werner" },
      argentinos: [
        { name: "Mariano Werner", pos: 1 },
        { name: "Julián Santero", pos: 5 },
        { name: "Otro Piloto", pos: 12, noTermino: "abandonó" },
      ],
      dondeVerlo: ["Canal 9"],
    },
    "2026-09-26T12:00:00Z",
  );
  const desc = lines.find((l) => l.startsWith("DESCRIPTION:"));
  assert.ok(desc.includes("Ganador: Mariano Werner."));
  assert.ok(desc.includes("Julián Santero 5.º"));
  assert.ok(desc.includes("Otro Piloto abandonó"));
  assert.ok(desc.includes("Dónde verlo: Canal 9."));
});

test("buildCalendar arma un VCALENDAR válido: cabecera, un VEVENT por sesión, pie, todo en CRLF", () => {
  const ics = buildCalendar({
    name: "Fierros · Turismo Carretera",
    sessions: [base, { ...base, uid: "tc-2026-8-final", sessionName: "Final" }],
    dtstamp: "2026-09-26T12:00:00Z",
  });
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.ok(ics.includes("X-WR-CALNAME:Fierros · Turismo Carretera\r\n"));
  assert.ok(ics.includes("X-WR-TIMEZONE:America/Argentina/Buenos_Aires\r\n"));
  assert.ok(ics.includes("REFRESH-INTERVAL;VALUE=DURATION:PT6H\r\n"));
  assert.ok(ics.includes("X-PUBLISHED-TTL:PT6H\r\n"));
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 2);
  assert.equal((ics.match(/END:VEVENT/g) ?? []).length, 2);
  // Sin LF suelto (sólo CRLF): un \n que no venga precedido de \r rompe el formato para varios lectores.
  assert.ok(!/(?<!\r)\n/.test(ics));
});

test("buildCalendar no repite el dtstamp por evento si no se lo pasan explícito", () => {
  const ics = buildCalendar({ name: "x", sessions: [base], dtstamp: "2026-01-01T00:00:00Z" });
  assert.ok(ics.includes("DTSTAMP:20260101T000000Z"));
});
