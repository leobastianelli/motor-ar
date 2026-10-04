import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPdf } from "./fixtures/nuevo-car-show/pdf.mjs";
import { pdfLines, pdfRuns } from "./pdf-text.mjs";

const LINES = [
  { y: 700, runs: [{ x: 10, size: 8.5, text: "Pos." }, { x: 120, size: 8.5, text: "Nombre" }, { x: 300, size: 8.5, text: "Total T°" }] },
  { y: 688.4, runs: [{ x: 12, size: 8.5, text: "1" }, { x: 95, size: 8.5, text: "DELLA SANTINA Nahuel" }, { x: 290, size: 8.5, text: "23:11.865" }] },
  { y: 677, runs: [{ x: 12, size: 8.5, text: "2" }, { x: 99, size: 8.5, text: "GIORDANO Gastón (1)" }, { x: 290, size: 8.5, text: "+2.985" }] },
];

for (const mode of ["gs9", "gs10", "creator"]) {
  test(`lee el texto y la posición de cada fragmento (${mode})`, () => {
    const runs = pdfRuns(buildPdf(LINES, mode));
    assert.equal(runs.length, 9);
    const nombre = runs.find((r) => r.text === "DELLA SANTINA Nahuel");
    assert.deepEqual([nombre.x, nombre.y, nombre.size], [95, 688.4, 8.5]);
    // Las tildes, el grado y los paréntesis sobreviven al escape del PDF.
    assert.ok(runs.some((r) => r.text === "Total T°"));
    assert.ok(runs.some((r) => r.text === "GIORDANO Gastón (1)"));
  });

  test(`agrupa los fragmentos en líneas, de arriba hacia abajo y de izquierda a derecha (${mode})`, () => {
    const lines = pdfLines(buildPdf(LINES, mode));
    assert.deepEqual(
      lines.map((l) => l.runs.map((r) => r.text).join(" | ")),
      ["Pos. | Nombre | Total T°", "1 | DELLA SANTINA Nahuel | 23:11.865", "2 | GIORDANO Gastón (1) | +2.985"],
    );
  });
}

test("fragmentos con casi la misma altura van en la misma línea (la planilla desalinea medio punto)", () => {
  const lines = pdfLines(buildPdf([{ y: 600, runs: [{ x: 10, size: 8, text: "7" }] }, { y: 599.2, runs: [{ x: 90, size: 8, text: "BONELLO Nicolás" }] }]));
  assert.equal(lines.length, 1);
  assert.deepEqual(lines[0].runs.map((r) => r.text), ["7", "BONELLO Nicolás"]);
});

test("un PDF sin texto legible devuelve una lista vacía, no revienta", () => {
  assert.deepEqual(pdfRuns(Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n")), []);
  assert.deepEqual(pdfRuns(Buffer.from("esto no es un PDF")), []);
});
