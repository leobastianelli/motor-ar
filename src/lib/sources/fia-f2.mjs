// Fórmula 2: clasificaciones oficiales de la FIA (fia.com, robots.txt pide 10 s entre pedidos): clasificación, carrera sprint y carrera
// principal, con todos los pilotos, equipo, tiempos, diferencias y abandonos. Lo que fia.com no publica (la práctica, y fechas enteras
// como Monza y Baku 2026) sale de fiaformula2.com, que muestra la clasificación completa de la última sesión terminada.

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

// ——— fiaformula2.com: la página de cada fecha trae embebida la clasificación completa de la última sesión terminada ———
// Es la única fuente cuando fia.com no publica la tabla en HTML (Monza y Baku 2026) y la única que trae la práctica. Como sólo muestra
// la última sesión, lo que se lee queda guardado y se conserva en las corridas siguientes.

const OFFICIAL = "https://www.fiaformula2.com/en/racing/2026";
export const F2_OFFICIAL_SOURCE = "FIA Formula 2 · clasificación oficial";

/** Texto de los datos que Next.js manda embebidos en la página (`self.__next_f.push([1, "..."])`), unido. */
function flightText(html) {
  let out = "";
  for (const m of String(html).matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) {
    try {
      out += JSON.parse(m[1]);
    } catch {
      // Un fragmento roto no invalida los demás.
    }
  }
  return out;
}

/** El arreglo JSON que empieza en `from` (respeta corchetes dentro de textos). */
function jsonArrayAt(text, from) {
  let depth = 0;
  let inString = false;
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "[") depth++;
    else if (c === "]" && --depth === 0) return JSON.parse(text.slice(from, i + 1));
  }
  return null;
}

const lapMs = (t) => {
  const m = String(t ?? "").match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/);
  return m ? Math.round((Number(m[1] ?? 0) * 60 + Number(m[2])) * 1000) : null;
};

/** Filas de una sesión de fiaformula2.com en el formato de la temporada. */
export function officialRows(results, kind, resolveName) {
  const race = RACE.has(kind);
  const sorted = [...results].sort((a, b) => (Number(a.positionNumber) || 999) - (Number(b.positionNumber) || 999));
  const best = lapMs(sorted[0]?.classifiedTime ?? sorted[0]?.displayTime);
  const rows = [];
  for (const r of sorted) {
    const short = String(r.driverShortName ?? "").trim();
    const full = [r.driverFirstName, r.driverLastName].filter(Boolean).join(" ");
    const resolved = short ? resolveName(short) : "";
    const driver = resolved && resolved !== short ? resolved : full || short;
    if (!driver) continue;
    const pos = Number(r.positionNumber);
    const code = String(r.completionStatusCode ?? "OK").toUpperCase();
    const classified = pos > 0 && (!race || code === "OK");
    const time = String(r.classifiedTime ?? r.displayTime ?? "").trim();
    const team = String(r.teamName ?? r.displayTeamName ?? "").trim();
    let gap = "";
    let status;
    if (race) {
      if (!classified) status = /DNS/.test(code) ? "No largó" : /DSQ|EXC/.test(code) ? "Descalificado" : "Abandonó";
      else if (rows.length === 0) gap = time;
      else {
        const behind = String(r.gapToLeader ?? r.displayTime ?? "").trim();
        const laps = behind.match(/^\+?(\d+)\s*LAPS?$/i);
        gap = laps ? `+${laps[1]} ${laps[1] === "1" ? "vuelta" : "vueltas"}` : behind && !behind.startsWith("+") ? `+${behind}` : behind;
      }
    } else if (rows.length === 0) gap = time;
    else if (lapMs(time) !== null && best !== null) gap = `+${((lapMs(time) - best) / 1000).toFixed(3)}`;
    else status = "Sin tiempo";
    const points = Number.parseFloat(r.racePoints ?? r.points);
    rows.push({
      pos: classified ? pos : rows.length + 1,
      ...(classified ? {} : { positionText: "NC" }),
      number: r.racingNumber ? String(r.racingNumber) : undefined,
      driver,
      team: team && team === team.toUpperCase() ? titleCase(team) : team,
      gap,
      ...(race && Number.isFinite(points) ? { points } : {}),
      ...(status ? { status } : {}),
    });
  }
  return rows;
}

const OFFICIAL_KIND = { Practice: "practica", Qualifying: "clasificacion" };

/**
 * Sesiones de la página de una fecha en fiaformula2.com, en orden: [{ kind, index, name, state, end, results }].
 * `index` es el orden entre las sesiones del mismo tipo (Baku 2026: dos clasificaciones y dos carreras principales).
 * `results` sólo viene en la última sesión terminada.
 */
export function parseOfficialSessions(html) {
  const text = flightText(html);
  const at = text.indexOf('"meetingSessions":[');
  if (at === -1) return [];
  let list;
  try {
    list = jsonArrayAt(text, text.indexOf("[", at)) ?? [];
  } catch {
    return [];
  }
  const seen = {};
  const out = [];
  for (const s of list) {
    const kind = s.sessionType === "Race" ? (/sprint/i.test(s.shortName ?? "") ? "sprint" : "carrera") : OFFICIAL_KIND[s.sessionType];
    if (!kind || !s.endTime) continue;
    const end = Date.parse(`${s.endTime}${s.gmtOffset ?? "Z"}`);
    out.push({ kind, name: s.shortName ?? s.session ?? "", state: s.state, end, results: Array.isArray(s.results) ? s.results : [] });
  }
  out.sort((a, b) => a.end - b.end);
  for (const s of out) s.index = (seen[s.kind] = (seen[s.kind] ?? -1) + 1);
  return out;
}

const NAME_OF = { practica: "Práctica", clasificacion: "Clasificación", sprint: "Carrera sprint", carrera: "Carrera principal" };

const fromFia = (s) => (s.resultsSource?.name === FIA_F2_SOURCE || s.resultsSource?.name === F2_OFFICIAL_SOURCE) && s.results?.length;
const byStart = (a, b) => a.start.localeCompare(b.start);

/** Las sesiones de un tipo, en orden. */
const ofKind = (event, kind) => event.sessions.filter((s) => s.kind === kind).sort(byStart);

/**
 * Pega resultados a las sesiones de la fecha. Cada uno va a la sesión con su mismo id; si no hay, a la de su tipo en el mismo orden
 * (`index`), y si la fecha no tiene esa sesión, se agrega.
 */
function attach(event, found) {
  const sessions = [...event.sessions];
  for (const f of found) {
    let i = sessions.findIndex((s) => s.id === f.id);
    if (i === -1) {
      const target = ofKind({ sessions }, f.kind)[f.index ?? 0];
      i = target ? sessions.indexOf(target) : -1;
    }
    if (i >= 0) {
      const s = { ...sessions[i], results: f.results, resultsSource: f.resultsSource };
      delete s.resultsUnread;
      sessions[i] = s;
    } else sessions.push({ id: f.id ?? `${event.id}-${f.kind}`, kind: f.kind, name: f.name, start: sessions[0]?.start, timeKnown: false, durationMin: 45, results: f.results, resultsSource: f.resultsSource });
  }
  const order = { practica: 0, clasificacion: 1, sprint: 2, carrera: 3 };
  return { ...event, sessions: sessions.sort((a, b) => byStart(a, b) || order[a.kind] - order[b.kind]) };
}

/** Lo que dejó guardado la versión anterior: resultados leídos y sesiones que la FIA publicó pero no se pudieron leer. */
function storedOf(before, event) {
  const old = before.get(event.id)?.sessions ?? [];
  return { results: old.filter(fromFia), unread: new Set(old.filter((s) => s.resultsUnread && !s.results?.length).map((s) => s.id)) };
}

const markUnread = (event, ids) =>
  ids.size ? { ...event, sessions: event.sessions.map((s) => (ids.has(s.id) && !s.results?.length ? { ...s, resultsUnread: true } : s)) } : event;

export function keepPreviousFia(events, previous) {
  const before = new Map((previous?.events ?? []).map((e) => [e.id, e]));
  return events.map((e) => {
    const stored = storedOf(before, e);
    return markUnread(stored.results.length ? attach(e, stored.results) : e, stored.unread);
  });
}

export async function fiaF2(io, events, previous, { windowDays = 10, delayMs = 11000, officialDelayMs = 250, knownNames = [], now = Date.now() } = {}) {
  const resolveName = f2Names(knownNames);
  const before = new Map((previous?.events ?? []).map((e) => [e.id, e]));
  let requests = 0;
  let officialRequests = 0;
  let withResults = 0;
  const unreadNames = [];

  const out = [];
  for (const event of events) {
    if (event.seriesId !== "f2") {
      out.push(event);
      continue;
    }
    const stored = storedOf(before, event);
    const starts = event.sessions.map((s) => Date.parse(s.start));
    const recent = now - Math.max(...starts) < windowDays * DAY;
    if (Math.min(...starts) > now || (stored.results.length && !recent)) {
      out.push(markUnread(stored.results.length ? attach(event, stored.results) : event, stored.unread));
      if (stored.results.length) withResults++;
      continue;
    }
    const idOf = (kind, index) => ofKind(event, kind)[index]?.id ?? `${event.id}-${kind}${index ? `-${index + 1}` : ""}`;

    // 1) fia.com: una página por tipo de sesión. Si la fecha tiene dos del mismo tipo, no se sabe a cuál corresponde y no se usa.
    const venue = VENUE_ALIASES[event.venueSlug] ?? event.venueSlug ?? slugify(event.circuit.city);
    const found = [];
    for (const page of PAGES) {
      const same = ofKind(event, page.kind);
      if (same.length > 1 || (same[0] && Date.parse(same[0].start) > now)) continue;
      for (const slug of page.slugs) {
        const url = `${BASE}/${venue}/${slug}`;
        try {
          requests++;
          const html = await io.text(url, { revalidate: recent ? 1800 : 30 * DAY / 1000 });
          const results = parseFia(html, page.kind, resolveName);
          if (results.length) {
            found.push({ id: idOf(page.kind, 0), kind: page.kind, index: 0, name: page.name, results, resultsSource: { name: FIA_F2_SOURCE, url } });
            await io.sleep(delayMs);
            break;
          }
        } catch {
          // Página inexistente o conexión cortada: se prueba el siguiente nombre de página.
        }
        await io.sleep(delayMs);
      }
    }

    // 2) fiaformula2.com, sólo si queda alguna sesión terminada sin resultados.
    const have = new Set([...found, ...stored.results].map((s) => s.id));
    const ended = (s) => Date.parse(s.start) + (s.durationMin ?? 60) * 60000 < now;
    const unread = new Set(stored.unread);
    if (event.sessions.some((s) => ended(s) && !have.has(s.id))) {
      const url = `${OFFICIAL}/${event.venueSlug ?? slugify(event.circuit.city)}`;
      try {
        officialRequests++;
        const sessions = parseOfficialSessions(await io.text(url, { revalidate: 600 }));
        for (const o of sessions) {
          if (o.state !== "completed") continue;
          const id = idOf(o.kind, o.index);
          const results = o.results.length ? officialRows(o.results, o.kind, resolveName) : [];
          if (results.length) {
            if (!found.some((f) => f.id === id)) {
              const name = ofKind(event, o.kind)[o.index]?.name ?? NAME_OF[o.kind];
              found.push({ id, kind: o.kind, index: o.index, name, results, resultsSource: { name: F2_OFFICIAL_SOURCE, url } });
            }
          } else if (!have.has(id) && now - o.end > 30 * 60000) unread.add(id);
        }
      } catch {
        // Página caída: quedan los resultados guardados.
      }
      await io.sleep(officialDelayMs);
    }

    const kept = stored.results.filter((s) => !found.some((f) => f.id === s.id));
    const merged = markUnread(found.length || kept.length ? attach(event, [...kept, ...found]) : event, unread);
    if (merged.sessions.some(fromFia)) withResults++;
    for (const s of merged.sessions) if (s.resultsUnread) unreadNames.push(`${event.circuit?.city ?? event.name} · ${s.name}`);
    out.push(merged);
  }
  return { events: out, meta: { requests, officialRequests, eventsWithResults: withResults, ...(unreadNames.length ? { unread: unreadNames } : {}) } };
}
