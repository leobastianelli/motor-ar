// Fórmula 1: resultados de cada sesión desde la página oficial de resultados (formula1.com/en/results). Es la fuente que no falla cuando
// termina una sesión: OpenF1 bloquea todo pedido sin clave mientras haya cualquier sesión en vivo, y Jolpica publica clasificación,
// sprint y carrera con horas de demora y no trae prácticas. Sólo se piden las sesiones que ya terminaron y siguen sin resultados.
const BASE = "https://www.formula1.com/en/results/2026/races";
const HOUR = 3600000;
const DAY = 24 * HOUR;
export const F1_OFFICIAL_SOURCE = "Fórmula 1 (oficial)";

/** Nuestra sesión → tramo de la dirección oficial y cómo leer la tabla. */
const SESSIONS = [
  { name: "Práctica 1", path: "practice/1", mode: "practice" },
  { name: "Práctica 2", path: "practice/2", mode: "practice" },
  { name: "Práctica 3", path: "practice/3", mode: "practice" },
  { name: "Clasificación sprint", path: "sprint-qualifying", mode: "qualifying" },
  { name: "Sprint", path: "sprint-results", mode: "race" },
  { name: "Clasificación", path: "qualifying", mode: "qualifying" },
  { name: "Carrera", path: "race-result", mode: "race" },
];
const BY_NAME = new Map(SESSIONS.map((s) => [s.name, s]));
/** Nombres de las sesiones cuyos resultados se piden a la página oficial (el refresco caliente decide con esto si hay algo por traer). */
export const F1_OFFICIAL_SESSION_NAMES = new Set(BY_NAME.keys());

const clean = (html) =>
  String(html)
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/[\s �]+/g, " ")
    .trim();
const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Páginas de fechas del índice de resultados, en el orden del calendario: [{ id, slug }]. */
export function parseIndex(html) {
  const seen = new Set();
  const out = [];
  for (const m of String(html).matchAll(/\/en\/results\/2026\/races\/(\d+)\/([a-z0-9-]+)\/race-result/g)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push({ id: m[1], slug: m[2] });
  }
  return out;
}

/** Nombre del piloto: la celda trae nombre, apellido y sigla en tres <span> (según el ancho de pantalla se muestra uno u otro). */
function driverOf(cell) {
  const part = (cls) => clean(cell.match(new RegExp(`<span class="${cls}">(.*?)</span>`, "s"))?.[1] ?? "");
  const first = part("max-lg:hidden");
  const last = part("max-md:hidden");
  const code = part("md:hidden");
  return { driver: `${first} ${last}`.trim(), code: code || undefined };
}

const lapsBehind = /^\+(\d+) Laps?$/i;

/**
 * Tabla de resultados oficial → filas con la misma forma que las demás fuentes de F1. Devuelve [] si la sesión todavía no publicó la tabla
 * (sin <table>, o con las columnas esperadas y sin filas). Si hay una tabla que no se puede leer (otras columnas u otras clases en las filas)
 * lanza un error: un cambio de HTML no puede pasar por "todavía no hay resultados".
 */
export function parseResults(html, mode) {
  const table = String(html).match(/<table[\s\S]*?<\/table>/)?.[0];
  if (!table) return [];
  const heads = [...table.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => norm(clean(m[1])));
  const col = (re) => heads.findIndex((h) => re.test(h));
  const at = { pos: col(/^pos/), no: col(/^no/), driver: col(/^driver/), team: col(/^team/), time: col(/time|gap|retired/), pts: col(/^pts|points/), q1: col(/^q1/), q2: col(/^q2/), q3: col(/^q3/) };
  if (at.pos < 0 || at.driver < 0) throw new Error(`la tabla oficial no tiene las columnas esperadas (encabezados: ${heads.join(", ") || "ninguno"})`);

  const rows = [];
  for (const tr of table.matchAll(/<tr[^>]*body-row[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    const text = (i) => (i >= 0 && cells[i] !== undefined ? clean(cells[i]) : "");
    const { driver, code } = driverOf(cells[at.driver] ?? "");
    if (!driver) continue;
    const positionText = text(at.pos);
    const pos = Number(positionText);
    const timeText = text(at.time);
    const row = {
      pos: Number.isFinite(pos) && positionText !== "" ? pos : rows.length + 1,
      ...(Number.isFinite(pos) && positionText !== "" ? {} : { positionText: positionText || "—" }),
      ...(mode === "race" ? { positionText: positionText || String(rows.length + 1) } : {}),
      number: text(at.no) || undefined,
      driver,
      code,
      team: text(at.team),
      gap: "",
    };
    if (mode === "qualifying") row.gap = text(at.q3) || text(at.q2) || text(at.q1);
    else row.gap = timeText.replace(/^(\+[\d:.]+)s$/, "$1");
    if (mode === "race") {
      const pts = text(at.pts);
      if (pts !== "") row.points = Number(pts);
      if (/^(DNF|DNS|DSQ|DQ|NC|Retired|Disqualified)/i.test(timeText)) {
        row.status = /^DNS/i.test(timeText) ? "No largó" : /^(DSQ|DQ|Disq)/i.test(timeText) ? "Descalificado" : "Abandonó";
        row.gap = "";
      } else if (lapsBehind.test(timeText)) {
        const n = Number(timeText.match(lapsBehind)[1]);
        row.gap = `+${n} ${n === 1 ? "vuelta" : "vueltas"}`;
      }
    } else if (!row.gap) row.status = "Sin tiempo";
    for (const k of Object.keys(row)) if (row[k] === undefined) delete row[k];
    rows.push(row);
  }
  if (!rows.length && /<tr[^>]*>\s*<td/.test(table)) throw new Error("la tabla oficial tiene filas pero ninguna coincide con el formato esperado");
  return rows;
}

/** El sitio oficial escribe "Kimi Antonelli" y "Sergio Perez"; el campeonato (Jolpica) "Andrea Kimi Antonelli" y "Sergio Pérez": se usa el nombre conocido. */
function canonicalName(name, known) {
  const n = norm(name);
  const last = n.split(" ").at(-1);
  const first = n.split(" ")[0];
  return known.find((k) => norm(k) === n) ?? known.find((k) => norm(k).split(" ").at(-1) === last && norm(k).split(" ").includes(first)) ?? name;
}

const sessionEnd = (s) => Date.parse(s.start) + (s.durationMin ?? 60) * 60000;

/**
 * Completa las sesiones de F1 que ya terminaron y siguen sin resultados. No toca lo que ya tiene resultados (Jolpica y OpenF1 traen más
 * datos: puntos, parrilla, vueltas). Una sesión reciente se vuelve a pedir cada pocos minutos: la página oficial la publica al terminar.
 */
export async function f1OfficialSessions(io, events, previous, { windowDays = 10, delayMs = 500, now = Date.now(), knownNames = [] } = {}) {
  const pending = (e) => e.seriesId === "f1" && e.sessions.some((s) => BY_NAME.has(s.name) && !s.results?.length && sessionEnd(s) + 5 * 60000 < now && now - sessionEnd(s) < windowDays * DAY);
  if (!events.some(pending)) return { events, meta: { f1Official: { requests: 0, sessionsWithResults: 0, errors: [] } } };

  const f1Events = events.filter((e) => e.seriesId === "f1").sort((a, b) => (a.round ?? 0) - (b.round ?? 0));
  // Una sesión que termina recién aparece en el índice cuando se refresca: misma regla que las páginas de sesión.
  const recent = events.some((e) => e.seriesId === "f1" && e.sessions.some((s) => BY_NAME.has(s.name) && sessionEnd(s) <= now && now - sessionEnd(s) < 6 * HOUR));
  const index = parseIndex(await io.text(`${BASE}`, { revalidate: recent ? 120 : 6 * 3600 }));
  if (index.length !== f1Events.length) throw new Error(`el índice oficial lista ${index.length} fechas y el calendario ${f1Events.length}`);
  const pageOf = new Map(f1Events.map((e, i) => [e.id, index[i]]));

  let requests = 0;
  let filled = 0;
  const errors = [];
  const out = [];
  for (const event of events) {
    if (!pending(event)) {
      out.push(event);
      continue;
    }
    const page = pageOf.get(event.id);
    const sessions = [];
    for (const s of event.sessions) {
      const spec = BY_NAME.get(s.name);
      if (!spec || s.results?.length || !(sessionEnd(s) + 5 * 60000 < now) || now - sessionEnd(s) >= windowDays * DAY) {
        sessions.push(s);
        continue;
      }
      const url = `${BASE}/${page.id}/${page.slug}/${spec.path}`;
      try {
        // Recién terminada: se vuelve a mirar seguido. Más vieja: la página ya no cambia salvo rectificaciones.
        const revalidate = now - sessionEnd(s) < 6 * HOUR ? 120 : 6 * 3600;
        const html = await io.text(url, { revalidate });
        requests++;
        await io.sleep(delayMs);
        // Si el título de la página no nombra la fecha esperada, el índice se desfasó: no se publica nada de otra carrera.
        const title = norm(html.match(/<title>(.*?)<\/title>/s)?.[1] ?? "");
        const first = norm(event.officialName ?? "").split(" ")[0];
        if (first && !title.includes(first)) throw new Error(`la página de ${url} no es de ${event.officialName}`);
        const results = parseResults(html, spec.mode).map((r) => ({ ...r, driver: canonicalName(r.driver, knownNames) }));
        if (results.length) {
          sessions.push({ ...s, results, resultsSource: { name: F1_OFFICIAL_SOURCE, url } });
          filled++;
        } else sessions.push(s);
      } catch (error) {
        errors.push(`${event.name} · ${s.name}: ${error.message}`);
        sessions.push(s);
      }
    }
    out.push({ ...event, sessions });
  }
  return { events: out, meta: { f1Official: { requests, sessionsWithResults: filled, errors } } };
}

/** Si la fuente oficial falla: cada sesión conserva los resultados que ya había traído. */
export function keepPreviousF1Official(events, previous) {
  const before = new Map((previous?.events ?? []).flatMap((e) => e.sessions.map((s) => [s.id, s])));
  return events.map((e) => {
    if (e.seriesId !== "f1") return e;
    return {
      ...e,
      sessions: e.sessions.map((s) => {
        const old = before.get(s.id);
        return !s.results?.length && old?.resultsSource?.name === F1_OFFICIAL_SOURCE && old.results?.length ? { ...s, results: old.results, resultsSource: old.resultsSource } : s;
      }),
    };
  });
}
