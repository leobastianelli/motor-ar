// Temporada 2026 de todas las categorías con fuente real. Si una fuente falla, se conservan sus datos anteriores.
import { actcSeason } from "./actc.mjs";
import { apatSeason } from "./apat.mjs";
import { f1Season } from "./f1.mjs";
import { f2Season } from "./f2.mjs";
import { indycarSeason } from "./indycar.mjs";
import { nascarSeason } from "./nascar.mjs";
import { tc2000Season } from "./tc2000.mjs";

const SOURCES = [
  ["F1", ["f1"], f1Season],
  ["F2", ["f2"], f2Season],
  ["IndyCar", ["indycar"], indycarSeason],
  ["NASCAR", ["nascar"], nascarSeason],
  ["TC y TC Pista", ["tc", "tc-pista"], actcSeason],
  ["TN APAT", ["tn"], apatSeason],
  ["TC2000", ["tc2000"], tc2000Season],
];

export async function buildSeason(io, previous = { events: [], standings: {}, meta: {} }, log = () => {}) {
  const events = [];
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

  events.sort((a, b) => new Date(a.sessions[0].start) - new Date(b.sessions[0].start));
  return { generatedAt: new Date().toISOString(), events, standings, meta, failures };
}
