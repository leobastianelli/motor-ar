// Resultados oficiales de la ACTC desde su portal de tiempos (tiempos.actc.org.ar, robots.txt sin restricciones):
// entrenamientos, clasificación, series y final, con la clasificación completa, para las seis categorías de la ACTC.
// El listado agrupa por categoría y fecha; cada sesión tiene una página con la tabla de pilotos.

import { belongsToEvent } from "./plausible.mjs";
import { sessionId } from "../session-id.mjs";
import { PROVISIONAL, brokenActcResults, describeOfficialChange, hasPodium, isProvisional, penaltiesFrom, reconcileSession } from "../provisorio.mjs";

const BASE = "https://tiempos.actc.org.ar";
const TAB_SERIES = { TC: "tc", TCP: "tc-pista", TCM: "tc-mouras", TCPM: "tc-pista-mouras", TCPK: "tc-pick-up", TCPPK: "tc-pista-pick-up" };
export const TIMING_SERIES = new Set(Object.values(TAB_SERIES));
export const TIMING_SOURCE = "ACTC · tiempos oficiales";
export const LISTING_URL = `${BASE}/resultados`;

const DAY = 86400000;
/** Días después del último día de la fecha en que todavía se acepta un documento del portal como suyo. */
const LATE_DOCS_DAYS = 2;
/** Cuántos documentos de una misma sesión se leen como máximo hasta dar con uno oficial. */
const MAX_CANDIDATES = 4;
const ORDER = { practica: 0, clasificacion: 1, serie: 2, sprint: 3, final: 4, carrera: 4 };

const plain = (html) =>
  String(html)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();

/** El portal declara UTF-8 pero algunas páginas vienen en Windows-1252: se decodifica según lo que realmente llega. */
async function page(io, url, revalidate) {
  const buf = new Uint8Array(await io.bytes(url, { revalidate }));
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("windows-1252").decode(buf);
  }
}

const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])([a-záéíóúñü])/g, (m, p, c) => p + c.toUpperCase());
const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Documentos del listado: categoría, día, título y página de cada resultado. */
export function parseListing(html) {
  const docs = [];
  for (const block of html.split(/<div class="acc-item"/).slice(1)) {
    const seriesId = TAB_SERIES[block.match(/data-tab="([^"]+)"/)?.[1]];
    if (!seriesId) continue;
    const blockId = block.match(/id="([^"]+)"/)?.[1] ?? "";
    for (const row of block.split(/<div class="result-row/).slice(1)) {
      const title = plain(row.match(/result-title">([\s\S]*?)<\/div>/)?.[1] ?? "");
      const date = row.match(/result-date">\s*(\d{2})\/(\d{2})\/(\d+)/);
      const id = row.match(/\/resultados\/(\d+)\/ver/)?.[1];
      if (!title || !date || !id) continue;
      // El portal a veces tipea mal el año ("20206"): todo lo publicado es de la temporada en curso.
      const year = /^20\d\d$/.test(date[3]) ? date[3] : "2026";
      // El botón de descarga dice qué es: Excel (planilla del cronometraje), PDF (clasificación de los comisarios) o nada (Mouras, otro sistema).
      const format = row.match(/dl-btn (xlsx|pdf)/)?.[1];
      docs.push({ seriesId, block: blockId, title, day: `${year}-${date[2]}-${date[1]}`, id: Number(id), url: `${BASE}/resultados/${id}/ver`, ...(format ? { format } : {}) });
    }
  }
  return docs;
}

/** Categoría como la rotula la página de un resultado ("🏷 Turismo Carretera Pista Pick Up", a veces "TC PISTA MOURAS") → serie. */
const LABEL_SERIES = {
  "TURISMO CARRETERA": "tc",
  "TURISMO CARRETERA PISTA": "tc-pista",
  "TURISMO CARRETERA MOURAS": "tc-mouras",
  "TURISMO CARRETERA PISTA MOURAS": "tc-pista-mouras",
  "TURISMO CARRETERA PICK UP": "tc-pick-up",
  "TURISMO CARRETERA PISTA PICK UP": "tc-pista-pick-up",
};

/** La serie que dice la página de un resultado, o null si no la dice (los PDF de los comisarios y las grillas no traen la etiqueta). */
export function pageSeries(html) {
  const label = String(html).match(/<span>\s*🏷️?\s*([^<]+)<\/span>/)?.[1];
  if (!label) return null;
  const t = fold(plain(label)).toUpperCase().replace(/\s+/g, " ").trim().replace(/^TC\b/, "TURISMO CARRETERA");
  return LABEL_SERIES[t] ?? null;
}

/**
 * Una tanda de una clasificación por etapas, no la clasificación: los cortes eliminatorios de las Pick Up ("CLASIFICACION CL1", "CL3 PARCIALES
 * CLASIFICACION TC PICK UP") y los grupos del TC ("CUARTOS CLASIFICATORIOS", "TERCIOS", "GRUPOS"). El mejor de un corte no es el de la pole
 * (La Plata, 17/10/2026: Mazzacane ganó el CL1 del TC Pick Up y Werner el CL2); vale sólo la clasificación final que publican después.
 */
export const isQualifyingStage = (title) => /\bCL\s*\d\b|\bCUARTOS?\b|\bTERCIOS?\b|\bGRUPOS?\b/.test(fold(title).toUpperCase());

/** Título del portal → sesión nuestra. Los parciales, las grillas y las tandas de una clasificación por etapas no son clasificaciones. */
export function classify(title) {
  const t = fold(title).toUpperCase();
  if (/PARCIAL|GRILLA|GRILA|LARGADA/.test(t)) return null;
  const n = t.match(/\b(\d)\s*(?:ERA|ER|DA|DO|RA|RO|TA|TO)?\b/)?.[1] ?? "1";
  if (/ENTRENAMIENTO|PRACTICA|ENSAYO/.test(t)) return { kind: "practica", name: `${n}° Entrenamiento` };
  if (/CLASIFICACION/.test(t)) return isQualifyingStage(t) ? null : { kind: "clasificacion", name: "Clasificación" };
  if (/SERIE UNICA/.test(t)) return { kind: "serie", name: "Serie única" };
  if (/SERIE/.test(t)) return { kind: "serie", name: `Serie ${n}` };
  if (/FINAL/.test(t)) return { kind: "final", name: "Final" };
  return null;
}

/** Marcas como las escribe el portal → como se conocen. */
const MAKES = { bmw: "BMW", benz: "Mercedes-Benz", "mercedes benz": "Mercedes-Benz", mercedes: "Mercedes-Benz", ram: "RAM", camaro: "Camaro", challenger: "Challenger", mustang: "Mustang" };

const TIME = /^\+?(?:(\d+):)?(\d{1,2})[.,](\d{1,3})$/;
const seconds = (s) => {
  const m = String(s).match(TIME);
  return m ? Number(m[1] ?? 0) * 60 + Number(m[2]) + Number(`0.${m[3]}`) : null;
};
const clock = (sec) => {
  const m = Math.floor(sec / 60);
  const rest = (sec - m * 60).toFixed(3).padStart(6, "0");
  return m ? `${m}:${rest}` : rest;
};

/** Nombres de pila frecuentes en el automovilismo argentino: ordenan "APELLIDO NOMBRE" sin adivinar por posición. */
const FIRST_NAMES = new Set(
  (
    "agustin alan alejandro alfonso alfredo andres angel antonio ariel augusto axel bautista benjamin bruno camilo carlos christian cristian " +
    "claudio dante damian daniel dario david diego eduardo elias emanuel emiliano enzo esteban eugenio ezequiel facundo federico felipe fernando " +
    "franco francisco gabriel gaston german gonzalo guido guillermo gustavo hernan horacio hugo ignacio inaki ivan jeremias jonatan jonathan jorge jose " +
    "joaquin juan julian julio kevin laureano leandro leonel lucas luciano luis manuel marcelo marcos mariano mario martin mateo matias mauricio " +
    "maximiliano miguel nahuel nestor nicolas norberto octavio omar oscar otto pablo pedro ramiro raul renzo ricardo roberto rodrigo roman rosendo " +
    "santiago santino sebastian sergio thiago tobias tomas ulises valentin walter " +
    "abel adrian alberto aldo dino alex alexis alvaro amadeo anibal bernardo braian brian cesar cristobal cruz edgardo emilio ernesto fabian fabricio " +
    "fabrizio fausto francesco gerardo gian gianfranco gino hector ivo jesus joel josue lautaro leonardo lisandro lorenzo luca marcio marco maximo " +
    "nazareno nehuen patricio rafael ramon ruben salvador teo tiago uriel valentino vicente victor yamil"
  ).split(" "),
);

/** Marcas y modelos como aparecen en el portal (a veces pegados al nombre) → marca. */
const MAKE_WORDS = {
  chevrolet: "Chevrolet", camaro: "Chevrolet", s10: "Chevrolet", ford: "Ford", mustang: "Ford", ranger: "Ford", toyota: "Toyota", camry: "Toyota",
  hilux: "Toyota", toyoya: "Toyota", dodge: "Dodge", challenger: "Dodge", torino: "Torino", mercedes: "Mercedes-Benz", benz: "Mercedes-Benz", bmw: "BMW", ram: "RAM",
  volkswagen: "Volkswagen", vw: "Volkswagen", amarok: "Volkswagen", nissan: "Nissan", frontier: "Nissan", fiat: "Fiat", foton: "Foton",
};
const NOISE = new Set([
  "tc", "tcp", "tcm", "tcpm", "tcpk", "tcppk", "actc", "n", "no", "piloto", "nombre", "marca", "apellido",
  "ex", "ab", "nc", "dsq", "desc", "exc", "laps", "lap", "vuelta", "vueltas", "vtas", "vta", "pts",
  // Estado del auto (badge al lado del nombre + repetido en la columna de diferencia, p. ej. "MANGONI EXCLUIDO"
  // con diferencia "excluido"): sin esto, el nombre queda pegado a la palabra de estado, hasta duplicada.
  "excluido", "excluida", "descalificado", "descalificada", "abandono", "abandonado", "abandonada", "retirado", "retirada",
]);

const nameKey = (s) => fold(s).replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean).sort().join(" ");
const letterKey = (s) => [...fold(s).replace(/[^a-z]/g, "")].sort().join("");

/**
 * Nombre para mostrar a partir de sus palabras, venga "WERNER MARIANO", "Perez, Damian" o "Juan Pablo Gianini":
 * primero el nombre ya conocido con las mismas palabras (o las mismas letras, si el portal partió mal una palabra);
 * si no, los nombres de pila van adelante.
 */
export function displayName(words, known) {
  const list = (Array.isArray(words) ? words : String(words).split(/[\s,]+/)).filter(Boolean);
  const joined = list.join(" ");
  const hit = known.get(nameKey(joined)) ?? known.get(`#${letterKey(joined)}`);
  if (hit) return hit;
  const isFirst = (w) => FIRST_NAMES.has(fold(w)) || /^[a-z]\.?$/i.test(w);
  const ordered = list.some(isFirst) && !list.every(isFirst) ? [...list.filter(isFirst), ...list.filter((w) => !isFirst(w))] : list;
  return titleCase(ordered.join(" "));
}

/** Nombres conocidos indexados por sus palabras y por sus letras. */
export function knownIndex(names) {
  const known = new Map();
  for (const name of names) {
    if (!name || name.trim().split(/\s+/).length < 2) continue;
    if (!known.has(nameKey(name))) known.set(nameKey(name), name);
    if (!known.has(`#${letterKey(name)}`)) known.set(`#${letterKey(name)}`, name);
  }
  return known;
}

/**
 * Filas de una página de resultado. El portal cambia la estructura según quién cargó cada archivo (nombre partido en dos
 * celdas, marca pegada al nombre, tiempo en la columna de marca): cada celda se lee por su contenido, no por su posición.
 */
export function parseResult(html, kind, known) {
  const rows = [];
  for (const tr of html.match(/<tr class="driver-row"[\s\S]*?<\/tr>/g) ?? []) {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => plain(m[1]));
    if (!/^\d+$/.test(cells[1] ?? "")) continue; // encabezados repetidos dentro de la tabla
    const pieces = cells.slice(2);
    const time = pieces.find((c) => TIME.test(c));
    const ints = pieces.filter((c) => /^\d+$/.test(c)).map(Number);
    // "+3" (entero con signo) en la columna de diferencia son vueltas de atraso, no segundos.
    const behind = pieces.find((c) => /^\+\d+$/.test(c));
    const words = [];
    let make = "";
    for (const cell of pieces) {
      if (!cell || TIME.test(cell) || /^\d+$/.test(cell) || /^[-—–+]+$/.test(cell)) continue;
      for (let token of cell.split(/[\s,]+/)) {
        const f = fold(token).replace(/[^a-z0-9]/g, "");
        if (!f || NOISE.has(f)) continue;
        if (MAKE_WORDS[f]) {
          make ||= MAKE_WORDS[f];
          continue;
        }
        const glued = Object.keys(MAKE_WORDS).find((m) => f.length > m.length + 2 && f.endsWith(m));
        if (glued) {
          make ||= MAKE_WORDS[glued];
          token = token.slice(0, token.length - glued.length);
        }
        if (/[a-záéíóúñü]/i.test(token)) words.push(token);
      }
    }
    if (!words.length) continue;
    const pos = Number.parseInt(cells[0], 10);
    rows.push({
      pos: Number.isFinite(pos) ? pos : rows.length + 1,
      positionText: Number.isFinite(pos) ? undefined : cells[0] || undefined,
      number: cells[1],
      driver: displayName(words, known),
      team: make,
      seconds: time ? seconds(time) : null,
      laps: ints.length ? Math.max(...ints) : null,
      behind: behind ? Number(behind.slice(1)) : null,
    });
  }
  const race = kind === "serie" || kind === "final";
  const lead = rows[0];
  const lapText = (n) => `+${n} ${n === 1 ? "vuelta" : "vueltas"}`;
  return rows.map(({ seconds: sec, laps, behind, ...r }, i) => {
    let gap = "";
    if (i === 0) gap = sec !== null ? clock(sec) : "";
    else if (race && lead.laps && laps !== null && laps < lead.laps) gap = lapText(lead.laps - laps);
    else if (race && behind) gap = lapText(behind); // el portal a veces deja el total de un auto doblado como tiempo suelto, sin vueltas
    else if (sec !== null && lead.seconds !== null && sec >= lead.seconds) gap = `+${(sec - lead.seconds).toFixed(3)}`;
    // Con el total menor al del líder la diferencia daría negativa: el dato es inconsistente y no se muestra un número.
    return { ...r, gap, ...(!gap && (sec === null || lead.seconds !== null) ? { status: "Sin tiempo" } : {}) };
  });
}

const sortSessions = (a, b) => a.start.slice(0, 10).localeCompare(b.start.slice(0, 10)) || ORDER[a.kind] - ORDER[b.kind] || a.name.localeCompare(b.name) || a.start.localeCompare(b.start);
const sessionKey = (s) => `${s.kind}|${fold(s.name)}`;

/** Suma a la fecha las sesiones con resultados oficiales: completa las del cronograma y agrega las que falten. */
export function mergeTiming(event, timed) {
  const sessions = [...event.sessions];
  for (const t of timed) {
    const i = sessions.findIndex((s) => sessionKey(s) === sessionKey(t));
    if (i >= 0) sessions[i] = { ...sessions[i], results: t.results, resultsSource: t.resultsSource };
    else sessions.push(t);
  }
  return { ...event, sessions: sessions.sort(sortSessions) };
}

const fromActc = (s) => s.resultsSource?.name === TIMING_SOURCE && s.results?.length;

/** Si el portal no responde, cada fecha conserva los resultados oficiales que ya tenía. */
export function keepPreviousTiming(events, previous) {
  const before = new Map((previous?.events ?? []).map((e) => [e.id, e]));
  return events.map((e) => {
    const timed = before.get(e.id)?.sessions.filter((s) => fromActc(s) && belongsToEvent(e, s)) ?? [];
    return timed.length ? mergeTiming(e, timed) : e;
  });
}

// ─── Planillas del cronometraje: resultados provisorios (docs/plan-datos/tc-provisorios.md) ──────────────────────────
// Antes del PDF de los comisarios el portal publica un Excel del cronometraje: el orden de llegada con la mejor vuelta, los sectores y todas las
// vueltas de cada auto, sin tiempo total ni observaciones. Las finales lo rotulan "PARCIALES"; las series lo publican con el mismo título que el PDF.

/**
 * Series, finales y clasificaciones: la planilla es lo primero que se muestra y el PDF de los comisarios la reemplaza. Las prácticas quedan afuera
 * (sus planillas son rondas intermedias). En la clasificación vale la planilla de la clasificación entera ("CLASIFICACION PARCIALES"), nunca la de un
 * corte o un grupo (`isQualifyingStage`).
 */
export const PROVISIONAL_KINDS = new Set(["clasificacion", "serie", "final"]);
const PARTIAL_TITLE = /PARCIAL/;
const isPartialTitle = (title) => PARTIAL_TITLE.test(fold(title).toUpperCase());
const MIN_PROVISIONAL_ROWS = 3;

/** Formato de una página de resultado: "planilla" (Excel del cronometraje: mejor vuelta, sin tiempo total), "oficial" (con tiempo total: PDF o Mouras) u "otro". */
export function pageFormat(html) {
  if (/Tiempo total/i.test(html)) return "oficial";
  if (/Mejor vuelta/i.test(html) && /<tr class="driver-row/.test(html)) return "planilla";
  return "otro";
}

/** Líneas de "OBSERVACIONES" de una página oficial (recargos, exclusiones, pase y siga). */
export function observationLines(html) {
  const block = html.match(/OBSERVACIONES:([\s\S]*?)<\/span>/)?.[1] ?? "";
  return block.split(/\r?\n/).map(plain).filter(Boolean);
}

const bestSeconds = (s) => {
  const m = String(s).match(/^(?:(\d+):)?(\d{1,2})[.,](\d{1,3})$/);
  return m ? Number(m[1] ?? 0) * 60 + Number(m[2]) + Number(`0.${m[3]}`) : null;
};

/** Filas de una planilla: posición, número, nombre, mejor vuelta, vueltas (la mayor "V<n>" de su tabla de vueltas) y si trae tiempos por sector. */
export function parsePlanilla(html) {
  const rows = [];
  for (const chunk of html.split(/<tr class="driver-row/).slice(1)) {
    const tr = chunk.split("</tr>")[0];
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => plain(m[1]));
    // pos, número, piloto, mejor vuelta, dif., S1 a S5 y el botón de las vueltas.
    if (cells.length < 10 || !/^\d+$/.test(cells[1] ?? "")) continue;
    const title = plain(chunk.match(/laps-title">([\s\S]*?)<\/div>/)?.[1] ?? "").replace(/^Todas las vueltas\s*[—–-]\s*/, "");
    const name = (cells[2] || title).replace(/\s*-\s*\*?\w+\s*$/, "");
    const laps = Math.max(0, ...[...chunk.matchAll(/<td>V(\d+)<\/td>/g)].map((m) => Number(m[1])));
    const pos = Number.parseInt(cells[0], 10);
    rows.push({ pos: Number.isFinite(pos) ? pos : rows.length + 1, number: cells[1], name, best: bestSeconds(cells[3]), laps, sectors: cells.slice(5, 10).some((c) => TIME.test(c)), complete: cells.slice(5, 10).every((c) => TIME.test(c)) });
  }
  return rows;
}

/**
 * ¿Esta planilla es la clasificación completa al final de la tanda? Devuelve los motivos por los que NO (vacío = sí). Reglas medidas en
 * docs/plan-datos/tc-provisorios.md: al menos 3 filas; las vueltas no crecen al bajar por la lista (un líder con menos vueltas que otros es un
 * archivo mal armado o una foto intermedia); el líder trae tiempos por sector; y el orden no es por mejor vuelta (así vienen algunas planillas: sirve
 * para prácticas, no para decir quién ganó).
 */
export function provisionalProblems(rows, kind = "final") {
  const problems = [];
  if (rows.length < MIN_PROVISIONAL_ROWS) problems.push("pocas filas");
  if (kind === "clasificacion") {
    // En la clasificación se ordena por mejor vuelta: es lo esperado. Lo que no vale es un líder sin tiempo o una lista desordenada.
    // Una vuelta incompleta (faltan sectores) trae un tiempo imposible, más rápido que la pole (TC, 03/10/2026: 1:07.863 en la fila 36): esas filas
    // no cuentan para el orden, pero el podio sí tiene que ser de vueltas completas.
    if (rows.length && rows[0].best === null) problems.push("el líder no trae mejor vuelta");
    if (rows.slice(0, 3).some((r) => r.complete === false)) problems.push("el podio trae una vuelta incompleta");
    const times = rows.filter((r) => r.best !== null && r.complete !== false).map((r) => r.best);
    if (!times.every((b, i) => i === 0 || b >= times[i - 1])) problems.push("no está ordenada por mejor vuelta");
    return problems;
  }
  if (!rows.every((r, i) => i === 0 || r.laps <= rows[i - 1].laps)) problems.push("las vueltas no decrecen");
  if (rows.length && !rows[0].sectors) problems.push("el líder no trae sectores");
  if (rows.length >= 4 && rows.every((r, i) => r.best !== null && (i === 0 || r.best >= rows[i - 1].best))) problems.push("ordenada por mejor vuelta");
  return problems;
}

/** Filas de resultado de una planilla aceptada: sin tiempo total no hay diferencia de carrera; sólo las vueltas de atraso. */
export function planillaResults(rows, known, kind = "final") {
  const lead = rows[0]?.laps ?? 0;
  const quali = kind === "clasificacion";
  return rows.map((r, i) => {
    const behind = lead - r.laps;
    let gap = i > 0 && lead > 0 && behind > 0 ? `+${behind} ${behind === 1 ? "vuelta" : "vueltas"}` : "";
    // Clasificación: como en el PDF, el líder lleva su mejor vuelta y el resto la diferencia contra ella.
    const sinTiempo = quali && (r.best === null || r.complete === false);
    if (quali) gap = sinTiempo ? "" : i === 0 ? clock(r.best) : `+${(r.best - rows[0].best).toFixed(3)}`;
    return {
      pos: r.pos,
      number: r.number,
      driver: displayName(r.name.split(/[\s,]+/).filter((w) => w && !NOISE.has(fold(w).replace(/[^a-z0-9]/g, ""))), known),
      team: "",
      gap,
      ...(sinTiempo ? { status: "Sin tiempo" } : {}),
    };
  });
}

/**
 * Los documentos de cada sesión, del que vale al que menos: una lista por sesión (`candidates`) y el primero (`doc`).
 * Modo clásico (`provisional: false`): una clasificación por sesión, sin parciales ni grillas; si hay versión rectificada o repetida, vale la última.
 * Con `provisional: true` también entran las planillas de las series y las finales (título "PARCIALES" o botón de Excel en el listado) como última opción:
 * un documento oficial gana siempre, sea cual sea el orden de los ids. Lo usan la sincronización y el pulso (documentos nuevos).
 */
export function chooseDocs(docs, { provisional = false } = {}) {
  const groups = new Map();
  for (const doc of docs) {
    const partial = isPartialTitle(doc.title);
    if (partial && !provisional) continue;
    const session = classify(partial ? doc.title.replace(/PARCIALES?/gi, " ") : doc.title);
    if (!session || (partial && !PROVISIONAL_KINDS.has(session.kind))) continue;
    const planilla = provisional && PROVISIONAL_KINDS.has(session.kind) && (partial || doc.format === "xlsx");
    const entry = { doc, session, rectified: /RECTIFICAD/i.test(doc.title), planilla, partial };
    if (!groups.has(session.name)) groups.set(session.name, []);
    groups.get(session.name).push(entry);
  }
  const chosen = new Map();
  for (const [name, list] of groups) {
    list.sort((a, b) => Number(a.planilla) - Number(b.planilla) || Number(b.rectified) - Number(a.rectified) || b.doc.id - a.doc.id);
    const [first] = list;
    chosen.set(name, { doc: first.doc, session: first.session, rectified: first.rectified, planilla: first.planilla, candidates: list });
  }
  return chosen;
}

// ─── Documentos en la pestaña equivocada y tandas de la clasificación ─────────────────────────────────────────────
// El portal a veces carga una fecha entera en la pestaña de otra categoría: La Plata, 17/10/2026, el TC Pista Pick Up (fecha 9) quedó bajo "TCM"
// y su clasificación se mostró como la del TC Mouras. Cada bloque reciente del listado se confirma con la etiqueta de sus páginas
// (`pageSeries`); si dice otra categoría, el bloque entero pasa a esa. Lo decidido se guarda en `meta.timing.retagged` (id del documento →
// { from, to }) para que, cuando la fecha ya no sea reciente, el documento no vuelva a la pestaña equivocada.

/** Clave de un documento leído para una categoría: así se marca lo que nunca debió cargarse en ella. */
const misreadKey = (seriesId, url) => `${seriesId} ${url}`;

/** Los bloques del listado con algún documento desde `since`: la categoría que dicen sus páginas, si no es la de la pestaña. */
async function checkBlocks(io, listing, { since, delayMs, pages }) {
  const blocks = new Map();
  for (const d of listing) {
    if (!d.block) continue;
    if (!blocks.has(d.block)) blocks.set(d.block, []);
    blocks.get(d.block).push(d);
  }
  const retagged = {};
  let fetched = 0;
  for (const docs of blocks.values()) {
    if (!docs.some((d) => Date.parse(`${d.day}T12:00:00-03:00`) >= since)) continue;
    // Las planillas casi siempre traen la etiqueta; los PDF de los comisarios y las grillas casi nunca.
    const order = [...docs].sort((a, b) => Number(b.format === "xlsx") - Number(a.format === "xlsx") || b.id - a.id);
    for (const doc of order.slice(0, 3)) {
      let html;
      try {
        html = await page(io, doc.url, 1800);
      } catch {
        continue;
      }
      fetched++;
      pages.set(doc.url, html);
      await io.sleep(delayMs);
      const series = pageSeries(html);
      if (!series) continue;
      if (series !== doc.seriesId) for (const d of docs) retagged[d.id] = { from: d.seriesId, to: series };
      break;
    }
  }
  return { retagged, fetched };
}

/** La temporada guardada sin los resultados que salieron de documentos mal leídos (`actcTiming(...).misread`): que nada los reponga. */
export function withoutMisread(season, misread = []) {
  const bad = new Set(misread);
  if (!bad.size || !season?.events) return season;
  return { ...season, events: season.events.map((e) => dropMisread(e, bad)) };
}

function dropMisread(event, bad) {
  if (!event.sessions.some((s) => bad.has(misreadKey(event.seriesId, s.resultsSource?.url)))) return event;
  return {
    ...event,
    sessions: event.sessions.map((s) => {
      if (!bad.has(misreadKey(event.seriesId, s.resultsSource?.url))) return s;
      const { results, resultsSource, ...rest } = s;
      return rest;
    }),
  };
}

/**
 * Completa las fechas de la ACTC con los resultados del portal. Las fechas recientes (`windowDays`) se consultan;
 * las viejas reutilizan lo ya guardado, así cada actualización pide pocas páginas.
 */
export async function actcTiming(io, events, previous, { windowDays = 10, knownNames = [], delayMs = 400 } = {}) {
  const raw = parseListing(await io.text(LISTING_URL, { revalidate: 900 }));
  const known = knownIndex(knownNames);
  const now = Date.now();
  const pages = new Map();
  const checked = await checkBlocks(io, raw, { since: now - windowDays * DAY, delayMs, pages });
  let fetched = checked.fetched;
  let withResults = 0;
  // Lo que ya se había decidido antes, más lo de hoy; si el portal corrigió la pestaña, el documento ya está donde debe.
  const retagged = { ...(previous?.meta?.timing?.retagged ?? {}), ...checked.retagged };
  const listing = raw.map((d) => (retagged[d.id] && retagged[d.id].to !== d.seriesId ? { ...d, seriesId: retagged[d.id].to } : d));
  const misread = new Set();
  for (const d of raw) if (retagged[d.id]) misread.add(misreadKey(retagged[d.id].from, d.url));
  for (const d of listing) if (/CLASIFIC/i.test(fold(d.title)) && isQualifyingStage(d.title)) misread.add(misreadKey(d.seriesId, d.url));
  const before = new Map((previous?.events ?? []).map((e) => [e.id, dropMisread(e, misread)]));

  const out = [];
  for (const input of events) {
    if (!TIMING_SERIES.has(input.seriesId)) {
      out.push(input);
      continue;
    }
    const event = dropMisread(input, misread);
    const lastDay = event.sessions.map((s) => s.start.slice(0, 10)).sort().at(-1);
    const end = Date.parse(`${lastDay}T23:59:59-03:00`);
    const docs = listing.filter((d) => {
      const t = Date.parse(`${d.day}T12:00:00-03:00`);
      // El portal a veces sube una rectificada un par de días después de la carrera (la final del TC Mouras de Concepción, del 3/3).
      return d.seriesId === event.seriesId && t <= end + LATE_DOCS_DAYS * DAY && t >= end - 3 * DAY;
    });
    const stored = before.get(event.id)?.sessions.filter((s) => fromActc(s) && !brokenActcResults(s) && belongsToEvent(event, s)) ?? [];
    const recent = now - end < windowDays * DAY;
    // Una fecha vieja se reutiliza tal cual sólo si ya tiene todo lo que el portal publicó; si el portal sumó una sesión que falta, se la va a buscar.
    const missing = !recent && stored.length && [...chooseDocs(docs, { provisional: true }).values()].some(({ session }) => !stored.some((s) => sessionKey(s) === sessionKey(session)));
    if (!docs.length || (!recent && stored.length && !missing)) {
      out.push(stored.length ? mergeTiming(event, stored) : event);
      if (stored.length) withResults++;
      continue;
    }

    const chosen = chooseDocs(docs, { provisional: true });

    const timed = [];
    const penalties = new Map();
    const gaps = new Map();
    for (const { session, candidates } of chosen.values()) {
      // Del documento que más vale al que menos: el primero oficial que se lee gana; si no hay, la primera planilla que pasa la regla queda como provisoria.
      let official = null;
      let planilla = null;
      let incomplete = null;
      for (const { doc, partial } of candidates.slice(0, MAX_CANDIDATES)) {
        try {
          let html = pages.get(doc.url);
          if (!html) {
            html = await page(io, doc.url, recent ? 1800 : 30 * 86400);
            fetched++;
          }
          const format = pageFormat(html);
          const labeled = pageSeries(html);
          // La página dice que es de otra categoría: no se carga acá, aunque el listado la ponga en esta pestaña.
          if (labeled && labeled !== event.seriesId) {
            misread.add(misreadKey(event.seriesId, doc.url));
          } else if (format === "planilla" && PROVISIONAL_KINDS.has(session.kind)) {
            if (!planilla) {
              const rows = parsePlanilla(html);
              if (!provisionalProblems(rows, session.kind).length) planilla = { doc, results: planillaResults(rows, known, session.kind) };
            }
          } else if (!partial) {
            const results = parseResult(html, session.kind, known);
            // Una página que carga sólo algunas filas (sin podio) no es el oficial: se sigue con el siguiente documento (la planilla, si hay).
            if (results.length && hasPodium(results)) official = { doc, results, penalties: penaltiesFrom(observationLines(html)) };
            else if (results.length && !incomplete) incomplete = { reason: "incompleto", url: doc.url, rows: results.length };
          }
        } catch {
          // Una página caída no frena al resto.
        }
        await io.sleep(delayMs);
        if (official) break;
      }
      const pick = official ?? planilla;
      // El documento oficial existe pero la ACTC lo publicó con filas sueltas: no se inventa nada, sólo se deja constancia (no es un bug nuestro).
      if (!pick) {
        if (incomplete) gaps.set(sessionKey(session), incomplete);
        continue;
      }
      const id = sessionId(event.id, session.kind, session.name);
      if (official) penalties.set(id, official.penalties);
      timed.push({
        id,
        kind: session.kind,
        name: session.name,
        start: `${pick.doc.day}T12:00:00-03:00`,
        timeKnown: false,
        durationMin: 30,
        results: pick.results,
        resultsSource: { name: TIMING_SOURCE, url: pick.doc.url, ...(official ? {} : { status: PROVISIONAL }) },
      });
    }
    // Algunas páginas no publican la marca: se toma la del mismo auto (número) en otra sesión de la fecha.
    const makeByNumber = new Map();
    for (const s of timed) for (const r of s.results) if (r.number && r.team && !makeByNumber.has(r.number)) makeByNumber.set(r.number, r.team);
    for (const s of timed) s.results = s.results.map((r) => (r.team || !makeByNumber.has(r.number) ? r : { ...r, team: makeByNumber.get(r.number) }));
    // Contra lo guardado: un provisorio nunca pisa un oficial ni se achica, y un oficial que reemplaza a un provisorio dice qué cambió.
    const storedByKey = new Map(stored.map((s) => [sessionKey(s), s]));
    const final = timed.map((t) => {
      const kept = reconcileSession(t, storedByKey.get(sessionKey(t)));
      // Sólo el oficial recién leído (no uno guardado, que ya trae su nota) que arrastra el podio de un provisorio.
      const fresh = kept.resultsSource.url === t.resultsSource.url && !isProvisional(kept) && kept.resultsSource.provisional;
      return fresh ? { ...kept, resultsSource: { ...kept.resultsSource, note: describeOfficialChange(kept, kept.resultsSource.provisional, penalties.get(kept.id)) } } : kept;
    });
    // Las sesiones guardadas que hoy no se leyeron (página caída, planilla rechazada) se conservan.
    const read = new Set(final.map(sessionKey));
    const all = [...final, ...stored.filter((s) => !read.has(sessionKey(s)))];
    const base = all.length ? mergeTiming(event, all) : event;
    const merged = gaps.size ? { ...base, sessions: base.sessions.map((s) => (!s.results?.length && gaps.has(sessionKey(s)) ? { ...s, resultsGap: gaps.get(sessionKey(s)) } : s)) } : base;
    if (merged.sessions.some(fromActc)) withResults++;
    out.push(merged);
  }
  // Resultados guardados con restos de la tabla ("Laps", "Actc", la marca): se limpian y se ordenan antes de unificar.
  const tidy = (raw) => {
    const kept = raw.split(/\s+/).filter((w) => {
      const f = fold(w).replace(/[^a-z0-9�]/g, "");
      return f && !NOISE.has(f) && !MAKE_WORDS[f];
    });
    return kept.length >= 2 ? displayName(kept, known) : raw;
  };
  // Un mismo piloto se escribe igual en todas las sesiones: vale la versión con acentos si alguna fuente la tiene.
  const hasAccent = (n) => /[^\x00-\x7f]/.test(n.replace(/�/g, ""));
  const best = new Map();
  for (const name of [...knownNames, ...out.flatMap((e) => e.sessions.flatMap((s) => s.results?.map((r) => tidy(r.driver)) ?? []))]) {
    const current = best.get(nameKey(name));
    if (!current || current.includes("�") || (hasAccent(name) && !hasAccent(current) && !name.includes("�"))) best.set(nameKey(name), name);
  }
  // Errores de carga del propio portal: letras perdidas ("I�aki") o la marca pegada al nombre ("SANTERO JULIAN TOYOTA").
  const clean = [...best.values()].filter((n) => !n.includes("�"));
  const resolve = (raw) => {
    const name = tidy(raw);
    const direct = best.get(nameKey(name));
    if (direct && !direct.includes("�")) return direct;
    if (name.includes("�")) {
      // Cada palabra con letras perdidas tiene que coincidir con una palabra del nombre limpio, sin importar el orden.
      const tokens = fold(name).split(/\s+/);
      const hits = clean.filter((n) => {
        const cand = fold(n).split(/\s+/);
        return cand.length === tokens.length && tokens.every((t) => cand.some((c) => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/�/g, ".+")}$`).test(c)));
      });
      if (hits.length === 1) return hits[0];
    }
    const tokens = new Set(nameKey(name).split(" "));
    if (tokens.size >= 3) {
      const hits = clean.filter((n) => {
        const k = nameKey(n).split(" ");
        return k.length >= 2 && k.length < tokens.size && k.every((t) => tokens.has(t));
      });
      if (hits.length === 1) return hits[0];
    }
    return direct ?? name;
  };
  const unified = out.map((e) =>
    TIMING_SERIES.has(e.seriesId)
      ? { ...e, sessions: e.sessions.map((s) => (s.results ? { ...s, results: s.results.map((r) => ({ ...r, driver: resolve(r.driver) })) } : s)) }
      : e,
  );
  return {
    events: unified,
    meta: { documents: listing.length, pagesFetched: fetched, eventsWithResults: withResults, ...(Object.keys(retagged).length ? { retagged } : {}) },
    misread: [...misread],
  };
}
