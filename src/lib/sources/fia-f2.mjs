// Fórmula 2: clasificaciones oficiales de la FIA (fia.com, robots.txt pide 10 s entre pedidos): práctica, clasificación,
// carrera sprint y carrera principal, con todos los pilotos, equipo, tiempos, diferencias y abandonos.

const BASE = "https://www.fia.com/events/formula-2-championship/season-2026";
const DAY = 86400000;
export const FIA_F2_SOURCE = "FIA · clasificación oficial";

// La práctica no se publica en HTML (sólo en PDF), así que no se pide.
const PAGES = [
  { kind: "clasificacion", name: "Clasificación", slugs: ["qualifying-classification"] },
  { kind: "sprint", name: "Carrera sprint", slugs: ["sprint-race-classification"] },
  { kind: "carrera", name: "Carrera principal", slugs: ["feature-race-classification"] },
];
const RACE = new Set(["sprint", "carrera"]);

/** fiaformula2.com y fia.com nombran distinto algunas sedes. */
const VENUE_ALIASES = {
  "miami-gardens": "miami",
  "monte-carlo": "monaco",
  barcelona: "barcelona-catalunya",
  "spa-francorchamps": "spa-francorchamps",
  lusail: "lusail",
  "yas-marina": "yas-marina",
};

const plain = (html) =>
  String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])([a-záéíóúñü])/g, (m, p, c) => p + c.toUpperCase());
const slugify = (s) => fold(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** "N. Tsolov" → "Nikola Tsolov" con los nombres completos del campeonato (inicial + apellido). */
export function f2Names(fullNames) {
  const map = new Map();
  for (const full of fullNames) {
    const [first, ...rest] = full.trim().split(/\s+/);
    if (!first || !rest.length) continue;
    map.set(`${fold(first)[0]} ${fold(rest.join(" "))}`, full);
  }
  return (short) => {
    const m = short.match(/^([A-Za-zÀ-ÿ])\.\s*(.+)$/);
    return (m && map.get(`${fold(m[1])} ${fold(m[2])}`)) ?? short;
  };
}

/** Tabla de clasificación de fia.com. Las columnas se leen por el nombre de su encabezado. */
export function parseFia(html, kind, resolveName) {
  const table = html.match(/<table[\s\S]*?<\/table>/)?.[0];
  if (!table) return [];
  const trs = table.match(/<tr[\s\S]*?<\/tr>/g) ?? [];
  const header = trs.find((t) => /table-header/.test(t));
  if (!header) return [];
  const cols = [...header.matchAll(/<td class="header-([a-z-]+)"/g)].map((m) => m[1]);
  const race = RACE.has(kind);
  const rows = [];
  for (const tr of trs.filter((t) => /class="competitor/.test(t))) {
    const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    const get = (name) => (cols.indexOf(name) === -1 ? "" : plain(tds[cols.indexOf(name)] ?? ""));
    const rawName = plain(tds[cols.indexOf("driver")]?.match(/class="name">([\s\S]*?)<\/div>/)?.[1] ?? "");
    if (!rawName) continue;
    const pos = Number(get("pos"));
    const classified = pos > 0 && pos < 999;
    const gapFirst = get("gap-first");
    const team = get("team");
    const lapsBehind = gapFirst.match(/^(\d+)\s*LAPS?$/i);
    let gap = "";
    let status;
    if (race) {
      if (!classified) status = /DNS/i.test(gapFirst) ? "No largó" : /DSQ|EXC/i.test(gapFirst) ? "Descalificado" : "Abandonó";
      else if (rows.length === 0) gap = get("time");
      else if (lapsBehind) gap = `+${lapsBehind[1]} ${lapsBehind[1] === "1" ? "vuelta" : "vueltas"}`;
      else if (gapFirst) gap = `+${gapFirst}`;
    } else if (rows.length === 0) gap = get("best-lap");
    else if (gapFirst) gap = `+${gapFirst}`;
    else if (!get("best-lap")) status = "Sin tiempo";
    const points = Number.parseFloat(get("points"));
    rows.push({
      pos: classified ? pos : rows.length + 1,
      ...(classified ? {} : { positionText: "NC" }),
      number: get("nr") || undefined,
      driver: resolveName(rawName),
      team: team === team.toUpperCase() ? titleCase(team) : team,
      gap,
      ...(race && Number.isFinite(points) ? { points } : {}),
      ...(status ? { status } : {}),
    });
  }
  return rows;
}

const fromFia = (s) => s.resultsSource?.name === FIA_F2_SOURCE && s.results?.length;

function attach(event, found) {
  const sessions = [...event.sessions];
  for (const f of found) {
    const i = sessions.findIndex((s) => s.kind === f.kind);
    if (i >= 0) sessions[i] = { ...sessions[i], results: f.results, resultsSource: f.resultsSource };
    else sessions.push({ id: `${event.id}-${f.kind}`, kind: f.kind, name: f.name, start: sessions[0]?.start, timeKnown: false, durationMin: 45, results: f.results, resultsSource: f.resultsSource });
  }
  const order = { practica: 0, clasificacion: 1, sprint: 2, carrera: 3 };
  return { ...event, sessions: sessions.sort((a, b) => a.start.localeCompare(b.start) || order[a.kind] - order[b.kind]) };
}

export function keepPreviousFia(events, previous) {
  const before = new Map((previous?.events ?? []).map((e) => [e.id, e]));
  return events.map((e) => {
    const stored = before.get(e.id)?.sessions.filter(fromFia) ?? [];
    return stored.length ? attach(e, stored) : e;
  });
}

export async function fiaF2(io, events, previous, { windowDays = 10, delayMs = 11000, knownNames = [] } = {}) {
  const resolveName = f2Names(knownNames);
  const before = new Map((previous?.events ?? []).map((e) => [e.id, e]));
  const now = Date.now();
  let requests = 0;
  let withResults = 0;

  const out = [];
  for (const event of events) {
    if (event.seriesId !== "f2") {
      out.push(event);
      continue;
    }
    const stored = before.get(event.id)?.sessions.filter(fromFia) ?? [];
    const starts = event.sessions.map((s) => Date.parse(s.start));
    const recent = now - Math.max(...starts) < windowDays * DAY;
    if (Math.min(...starts) > now || (stored.length && !recent)) {
      out.push(stored.length ? attach(event, stored) : event);
      if (stored.length) withResults++;
      continue;
    }
    const venue = VENUE_ALIASES[event.venueSlug] ?? event.venueSlug ?? slugify(event.circuit.city);
    const found = [];
    for (const page of PAGES) {
      const session = event.sessions.find((s) => s.kind === page.kind);
      if (session && Date.parse(session.start) > now) continue;
      for (const slug of page.slugs) {
        const url = `${BASE}/${venue}/${slug}`;
        try {
          requests++;
          const html = await io.text(url, { revalidate: recent ? 1800 : 30 * DAY / 1000 });
          const results = parseFia(html, page.kind, resolveName);
          if (results.length) {
            found.push({ kind: page.kind, name: page.name, results, resultsSource: { name: FIA_F2_SOURCE, url } });
            await io.sleep(delayMs);
            break;
          }
        } catch {
          // Página inexistente o conexión cortada: se prueba el siguiente nombre de página.
        }
        await io.sleep(delayMs);
      }
    }
    const kept = stored.filter((s) => !found.some((f) => f.kind === s.kind));
    const merged = found.length || kept.length ? attach(event, [...kept, ...found]) : event;
    if (merged.sessions.some(fromFia)) withResults++;
    out.push(merged);
  }
  return { events: out, meta: { requests, eventsWithResults: withResults } };
}
