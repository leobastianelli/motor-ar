// Orquestación del vigilante: compartida entre scripts/watchdog.mjs (corrida manual, estado en archivo) y GET /api/vigilante (disparado por
// cron-job.org, estado en Neon). Prueba las páginas clave, lee /api/salud y las corridas del sincronizador, y decide con `evaluate` qué avisar.
// No manda a Telegram ni guarda estado por sí sola (eso lo hace cada llamador, con su propio destino): así se puede probar sin efectos.
import { parseDataMeta } from "../salud-core.mjs";
import { emptyState, evaluate } from "./alerts.mjs";
import { renderAlerts, sendTelegram } from "./telegram.mjs";
import { saludFindings, siteFindings, syncFindings } from "./watchdog-checks.mjs";

const PATHS = ["/", "/calendario", "/categorias/tc", "/api/salud"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Una página con hasta 3 intentos: una falla suelta de red no es una caída. */
async function probe(site, path, { fetchImpl = fetch, dry = false } = {}) {
  let last = { path, ok: false, status: null, ms: 0, body: "" };
  for (let attempt = 1; attempt <= 3; attempt++) {
    const t0 = Date.now();
    try {
      const res = await fetchImpl(`${site}${path}`, { headers: { "User-Agent": "fierros-watchdog/0.1" }, signal: AbortSignal.timeout(20_000) });
      const body = path === "/" || path === "/api/salud" ? await res.text() : "";
      last = { path, ok: res.ok, status: res.status, ms: Date.now() - t0, body };
      if (res.ok) return last;
    } catch {
      last = { path, ok: false, status: null, ms: Date.now() - t0, body: "" };
    }
    if (attempt < 3) await sleep(dry ? 500 : 15_000);
  }
  return last;
}

/**
 * Corre una pasada del vigilante contra `site` (origen público, sin barra final) y devuelve qué avisar según `state` (la corrida anterior).
 * `githubToken`+`githubRepo` son opcionales: sin ellos se saltea la revisión del sincronizador y queda anotado en `notes`.
 *
 * @returns { probed, findings, send, resolved, state, notes } — `state` es el que hay que guardar para la próxima corrida.
 */
export async function runWatchdog({ site, now, state, fetchImpl = fetch, githubToken, githubRepo, dry = false }) {
  const probed = await Promise.all(PATHS.map((p) => probe(site, p, { fetchImpl, dry })));
  const notes = [];

  // /api/salud se juzga aparte: no responder no es "el sitio está caído", es "no sabemos qué versión sirve".
  const findings = siteFindings(probed.filter((r) => r.path !== "/api/salud"));
  const saludProbe = probed.find((r) => r.path === "/api/salud");
  let salud = null;
  try {
    if (saludProbe?.ok) salud = JSON.parse(saludProbe.body);
  } catch {
    // Respondió pero no es JSON: cuenta como que no responde.
  }
  // Versión que muestra la home (<meta name="fierros-datos" content="v=…;…">), para compararla con la última del almacén.
  const homeBody = probed.find((r) => r.path === "/")?.body ?? "";
  const homeMeta = homeBody.match(/<meta[^>]+name="fierros-datos"[^>]+content="([^"]*)"/)?.[1];
  const homeVersion = parseDataMeta(homeMeta?.replace(/&amp;/g, "&"))?.v;
  findings.push(...saludFindings(salud, now, { homeVersion }));

  if (githubToken && githubRepo) {
    try {
      const res = await fetchImpl(`https://api.github.com/repos/${githubRepo}/actions/workflows/sync-season.yml/runs?per_page=6&status=completed`, {
        headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json", "User-Agent": "fierros-watchdog/0.1" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`GitHub respondió ${res.status}`);
      findings.push(...syncFindings((await res.json()).workflow_runs ?? [], now));
    } catch (error) {
      notes.push(`No se pudo leer las corridas del sincronizador: ${error.message}`);
    }
  } else {
    notes.push("sin token de GitHub: no se vigila el sincronizador");
  }

  const { send, resolved, state: nextState } = evaluate(findings, state ?? emptyState(), now);
  return { probed, findings, send, resolved, state: nextState, notes };
}

/** Manda los avisos de una corrida (si hay) por Telegram. Separado de runWatchdog para que un --dry pueda mostrarlos sin enviarlos. */
export async function deliverWatchdog({ send, resolved }, { token, chatId } = {}) {
  const text = renderAlerts({ send, resolved });
  if (!text) return { sent: 0, text: null };
  const result = await sendTelegram(text, { token, chatId });
  return { ...result, text };
}
