// Rally Argentino desde una PC: rallyargentino.com y su API (Cloudflare) contestan 403 a GitHub Actions y a Vercel (probado el 4/10/2026), así que
// esta fuente no puede correr en la nube. Este script trae calendario, resultados y campeonato desde acá y publica una versión del almacén (Neon)
// que toca sólo el Rally, con las mismas protecciones que la sincronización (nunca se achica). La sincronización de GitHub conserva lo que deja.
// Uso: npm run sync:rally (después de cada fecha). Necesita DATABASE_URL en .env.local; con CRON_SECRET además invalida el sitio.
import { mergeRally, RALLY } from "../src/lib/rally-refresh-core.mjs";
import { readLatest, writeVersion } from "../src/lib/season-store-write.mjs";
import { repairMojibake } from "../src/lib/sources/common.mjs";
import { rallyArgentinoSeason } from "../src/lib/sources/rally-argentino.mjs";
import { connect } from "./season-source.mjs";

const UA = { "User-Agent": "fierros-motor-ar/0.1 (leonelbastianelli@gmail.com)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function text(url, options = {}) {
  let cause = "sin respuesta";
  for (let attempt = 1; attempt <= 3; attempt++) {
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
const io = { text, json: async (url, options) => JSON.parse(await text(url, options)), sleep };

const sql = await connect();
if (!sql) throw new Error("Falta DATABASE_URL (correlo con: npm run sync:rally, que carga .env.local)");
const latest = await readLatest(sql);
if (!latest) throw new Error("El almacén no tiene versiones");
console.log(`Se parte de la versión ${latest.id}.`);

const part = await rallyArgentinoSeason(io, latest.raw, { delayMs: 200 });
const errors = part.meta.rallyArgentino?.errors ?? [];
const sessions = part.events.flatMap((e) => e.sessions);
console.log(`Rally Argentino: ${part.events.length} fechas · ${sessions.filter((s) => s.results?.length).length} sesiones con resultados`);
for (const [id, c] of Object.entries(part.meta[RALLY]?.clases ?? {})) console.log(`  ${id}: ${c.status}${c.asOfRound ? ` tras la fecha ${c.asOfRound}` : ""}${c.rows?.[0] ? ` · lidera ${c.rows[0].driver}` : ""}`);
for (const e of errors) console.error(`ERROR ${e}`);
if (errors.some((e) => /HTTP 403/.test(e))) throw new Error("rallyargentino.com contestó 403 también desde acá: no se publica nada");

const at = new Date().toISOString();
const result = mergeRally(latest.raw, part, { at });
if (!result.write) {
  console.log(`Sin cambios: sigue vigente la versión ${latest.id}.`);
  process.exit(0);
}
// Si otro escritor entró mientras tanto, se parte de su versión y se le pone encima sólo el Rally de esta corrida.
const reconcile = (candidate, newer) =>
  mergeRally(
    newer,
    {
      events: candidate.events.filter((e) => e.seriesId === RALLY),
      standings: candidate.standings?.[RALLY] ? { [RALLY]: candidate.standings[RALLY] } : {},
      meta: { [RALLY]: candidate.meta[RALLY], rallyArgentino: candidate.meta.rallyArgentino },
    },
    { at },
  ).raw;
const written = await writeVersion(sql, { raw: result.raw, parentId: latest.id, origin: "sync", reconcile });
console.log(written.unchanged ? `Sin cambios: sigue vigente la versión ${written.id}.` : `Versión ${written.id} escrita en el almacén.`);

const secret = process.env.CRON_SECRET;
if (!written.unchanged) {
  if (!secret) console.log('Sin CRON_SECRET: el sitio lo muestra cuando corra la próxima sincronización (o: gh workflow run "Sincronizar temporada").');
  else {
    const site = (process.env.SITE_URL ?? "https://www.somosfierros.ar").replace(/\/$/, "");
    const res = await fetch(`${site}/api/refresh`, { headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(60_000) });
    console.log(`Sitio invalidado (${site}/api/refresh → ${res.status}).`);
  }
}
