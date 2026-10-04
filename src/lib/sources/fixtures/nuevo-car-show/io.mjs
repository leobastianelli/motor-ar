// io falso del Nuevo Car Show: reproduce la estructura de nuevocarshow.com.ar (WordPress + Elementor) con datos reales recortados — el calendario
// completo y las planillas de la Clase 3 de las fechas 1 a 3 (planillas.json, mismas que usa el test de lectura). No se toca la red.
import fs from "node:fs";
import { CLASES } from "../../nuevo-car-show-clases.mjs";
import { buildPdf } from "./pdf.mjs";

export const PLANILLAS = JSON.parse(fs.readFileSync(new URL("./planillas.json", import.meta.url), "utf8"));
// El entrenamiento 1 de Termas (fecha 6) llevado al sábado 18/4 de Paraná: sirve para el caso del sitio que cuelga un mismo archivo de dos rótulos.
PLANILLAS["c3-f2-ent1"] = PLANILLAS["c3-f6-ent1"].map((l) => ({ ...l, runs: l.runs.map((r) => ({ ...r, text: r.text.replace("15/8/2026", "18/4/2026") })) }));
export const NOW = new Date("2026-04-21T15:00:00Z");
const UPLOADS = "https://nuevocarshow.com.ar/wp-content/uploads/2026";

/** Calendario real de /calendario/: cuatro títulos por fecha ("FECHA", "01", "08-03", "San Jorge"). */
export const CALENDARIO = [
  ["01", "08-03", "San Jorge"],
  ["02", "19-04", "Paraná"],
  ["03", "17-05", "San Nicolás"],
  ["04", "21-06", "San Jorge"],
  ["05", "12-07", "Rafaela"],
  ["06", "16-08", "Termas"],
  ["07", "13-09", "San Nicolás"],
  ["08", "04-10", "San Jorge"],
  ["09", "08-11", "A Confirmar"],
  ["10", "06-12", "Rafaela"],
];
export const calendarioHtml = (filas = CALENDARIO) =>
  `<div class="elementor"><h2>CALENDARIO 2026</h2>${filas
    .map(([n, d, v]) => `<div><h6 class="elementor-heading-title">FECHA</h6><h2 class="elementor-heading-title">${n}</h2></div><div><h6>${d}</h6><h6>${v}</h6></div><img src="x.png">`)
    .join("")}</div>`;

/**
 * Página de resultados de una clase: un acordeón por fecha con el PDF de cada sesión.
 * `fechas`: { [n]: { titulo, docs: [[rótulo, archivo]] } }. Las fechas que faltan figuran vacías, como en el sitio.
 */
export function resultadosHtml(fechas, venues = CALENDARIO) {
  return venues
    .map(([n, d, v], i) => {
      const f = fechas[Number(n)];
      const titulo = f?.titulo ?? `FECHA ${Number(n)} - ${v} ${d.replace("-", "/").split("/").reverse().join("/")}`;
      const items = (f?.docs ?? [])
        .map(([rotulo, archivo]) => `<div class="e-loop-item"><div class="elementor-widget-container"><h5 class="elementor-heading-title elementor-size-default">${rotulo}</h5></div><div><a class="wp-block-button__link" href="${UPLOADS}/${archivo}" target="_blank">Leer más</a></div></div>`)
        .join("");
      return `<details id="e-n-accordion-item-${i}"><summary><span class='e-n-accordion-item-title-header'><div class="e-n-accordion-item-title-text"> ${titulo} </div></span></summary><div role="region">${items}</div></details>`;
    })
    .join("");
}

/** Tabla oficial de una clase: `rondas` = { [n]: [[número, "APELLIDO, Nombre", ...celdas]] }; una pestaña por fecha (las diez, vacías las que no se corrieron). */
export function tablaOficialHtml(rondas) {
  return Array.from({ length: 10 }, (_, i) => {
    const filas = (rondas[i + 1] ?? []).map((celdas) => `<ul class="elementor-inline-items elementor-icon-list-items">${celdas.map((c) => `<li><span class="elementor-icon-list-text">${c}</span></li>`).join("")}</ul>`);
    return `<div role="tabpanel" data-tab-index="${i + 1}">${filas.join("")}</div>`;
  }).join("");
}

/** Qué PDF cuelga de cada rótulo en la fecha 1, 2 y 3 de la Clase 3 (el resto de las fechas no tiene documentos). */
export const DOCS_CLASE = {
  1: { docs: [["Final", "03/FINAL-CLASE-3.pdf"], ["General Entrenamientos", "03/GENERAL-SABADO-CLASE-3.pdf"]] },
  2: {
    docs: [
      ["Final", "04/C3-FINAL-RECT-OK.pdf"],
      ["Final", "04/C3-FINAL.pdf"], // el original, sin rectificar: tiene que ganar el rectificado
      ["1ra Serie", "04/C3-SERIE-1.pdf"],
      ["General Clasificación", "04/C3-CLASIFICACION-GRAL.pdf"],
      ["1ra Clasificación", "04/C3-CLASIFICACION-1.pdf"],
      ["1er Entrenamiento", "04/C3-ENT-1.pdf"],
      ["2do Entrenamiento", "04/C3-ENT-1.pdf"], // el sitio repite un archivo: sólo vale el rótulo que coincide con el "ENTRENAMIENTO 1" que imprime la planilla
    ],
  },
  3: { docs: [["Final Titulares", "05/C3-FINAL-TITULARES.pdf"], ["Final Invitados", "05/C3-FINAL-INVITADOS.pdf"], ["Entrenamiento Titulares", "05/C3-ENT-TITULARES.pdf"]] },
};

const PDF_DE = {
  "03/FINAL-CLASE-3.pdf": ["c3-f1-final-us", "creator"],
  "03/GENERAL-SABADO-CLASE-3.pdf": ["c3-f6-ent1", "creator"],
  "04/C3-FINAL-RECT-OK.pdf": ["c3-f2-final-rect", "gs9"],
  "04/C3-FINAL.pdf": ["c3-f2-serie1", "gs9"], // contenido distinto a propósito: si se leyera éste, el ganador sería otro
  "04/C3-SERIE-1.pdf": ["c3-f2-serie1", "gs10"],
  "04/C3-CLASIFICACION-GRAL.pdf": ["c3-f2-clasi-gral", "gs10"],
  "04/C3-CLASIFICACION-1.pdf": ["c3-f2-clasi1-ex", "gs9"],
  "04/C3-ENT-1.pdf": ["c3-f2-ent1", "gs9"],
  "05/C3-FINAL-TITULARES.pdf": ["c3-f3-final-titulares", "gs9"],
  "05/C3-FINAL-INVITADOS.pdf": ["c3-f3-final-titulares", "gs9"],
  "05/C3-ENT-TITULARES.pdf": ["c3-f6-ent1", "gs9"],
};

/**
 * io falso. `clases`: por clase, las fechas de su página de resultados (por defecto DOCS_CLASE en todas); `oficiales`: HTML de la tabla oficial por
 * clase; `failing`: archivos de PDF que fallan; `sin`: slugs de página que fallan. Registra los pedidos en `calls`.
 */
export function fakeIo({ clases = {}, oficiales = {}, failing = new Set(), sin = new Set(), posts = [], calendario = calendarioHtml() } = {}) {
  const calls = { json: [], bytes: [] };
  const json = async (url, options) => {
    calls.json.push({ url, headers: options?.headers });
    let m;
    if ((m = url.match(/slug=([a-z0-9-]+)&/))) {
      const slug = m[1];
      if (sin.has(slug)) throw new Error(`503 al pedir ${url}`);
      if (slug === "calendario") return [{ content: { rendered: calendario } }];
      const r = slug.match(/^resultados-(.+)-2026$/);
      if (r) {
        const clase = CLASES.find((c) => ({ clase1: "clase-1", clase2: "clase-2", clase3: "clase-3", tc4000: "tc-4000", fiat600: "fiat-600" })[c.id] === r[1]);
        return [{ content: { rendered: resultadosHtml(clases[clase.id] ?? DOCS_CLASE) } }];
      }
      const o = slug.match(/^campeonato-(.+)$/);
      if (o) return [{ content: { rendered: oficiales[o[1]] ?? tablaOficialHtml({}) } }];
    }
    if (url.includes("/posts?")) return posts.map((title) => ({ title: { rendered: title } }));
    throw new Error("URL inesperada " + url);
  };
  const bytes = async (url, options) => {
    calls.bytes.push({ url, headers: options?.headers });
    const file = url.replace(`${UPLOADS}/`, "");
    if (failing.has(file)) throw new Error(`404 al pedir ${url}`);
    const [key, mode] = PDF_DE[file] ?? [];
    if (!key) throw new Error("PDF inesperado " + url);
    const b = buildPdf(PLANILLAS[key], mode);
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  };
  return { json, text: json, bytes, sleep: async () => {}, calls };
}
