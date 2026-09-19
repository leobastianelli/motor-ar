// Actualiza en la instantánea (src/data/season-2026.json) sólo GT World Challenge Europe desde el sitio oficial: horarios y
// resultados de cada sesión. Es rápido (~1 minuto), a diferencia de `npm run sync:season`, que recorre todas las categorías.
// Uso: npm run sync:gtworld
import fs from "node:fs";
import { gtwcOfficial } from "../src/lib/sources/gtwc-official.mjs";

const UA = { "User-Agent": "fierros-motor-ar/0.1 (leonelbastianelli@gmail.com)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function text(url) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: UA });
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
const result = await gtwcOfficial({ text, sleep }, season.events, season, { windowDays: Number(process.env.TIMING_DAYS ?? 400), delayMs: 300 });
const { meetings, sessions, withResults, errors } = result.meta.gtwcOfficial;
console.log(`${meetings} fechas · ${sessions} sesiones con horario oficial · ${withResults} con resultados`);
for (const error of errors) console.error(`ERROR ${error}`);

season.events = result.events.sort((a, b) => new Date(a.sessions[0].start) - new Date(b.sessions[0].start));
season.meta = { ...season.meta, ...result.meta };
fs.writeFileSync(OUTPUT, JSON.stringify(season, null, 2));
console.log(`→ ${OUTPUT}`);
