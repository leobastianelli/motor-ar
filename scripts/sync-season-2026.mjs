// Sincronización completa de la temporada. Con DATABASE_URL: parte de la última versión del almacén (Neon), escribe una versión nueva
// (fusionando con lo que otro escritor haya guardado mientras corría) y, si publicó algo, le avisa al sitio con /api/refresh. Sin DATABASE_URL (uso local):
// parte del archivo. En ambos casos regenera src/data/season-2026.json (respaldo y datos de compilación) y drivers-2026.json.
// Uso: npm run sync:season
import fs from "node:fs";
import { carryRally, inActions, RALLY_LABEL } from "../src/lib/rally-refresh-core.mjs";
import { parseDataMeta } from "../src/lib/salud-core.mjs";
import { writeVersion } from "../src/lib/season-store-write.mjs";
import { loadSeason } from "./season-source.mjs";
import { repairMojibake } from "../src/lib/sources/common.mjs";
import { buildDriverIndex } from "../src/lib/sources/driver-index.mjs";
import { mergeOnto } from "../src/lib/sources/season-merge.mjs";
import { buildSeason } from "../src/lib/sources/season.mjs";
import { wikiRawUrl } from "../src/lib/sources/wiki-pages.mjs";

const UA = { "User-Agent": "fierros-motor-ar/0.1 (leonelbastianelli@gmail.com)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Tope por pedido (incluye leer el cuerpo). Sin esto, un servidor que acepta la conexión y no contesta colgaba la sincronización
// entera: el 4/10/2026, con la ACTC dando 502, una corrida quedó 40 min trabada y frenó a las siguientes.
const REQUEST_TIMEOUT_MS = 30_000;
// Sitios que ya no respondieron (dos esperas seguidas agotadas) en esta corrida: el resto de sus pedidos falla en el acto. Con actc.org.ar
// caído (4/10/2026) cada página esperaba 30 s × 4 intentos y la corrida tardaba ~20 min; los resultados salen de otro sitio
// (tiempos.actc.org.ar) y llegaban tarde por esperar a éste. Cada fuente que falla conserva sus datos anteriores, como con cualquier error.
const silentHosts = new Set();
const hostOf = (url) => new URL(url).host;
const isTimeout = (error) => error?.name === "TimeoutError" || error?.name === "AbortError";
const silentError = (url) => new Error(`No se pudo descargar ${url}: ${hostOf(url)} no respondió antes en esta corrida`);

async function text(url, options = {}) {
  if (silentHosts.has(hostOf(url))) throw silentError(url);
  let cause = "sin respuesta";
  let timeouts = 0;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { ...UA, ...options.headers }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (res.ok) return repairMojibake(await res.text());
      cause = `HTTP ${res.status} (${res.headers.get("content-type") ?? "sin content-type"})`;
    } catch (error) {
      cause = isTimeout(error) ? `sin respuesta en ${REQUEST_TIMEOUT_MS / 1000} s` : error.message;
      if (isTimeout(error) && ++timeouts >= 2) {
        silentHosts.add(hostOf(url));
        break;
      }
    }
    await sleep(1500 * attempt);
  }
  throw new Error(`No se pudo descargar ${url}: ${cause}`);
}

async function bytes(url, options = {}) {
  if (silentHosts.has(hostOf(url))) throw silentError(url);
  const res = await fetch(url, { headers: { ...UA, ...options.headers }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${res.status} al pedir ${url}`);
  return res.arrayBuffer();
}

// En el sincronizador se consultan los resultados de toda la temporada (en producción, sólo las fechas recientes).
const io = { text, bytes, json: async (url, options) => JSON.parse(await text(url, options)), wiki: (key) => text(wikiRawUrl(key)), sleep, timingWindowDays: Number(process.env.TIMING_DAYS ?? 400), timingDelayMs: 700 };

const OUTPUT = "src/data/season-2026.json";
const start = await loadSeason(OUTPUT, { requireStore: true });
const previous = start.raw;
console.log(`Se parte de: ${start.label}`);

// rallyargentino.com y su API (Cloudflare) contestan 403 a las IPs de GitHub Actions: ahí el Rally se saltea y se conserva lo que haya escrito el
// script `npm run sync:rally` desde una PC (scripts/sync-rally.mjs; Vercel también recibe 403), sin anotar una falla que no es nuestra. Corriendo en otro lado (local) se consulta normal.
const skipRally = inActions();
if (skipRally) console.log("Rally Argentino: se saltea en GitHub Actions (lo publica npm run sync:rally desde una PC).");
const season = await buildSeason(
  io,
  previous,
  (label, part) => {
    const sessions = part.events.flatMap((e) => e.sessions);
    console.log(
      `${label.padEnd(14)} ${String(part.events.length).padStart(3)} eventos · ${sessions.filter((s) => s.results?.length).length} con resultados · ${sessions.filter((s) => s.timeKnown).length} con horario`,
    );
  },
  { skip: skipRally ? [RALLY_LABEL] : [] },
);
for (const failure of season.failures) console.error(`ERROR ${failure} (se conservan los datos anteriores)`);

// Con almacén: se publica como versión nueva (fusionada con lo que otro escritor haya guardado mientras tanto). `saved` es lo que quedó vigente,
// y es lo que va al archivo de respaldo y al índice de pilotos.
let saved = season;
let published = false;
let vigente = null;
if (start.sql) {
  // Si Vercel escribió una versión mientras esta corrida trabajaba, el Rally que quede es el de esa versión, no el que esta corrida leyó al empezar.
  const reconcile = skipRally ? (candidate, latest) => carryRally(mergeOnto(candidate, latest), latest) : mergeOnto;
  const written = await writeVersion(start.sql, { raw: season, parentId: start.versionId, origin: "sync", reconcile });
  saved = written.raw;
  published = !written.unchanged;
  vigente = written.id;
  console.log(written.unchanged ? `Sin cambios: sigue vigente la versión ${written.id} del almacén.` : `Versión ${written.id} escrita en el almacén.`);
}

fs.writeFileSync(OUTPUT, JSON.stringify(saved, null, 2));
console.log(`\n${season.events.length} eventos → ${OUTPUT}`);

// Índice de pilotos: se completa con lo nuevo y conserva a todos los que ya estaban.
const INDEX = "src/data/drivers-2026.json";
const previousIndex = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, "utf8")) : undefined;
const index = buildDriverIndex(saved, previousIndex);
// El índice lo importa el código, así que cada cambio del archivo es un despliegue: si sólo cambiaría `generatedAt`, no se toca.
if (previousIndex && JSON.stringify(index.drivers) === JSON.stringify(previousIndex.drivers)) {
  console.log(`${index.drivers.length} pilotos, sin cambios → ${INDEX} queda igual`);
} else {
  fs.writeFileSync(INDEX, JSON.stringify(index, null, 2));
  console.log(`${index.drivers.length} pilotos → ${INDEX}`);
}

// Avisa al sitio que hay datos nuevos (revalida las páginas) sólo si hace falta: cada invalidación global regenera de a poco las ~1000 páginas a
// medida que las visitan (y cada regeneración es una escritura de ISR), así que sin cambios no se invalida. Hace falta si esta corrida publicó una
// versión, o si la home todavía sirve otra que la vigente (una corrida anterior escribió y su /api/refresh falló: el reintento lo arregla acá).
// Si falla, la corrida falla: el guardián avisa y no queda una versión escrita que el sitio no muestra sin que nadie se entere.
const site = (process.env.SITE_URL ?? "https://www.somosfierros.ar").replace(/\/$/, "");
async function servedVersion() {
  try {
    const res = await fetch(`${site}/`, { headers: UA, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    const meta = (await res.text()).match(/<meta name="fierros-datos" content="([^"]*)"/);
    return meta ? parseDataMeta(meta[1])?.v ?? null : null;
  } catch {
    return null;
  }
}
const behind = start.sql && !published ? await servedVersion().then((v) => v !== String(vigente)) : false;
if (published || behind) {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("Falta CRON_SECRET: sin él no se puede invalidar el sitio (/api/refresh)");
  const res = await fetch(`${site}/api/refresh`, { headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`/api/refresh respondió ${res.status}: el sitio no se invalidó`);
  console.log(`Sitio invalidado${behind ? " (servía otra versión que la vigente)" : ""} (${site}/api/refresh → ${res.status}).`);
} else if (start.sql) {
  console.log("Sin versión nueva y el sitio ya sirve la vigente: no se invalida.");
}
