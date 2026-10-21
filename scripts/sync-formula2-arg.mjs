// Actualiza en la instantánea local (src/data/season-2026.json) sólo la Fórmula 2 Argentina: calendario, resultados de cada sesión y campeonato
// desde formula2.com.ar. Es rápido (~20 s con toda la temporada).
// NO toca el almacén de producción (Neon): sólo lee y escribe archivos, como `sync:cordoba`. La sincronización completa (`sync:season`, en GitHub Actions)
// es la que escribe el almacén; ésta sirve para probar la fuente en local y para ver las páginas con `next dev`.
// Uso: npm run sync:f2arg
import fs from "node:fs";
import { formula2ArgSeason } from "../src/lib/sources/formula2-arg.mjs";
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
      const res = await fetch(url, { headers: { ...UA, ...options.headers }, signal: AbortSignal.timeout(30_000) });
      if (res.ok) return repairMojibake(await res.text());
      cause = `HTTP ${res.status} (${res.headers.get("content-type") ?? "sin content-type"})`;
      if (res.status === 404) break; // una página que no existe no mejora reintentando
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

const f2 = await formula2ArgSeason(io, season, { windowDays, delayMs: 400 });
const others = season.events.filter((e) => e.seriesId !== "f2-arg");
// Misma red de seguridad que la sincronización completa: nada de lo que ya estaba se pierde.
const guarded = protectSeason([...others, ...f2.events], season);
season.events = guarded.events.sort((a, b) => new Date(a.sessions[0].start) - new Date(b.sessions[0].start));
season.standings = { ...season.standings, ...f2.standings };
season.meta = { ...season.meta, ...f2.meta };
season.generatedAt = new Date().toISOString();
fs.writeFileSync(OUTPUT, JSON.stringify(season, null, 2));

const meta = f2.meta["f2-arg"];
const sessions = f2.events.flatMap((e) => e.sessions);
console.log(`Fórmula 2 Argentina: ${f2.events.length} fechas · ${sessions.length} sesiones · ${sessions.filter((s) => s.results?.length).length} con resultados`);
for (const e of f2.events) {
  const final = e.sessions.find((s) => s.kind === "final")?.results?.[0];
  console.log(`  Fecha ${e.round} · ${e.circuit.city} · ${e.sessions.filter((s) => s.results?.length).length}/${e.sessions.length} con resultados${final ? ` · final: ${final.driver}` : ""}`);
}
const tabla = f2.standings["f2-arg"];
console.log(`  campeonato: ${tabla.length} pilotos${tabla[0] ? `, líder ${tabla[0].driver} ${tabla[0].points} pts` : ""} (tabla tras la fecha ${meta.standingsAsOfRound ?? "?"})`);
for (const note of meta.notes) console.warn(`NOTA ${note}`);
for (const error of meta.errors) console.error(`ERROR ${error}`);
for (const w of guarded.warnings) console.warn(`AVISO ${w}`);
console.log(`→ ${OUTPUT}`);

// Índice de pilotos (lo lee el sitio para las fichas automáticas).
const previousIndex = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, "utf8")) : undefined;
const index = buildDriverIndex(season, previousIndex);
fs.writeFileSync(INDEX, JSON.stringify(index, null, 2));
console.log(`${index.drivers.length} pilotos → ${INDEX}`);
