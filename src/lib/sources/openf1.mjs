// Fórmula 1: resultados de las prácticas y de la clasificación sprint desde OpenF1 (api.openf1.org, datos históricos gratuitos).
// Jolpica ya trae carrera, clasificación y sprint; OpenF1 completa las sesiones que Jolpica no publica.

const BASE = "https://api.openf1.org/v1";
const DAY = 86400000;
export const OPENF1_SOURCE = "OpenF1";

/** Sesión de OpenF1 → nombre de nuestra sesión (el mismo que arma f1.mjs). */
const NAMES = { "Practice 1": "Práctica 1", "Practice 2": "Práctica 2", "Practice 3": "Práctica 3", "Sprint Qualifying": "Clasificación sprint" };
const OURS = new Set(Object.values(NAMES));

const titleCase = (s) => String(s).toLowerCase().replace(/(^|[\s-])([a-záéíóúñüäöëï])/g, (m, p, c) => p + c.toUpperCase());
const last = (v) => (Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined).at(-1) : v) ?? null;
const clock = (sec) => {
  const m = Math.floor(sec / 60);
  const rest = (sec - m * 60).toFixed(3).padStart(6, "0");
  return m ? `${m}:${rest}` : rest;
};

function rows(results, drivers) {
  const byNumber = new Map(drivers.map((d) => [d.driver_number, d]));
  return [...results]
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
    .map((r, i) => {
      const d = byNumber.get(r.driver_number) ?? {};
      const best = last(r.duration);
      const gap = last(r.gap_to_leader);
      const status = r.dsq ? "Descalificado" : r.dns ? "No largó" : r.dnf ? "Abandonó" : best === null ? "Sin tiempo" : undefined;
      return {
        pos: r.position ?? i + 1,
        ...(r.position === null ? { positionText: "—" } : {}),
        number: String(r.driver_number),
        driver: d.full_name ? titleCase(d.full_name) : `#${r.driver_number}`,
        code: d.name_acronym,
        team: d.team_name ?? "",
        gap: best === null ? "" : i === 0 || !gap ? clock(best) : `+${Number(gap).toFixed(3)}`,
        ...(status ? { status } : {}),
      };
    });
}

const fromOpenf1 = (s) => s.resultsSource?.name === OPENF1_SOURCE && s.results?.length;

/** Si OpenF1 no responde, cada sesión conserva los resultados que ya tenía. */
export function keepPreviousOpenf1(events, previous) {
  const before = new Map((previous?.events ?? []).map((e) => [e.id, e]));
  return events.map((e) => {
    const stored = before.get(e.id)?.sessions.filter(fromOpenf1) ?? [];
    if (!stored.length) return e;
    return { ...e, sessions: e.sessions.map((s) => stored.find((x) => x.name === s.name && !s.results?.length) ?? s) };
  });
}

export async function openf1Sessions(io, events, previous, { windowDays = 10, delayMs = 1000 } = {}) {
  let catalog;
  try {
    catalog = await io.json(`${BASE}/sessions?year=2026`, { revalidate: 600 });
  } catch (error) {
    // Con cualquier sesión de F1 en vivo, OpenF1 rechaza (401) todo pedido sin clave, también los de sesiones pasadas. No es una falla:
    // los resultados que ya teníamos se conservan y la fuente oficial (f1-official.mjs) cubre lo que falte hasta que se libere.
    if (/^401\b/.test(String(error.message))) return { events: keepPreviousOpenf1(events, previous), meta: { sessions: 0, requests: 0, sessionsWithResults: 0, restrictedWhileLive: true } };
    throw error;
  }
  const before = new Map((previous?.events ?? []).map((e) => [e.id, e]));
  const now = Date.now();
  let requests = 0;
  let filled = 0;

  const out = [];
  for (const event of events) {
    if (event.seriesId !== "f1") {
      out.push(event);
      continue;
    }
    const stored = before.get(event.id)?.sessions.filter(fromOpenf1) ?? [];
    const end = Math.max(...event.sessions.map((s) => Date.parse(s.start)));
    const recent = now - end < windowDays * DAY;
    const sessions = [];
    for (const s of event.sessions) {
      const kept = stored.find((x) => x.name === s.name);
      const withKept = kept ? { ...s, results: kept.results, resultsSource: kept.resultsSource } : s;
      if (!OURS.has(s.name) || Date.parse(s.start) > now || (kept && !recent)) {
        sessions.push(OURS.has(s.name) ? withKept : s);
        if (kept && OURS.has(s.name)) filled++;
        continue;
      }
      const match = catalog.find((o) => NAMES[o.session_name] === s.name && Math.abs(Date.parse(o.date_start) - Date.parse(s.start)) < 6 * 3600000);
      if (!match) {
        sessions.push(withKept);
        continue;
      }
      try {
        // Recién terminada: OpenF1 tarda unos minutos en publicar la tabla y una respuesta vacía no puede quedar guardada media hora.
        const ended = now - (Date.parse(s.start) + (s.durationMin ?? 60) * 60000);
        const revalidate = ended < 3 * 3600000 ? 120 : recent ? 1800 : 30 * 86400;
        const results = await io.json(`${BASE}/session_result?session_key=${match.session_key}`, { revalidate });
        await io.sleep(delayMs);
        const drivers = await io.json(`${BASE}/drivers?session_key=${match.session_key}`, { revalidate });
        requests += 2;
        const list = rows(results, drivers);
        if (list.length) {
          sessions.push({ ...s, results: list, resultsSource: { name: OPENF1_SOURCE, url: `${BASE}/session_result?session_key=${match.session_key}` } });
          filled++;
        } else sessions.push(withKept);
      } catch {
        sessions.push(withKept);
      }
      await io.sleep(delayMs);
    }
    out.push({ ...event, sessions });
  }
  return { events: out, meta: { sessions: catalog.length, requests, sessionsWithResults: filled } };
}
