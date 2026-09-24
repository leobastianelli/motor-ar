// Sincronización completa de la temporada. Con DATABASE_URL: parte de la última versión del almacén (Neon), escribe una versión nueva
// (fusionando con lo que otro escritor haya guardado mientras corría) y le avisa al sitio con /api/refresh. Sin DATABASE_URL (uso local):
// parte del archivo. En ambos casos regenera src/data/season-2026.json (respaldo y datos de compilación) y drivers-2026.json.
// Uso: npm run sync:season
import fs from "node:fs";
import { writeVersion } from "../src/lib/season-store-write.mjs";
import { loadSeason } from "./season-source.mjs";
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
const start = await loadSeason(OUTPUT, { requireStore: true });
const previous = start.raw;
console.log(`Se parte de: ${start.label}`);

const season = await buildSeason(io, previous, (label, part) => {
  const sessions = part.events.flatMap((e) => e.sessions);
  console.log(
    `${label.padEnd(14)} ${String(part.events.length).padStart(3)} eventos · ${sessions.filter((s) => s.results?.length).length} con resultados · ${sessions.filter((s) => s.timeKnown).length} con horario`,
  );
});
for (const failure of season.failures) console.error(`ERROR ${failure} (se conservan los datos anteriores)`);

// Con almacén: se publica como versión nueva (fusionada con lo que otro escritor haya guardado mientras tanto). `saved` es lo que quedó vigente,
// y es lo que va al archivo de respaldo y al índice de pilotos.
let saved = season;
if (start.sql) {
  const written = await writeVersion(start.sql, { raw: season, parentId: start.versionId, origin: "sync" });
  saved = written.raw;
  console.log(written.unchanged ? `Sin cambios: sigue vigente la versión ${written.id} del almacén.` : `Versión ${written.id} escrita en el almacén.`);
}

fs.writeFileSync(OUTPUT, JSON.stringify(saved, null, 2));
console.log(`\n${season.events.length} eventos → ${OUTPUT}`);

// Índice de pilotos: se completa con lo nuevo y conserva a todos los que ya estaban.
const INDEX = "src/data/drivers-2026.json";
const previousIndex = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, "utf8")) : undefined;
const index = buildDriverIndex(saved, previousIndex);
fs.writeFileSync(INDEX, JSON.stringify(index, null, 2));
console.log(`${index.drivers.length} pilotos → ${INDEX}`);

// Avisa al sitio que hay datos vigentes (revalida las páginas). Si falla, la corrida falla: el guardián avisa y no queda una versión escrita
// que el sitio no muestra sin que nadie se entere.
if (start.sql) {
  const site = (process.env.SITE_URL ?? "https://www.somosfierros.ar").replace(/\/$/, "");
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("Falta CRON_SECRET: sin él no se puede invalidar el sitio (/api/refresh)");
  const res = await fetch(`${site}/api/refresh`, { headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`/api/refresh respondió ${res.status}: el sitio no se invalidó`);
  console.log(`Sitio invalidado (${site}/api/refresh → ${res.status}).`);
}
