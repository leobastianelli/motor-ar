// Actualiza en la instantánea local (src/data/season-2026.json) sólo Córdoba Pista: calendario, horarios reales y resultados de las siete clases
// desde el cronometraje de la FRAD (Speedhive), y el campeonato que calcula Fierros. Es rápido (~1 minuto con toda la temporada).
// NO toca el almacén de producción (Neon): sólo lee y escribe archivos, como `sync:tn`. La sincronización completa (`sync:season`, en GitHub Actions)
// es la que escribe el almacén; ésta sirve para probar la fuente en local y para ver las páginas con `next dev`.
// Uso: npm run sync:cordoba
import fs from "node:fs";
import { cordobaPistaSeason } from "../src/lib/sources/cordoba-pista.mjs";
import { repairMojibake } from "../src/lib/sources/common.mjs";
import { buildDriverIndex } from "../src/lib/sources/driver-index.mjs";
import { protectSeason } from "../src/lib/sources/guard.mjs";

if (process.env.DATABASE_URL) console.warn("Aviso: hay DATABASE_URL en el entorno, pero este script no lo usa (no escribe en el almacén).");

const UA = { "User-Agent": "fierros-motor-ar/0.1 (leonelbastianelli@gmail.com)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function text(url, options = {}) {
  let cause = "sin respuesta";
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { ...UA, ...options.headers } });
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
const INDEX = "src/data/drivers-2026.json";
const season = JSON.parse(fs.readFileSync(OUTPUT, "utf8"));
const io = { text, json: async (url, options) => JSON.parse(await text(url, options)), sleep };
const windowDays = Number(process.env.TIMING_DAYS ?? 400);

const cp = await cordobaPistaSeason(io, season, { windowDays, delayMs: 250 });
const others = season.events.filter((e) => e.seriesId !== "cordoba-pista");
// Misma red de seguridad que la sincronización completa: nada de lo que ya estaba se pierde.
const guarded = protectSeason([...others, ...cp.events], season);
season.events = guarded.events.sort((a, b) => new Date(a.sessions[0].start) - new Date(b.sessions[0].start));
season.meta = { ...season.meta, ...cp.meta };
season.generatedAt = new Date().toISOString();
fs.writeFileSync(OUTPUT, JSON.stringify(season, null, 2));

const sessions = cp.events.flatMap((e) => e.sessions);
console.log(`Córdoba Pista: ${cp.events.length} fechas · ${sessions.length} sesiones · ${sessions.filter((s) => s.results?.length).length} con resultados`);
for (const e of cp.events) console.log(`  Fecha ${e.round} · ${e.circuit.city} · ${e.sessions.length} sesiones`);
for (const [id, c] of Object.entries(cp.meta["cordoba-pista"].clases)) {
  console.log(`  ${id.padEnd(8)} ${c.status === "calculado" ? `campeonato calculado tras la fecha ${c.asOfRound} (${c.rows.length} pilotos, líder ${c.rows[0].driver} ${c.rows[0].points} pts)` : "sin campeonato publicado"}`);
}
for (const error of cp.meta.cordobaPista.errors) console.error(`ERROR ${error}`);
for (const w of guarded.warnings) console.warn(`AVISO ${w}`);
console.log(`→ ${OUTPUT}`);

// Índice de pilotos (lo lee el sitio para las fichas automáticas).
const previousIndex = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, "utf8")) : undefined;
const index = buildDriverIndex(season, previousIndex);
fs.writeFileSync(INDEX, JSON.stringify(index, null, 2));
console.log(`${index.drivers.length} pilotos → ${INDEX}`);
