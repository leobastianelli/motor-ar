// Resultados oficiales de la ACTC desde su portal de tiempos (tiempos.actc.org.ar, robots.txt sin restricciones):
// entrenamientos, clasificación, series y final, con la clasificación completa, para las seis categorías de la ACTC.
// El listado agrupa por categoría y fecha; cada sesión tiene una página con la tabla de pilotos.

import { belongsToEvent } from "./plausible.mjs";
import { PROVISIONAL, describeOfficialChange, isProvisional, penaltiesFrom, reconcileSession } from "../provisorio.mjs";

const BASE = "https://tiempos.actc.org.ar";
const TAB_SERIES = { TC: "tc", TCP: "tc-pista", TCM: "tc-mouras", TCPM: "tc-pista-mouras", TCPK: "tc-pick-up", TCPPK: "tc-pista-pick-up" };
export const TIMING_SERIES = new Set(Object.values(TAB_SERIES));
export const TIMING_SOURCE = "ACTC · tiempos oficiales";
export const LISTING_URL = `${BASE}/resultados`;

const DAY = 86400000;
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
    for (const row of block.split(/<div class="result-row/).slice(1)) {
      const title = plain(row.match(/result-title">([\s\S]*?)<\/div>/)?.[1] ?? "");
      const date = row.match(/result-date">\s*(\d{2})\/(\d{2})\/(\d+)/);
      const id = row.match(/\/resultados\/(\d+)\/ver/)?.[1];
      if (!title || !date || !id) continue;
      // El portal a veces tipea mal el año ("20206"): todo lo publicado es de la temporada en curso.
      const year = /^20\d\d$/.test(date[3]) ? date[3] : "2026";
      // El botón de descarga dice qué es: Excel (planilla del cronometraje), PDF (clasificación de los comisarios) o nada (Mouras, otro sistema).
      const format = row.match(/dl-btn (xlsx|pdf)/)?.[1];
      docs.push({ seriesId, title, day: `${year}-${date[2]}-${date[1]}`, id: Number(id), url: `${BASE}/resultados/${id}/ver`, ...(format ? { format } : {}) });
    }
  }
  return docs;
}

/** Título del portal → sesión nuestra. Los parciales y las grillas no son clasificaciones. */
export function classify(title) {
  const t = fold(title).toUpperCase();
  if (/PARCIAL|GRILLA|GRILA|LARGADA/.test(t)) return null;
  const n = t.match(/\b(\d)\s*(?:ERA|ER|DA|DO|RA|RO|TA|TO)?\b/)?.[1] ?? "1";
  if (/ENTRENAMIENTO|PRACTICA|ENSAYO/.test(t)) return { kind: "practica", name: `${n}° Entrenamiento` };
  if (/CLASIFICACION/.test(t)) return { kind: "clasificacion", name: "Clasificación" };
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

/** Sólo las carreras: en prácticas y clasificaciones las planillas son rondas intermedias y no hay cómo saber cuál es la última. */
export const PROVISIONAL_KINDS = new Set(["serie", "final"]);
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
    rows.push({ pos: Number.isFinite(pos) ? pos : rows.length + 1, number: cells[1], name, best: bestSeconds(cells[3]), laps, sectors: cells.slice(5, 10).some((c) => TIME.test(c)) });
  }
  return rows;
}

/**
 * ¿Esta planilla es la clasificación completa al final de la tanda? Devuelve los motivos por los que NO (vacío = sí). Reglas medidas en
 * docs/plan-datos/tc-provisorios.md: al menos 3 filas; las vueltas no crecen al bajar por la lista (un líder con menos vueltas que otros es un
 * archivo mal armado o una foto intermedia); el líder trae tiempos por sector; y el orden no es por mejor vuelta (así vienen algunas planillas: sirve
 * para prácticas, no para decir quién ganó).
 */
export function provisionalProblems(rows) {
  const problems = [];
  if (rows.length < MIN_PROVISIONAL_ROWS) problems.push("pocas filas");
  if (!rows.every((r, i) => i === 0 || r.laps <= rows[i - 1].laps)) problems.push("las vueltas no decrecen");
  if (rows.length && !rows[0].sectors) problems.push("el líder no trae sectores");
  if (rows.length >= 4 && rows.every((r, i) => r.best !== null && (i === 0 || r.best >= rows[i - 1].best))) problems.push("ordenada por mejor vuelta");
  return problems;
}

/** Filas de resultado de una planilla aceptada: sin tiempo total no hay diferencia de carrera; sólo las vueltas de atraso. */
export function planillaResults(rows, known) {
  const lead = rows[0]?.laps ?? 0;
  return rows.map((r, i) => {
    const behind = lead - r.laps;
    return {
      pos: r.pos,
      number: r.number,
      driver: displayName(r.name.split(/[\s,]+/).filter((w) => w && !NOISE.has(fold(w).replace(/[^a-z0-9]/g, ""))), known),
      team: "",
      gap: i > 0 && lead > 0 && behind > 0 ? `+${behind} ${behind === 1 ? "vuelta" : "vueltas"}` : "",
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

/**
 * Completa las fechas de la ACTC con los resultados del portal. Las fechas recientes (`windowDays`) se consultan;
 * las viejas reutilizan lo ya guardado, así cada actualización pide pocas páginas.
 */
export async function actcTiming(io, events, previous, { windowDays = 10, knownNames = [], delayMs = 400 } = {}) {
  const listing = parseListing(await io.text(LISTING_URL, { revalidate: 900 }));
  const known = knownIndex(knownNames);
  const before = new Map((previous?.events ?? []).map((e) => [e.id, e]));
  const now = Date.now();
  let fetched = 0;
  let withResults = 0;

  const out = [];
  for (const event of events) {
    if (!TIMING_SERIES.has(event.seriesId)) {
      out.push(event);
      continue;
    }
    const lastDay = event.sessions.map((s) => s.start.slice(0, 10)).sort().at(-1);
    const end = Date.parse(`${lastDay}T23:59:59-03:00`);
    const docs = listing.filter((d) => {
      const t = Date.parse(`${d.day}T12:00:00-03:00`);
      return d.seriesId === event.seriesId && t <= end && t >= end - 3 * DAY;
    });
    const stored = before.get(event.id)?.sessions.filter((s) => fromActc(s) && belongsToEvent(event, s)) ?? [];
    const recent = now - end < windowDays * DAY;
    if (!docs.length || (!recent && stored.length)) {
      out.push(stored.length ? mergeTiming(event, stored) : event);
      if (stored.length) withResults++;
      continue;
    }

    const chosen = chooseDocs(docs, { provisional: true });

    const timed = [];
    const penalties = new Map();
    for (const { session, candidates } of chosen.values()) {
      // Del documento que más vale al que menos: el primero oficial que se lee gana; si no hay, la primera planilla que pasa la regla queda como provisoria.
      let official = null;
      let planilla = null;
      for (const { doc, partial } of candidates.slice(0, MAX_CANDIDATES)) {
        try {
          const html = await page(io, doc.url, recent ? 1800 : 30 * 86400);
          fetched++;
          const format = pageFormat(html);
          if (format === "planilla" && PROVISIONAL_KINDS.has(session.kind)) {
            if (!planilla) {
              const rows = parsePlanilla(html);
              if (!provisionalProblems(rows).length) planilla = { doc, results: planillaResults(rows, known) };
            }
          } else if (!partial) {
            const results = parseResult(html, session.kind, known);
            if (results.length) official = { doc, results, penalties: penaltiesFrom(observationLines(html)) };
          }
        } catch {
          // Una página caída no frena al resto.
        }
        await io.sleep(delayMs);
        if (official) break;
      }
      const pick = official ?? planilla;
      if (!pick) continue;
      const id = `${event.id}-${fold(session.name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
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
    const merged = all.length ? mergeTiming(event, all) : event;
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
  return { events: unified, meta: { documents: listing.length, pagesFetched: fetched, eventsWithResults: withResults } };
}
