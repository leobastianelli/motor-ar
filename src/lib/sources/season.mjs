// Temporada 2026 de todas las categorías con fuente real. Si una fuente falla, se conservan sus datos anteriores.
import { actcSeason } from "./actc.mjs";
import { actcOfficialSchedules } from "./actc-official.mjs";
import { apatSeason } from "./apat.mjs";
import { f1Season } from "./f1.mjs";
import { f2Season } from "./f2.mjs";
import { actcTiming, keepPreviousTiming, TIMING_SERIES } from "./actc-timing.mjs";
import { applySchedules, buildConsensus, solotcNotes } from "./schedule-notes.mjs";
import { tc2000Season } from "./tc2000.mjs";

const SOURCES = [
  ["F1", ["f1"], f1Season],
  ["F2", ["f2"], f2Season],
  ["ACTC", ["tc", "tc-pista", "tc-mouras", "tc-pista-mouras", "tc-pick-up", "tc-pista-pick-up"], actcSeason],
  ["TN APAT", ["tn"], apatSeason],
  ["TC2000", ["tc2000"], tc2000Season],
];

/** Categorías cuyos horarios salen de notas de cronograma (ver schedule-notes.mjs). */
const SCHEDULED_SERIES = new Set(["tc", "tc-pista", "tc-mouras", "tc-pista-mouras", "tc-pick-up", "tc-pista-pick-up"]);

/**
 * Suma horarios a las fechas nacionales desde notas de cronograma (SoloTC) verificadas con el PDF oficial de la ACTC.
 * Si las notas no se pueden leer, reutiliza los horarios ya publicados en la versión anterior de cada fecha.
 */
async function withSchedules(io, events, previous, failures) {
  const national = events.filter((e) => SCHEDULED_SERIES.has(e.seriesId));
  try {
    const notes = await solotcNotes(io);
    let official = [];
    try {
      official = await actcOfficialSchedules(io);
    } catch (error) {
      failures.push(`Cronograma oficial ACTC: ${error.message}`);
    }
    const consensus = buildConsensus(notes, official);
    const { events: timed, applied } = applySchedules(national, consensus);
    const byId = new Map(timed.map((e) => [e.id, e]));
    return {
      events: events.map((e) => byId.get(e.id) ?? e),
      meta: {
        notes: notes.length,
        officialPdfs: official.length,
        sessions: consensus.length,
        confirmed: consensus.filter((s) => s.status === "confirmed").length,
        conflicts: consensus.filter((s) => s.conflict).length,
        eventsWithTimes: applied,
      },
    };
  } catch (error) {
    failures.push(`Cronogramas: ${error.message} (se conservan los horarios anteriores)`);
    const previousById = new Map((previous.events ?? []).map((e) => [e.id, e]));
    return {
      events: events.map((e) => {
        const before = previousById.get(e.id);
        if (!SCHEDULED_SERIES.has(e.seriesId) || !before?.sessions.some((s) => s.timeKnown)) return e;
        const finalResults = e.sessions.find((s) => s.kind === "final")?.results;
        return {
          ...e,
          sessions: before.sessions.map((s) => (s.kind === "final" && finalResults ? { ...s, results: finalResults } : s)),
        };
      }),
      meta: previous.meta?.schedules ?? null,
    };
  }
}

export async function buildSeason(io, previous = { events: [], standings: {}, meta: {} }, log = () => {}) {
  let events = [];
  const standings = {};
  const meta = {};
  const failures = [];

  for (const [label, seriesIds, run] of SOURCES) {
    try {
      const part = await run(io);
      events.push(...part.events);
      Object.assign(standings, part.standings);
      Object.assign(meta, part.meta);
      log(label, part);
    } catch (error) {
      failures.push(`${label}: ${error.message}`);
      events.push(...previous.events.filter((e) => seriesIds.includes(e.seriesId)));
      for (const id of seriesIds) {
        if (previous.standings?.[id]) standings[id] = previous.standings[id];
        if (previous.meta?.[id]) meta[id] = previous.meta[id];
      }
    }
  }

  const scheduled = await withSchedules(io, events, previous, failures);
  events = scheduled.events;
  meta.schedules = scheduled.meta;

  // Resultados oficiales de cada sesión de la ACTC. Los nombres conocidos (campeonato y otras fuentes) ordenan cómo se muestran.
  // Sólo nombres del TC y sus categorías (Wikipedia los escribe "Nombre Apellido"; otras fuentes los dan vuelta).
  const knownNames = [
    ...(standings.tc ?? []).map((r) => r.driver),
    ...events.filter((e) => TIMING_SERIES.has(e.seriesId)).flatMap((e) => e.sessions.flatMap((s) => s.results?.map((r) => r.driver) ?? [])),
  ];
  try {
    const timing = await actcTiming(io, events, previous, { windowDays: io.timingWindowDays ?? 10, delayMs: io.timingDelayMs ?? 400, knownNames });
    events = timing.events;
    meta.timing = timing.meta;
  } catch (error) {
    failures.push(`Tiempos ACTC: ${error.message} (se conservan los resultados anteriores)`);
    events = keepPreviousTiming(events, previous);
    meta.timing = previous.meta?.timing ?? null;
  }

  events.sort((a, b) => new Date(a.sessions[0].start) - new Date(b.sessions[0].start));
  return { generatedAt: new Date().toISOString(), events, standings, meta, failures };
}
