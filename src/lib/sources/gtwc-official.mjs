// GT World Challenge Europe desde el sitio oficial (gt-world-challenge-europe.com): horarios reales de cada sesión (con hora local
// y GMT publicadas) y resultados oficiales de cada sesión. Reemplaza las fechas y horarios estimados que arma gtwc.mjs desde
// Wikipedia. Los sitios de GT World publican HTML de servidor (robots.txt permite el rastreo), sin API ni login.
import { dayMonth, pad } from "./common.mjs";

const BASE = "https://www.gt-world-challenge-europe.com";
const YEAR = 2026;
const SEASON_ID = 26; // filtro de temporada del sitio (2026)
export const GTWC_SOURCE = "GT World Challenge Europe (oficial)";

// Entidades HTML con nombre: las básicas y todas las de Latin-1 (acentos y letras europeas de los nombres de pilotos).
const LATIN1 = "nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml".split(" ");
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", ...Object.fromEntries(LATIN1.map((name, i) => [name, String.fromCharCode(160 + i)])) };
const decode = (s) =>
  String(s)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => ENTITIES[n] ?? m);
const text = (html) => decode(String(html).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const norm = (s) => decode(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Fechas del calendario oficial: [{ id, slug }] de cada fecha del campeonato (sin los días de prueba). */
export function parseCalendar(html) {
  const seen = new Map();
  for (const m of html.matchAll(/href="\/event\/(\d+)\/([^"?#]+)"/g)) {
    const slug = decodeURIComponent(m[2]);
    if (/test/i.test(slug) || seen.has(m[1])) continue;
    seen.set(m[1], { id: m[1], slug });
  }
  return [...seen.values()];
}

/** Cronograma de la página de una fecha → [{ name, date: "2026-09-19", local: "14:45", start: ISO con el huso del circuito }]. */
export function parseTimetable(html) {
  const out = [];
  for (const table of html.match(/<table class="timetable__table"[\s\S]*?<\/table>/g) ?? []) {
    const caption = text(table.match(/<caption[\s\S]*?<\/caption>/)?.[0] ?? "");
    const day = dayMonth(caption.replace(/^[A-Za-z]+,\s*/, ""));
    if (!day) continue;
    const date = `${YEAR}-${pad(day.m)}-${pad(day.d)}`;
    for (const row of (table.match(/<tbody[\s\S]*<\/tbody>/)?.[0] ?? "").match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => text(m[1]));
      const [name = "", local = "", gmt = ""] = cells;
      const l = local.match(/^(\d{1,2}):(\d{2})$/);
      const g = gmt.match(/^(\d{1,2}):(\d{2})$/);
      if (!l || !g) continue;
      // La diferencia entre la hora local y la GMT publicadas es el huso del circuito (puede cruzar la medianoche).
      let offset = Number(l[1]) * 60 + Number(l[2]) - (Number(g[1]) * 60 + Number(g[2]));
      if (offset > 720) offset -= 1440;
      if (offset < -720) offset += 1440;
      const sign = offset < 0 ? "-" : "+";
      const abs = Math.abs(offset);
      out.push({ name, date, local: `${pad(Number(l[1]))}:${l[2]}`, start: `${date}T${pad(Number(l[1]))}:${l[2]}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}` });
    }
  }
  return out;
}

const minutes = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 60000);

/**
 * Sesiones nuestras a partir del cronograma oficial. `cup` es "sprint" o "endurance"; `raceName` y `raceMin` salen de la fecha ya
 * cargada (p. ej. "24 Horas de Spa", 1440). Salen sólo las sesiones que se muestran: se ignoran las pruebas privadas (Bronze Test,
 * Official Test), las caminatas de boxes, el desfile de Spa, las filas "Main Race after…" (parciales por hora) y las filas sin nombre
 * de los cronogramas todavía en borrador.
 */
export function planSessions(rows, cup, { raceName = "Carrera", raceMin = 180 } = {}) {
  const sessions = [];
  const at = (i) => rows[i].start;
  const nextGap = (i, cap) => {
    const next = rows.slice(i + 1).find((r) => r.date === rows[i].date);
    return next ? Math.max(10, Math.min(cap, minutes(at(i), next.start))) : cap;
  };
  const groups = new Map(); // Sprint: número de clasificación → { first, second, combined }
  const endurance = [];

  rows.forEach((row, i) => {
    const n = row.name.trim();
    let m;
    if ((m = n.match(/^free practice (\d)$/i))) {
      sessions.push({ id: `fp${m[1]}`, kind: "practica", name: `Práctica libre ${m[1]}`, start: at(i), durationMin: nextGap(i, 60), slugs: [`free-practice-${m[1]}`] });
    } else if ((m = n.match(/^night practice$/i))) {
      sessions.push({ id: "np", kind: "practica", name: "Práctica nocturna", start: at(i), durationMin: nextGap(i, 60), slugs: ["night-practice"] });
    } else if ((m = n.match(/^warm-?up$/i))) {
      sessions.push({ id: "wu", kind: "practica", name: "Warm-up", start: at(i), durationMin: nextGap(i, 20), slugs: ["warm-up"] });
    } else if ((m = n.match(/^super-?pole$/i))) {
      sessions.push({ id: "sp", kind: "clasificacion", name: "Superpole", start: at(i), durationMin: nextGap(i, 60), slugs: ["super-pole", "superpole"] });
    } else if ((m = n.match(/^qualifying (\d)\s*-\s*group ([ab])$/i))) {
      const g = groups.get(m[1]) ?? {};
      g[m[2].toLowerCase()] = i;
      groups.set(m[1], g);
    } else if ((m = n.match(/^qualifying (\d) combined$/i))) {
      groups.set(m[1], { ...groups.get(m[1]), combined: i });
    } else if ((m = n.match(/^qualifying (\d)$/i))) {
      if (cup === "sprint") groups.set(m[1], { ...groups.get(m[1]), single: i });
      else endurance.push(i);
    } else if (/^qualifying$/i.test(n)) {
      endurance.push(i);
    } else if ((m = n.match(/^race (\d)$/i))) {
      sessions.push({ id: `r${m[1]}`, kind: "carrera", name: `Carrera ${m[1]}`, start: at(i), durationMin: 60, slugs: [`race-${m[1]}`] });
    } else if (/^main race$/i.test(n)) {
      sessions.push({ id: "race", kind: "carrera", name: raceName, start: at(i), durationMin: raceMin, slugs: ["main-race"] });
    }
  });

  for (const [n, g] of groups) {
    const first = g.a ?? g.single;
    if (first === undefined) continue;
    const length = g.b !== undefined ? (Date.parse(at(g.b)) - Date.parse(at(g.a))) / 60000 : nextGap(first, 20);
    sessions.push({
      id: `q${n}`,
      kind: "clasificacion",
      name: `Clasificación ${n}`,
      start: at(first),
      durationMin: g.b !== undefined ? Math.max(10, length * 2) : length,
      slugs: [`qualifying-${n}-combined`, `qualifying-${n}`],
    });
  }
  // Endurance: varias sesiones de clasificación seguidas (por grupo de pilotos) que dan una sola grilla: una sola fila.
  if (endurance.length) {
    const first = endurance[0];
    const last = endurance.at(-1);
    sessions.push({ id: "q", kind: "clasificacion", name: "Clasificación", start: at(first), durationMin: minutes(at(first), at(last)) + 20, slugs: ["qualifying-combined", "qualifying"] });
  }
  return sessions.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

/** Tabla de resultados de una sesión → filas nuestras (posiciones ya ordenadas). Vacía si la sesión todavía no tiene resultados. */
export function parseResults(html, { race = false } = {}) {
  const table = html.match(/<table class="table session"[\s\S]*?<\/table>/)?.[0];
  if (!table) return [];
  const rows = [];
  for (const tr of (table.match(/<tbody[\s\S]*<\/tbody>/)?.[0] ?? "").match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    const c = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => text(m[1]));
    if (c.length < 7) continue;
    const [pos, number, klass, drivers, team, , , laps, gap = ""] = c;
    const p = Number.parseInt(pos, 10);
    const status = /dsq|disq/i.test(pos) ? "Descalificado" : /dns/i.test(pos) ? "No largó" : /^nc$/i.test(pos) ? "No clasificado" : /dnf|ret/i.test(pos) ? "Abandonó" : undefined;
    rows.push({
      pos: Number.isFinite(p) ? p : 999,
      ...(Number.isFinite(p) ? {} : { positionText: pos || "—" }),
      ...(status ? { status } : {}),
      number,
      class: klass,
      driver: drivers.split(/\s*,\s*/).filter(Boolean).join(" / "),
      team,
      laps: Number.parseInt(laps, 10) || 0,
      gap,
    });
  }
  // En carrera, quien completó menos vueltas que el ganador figura "a N vueltas" (el sitio publica ahí un tiempo negativo o
  // mezclado, que no se puede mostrar como diferencia). En las demás sesiones la diferencia es el tiempo contra el mejor.
  const leaderLaps = rows[0]?.laps ?? 0;
  for (const r of rows) {
    const behind = race && r.pos !== 999 ? leaderLaps - r.laps : 0;
    r.gap = r.pos === 999 ? "" : behind > 0 ? `+${behind} vuelta${behind > 1 ? "s" : ""}` : r.gap && !/^-/.test(r.gap) && !/^0*\.?0*$/.test(r.gap) ? `+${r.gap}` : "";
    delete r.laps;
  }
  const classified = rows.filter((r) => r.pos !== 999).length;
  return rows.map((r, i) => (r.pos === 999 ? { ...r, pos: classified + i + 1 } : r));
}

/** Página de resultados de una fecha → { slug del circuito en la URL, sesiones publicadas }. */
export function parseResultLinks(html, meetingId) {
  const sessions = new Set();
  let venue = null;
  for (const m of html.matchAll(/href="\/results\/(\d{4})\/([^"/]+)\/([^"/]+)"/g)) {
    venue ??= m[2];
    sessions.add(decode(m[3]));
  }
  return { venue: venue ? decode(venue) : null, sessions, meetingId };
}

const isOurs = (s) => s.timeSources?.some((t) => t.name === GTWC_SOURCE);

/** Encuentra la fecha oficial de cada evento GT3 que ya tenemos, por nombre del circuito. */
function matchMeetings(events, meetings) {
  const pairs = [];
  for (const meeting of meetings) {
    const key = norm(meeting.slug.replace(/^crowdstrike-24-hours-of-/, "").replace(/^circuit-/, ""));
    const event = events.find((e) => ` ${norm(`${e.name} ${e.circuit?.name ?? ""} ${e.circuit?.city ?? ""}`)} `.includes(` ${key} `));
    if (event) pairs.push({ meeting, event });
  }
  return pairs;
}

/**
 * Suma horarios y resultados oficiales a las fechas de GT3. Si una fecha o la fuente fallan, esa fecha queda como estaba.
 * Las fechas ya terminadas con datos oficiales se reutilizan de la versión anterior (sólo se vuelve a leer la ventana reciente).
 */
export async function gtwcOfficial(io, events, previous, { windowDays = 10, delayMs = 300, now = new Date() } = {}) {
  const calendar = parseCalendar(await io.text(`${BASE}/calendar`, { revalidate: 3600 }));
  if (!calendar.length) throw new Error("el calendario oficial no trae fechas");
  const gt3 = events.filter((e) => e.seriesId === "gt3");
  const previousById = new Map((previous.events ?? []).map((e) => [e.id, e]));
  const pairs = matchMeetings(gt3, calendar);
  const done = new Map();
  const errors = [];
  let sessionsWithTimes = 0;
  let sessionsWithResults = 0;

  for (const { meeting, event } of pairs) {
    const before = previousById.get(event.id);
    const lastStart = Math.max(...(before?.sessions ?? event.sessions).map((s) => Date.parse(s.start)));
    if (before?.sessions.some(isOurs) && lastStart < now.getTime() - windowDays * 86400000) {
      done.set(event.id, before);
      continue;
    }
    try {
      await io.sleep(delayMs);
      const eventUrl = `${BASE}/event/${meeting.id}/${encodeURIComponent(meeting.slug)}`;
      const page = await io.text(eventUrl, { revalidate: 900 });
      const rows = parseTimetable(page);
      const cup = event.id.startsWith("gt3-2026-s") ? "sprint" : "endurance";
      const oldRace = event.sessions.find((s) => s.kind === "carrera");
      const raceName = cup === "endurance" ? oldRace?.name : undefined;
      const hours = raceName?.match(/^(\d+)\s+hora/i);
      const plan = planSessions(rows, cup, { ...(raceName ? { raceName } : {}), ...(hours ? { raceMin: Number(hours[1]) * 60 } : {}) });
      if (!plan.some((s) => s.kind === "carrera")) throw new Error("el cronograma no trae la carrera");

      // Cronograma en borrador (el PDF oficial todavía no es la versión final) → horarios a confirmar.
      const tentative = /timetable\s+draft/i.test(page) || rows.some((r) => !r.name.trim());
      const links = parseResultLinks(await io.text(`${BASE}/results?filter_season_id=${SEASON_ID}&filter_meeting_id=${meeting.id}`, { revalidate: 900 }), meeting.id);

      const sessions = [];
      for (const s of plan) {
        const { slugs, id, ...rest } = s;
        const session = {
          id: `${event.id}-${id}`,
          ...rest,
          timeKnown: true,
          timeStatus: tentative ? "tentative" : "confirmed",
          timeSources: [{ name: GTWC_SOURCE, url: eventUrl, start: s.start }],
        };
        sessionsWithTimes++;
        const slug = slugs.find((x) => links.sessions.has(x));
        if (slug && links.venue && Date.parse(s.start) <= now.getTime()) {
          const url = `${BASE}/results/${YEAR}/${encodeURIComponent(links.venue)}/${slug}`;
          try {
            await io.sleep(delayMs);
            const results = parseResults(await io.text(url, { revalidate: 900 }), { race: s.kind === "carrera" });
            if (results.length) {
              session.results = results;
              session.resultsSource = { name: GTWC_SOURCE, url };
              sessionsWithResults++;
            }
          } catch (error) {
            errors.push(`${event.id}/${slug}: ${error.message}`);
          }
        }
        // Si la fuente oficial todavía no publicó la sesión, se conserva lo que ya teníamos (p. ej. Wikipedia) para esa misma sesión.
        if (!session.results) {
          const old = event.sessions.find((o) => o.kind === session.kind && o.name === session.name && o.results?.length);
          if (old) Object.assign(session, { results: old.results, resultsSource: old.resultsSource });
        }
        sessions.push(session);
      }
      done.set(event.id, { ...event, sessions, source: `${GTWC_SOURCE} · ${event.source}` });
    } catch (error) {
      errors.push(`${event.id}: ${error.message}`);
      const kept = before && before.sessions.some(isOurs) ? before : event;
      done.set(event.id, kept);
    }
  }

  const updated = events.map((e) => done.get(e.id) ?? e);
  const clases = await classStandings(io, updated, previous, { delayMs, errors });
  return {
    events: updated,
    meta: { gtwcOfficial: { meetings: pairs.length, sessions: sessionsWithTimes, withResults: sessionsWithResults, errors }, gt3Clases: clases },
  };
}

// ─── Campeonatos por clase ──────────────────────────────────────────────────────────────────────────────────────
// Cada clase (Gold, Silver y Bronze Cup) tiene su campeonato de pilotos en la temporada completa del GT World Challenge Europe, en el Endurance
// Cup y en el Sprint Cup. Para un piloto Silver la tabla que cuenta es la de la Silver Cup, no la general: en 2026 Montenegro figuraba 18.º en
// la general del Sprint y fue campeón Silver en los tres campeonatos.

export const STANDING_CUPS = [
  { id: "general", code: 0, label: "GT World Challenge Europe" },
  { id: "endurance", code: 42, label: "Endurance Cup" },
  { id: "sprint", code: 43, label: "Sprint Cup" },
];
export const STANDING_CLASSES = [
  { code: 81, name: "Gold Cup" },
  { code: 82, name: "Silver Cup" },
  { code: 80, name: "Bronze Cup" },
];
/** Filas que se guardan de cada tabla: las primeras y las de los argentinos. */
const TOP_ROWS = 5;

/**
 * Tabla de campeonato de pilotos del sitio oficial → fechas (con su columna de carrera) y filas. Los pilotos de un mismo auto comparten puesto y
 * puntos: se juntan en una fila ("Ignacio Montenegro / Matisse Lismont"). Una fecha está sumada si alguna fila tiene puntos en su carrera (la
 * última columna de la fecha: "MR", "R2" o "24hr"); las clasificaciones suman puntos antes de la carrera, así que no alcanzan.
 */
export function parseStandings(html) {
  const table = html.match(/<table class="table standing[\s\S]*?<\/table>/)?.[0];
  if (!table) return null;
  const trs = table.match(/<tr[\s\S]*?<\/tr>/g) ?? [];
  const cells = (tr) => [...tr.matchAll(/<t([dh])([^>]*)>([\s\S]*?)<\/t\1>/g)].map((m) => ({ text: text(m[3]), span: Number(m[2].match(/colspan="(\d+)"/)?.[1] ?? 1), html: m[3] }));
  const head = cells(trs[0] ?? "").slice(1);
  const tracks = cells(trs[1] ?? "").slice(1);
  const rounds = [];
  let col = 0;
  head.forEach((h, i) => {
    col += h.span;
    rounds.push({ round: h.text, track: text(tracks[i]?.html.replace(/<span[\s\S]*?<\/span>/g, "") ?? ""), raceCol: col - 1 });
  });
  const rows = [];
  for (const tr of trs.slice(3)) {
    const c = cells(tr);
    const pos = Number.parseInt(c[0]?.text ?? "", 10);
    if (!Number.isFinite(pos) || !c[1]?.text) continue;
    const points = Number(String(c[2]?.text ?? "").replace(",", "."));
    rows.push({ pos, driver: c[1].text, points: Number.isFinite(points) ? points : 0, races: c.slice(3).map((x) => x.text) });
  }
  // Índices de las fechas cuya carrera ya tiene puntos en esta tabla.
  const scoredRounds = rounds.flatMap((r, i) => (rows.some((row) => row.races[r.raceCol]) ? [i] : []));
  const merged = [];
  for (const r of rows) {
    const last = merged.at(-1);
    if (last && last.pos === r.pos && last.points === r.points) last.driver = `${last.driver} / ${r.driver}`;
    else merged.push({ pos: r.pos, driver: r.driver, points: r.points });
  }
  return { rounds: rounds.map(({ round, track }) => ({ round, track })), scored: scoredRounds.length, scoredRounds, rows: merged };
}

/** Fechas de GT3 cuya carrera (o carreras, en el Sprint) ya terminó con resultados, por campeonato. */
function racesDone(events, cup) {
  return events.filter((e) => {
    if (e.seriesId !== "gt3") return false;
    if (cup === "sprint" && !e.id.startsWith("gt3-2026-s")) return false;
    if (cup === "endurance" && !e.id.startsWith("gt3-2026-e")) return false;
    const races = e.sessions.filter((s) => s.kind === "carrera");
    return races.length > 0 && races.every((s) => s.results?.length);
  }).length;
}

export async function classStandings(io, events, previous, { delayMs, errors }) {
  const prev = previous?.meta?.gt3Clases ?? [];
  const argentines = new Set((previous?.meta?.gt3?.argentines ?? []).map(norm));
  const isArgentine = (driver) => driver.split(" / ").some((d) => argentines.has(norm(d)));
  const out = [];
  for (const cup of STANDING_CUPS) {
    const read = [];
    for (const cls of STANDING_CLASSES) {
      const old = prev.find((t) => t.cup === cup.id && t.class === cls.name);
      try {
        await io.sleep(delayMs);
        const url = `${BASE}/standings?filter_season_id=${SEASON_ID}&filter_standing_type=${cup.code}_${cls.code}_drivers`;
        const parsed = parseStandings(await io.text(url, { revalidate: 1800 }));
        if (!parsed?.rows.length) throw new Error("la tabla vino vacía");
        read.push({ cls, url, parsed });
      } catch (error) {
        errors.push(`campeonato ${cup.label} ${cls.name}: ${error.message}`);
        if (old) out.push(old);
      }
    }
    // Una clase puede no sumar puntos en una fecha (nadie de la clase corrió): la fecha cuenta como sumada si alguna clase ya la tiene.
    const scored = new Set(read.flatMap((r) => r.parsed.scoredRounds));
    const done = racesDone(events, cup.id);
    for (const { cls, url, parsed } of read) {
      const last = parsed.rounds[Math.max(-1, ...scored)];
      out.push({
        cup: cup.id,
        cupLabel: cup.label,
        class: cls.name,
        // La tabla oficial a veces tarda en sumar la última carrera: hasta que la suma, se dice hasta dónde llega.
        status: scored.size >= done ? "oficial" : "atrasada",
        scoredRounds: scored.size,
        totalRounds: parsed.rounds.length,
        racesDone: done,
        ...(last ? { asOf: last.track } : {}),
        source: url,
        rows: parsed.rows.filter((r, i) => i < TOP_ROWS || isArgentine(r.driver)),
      });
    }
  }
  return out;
}

/** Si la fuente oficial falla por completo: se conservan los horarios y resultados oficiales de la versión anterior. */
export function keepPreviousGtwc(events, previous) {
  const before = new Map((previous.events ?? []).map((e) => [e.id, e]));
  return events.map((e) => {
    const old = before.get(e.id);
    return e.seriesId === "gt3" && old?.sessions.some(isOurs) ? { ...e, sessions: old.sessions } : e;
  });
}
