// Actualiza en la instantánea (src/data/season-2026.json) sólo el Turismo Nacional: calendario, resultados y campeonato de APAT
// y, encima, hora real y clasificación de cada sesión desde el cronometraje (Speedhive) donde falte. Es rápido (~2 minutos).
// Uso: npm run sync:tn
import fs from "node:fs";
import { apatSeason } from "../src/lib/sources/apat.mjs";
import { repairMojibake } from "../src/lib/sources/common.mjs";
import { speedhiveTn } from "../src/lib/sources/speedhive-tn.mjs";

const UA = { "User-Agent": "fierros-motor-ar/0.1 (leonelbastianelli@gmail.com)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function text(url, options = {}) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { ...UA, ...options.headers } });
      if (res.ok) return repairMojibake(await res.text());
    } catch {
      // reintento
    }
    await sleep(1500 * attempt);
  }
  throw new Error(`No se pudo descargar ${url}`);
}

const OUTPUT = "src/data/season-2026.json";
const season = JSON.parse(fs.readFileSync(OUTPUT, "utf8"));
const io = { text, json: async (url, options) => JSON.parse(await text(url, options)), sleep };
const windowDays = Number(process.env.TIMING_DAYS ?? 400);

const apat = await apatSeason({ ...io, timingWindowDays: windowDays }, season);
let events = [...season.events.filter((e) => e.seriesId !== "tn"), ...apat.events];
Object.assign(season.standings, apat.standings);
Object.assign(season.meta, apat.meta);

const knownNames = [...(season.standings.tn ?? []).map((r) => r.driver), ...events.filter((e) => e.seriesId === "tn").flatMap((e) => e.sessions.flatMap((s) => s.results?.map((r) => r.driver) ?? []))];
const sh = await speedhiveTn(io, events, season, { windowDays, delayMs: 250, knownNames });
events = sh.events;
season.meta = { ...season.meta, ...sh.meta };
const { filledResults, realTimes, addedSessions, errors } = sh.meta.speedhiveTn;
console.log(`TN: ${apat.events.length} fechas de APAT · Speedhive: ${realTimes} horarios reales, ${filledResults} resultados, ${addedSessions} sesiones agregadas`);
for (const error of errors) console.error(`ERROR ${error}`);

season.events = events.sort((a, b) => new Date(a.sessions[0].start) - new Date(b.sessions[0].start));
fs.writeFileSync(OUTPUT, JSON.stringify(season, null, 2));
console.log(`→ ${OUTPUT}`);
