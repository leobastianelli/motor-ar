// Regenera la instantánea src/data/season-2026.json (respaldo del sitio y datos de compilación).
// El sitio en producción refresca estos datos solo; este script sirve para actualizar el repo.
// Uso: npm run sync:season
import fs from "node:fs";
import { repairMojibake } from "../src/lib/sources/common.mjs";
import { buildDriverIndex } from "../src/lib/sources/driver-index.mjs";
import { buildSeason } from "../src/lib/sources/season.mjs";
import { wikiRawUrl } from "../src/lib/sources/wiki-pages.mjs";

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

async function bytes(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} al pedir ${url}`);
  return res.arrayBuffer();
}

// En el sincronizador se consultan los resultados de toda la temporada (en producción, sólo las fechas recientes).
const io = { text, bytes, json: async (url, options) => JSON.parse(await text(url, options)), wiki: (key) => text(wikiRawUrl(key)), sleep, timingWindowDays: Number(process.env.TIMING_DAYS ?? 400), timingDelayMs: 700 };

const OUTPUT = "src/data/season-2026.json";
const previous = fs.existsSync(OUTPUT) ? JSON.parse(fs.readFileSync(OUTPUT, "utf8")) : undefined;

const season = await buildSeason(io, previous, (label, part) => {
  const sessions = part.events.flatMap((e) => e.sessions);
  console.log(
    `${label.padEnd(14)} ${String(part.events.length).padStart(3)} eventos · ${sessions.filter((s) => s.results?.length).length} con resultados · ${sessions.filter((s) => s.timeKnown).length} con horario`,
  );
});
for (const failure of season.failures) console.error(`ERROR ${failure} (se conservan los datos anteriores)`);

fs.writeFileSync(OUTPUT, JSON.stringify(season, null, 2));
console.log(`\n${season.events.length} eventos → ${OUTPUT}`);

// Índice de pilotos: se completa con lo nuevo y conserva a todos los que ya estaban.
const INDEX = "src/data/drivers-2026.json";
const previousIndex = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, "utf8")) : undefined;
const index = buildDriverIndex(season, previousIndex);
fs.writeFileSync(INDEX, JSON.stringify(index, null, 2));
console.log(`${index.drivers.length} pilotos → ${INDEX}`);
