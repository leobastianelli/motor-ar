// Campeonato de pilotos del Rally Argentino por clase, TAL CUAL lo publica rallyargentino.com/campeonato-pilotos.php (estado "oficial": no lo
// calculamos nosotros, a diferencia de Córdoba Pista). La página trae una tabla por clase (id `tbl_campeonato_<clase>`): posición, piloto,
// marca (un ícono) y una celda de puntos por fecha (9, con decimales: 62.5; 0 si la fecha todavía no se corrió), más el total.
//
// Frescura: la página no dice "tras la fecha N", así que se deduce: la última columna con algún punto en esa clase. Si la clase corrió más
// fechas que las que la tabla cubre, `data.ts` la oculta (nunca se muestra una tabla vieja como actual).
import { CLASES, claseDeTexto } from "./rally-argentino-clases.mjs";
import { nombrePropio } from "./rally-argentino-nombres.mjs";

export const TABLA_OFICIAL = { name: "rallyargentino.com", url: "https://www.rallyargentino.com/campeonato-pilotos.php" };

const entities = { "&nbsp;": " ", "&amp;": "&", "&aacute;": "á", "&eacute;": "é", "&iacute;": "í", "&oacute;": "ó", "&uacute;": "ú", "&ntilde;": "ñ", "&#39;": "'", "&quot;": '"' };
const plain = (html) =>
  String(html ?? "")
    .replace(/<[^>]*>?/g, " ")
    .replace(/&[a-z#0-9]+;/gi, (e) => entities[e.toLowerCase()] ?? " ")
    .replace(/\s+/g, " ")
    .trim();

const MARCAS = { vw: "VW", bmw: "BMW", ds: "DS", mini: "Mini", mitsubishi: "Mitsubishi" };
/** El ícono de la marca ("assets/img/elementos/skoda.gif") → "Skoda". Vacío si la celda no trae ícono. */
export function marcaDe(cellHtml) {
  const file = String(cellHtml ?? "").match(/elementos\/([a-z0-9_-]+)\.\w+/i)?.[1]?.toLowerCase();
  return file ? (MARCAS[file] ?? file[0].toUpperCase() + file.slice(1)) : "";
}

/**
 * Tablas del campeonato → { [classId]: { rows, asOfRound, rounds } }. `rows`: { pos, driver, team, points } en el orden de la página.
 * `asOfRound` es la última fecha con algún punto en la clase (null si nadie sumó); `rounds`, cuántas columnas de fecha tiene la tabla.
 * Una clase con tabla vacía (Copa Toyota hoy) devuelve `rows: []`.
 */
export function parseCampeonato(html) {
  const out = {};
  for (const m of String(html).matchAll(/<table[^>]*id="tbl_campeonato_([a-z0-9]+)"[^>]*>([\s\S]*?)<\/table>/gi)) {
    const classId = claseDeTexto(m[1]);
    if (!classId || out[classId]) continue;
    const rounds = [...m[2].matchAll(/<th[^>]*>\s*(\d{1,2})\s*°/g)].length;
    const rows = [];
    let asOfRound = null;
    for (const tr of m[2].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      // La celda de la marca viene con la etiqueta <img> sin cerrar, así que se separa por </td> y no por <td>…</td>.
      const cells = tr[1].split(/<\/td>/i).slice(0, -1).map((c) => c.replace(/^[\s\S]*<td[^>]*>/i, ""));
      if (cells.length < 5) continue;
      const pos = Number.parseInt(plain(cells[0]), 10);
      const driver = nombrePropio(plain(cells[2]));
      const total = Number.parseFloat(plain(cells.at(-1)).replace(",", "."));
      if (!Number.isFinite(pos) || !driver || !Number.isFinite(total)) continue;
      const puntos = cells.slice(4, 4 + rounds).map((c) => Number.parseFloat(plain(c).replace(",", ".")) || 0);
      puntos.forEach((p, i) => {
        if (p > 0) asOfRound = Math.max(asOfRound ?? 0, i + 1);
      });
      rows.push({ pos, driver, team: marcaDe(cells[3]), points: total });
    }
    out[classId] = { rows, asOfRound, rounds };
  }
  return out;
}

/**
 * El campeonato de cada clase, listo para guardar en `meta["rally-argentino"].clases`. `previous`: lo guardado antes; nunca se achica: si la
 * tabla de hoy cubre menos fechas o trae menos pilotos que la anterior (la página falló, se rompió el HTML), se conserva la anterior.
 */
export function campeonatosDeRally(parsed, { previous = {}, source = TABLA_OFICIAL } = {}) {
  const out = {};
  for (const clase of CLASES) {
    const t = parsed?.[clase.id];
    let result;
    if (!t) result = { status: "sin-campeonato", reason: "La página del campeonato no trae la tabla de esta clase." };
    else if (!t.rows.length || !t.asOfRound) result = { status: "sin-campeonato", reason: "Todavía no hay puntos en la tabla oficial de esta clase." };
    else result = { status: "oficial", asOfRound: t.asOfRound, source, rows: t.rows };
    const before = previous?.[clase.id];
    if (before?.status === "oficial" && (result.status !== "oficial" || result.asOfRound < before.asOfRound || result.rows.length < before.rows.length)) result = before;
    out[clase.id] = result;
  }
  return out;
}
