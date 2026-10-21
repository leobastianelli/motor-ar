// Temporada 2026 de todas las categorías con fuente real. Si una fuente falla, se conservan sus datos anteriores.
import { actcSeason } from "./actc.mjs";
import { actcOfficialSchedules } from "./actc-official.mjs";
import { ACTC_CATEGORIES, actcNotes, actcStandings } from "./actc-site.mjs";
import { apatSeason } from "./apat.mjs";
import { cordobaPistaSeason } from "./cordoba-pista.mjs";
import { nuevoCarShowSeason } from "./nuevo-car-show.mjs";
import { f1Season } from "./f1.mjs";
import { f2Season } from "./f2.mjs";
import { gtwcSeason } from "./gtwc.mjs";
import { gtwcOfficial, keepPreviousGtwc } from "./gtwc-official.mjs";
import { gtwcYoutube, keepPreviousYoutube } from "./gtwc-youtube.mjs";
import { keepPreviousSpeedhive, speedhiveTn } from "./speedhive-tn.mjs";
import { actcTiming, keepPreviousTiming, TIMING_SERIES, withoutMisread } from "./actc-timing.mjs";
import { fiaF2, keepPreviousFia } from "./fia-f2.mjs";
import { keepPreviousOpenf1, openf1Sessions } from "./openf1.mjs";
import { f1OfficialSessions, keepPreviousF1Official } from "./f1-official.mjs";
import { f1Videos, keepPreviousF1Videos } from "./f1-youtube.mjs";
import { applySchedules, buildConsensus, solotcNotes } from "./schedule-notes.mjs";
import { protectSeason, protectStandings } from "./guard.mjs";
import { tc2000Season } from "./tc2000.mjs";
import { tcrSaSeason } from "./tcr-sa.mjs";
import { formulaNacionalSeason } from "./formula-nacional.mjs";
import { rallyArgentinoSeason } from "./rally-argentino.mjs";
import { carryRally } from "../rally-refresh-core.mjs";

const SOURCES = [
  ["F1", ["f1"], f1Season],
  ["F2", ["f2"], f2Season],
  ["ACTC", ["tc", "tc-pista", "tc-mouras", "tc-pista-mouras", "tc-pick-up", "tc-pista-pick-up"], actcSeason],
  ["TN APAT", ["tn"], apatSeason],
  ["TC2000", ["tc2000"], tc2000Season],
  ["GT World Challenge", ["gt3"], gtwcSeason],
  // Córdoba Pista: calendario, horarios y resultados de las siete clases desde el cronometraje de la FRAD (Speedhive); el campeonato de cada
  // clase lo calcula Fierros con esos resultados (cordoba-pista-campeonato.mjs). Las fechas viejas no se vuelven a pedir (ventana).
  ["Córdoba Pista", ["cordoba-pista"], (io, previous) => cordobaPistaSeason(io, previous, { windowDays: io.timingWindowDays ?? 21, delayMs: io.cordobaDelayMs ?? 250 })],
  ["TCR South America", ["tcr-sa"], tcrSaSeason],
  // Fórmula Nacional Argentina: calendario, horarios, tiempos de cada sesión y campeonato desde formulanacional.com.ar. Las fechas viejas con resultados no se vuelven a pedir (ventana).
  ["Fórmula Nacional", ["formula-nacional"], (io, previous) => formulaNacionalSeason(io, previous, { windowDays: io.timingWindowDays ?? 21, delayMs: io.fnaDelayMs ?? 400 })],
  ["Rally Argentino", ["rally-argentino"], rallyArgentinoSeason],
  ["Nuevo Car Show", ["nuevo-car-show"], (io, previous) => nuevoCarShowSeason(io, previous, { windowDays: io.timingWindowDays ?? 21, delayMs: io.cordobaDelayMs ?? 250 })],
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
    // Dos fuentes de notas de cronograma: SoloTC y el sitio oficial de la ACTC (las seis categorías). Cada una puede fallar sola;
    // sólo si fallan las dos se conservan los horarios anteriores.
    const notes = [];
    const noteErrors = [];
    for (const [label, load] of [["SoloTC", solotcNotes], ["ACTC", actcNotes]]) {
      try {
        notes.push(...(await load(io)));
      } catch (error) {
        noteErrors.push(`${label}: ${error.message}`);
      }
    }
    if (noteErrors.length) failures.push(`Cronogramas (${noteErrors.join("; ")})`);
    if (noteErrors.length === 2) throw new Error(noteErrors.join("; "));
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

/**
 * `skip`: rótulos de SOURCES que no se consultan en esta corrida. Su categoría pasa tal cual de la versión anterior, sin anotar una falla:
 * hoy sólo el Rally en GitHub Actions, donde rallyargentino.com contesta 403 y también a Vercel: lo publica `npm run sync:rally` desde una PC (scripts/sync-rally.mjs).
 */
export async function buildSeason(io, previous = { events: [], standings: {}, meta: {} }, log = () => {}, { skip = [] } = {}) {
  let events = [];
  const standings = {};
  const meta = {};
  const failures = [];

  for (const [label, seriesIds, run] of SOURCES) {
    if (skip.includes(label)) {
      events.push(...previous.events.filter((e) => seriesIds.includes(e.seriesId)));
      for (const id of seriesIds) {
        if (previous.standings?.[id]) standings[id] = previous.standings[id];
        if (previous.meta?.[id]) meta[id] = previous.meta[id];
      }
      continue;
    }
    try {
      const part = await run(io, previous);
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

  // Errores parciales de Córdoba Pista (una sesión o un evento que no se pudo leer; lo ya guardado se conserva).
  for (const error of meta.cordobaPista?.errors ?? []) failures.push(`Córdoba Pista: ${error}`);
  if (skip.includes("Rally Argentino")) {
    // Salteado: el Rally (incluidos `meta.rallyArgentino` y sus fallas, con el estado de Vercel) queda como estaba en la versión anterior.
    const kept = carryRally({ events, standings, meta, failures }, previous);
    meta.rallyArgentino = kept.meta.rallyArgentino;
    failures.splice(0, failures.length, ...kept.failures);
  } else {
    for (const error of meta.rallyArgentino?.errors ?? []) failures.push(`Rally Argentino: ${error}`);
  }
  for (const error of meta.nuevoCarShow?.errors ?? []) failures.push(`Nuevo Car Show: ${error}`);
  for (const error of meta.formulaNacional?.errors ?? []) failures.push(`Fórmula Nacional: ${error}`);

  // Campeonato oficial de la ACTC para las categorías que no tienen otra tabla (el del TC sale de Wikipedia y la carga manual).
  const missingTables = ACTC_CATEGORIES.filter((c) => c.path !== "tc" && !standings[c.seriesId]?.length);
  if (missingTables.length) {
    const acs = await actcStandings(io, missingTables);
    Object.assign(standings, acs.standings);
    for (const [id, m] of Object.entries(acs.meta)) meta[id] = { ...meta[id], ...m };
    failures.push(...acs.failures);
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
    // Lo que se había cargado de un documento de otra categoría o de un corte de la clasificación no lo repone la red de seguridad.
    previous = withoutMisread(previous, timing.misread);
  } catch (error) {
    failures.push(`Tiempos ACTC: ${error.message} (se conservan los resultados anteriores)`);
    events = keepPreviousTiming(events, previous);
    meta.timing = previous.meta?.timing ?? null;
  }

  // Fórmula 1: prácticas y clasificación sprint desde OpenF1.
  try {
    const f1Extra = await openf1Sessions(io, events, previous, { windowDays: io.timingWindowDays ?? 10, delayMs: io.openf1DelayMs ?? 1000 });
    events = f1Extra.events;
    meta.openf1 = f1Extra.meta;
  } catch (error) {
    failures.push(`OpenF1: ${error.message} (se conservan los resultados anteriores)`);
    events = keepPreviousOpenf1(events, previous);
    meta.openf1 = previous.meta?.openf1 ?? null;
  }

  // Fórmula 1: lo que siga sin resultados (prácticas mientras OpenF1 está bloqueado por una sesión en vivo, clasificación, sprint y carrera
  // antes de que Jolpica los publique) sale de la página oficial de resultados.
  const f1Names = [...(standings.f1 ?? []).map((r) => r.driver), ...events.filter((e) => e.seriesId === "f1").flatMap((e) => e.sessions.flatMap((s) => s.results?.map((r) => r.driver) ?? []))];
  try {
    const official = await f1OfficialSessions(io, events, previous, { windowDays: io.timingWindowDays ?? 10, delayMs: io.f1OfficialDelayMs ?? 500, knownNames: f1Names });
    events = official.events;
    meta.f1Official = official.meta.f1Official;
    if (official.meta.f1Official.errors.length) failures.push(`F1 oficial: ${official.meta.f1Official.errors.join("; ")}`);
  } catch (error) {
    failures.push(`F1 oficial: ${error.message} (se conservan los resultados anteriores)`);
    events = keepPreviousF1Official(events, previous);
    meta.f1Official = previous.meta?.f1Official ?? null;
  }

  // Fórmula 1: resúmenes de cada sesión del canal oficial de YouTube.
  try {
    const yt = await f1Videos(io, events, previous, { apiKey: io.youtubeKey ?? process.env.YOUTUBE_API_KEY, windowDays: io.timingWindowDays ?? 21 });
    events = yt.events;
    meta.f1Youtube = yt.meta.f1Youtube;
  } catch (error) {
    failures.push(`YouTube F1: ${error.message} (se conservan los videos anteriores)`);
    events = keepPreviousF1Videos(events, previous);
    meta.f1Youtube = previous.meta?.f1Youtube ?? null;
  }

  // Fórmula 2: clasificaciones oficiales de la FIA para todas las sesiones.
  try {
    const f2Extra = await fiaF2(io, events, previous, {
      windowDays: io.timingWindowDays ?? 10,
      delayMs: io.fiaDelayMs ?? 11000,
      knownNames: [...(standings.f2 ?? []).map((r) => r.driver), ...events.filter((e) => e.seriesId === "f2").flatMap((e) => e.sessions.flatMap((s) => s.results?.map((r) => r.driver) ?? []))],
    });
    events = f2Extra.events;
    meta.fiaF2 = f2Extra.meta;
  } catch (error) {
    failures.push(`FIA F2: ${error.message} (se conservan los resultados anteriores)`);
    events = keepPreviousFia(events, previous);
    meta.fiaF2 = previous.meta?.fiaF2 ?? null;
  }

  // GT World Challenge Europe: horarios y resultados oficiales de cada sesión (pisan las fechas estimadas de Wikipedia).
  try {
    const gt = await gtwcOfficial(io, events, previous, { windowDays: io.timingWindowDays ?? 10, delayMs: io.gtwcDelayMs ?? 300 });
    events = gt.events;
    Object.assign(meta, gt.meta);
    if (gt.meta.gtwcOfficial.errors.length) failures.push(`GT World oficial: ${gt.meta.gtwcOfficial.errors.join("; ")}`);
  } catch (error) {
    failures.push(`GT World oficial: ${error.message} (se conservan los datos anteriores)`);
    events = keepPreviousGtwc(events, previous);
    meta.gtwcOfficial = previous.meta?.gtwcOfficial ?? null;
  }

  // GT World Challenge Europe: transmisión y resumen de cada sesión desde el canal oficial de YouTube (API oficial, si hay clave).
  try {
    const yt = await gtwcYoutube(io, events, previous, { apiKey: io.youtubeKey ?? process.env.YOUTUBE_API_KEY, windowDays: io.timingWindowDays ?? 21 });
    events = yt.events;
    Object.assign(meta, yt.meta);
  } catch (error) {
    failures.push(`YouTube GT World: ${error.message} (se conservan los videos anteriores)`);
    events = keepPreviousYoutube(events, previous);
    meta.gtwcYoutube = previous.meta?.gtwcYoutube ?? null;
  }

  // Turismo Nacional: hora real y clasificación de cada sesión desde el cronometraje (Speedhive), sólo donde falta.
  try {
    const knownNames = [...(standings.tn ?? []).map((r) => r.driver), ...events.filter((e) => e.seriesId === "tn").flatMap((e) => e.sessions.flatMap((s) => s.results?.map((r) => r.driver) ?? []))];
    const sh = await speedhiveTn(io, events, previous, { windowDays: io.timingWindowDays ?? 21, knownNames });
    events = sh.events;
    Object.assign(meta, sh.meta);
    if (sh.meta.speedhiveTn.errors.length) failures.push("Speedhive TN: " + sh.meta.speedhiveTn.errors.join("; "));
  } catch (error) {
    failures.push("Speedhive TN: " + error.message + " (se conservan los datos anteriores)");
    events = keepPreviousSpeedhive(events, previous);
    meta.speedhiveTn = previous.meta?.speedhiveTn ?? null;
  }

  // Red de seguridad final, para todas las categorías: nada que ya teníamos se pierde porque una fuente falló ese día.
  const guarded = protectSeason(events, previous);
  events = guarded.events;
  failures.push(...guarded.warnings, ...protectStandings(standings, meta, previous));

  events.sort((a, b) => new Date(a.sessions[0].start) - new Date(b.sessions[0].start));
  return { generatedAt: new Date().toISOString(), events, standings, meta, failures };
}
