// Actualiza en la instantánea (src/data/season-2026.json) sólo GT World Challenge Europe: horarios y resultados de cada sesión
// desde el sitio oficial y, si hay YOUTUBE_API_KEY (en .env.local), la transmisión y el resumen de cada una desde el canal @GTWorld. Es rápido (~1 minuto), a diferencia de `npm run sync:season`, que recorre todas las categorías.
// Uso: npm run sync:gtworld
import fs from "node:fs";
import { gtwcOfficial } from "../src/lib/sources/gtwc-official.mjs";
import { gtwcYoutube } from "../src/lib/sources/gtwc-youtube.mjs";

try {
  process.loadEnvFile(".env.local");
} catch {
  // sin .env.local: sigue sin YouTube
}

const UA = { "User-Agent": "fierros-motor-ar/0.1 (leonelbastianelli@gmail.com)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function text(url, options = {}) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { ...UA, ...options.headers } });
      if (res.ok) return await res.text();
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
const result = await gtwcOfficial(io, season.events, season, { windowDays, delayMs: 300 });
const { meetings, sessions, withResults, errors } = result.meta.gtwcOfficial;
console.log(`${meetings} fechas · ${sessions} sesiones con horario oficial · ${withResults} con resultados`);
for (const error of errors) console.error(`ERROR ${error}`);

const yt = await gtwcYoutube(io, result.events, season, { apiKey: process.env.YOUTUBE_API_KEY, windowDays });
result.events = yt.events;
result.meta = { ...result.meta, ...yt.meta };
console.log(yt.meta.gtwcYoutube.skipped ? `YouTube: ${yt.meta.gtwcYoutube.skipped}` : `YouTube: ${yt.meta.gtwcYoutube.scanned} videos leídos · ${yt.meta.gtwcYoutube.sessions} sesiones con video`);

season.events = result.events.sort((a, b) => new Date(a.sessions[0].start) - new Date(b.sessions[0].start));
season.meta = { ...season.meta, ...result.meta };
fs.writeFileSync(OUTPUT, JSON.stringify(season, null, 2));
console.log(`→ ${OUTPUT}`);
