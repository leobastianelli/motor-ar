// Fórmula Nacional Argentina desde una PC: formulanacional.com.ar está detrás de Cloudflare y le contesta 403 a GitHub Actions, así que esta fuente no
// puede correr en la nube (desde una conexión hogareña, 200). Este script trae calendario, horarios, tiempos de cada sesión y campeonato desde acá y
// publica una versión del almacén (Neon) que toca sólo la Fórmula Nacional, con las mismas protecciones que la sincronización (nunca se achica).
// La sincronización de GitHub la saltea y conserva lo que deja. Es rápido (~1 minuto, con pausa entre pedidos).
// Uso: npm run sync:fna (después de cada fecha). Necesita DATABASE_URL en .env.local; con CRON_SECRET invalida el sitio; sin él dispara la sincronización de GitHub (scripts/avisar-sitio.mjs).
//      npm run sync:fna -- --json  sólo escribe src/data/season-2026.json y drivers-2026.json (sin Neon): para probar o si no hay almacén.
import fs from "node:fs";
import { FNA, fnaRefresh } from "../src/lib/fna-refresh-core.mjs";
import { readLatest, writeVersion } from "../src/lib/season-store-write.mjs";
import { repairMojibake } from "../src/lib/sources/common.mjs";
import { buildDriverIndex } from "../src/lib/sources/driver-index.mjs";
import { formulaNacionalSeason } from "../src/lib/sources/formula-nacional.mjs";
import { protectSeason, protectStandings } from "../src/lib/sources/guard.mjs";
import { avisarSitio } from "./avisar-sitio.mjs";
import { connect } from "./season-source.mjs";

const UA = { "User-Agent": "fierros-motor-ar/0.1 (leonelbastianelli@gmail.com)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jsonOnly = process.argv.includes("--json");

async function text(url, options = {}) {
  let cause = "sin respuesta";
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { ...UA, ...options.headers }, signal: AbortSignal.timeout(30_000) });
      if (res.ok) return repairMojibake(await res.text());
      cause = `HTTP ${res.status} (${res.headers.get("content-type") ?? "sin content-type"})`;
      if (res.status === 403 || res.status === 404) break;
    } catch (error) {
      cause = error.message;
    }
    await sleep(1500 * attempt);
  }
  throw new Error(`No se pudo descargar ${url}: ${cause}`);
}
const io = { text, sleep };
const options = { windowDays: Number(process.env.TIMING_DAYS ?? 400), delayMs: 700 };

function report(part, events, standings) {
  const mine = events.filter((e) => e.seriesId === FNA);
  const sessions = mine.flatMap((e) => e.sessions);
  console.log(`Fórmula Nacional: ${mine.length} fechas · ${sessions.filter((s) => s.results?.length).length} sesiones con resultados · ${sessions.filter((s) => s.timeKnown).length} con horario · campeonato de ${standings[FNA]?.length ?? 0} pilotos`);
  for (const e of part.meta.formulaNacional.errors) console.error(`ERROR ${e}`);
  for (const n of part.meta[FNA].notes ?? []) console.warn(`NOTA ${n}`);
}

// ------------------------------------------------------------------------------------------------------- sólo los JSON (--json)
async function writeJson() {
  const OUTPUT = "src/data/season-2026.json";
  const season = JSON.parse(fs.readFileSync(OUTPUT, "utf8"));
  const part = await formulaNacionalSeason(io, season, options);
  let events = [...season.events.filter((e) => e.seriesId !== FNA), ...part.events];
  Object.assign(season.standings, part.standings);
  Object.assign(season.meta, part.meta);

  // Red de seguridad: ninguna fecha ni resultado ya cargado desaparece porque el sitio respondió a medias.
  const guarded = protectSeason(events, season);
  events = guarded.events;
  const warnings = [...guarded.warnings, ...protectStandings(season.standings, season.meta, season)];
  report(part, events, season.standings);
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
}

// ------------------------------------------------------------------------------------------------------- publicar en Neon (lo normal)
async function publish() {
  const sql = await connect();
  if (!sql) throw new Error("Falta DATABASE_URL (correlo con: npm run sync:fna, que carga .env.local; o con --json para escribir sólo los archivos)");
  const latest = await readLatest(sql);
  if (!latest) throw new Error("El almacén no tiene versiones");
  console.log(`Se parte de la versión ${latest.id}.`);

  const part = await formulaNacionalSeason(io, latest.raw, options);
  report(part, part.events, part.standings);
  const errors = part.meta.formulaNacional.errors;
  if (errors.some((e) => /HTTP 403/.test(e))) throw new Error("formulanacional.com.ar contestó 403 también desde acá: no se publica nada");

  const at = new Date().toISOString();
  const result = fnaRefresh.merge(latest.raw, part, { at });
  if (!result.write) {
    console.log(`Sin cambios: sigue vigente la versión ${latest.id}.`);
    return;
  }
  // Si otro escritor entró mientras tanto, se parte de su versión y se le pone encima sólo la Fórmula Nacional de esta corrida.
  const written = await writeVersion(sql, { raw: result.raw, parentId: latest.id, origin: "sync", reconcile: fnaRefresh.reconcile(at) });
  console.log(written.unchanged ? `Sin cambios: sigue vigente la versión ${written.id}.` : `Versión ${written.id} escrita en el almacén.`);

  if (written.unchanged) return;
  await avisarSitio();
}

await (jsonOnly ? writeJson() : publish());
