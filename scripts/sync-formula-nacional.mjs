// Actualiza en la instantánea (src/data/season-2026.json) sólo la Fórmula Nacional Argentina: calendario, horarios, tiempos de cada sesión y
// campeonato desde formulanacional.com.ar, con la misma red de seguridad que la sincronización completa (nada de lo ya cargado se pierde).
// También completa el índice de pilotos. Es rápido (~1 minuto, con pausa entre pedidos).
// Uso: npm run sync:fna
import fs from "node:fs";
import { repairMojibake } from "../src/lib/sources/common.mjs";
import { buildDriverIndex } from "../src/lib/sources/driver-index.mjs";
import { formulaNacionalSeason } from "../src/lib/sources/formula-nacional.mjs";
import { protectSeason, protectStandings } from "../src/lib/sources/guard.mjs";

const UA = { "User-Agent": "fierros-motor-ar/0.1 (leonelbastianelli@gmail.com)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SERIES = "formula-nacional";

async function text(url, options = {}) {
  let cause = "sin respuesta";
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { ...UA, ...options.headers }, signal: AbortSignal.timeout(30_000) });
      if (res.ok) return repairMojibake(await res.text());
      cause = `HTTP ${res.status} (${res.headers.get("content-type") ?? "sin content-type"})`;
    } catch (error) {
      cause = error.message;
    }
    await sleep(1500 * attempt);
  }
  throw new Error(`No se pudo descargar ${url}: ${cause}`);
}

const OUTPUT = "src/data/season-2026.json";
const season = JSON.parse(fs.readFileSync(OUTPUT, "utf8"));
const io = { text, sleep };

const part = await formulaNacionalSeason(io, season, { windowDays: Number(process.env.TIMING_DAYS ?? 400), delayMs: 700 });
let events = [...season.events.filter((e) => e.seriesId !== SERIES), ...part.events];
Object.assign(season.standings, part.standings);
Object.assign(season.meta, part.meta);

// Red de seguridad: ninguna fecha ni resultado ya cargado desaparece porque el sitio respondió a medias.
const guarded = protectSeason(events, season);
events = guarded.events;
const warnings = [...guarded.warnings, ...protectStandings(season.standings, season.meta, season)];

const mine = events.filter((e) => e.seriesId === SERIES);
const sessions = mine.flatMap((e) => e.sessions);
console.log(`Fórmula Nacional: ${mine.length} fechas · ${sessions.filter((s) => s.results?.length).length} sesiones con resultados · ${sessions.filter((s) => s.timeKnown).length} con horario · campeonato de ${season.standings[SERIES]?.length ?? 0} pilotos`);
for (const e of part.meta.formulaNacional.errors) console.error(`ERROR ${e}`);
for (const n of part.meta[SERIES].notes ?? []) console.warn(`NOTA ${n}`);
for (const w of warnings) console.warn(`AVISO ${w}`);

season.events = events.sort((a, b) => new Date(a.sessions[0].start) - new Date(b.sessions[0].start));
fs.writeFileSync(OUTPUT, JSON.stringify(season, null, 2));
console.log(`→ ${OUTPUT}`);

const INDEX = "src/data/drivers-2026.json";
const previousIndex = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, "utf8")) : undefined;
const index = buildDriverIndex(season, previousIndex);
if (previousIndex && JSON.stringify(index.drivers) === JSON.stringify(previousIndex.drivers)) console.log(`${index.drivers.length} pilotos, sin cambios → ${INDEX} queda igual`);
else {
  fs.writeFileSync(INDEX, JSON.stringify(index, null, 2));
  console.log(`${index.drivers.length} pilotos → ${INDEX}`);
}
