// Planillas de resultados del Nuevo Car Show: PDF que genera el cronometraje (Orbits / MyLaps, "Print\A4\RaceFull") y que la organización
// sube a nuevocarshow.com.ar, uno por sesión y por clase. Tres generaciones de PDF (PDF Creator Pilot en la fecha 1, Ghostscript después) con
// los mismos datos y encabezados distintos ("Vtas / Total T° / Mejor Tm" en español, "Laps / Total Tm / Diff / Gap" en inglés, "Mejor Tpo",
// "Tanda 1"…): las columnas se leen por el rótulo del encabezado, no por su posición.
//
// Cada celda es un fragmento con su posición (pdf-text.mjs). A qué columna pertenece lo decide la cercanía de su centro con el centro del
// rótulo: los números van alineados a la derecha, los nombres centrados y los rótulos a la izquierda, así que el borde izquierdo no sirve.
import { pdfLines } from "./pdf-text.mjs";

const fold = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Rótulo del encabezado → campo. */
function campoDe(rotulo) {
  const t = fold(rotulo).replace(/[°º]/g, "").replace(/\s+/g, " ").trim();
  if (/^pos/.test(t)) return "pos";
  if (/^(n|no|nro|numero)\.?$/.test(t)) return "number";
  if (/^(nombre|name|piloto)$/.test(t)) return "name";
  if (/^(vtas|laps)$/.test(t)) return "laps";
  if (/^(total|tpo\.? ?total)/.test(t)) return "total";
  if (/speed|vel|^en vta|^prom|^tanda|^chasis|^class/.test(t)) return "otro";
  if (/^(mejor|best|overall)/.test(t)) return "best";
  if (/ant/.test(t) || /^gap$/.test(t)) return "gapPrev";
  if (/^(dif|diff)/.test(t)) return "gap1";
  if (/^(marca|make)$/.test(t)) return "make";
  return "otro";
}

const ancho = (run) => run.text.length * run.size * 0.52;
const centro = (run) => run.x + ancho(run) / 2;

const SECCION_NC = /^(no clasificado|not classified)/i;
const FIN_TABLA = /^(notificaciones|announcements|cronometraje|margin of victory|chief of timing)/i;

/** "Mat¡as" → "Matías", "Jos‚" → "José": la fuente escribe algunas tildes con la codificación DOS (CP850) leída como Latin-1. */
export const repararTildes = (s) =>
  String(s)
    .replace(/(?<=\p{L})[¡¢£¤¥‚](?=\p{L}|\s|$)/gu, (c) => ({ "¡": "í", "¢": "ó", "£": "ú", "¤": "ñ", "¥": "Ñ", "‚": "é" })[c])
    .replace(/\s+/g, " ")
    .trim();

/**
 * Lee una planilla. Devuelve { encabezado: string[], fechaHora: {a, b, anio, hh, mm}|null, filas, completa }.
 * `fechaHora.a` / `.b` son los dos números de la fecha tal como están escritos: la fecha 1 usa mes/día (formato estadounidense, con AM/PM) y
 * el resto día/mes; quien llama decide cuál es contra el día del evento. `filas`: { posText, number, name, laps, total, best, gap1,
 * gapPrev, make, nc } en el orden de la planilla. `completa`: se encontró el encabezado de la tabla y al menos una fila.
 */
export function leerPlanilla(buf) {
  const lines = pdfLines(buf);
  const hi = lines.findIndex((l) => l.runs.some((r) => /^pos/i.test(r.text)) && l.runs.some((r) => campoDe(r.text) === "name"));
  const encabezado = lines.slice(0, hi < 0 ? lines.length : hi).map((l) => l.runs.map((r) => r.text).join(" | "));
  let fechaHora = null;
  for (const t of encabezado) {
    const m = t.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
    if (!m) continue;
    let hh = Number(m[4]);
    if (m[6]) hh = (hh % 12) + (/pm/i.test(m[6]) ? 12 : 0);
    fechaHora = { a: Number(m[1]), b: Number(m[2]), anio: Number(m[3]), hh, mm: Number(m[5]), ampm: Boolean(m[6]) };
    break;
  }
  if (hi < 0) return { encabezado, fechaHora, filas: [], completa: false };

  const columnas = lines[hi].runs.map((r) => ({ campo: campoDe(r.text), c: centro(r) })).filter((c) => c.campo !== "otro" || true);
  const filas = [];
  let nc = false;
  for (const l of lines.slice(hi + 1)) {
    const primero = l.runs[0].text;
    if (FIN_TABLA.test(primero)) break;
    if (SECCION_NC.test(primero)) {
      nc = true;
      continue;
    }
    const celdas = {};
    for (const r of l.runs) {
      const col = columnas.reduce((best, c) => (Math.abs(c.c - centro(r)) < Math.abs(best.c - centro(r)) ? c : best));
      (celdas[col.campo] ??= []).push(r.text);
    }
    const number = (celdas.number ?? []).join("").trim();
    const name = repararTildes((celdas.name ?? []).join(" "));
    if (!/^\d+$/.test(number) || !/\p{L}/u.test(name)) continue;
    const posText = (celdas.pos ?? []).join("").replace(/\s+/g, "");
    // Una cifra puede venir partida en varios fragmentos ("0", ".", "4", "3", "2"): se juntan sin espacio, salvo la marca.
    const un = (k) => (celdas[k] ?? []).join(k === "make" ? " " : "").trim();
    filas.push({ posText, number, name, laps: un("laps"), total: un("total"), best: un("best"), gap1: un("gap1"), gapPrev: un("gapPrev"), make: un("make"), nc });
  }
  return { encabezado, fechaHora, filas, completa: filas.length > 0 };
}
