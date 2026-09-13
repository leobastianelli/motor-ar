// Temporada 2026 de todas las categorías con fuente real. Escribe src/data/season-2026.json.
// Si una fuente falla, conserva los datos anteriores de esa categoría.
// Uso: node scripts/fetch-wiki.mjs && node scripts/sync-season-2026.mjs
import fs from "node:fs";
import { actcSeason } from "./season/actc.mjs";
import { apatSeason } from "./season/apat.mjs";
import { f1Season } from "./season/f1.mjs";
import { f2Season } from "./season/f2.mjs";
import { indycarSeason } from "./season/indycar.mjs";
import { nascarSeason } from "./season/nascar.mjs";
import { tc2000Season } from "./season/tc2000.mjs";

const OUTPUT = "src/data/season-2026.json";
const previous = fs.existsSync(OUTPUT) ? JSON.parse(fs.readFileSync(OUTPUT, "utf8")) : { events: [], standings: {}, meta: {} };

const SOURCES = [
  ["F1", ["f1"], f1Season],
  ["F2", ["f2"], f2Season],
  ["IndyCar", ["indycar"], indycarSeason],
  ["NASCAR", ["nascar"], nascarSeason],
  ["TC y TC Pista", ["tc", "tc-pista"], actcSeason],
  ["TN APAT", ["tn"], apatSeason],
  ["TC2000", ["tc2000"], tc2000Season],
];

const events = [];
const standings = {};
const meta = {};
let failures = 0;

for (const [label, seriesIds, run] of SOURCES) {
  try {
    const part = await run();
    events.push(...part.events);
    Object.assign(standings, part.standings);
    Object.assign(meta, part.meta);
    const sessions = part.events.flatMap((e) => e.sessions);
    console.log(
      `${label.padEnd(14)} ${String(part.events.length).padStart(3)} eventos · ${sessions.filter((s) => s.results?.length).length} sesiones con resultados · campeonato: ${Object.values(part.standings).map((s) => s.length).join("/")}`,
    );
  } catch (error) {
    failures++;
    console.error(`${label.padEnd(14)} ERROR: ${error.message} (se conservan los datos anteriores)`);
    events.push(...previous.events.filter((e) => seriesIds.includes(e.seriesId)));
    for (const id of seriesIds) {
      if (previous.standings[id]) standings[id] = previous.standings[id];
      if (previous.meta[id]) meta[id] = previous.meta[id];
    }
  }
}

events.sort((a, b) => new Date(a.sessions[0].start) - new Date(b.sessions[0].start));
fs.writeFileSync(OUTPUT, JSON.stringify({ generatedAt: new Date().toISOString(), events, standings, meta }, null, 2));
console.log(`\n${events.length} eventos en total → ${OUTPUT}${failures ? ` (${failures} fuentes con error)` : ""}`);
