// Prueba de humo de un despliegue: verifica el sitio que está en línea, no el repo.
//   node scripts/humo.mjs <url-base> [--telegram]
// Variables: VERCEL_AUTOMATION_BYPASS_SECRET (para entrar a los previews protegidos), TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID (con --telegram,
// avisa si algo falla). Sale con código 1 si algo falla.
import { checkConsistency, checkFreshness, checkNotes, checkPages, checkSalud } from "../src/lib/humo-checks.mjs";
import { sendTelegram } from "../src/lib/monitor/telegram.mjs";

const args = process.argv.slice(2);
const BASE = args.find((a) => !a.startsWith("--"))?.replace(/\/$/, "");
const TELEGRAM = args.includes("--telegram");
if (!BASE) {
  console.error("Uso: node scripts/humo.mjs <url-base> [--telegram]");
  process.exit(2);
}

const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const headers = { "User-Agent": "fierros-humo/0.1", ...(bypass ? { "x-vercel-protection-bypass": bypass } : {}) };
const RETRY_MS = Number(process.env.HUMO_RETRY_MS ?? 30_000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, { headers, redirect: "manual", signal: AbortSignal.timeout(20_000) });
    return { path, status: res.status, ms: Date.now() - t0, body: await res.text() };
  } catch (error) {
    return { path, status: null, ms: Date.now() - t0, body: "", error: error.message };
  }
}

/** Una pasada completa. Devuelve { problems, statuses } para poder repetir la de consistencia una vez. */
async function run() {
  const problems = [];
  const log = (line) => console.log(line);

  const saludRes = await get("/api/salud");
  let salud = null;
  try {
    if (saludRes.status === 200) salud = JSON.parse(saludRes.body);
  } catch {
    // no es JSON: lo informa checkSalud
  }
  problems.push(...checkPages([{ path: "/api/salud", status: saludRes.status }]), ...(saludRes.status === 200 ? checkSalud(salud) : []));
  log(`/api/salud → ${saludRes.status ?? "sin respuesta"} · sirve ${salud?.sirviendo?.servedFrom ?? "?"} v${salud?.sirviendo?.versionId ?? "?"} · almacén v${salud?.almacen?.ultimaVersion ?? "?"}`);
  if (!salud) return { problems, consistencyOnly: false };

  const paths = ["/", "/notas", "/calendario", ...(salud.eventoReciente ? [`/eventos/${salud.eventoReciente}`] : [])];
  if (!salud.eventoReciente) problems.push("/api/salud no informa ningún evento con resultados");
  const pages = await Promise.all(paths.map(get));
  for (const p of pages) log(`${p.path} → ${p.status ?? "sin respuesta"} en ${p.ms} ms`);
  problems.push(...checkPages(pages));

  const html = Object.fromEntries(pages.filter((p) => p.status === 200).map((p) => [p.path, p.body]));
  const consistency = checkConsistency(salud, html);

  // Frescura: la página de cada evento con sesiones recientes nombra al ganador.
  const ganadores = salud.ganadoresRecientes ?? [];
  const eventIds = [...new Set(ganadores.map((g) => g.evento))];
  const eventPages = Object.fromEntries((await Promise.all(eventIds.filter((id) => !html[`/eventos/${id}`]).map((id) => get(`/eventos/${id}`)))).map((p) => [p.path.replace("/eventos/", ""), p]));
  for (const [id, p] of Object.entries(eventPages)) if (p.status !== 200) problems.push(`/eventos/${id} respondió ${p.status ?? "sin respuesta"}`);
  const eventHtml = Object.fromEntries(eventIds.map((id) => [id, html[`/eventos/${id}`] ?? eventPages[id]?.body ?? ""]));
  log(`ganadores recientes: ${ganadores.length} en ${eventIds.length} eventos · crónicas: ${(salud.cronicas ?? []).length}`);
  problems.push(...checkFreshness(ganadores, eventHtml), ...checkNotes(salud.cronicas, html["/notas"] ?? "", html["/"] ?? ""));

  return { problems, consistency };
}

let result = await run();
// Un desfase de versión puede ser una revalidación en curso: un solo reintento a los 30 s, y si sigue igual, falla.
if (result.consistency?.length) {
  console.log(`\nVersiones desparejas (${result.consistency.length}); reintento en ${RETRY_MS / 1000} s por si hay una revalidación en curso…`);
  await sleep(RETRY_MS);
  result = await run();
}
const problems = [...result.problems, ...(result.consistency ?? [])];

if (!problems.length) {
  console.log(`\n✔ Prueba de humo OK: ${BASE}`);
  process.exit(0);
}
console.error(`\n✘ Prueba de humo FALLÓ en ${BASE}:`);
for (const p of problems) console.error(`  - ${p}`);
if (TELEGRAM) {
  try {
    await sendTelegram(`🚨 Fierros: la prueba de humo falló en producción\n${BASE}\n\n${problems.map((p) => `• ${p}`).join("\n")}`, {
      token: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID,
    });
  } catch (error) {
    console.error(`No se pudo enviar el aviso: ${error.message}`);
  }
}
process.exit(1);
