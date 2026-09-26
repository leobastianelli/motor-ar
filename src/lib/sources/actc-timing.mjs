// Resultados oficiales de la ACTC desde su portal de tiempos (tiempos.actc.org.ar, robots.txt sin restricciones):
// entrenamientos, clasificación, series y final, con la clasificación completa, para las seis categorías de la ACTC.
// El listado agrupa por categoría y fecha; cada sesión tiene una página con la tabla de pilotos.

import { belongsToEvent } from "./plausible.mjs";

const BASE = "https://tiempos.actc.org.ar";
const TAB_SERIES = { TC: "tc", TCP: "tc-pista", TCM: "tc-mouras", TCPM: "tc-pista-mouras", TCPK: "tc-pick-up", TCPPK: "tc-pista-pick-up" };
export const TIMING_SERIES = new Set(Object.values(TAB_SERIES));
export const TIMING_SOURCE = "ACTC · tiempos oficiales";

const DAY = 86400000;
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
      docs.push({ seriesId, title, day: `${year}-${date[2]}-${date[1]}`, id: Number(id), url: `${BASE}/resultados/${id}/ver` });
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
  "ex", "ab", "nc", "dsq", "desc", "exc", "laps", "lap", "vueltas", "vtas", "vta", "pts",
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
    });
  }
  const race = kind === "serie" || kind === "final";
  const lead = rows[0];
  return rows.map(({ seconds: sec, laps, ...r }, i) => {
    let gap = "";
    if (i === 0) gap = sec !== null ? clock(sec) : "";
    else if (race && lead.laps && laps !== null && laps < lead.laps) gap = `+${lead.laps - laps} ${lead.laps - laps === 1 ? "vuelta" : "vueltas"}`;
    else if (sec !== null && lead.seconds !== null) gap = `+${(sec - lead.seconds).toFixed(3)}`;
    return { ...r, gap, ...(sec === null && !gap ? { status: "Sin tiempo" } : {}) };
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

/**
 * Completa las fechas de la ACTC con los resultados del portal. Las fechas recientes (`windowDays`) se consultan;
 * las viejas reutilizan lo ya guardado, así cada actualización pide pocas páginas.
 */
export async function actcTiming(io, events, previous, { windowDays = 10, knownNames = [], delayMs = 400 } = {}) {
  const listing = parseListing(await io.text(`${BASE}/resultados`, { revalidate: 900 }));
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

    // Una clasificación por sesión: si hay versión rectificada o repetida, vale la última publicada.
    const chosen = new Map();
    for (const doc of docs) {
      const session = classify(doc.title);
      if (!session) continue;
      const current = chosen.get(session.name);
      const rectified = /RECTIFICAD/i.test(doc.title);
      if (!current || (rectified && !current.rectified) || (rectified === current.rectified && doc.id > current.doc.id)) {
        chosen.set(session.name, { doc, session, rectified });
      }
    }

    const timed = [];
    for (const { doc, session } of chosen.values()) {
      try {
        const html = await page(io, doc.url, recent ? 1800 : 30 * 86400);
        fetched++;
        const results = parseResult(html, session.kind, known);
        if (results.length) {
          timed.push({
            id: `${event.id}-${fold(session.name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
            kind: session.kind,
            name: session.name,
            start: `${doc.day}T12:00:00-03:00`,
            timeKnown: false,
            durationMin: 30,
            results,
            resultsSource: { name: TIMING_SOURCE, url: doc.url },
          });
        }
      } catch {
        // Una página caída no frena al resto.
      }
      await io.sleep(delayMs);
    }
    // Algunas páginas no publican la marca: se toma la del mismo auto (número) en otra sesión de la fecha.
    const makeByNumber = new Map();
    for (const s of timed) for (const r of s.results) if (r.number && r.team && !makeByNumber.has(r.number)) makeByNumber.set(r.number, r.team);
    for (const s of timed) s.results = s.results.map((r) => (r.team || !makeByNumber.has(r.number) ? r : { ...r, team: makeByNumber.get(r.number) }));
    const merged = timed.length ? mergeTiming(event, timed) : stored.length ? mergeTiming(event, stored) : event;
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
