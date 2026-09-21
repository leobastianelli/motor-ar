// Turismo Nacional desde el cronometraje oficial (MYLAPS Speedhive, API pública de resultados, sin clave): hora real de inicio de
// cada sesión y clasificación de cada una, por clase. Lo sube el cronometrista ("Tiempos crono", que también cronometra a otras
// categorías argentinas) después de cada sesión, con estado "provisorio": no es en vivo segundo a segundo ni reemplaza a los
// resultados oficiales de APAT, que se prefieren cuando existen. Sólo completa lo que falta.
import { belongsToEvent } from "./plausible.mjs";

const API = "https://eventresults-api.speedhive.com/api/v0.2.3/eventresults";
const ORG = 381036; // "Tiempos crono" (Buenos Aires)
export const SPEEDHIVE_SOURCE = "Speedhive · cronometraje (provisorio)";
const DAY = 86400000;

const dayOf = (iso) => iso.slice(0, 10);
const addDays = (day, n) => new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const tokenKey = (s) => norm(s).split(" ").filter(Boolean).sort().join(" ");
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s'-])([a-zà-ÿ])/g, (m, p, c) => p + c.toUpperCase());

/**
 * "VITAR TOMAS" (apellido primero, mayúsculas) → "Tomas Vitar". Si el nombre ya está en el resto de la temporada se usa esa
 * escritura (sirve para apellidos compuestos); si no, se pasa el primer apellido al final.
 */
export function personName(raw, known) {
  const clean = String(raw).replace(/\s+/g, " ").trim();
  const match = known.get(tokenKey(clean));
  if (match) return match;
  const [first, ...rest] = clean.split(" ");
  return titleCase(rest.length ? `${rest.join(" ")} ${first}` : first);
}

/** Sesión de Speedhive (nombre dentro del grupo "TN CLASE n") → clave "clase|tipo|número"; null si no es una sesión que mostramos. */
export function speedhiveKey(cls, name) {
  const n = String(name).trim().toUpperCase();
  let m;
  if ((m = n.match(/^ENTRENAMIENTO\s*(\d)$/))) return `${cls}|practica|${m[1]}`;
  if ((m = n.match(/^CLASIFICACION\s*(\d)?$/))) return `${cls}|clasificacion|${m[1] ?? ""}`;
  if ((m = n.match(/^SERIE\s*(\d)$/))) return `${cls}|serie|${m[1]}`;
  if (/^FINAL$/.test(n)) return `${cls}|final|`;
  return null; // subgrupos ("… - A"), generales, pruebas
}

/** Sesión nuestra → la misma clave; null si no se puede (p. ej. "2 Series Clase 2", que junta varias). */
export function ourKey(session) {
  const cls = session.name.match(/clase\s*(\d)/i)?.[1];
  if (!cls) return null;
  const n =
    session.kind === "practica" ? session.name.match(/^(\d)\s*[°º]/)?.[1]
    : session.kind === "clasificacion" ? (session.name.match(/clasificaci[oó]n\s*(\d)/i)?.[1] ?? "")
    : session.kind === "serie" ? session.name.match(/^serie\s*(\d)/i)?.[1]
    : session.kind === "final" ? ""
    : undefined;
  return n === undefined || n === null ? null : `${cls}|${session.kind}|${n}`;
}

const NAMES = { practica: (n, c) => `${n}° Entrenamiento Clase ${c}`, clasificacion: (n, c) => (n ? `Clasificación ${n} Clase ${c}` : `Clasificación Clase ${c}`), serie: (n, c) => `Serie ${n} Clase ${c}`, final: (_n, c) => `Final Clase ${c}` };
const DURATION = { practica: 55, clasificacion: 40, serie: 35, final: 40 };

/** "00.288" → "+0.288"; "01:02.345" → "+1:02.345". */
const gapText = (diff) => {
  const t = String(diff ?? "").replace(/^0+(?=\d)/, "").replace(/^:/, "");
  return t && !/^0*\.?0*$/.test(t) ? `+${t}` : "";
};
const lapTime = (t) => String(t ?? "").replace(/^0+(?=\d)/, "");

const STATUS = [
  [/dns|no larg/i, "No largó"],
  [/dsq|disq/i, "Descalificado"],
  [/dnf|abandon|retir/i, "Abandonó"],
];

/** Clasificación de una sesión (API de Speedhive) → filas nuestras. */
export function toRows(classification, kind, known) {
  const rows = [...(classification.rows ?? [])].sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999));
  const timed = kind === "practica" || kind === "clasificacion";
  return rows.map((r, i) => {
    const statusText = r.status && !/^normal$/i.test(r.status) ? r.status : "";
    const status = statusText ? STATUS.find(([re]) => re.test(statusText))?.[1] : undefined;
    // "difference" es contra el líder ("gap" es contra el auto de adelante).
    const lapsBehind = r.difference?.lapsBehind ?? 0;
    return {
      pos: r.position ?? i + 1,
      ...(status ? { status } : {}),
      number: String(r.startNumber ?? ""),
      driver: personName(r.name, known),
      team: "",
      gap: i === 0 ? lapTime(timed ? r.bestTime : r.totalTime) : lapsBehind > 0 ? `+${lapsBehind} ${lapsBehind === 1 ? "vuelta" : "vueltas"}` : gapText(r.difference?.timeDifference),
    };
  });
}

/** Eventos de Speedhive que corresponden a una fecha nuestra del TN: por nombre ("TN") y por fecha (±1 día). */
function candidatesFor(event, list) {
  const days = event.sessions.map((s) => dayOf(s.start)).sort();
  const from = addDays(days[0], -1);
  const to = addDays(days.at(-1), 1);
  return list.filter((e) => /\bTN\b/i.test(e.name) && e.startDate >= from && e.startDate <= to && !/pruebas comunitarias/i.test(e.name));
}

/**
 * Suma a las fechas del TN, para cada clase, la hora real de inicio de las sesiones sin horario y la clasificación de las que no
 * tienen resultados (las de APAT, oficiales, se conservan). Ventana: fechas recientes o próximas (`windowDays`).
 */
export async function speedhiveTn(io, events, previous, { windowDays = 21, delayMs = 250, knownNames = [], now = new Date() } = {}) {
  const known = new Map(knownNames.map((n) => [tokenKey(n), n]));
  const list = await io.json(`${API}/organizations/${ORG}/events?count=${windowDays > 60 ? 500 : 80}`, { revalidate: 300 });
  const nowMs = now.getTime();
  const before = new Map((previous.events ?? []).map((e) => [e.id, e]));
  const errors = [];
  let filled = 0;
  let timed = 0;
  let added = 0;

  const result = [];
  for (const event of events) {
    if (event.seriesId !== "tn") {
      result.push(event);
      continue;
    }
    const first = Date.parse(event.sessions[0].start);
    const last = Date.parse(event.sessions.at(-1).start);
    if (last < nowMs - windowDays * DAY || first > nowMs + 3 * DAY) {
      result.push(carryOver(event, before.get(event.id)));
      continue;
    }
    try {
      // key → { session de Speedhive, filas }, quedándose con la versión con más pilotos si el mismo evento está duplicado.
      const found = new Map();
      for (const cand of candidatesFor(event, list)) {
        await io.sleep(delayMs);
        const detail = await io.json(`${API}/events/${cand.id}?sessions=true`, { revalidate: 120 });
        for (const group of detail.sessions?.groups ?? []) {
          const cls = group.name.match(/^TN\s*CLASE\s*([23])$/i)?.[1];
          if (!cls) continue;
          for (const s of group.sessions) {
            const key = speedhiveKey(cls, s.name);
            if (!key || !s.resultStatus || s.startTime.startsWith("1970")) continue;
            await io.sleep(delayMs);
            const rows = toRows(await io.json(`${API}/sessions/${s.id}/classification`, { revalidate: 120 }), key.split("|")[1], known);
            if (rows.length && rows.length >= (found.get(key)?.rows.length ?? 0)) found.set(key, { id: s.id, eventId: cand.id, start: `${s.startTime}-03:00`, rows });
          }
        }
      }

      const sessions = event.sessions.map((s) => ({ ...s }));
      const used = new Set();
      for (const s of sessions) {
        const key = ourKey(s);
        const hit = key && found.get(key);
        if (!hit) continue;
        used.add(key);
        if (s.timeKnown === false || s.timeKnown === undefined) {
          Object.assign(s, { start: hit.start, timeKnown: true, timeStatus: "confirmed", timeSources: [{ name: "Speedhive (cronometraje)", url: `https://speedhive.mylaps.com/events/${hit.eventId}`, start: hit.start }] });
          timed++;
        }
        if (!s.results?.length) {
          Object.assign(s, { results: hit.rows, resultsSource: { name: SPEEDHIVE_SOURCE, url: `https://speedhive.mylaps.com/sessions/${hit.id}` } });
          filled++;
        }
      }
      // Sesiones que la fuente de la fecha no trae (p. ej. una fecha en curso): se agregan si no hay ya otra de la misma clase y tipo.
      const has = new Set(sessions.map((s) => ourKey(s)?.split("|").slice(0, 2).join("|")).filter(Boolean));
      for (const [key, hit] of found) {
        if (used.has(key)) continue;
        const [cls, kind, n] = key.split("|");
        if (has.has(`${cls}|${kind}`)) continue;
        sessions.push({
          id: `${event.id}-c${cls}-${kind}${n}`,
          kind,
          name: NAMES[kind](n, cls),
          start: hit.start,
          timeKnown: true,
          timeStatus: "confirmed",
          timeSources: [{ name: "Speedhive (cronometraje)", url: `https://speedhive.mylaps.com/events/${hit.eventId}`, start: hit.start }],
          durationMin: DURATION[kind],
          results: hit.rows,
          resultsSource: { name: SPEEDHIVE_SOURCE, url: `https://speedhive.mylaps.com/sessions/${hit.id}` },
        });
        added++;
      }
      sessions.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
      result.push({ ...event, sessions });
    } catch (error) {
      errors.push(`${event.id}: ${error.message}`);
      result.push(carryOver(event, before.get(event.id)));
    }
  }
  return { events: result, meta: { speedhiveTn: { filledResults: filled, realTimes: timed, addedSessions: added, errors } } };
}

const TIME_SOURCE = "Speedhive (cronometraje)";

/**
 * Arrastra a una fecha lo que Speedhive ya había aportado en la versión anterior (hora real y resultados provisorios), para las
 * fechas que no se vuelven a pedir (fuera de la ventana reciente) o cuando la fuente falla.
 */
export function carryOver(event, old) {
  if (event.seriesId !== "tn" || !old) return event;
  const byId = new Map(old.sessions.map((o) => [o.id, o]));
  const sessions = event.sessions.map((s) => {
    const prev = byId.get(s.id);
    if (!prev || !belongsToEvent(event, prev)) return s;
    const out = { ...s };
    if (s.timeKnown !== true && prev.timeSources?.some((t) => t.name === TIME_SOURCE)) Object.assign(out, { start: prev.start, timeKnown: true, timeStatus: prev.timeStatus, timeSources: prev.timeSources });
    if (!s.results?.length && prev.resultsSource?.name === SPEEDHIVE_SOURCE) Object.assign(out, { results: prev.results, resultsSource: prev.resultsSource });
    return out;
  });
  const have = new Set(sessions.map((s) => s.id));
  for (const o of old.sessions) if (!have.has(o.id) && o.resultsSource?.name === SPEEDHIVE_SOURCE && belongsToEvent(event, o)) sessions.push(o);
  return { ...event, sessions: sessions.sort((a, b) => Date.parse(a.start) - Date.parse(b.start)) };
}

/** Si Speedhive falla por completo: se conserva lo de la versión anterior. */
export function keepPreviousSpeedhive(events, previous) {
  const before = new Map((previous.events ?? []).map((e) => [e.id, e]));
  return events.map((e) => carryOver(e, before.get(e.id)));
}
