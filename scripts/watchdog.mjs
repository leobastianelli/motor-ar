// Vigilante: corre cada hora en GitHub Actions, separado del sincronizador. Avisa por Telegram si el sitio se cae o si los datos dejan de sincronizarse.
//   npm run watchdog -- --dry   muestra lo que encontró sin enviar ni guardar estado
// Variables: SITE_URL, GITHUB_TOKEN + GITHUB_REPOSITORY (para leer las corridas del sincronizador), ALERT_STATE, TELEGRAM_*.
import fs from "node:fs";
import { emptyState, evaluate } from "../src/lib/monitor/alerts.mjs";
import { renderAlerts, sendTelegram } from "../src/lib/monitor/telegram.mjs";
import { saludFindings, siteFindings, syncFindings } from "../src/lib/monitor/watchdog-checks.mjs";

const DRY = process.argv.includes("--dry");
const NOW = process.env.WATCHDOG_NOW ?? new Date().toISOString();
const SITE = (process.env.SITE_URL ?? "https://www.somosfierros.ar").replace(/\/$/, "");
const STATE_PATH = process.env.ALERT_STATE ?? ".watchdog-state.json";
const state = fs.existsSync(STATE_PATH) ? JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) : emptyState();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Una página con hasta 3 intentos: una falla suelta de red no es una caída. */
async function probe(path) {
  let last = { path, ok: false, status: null, ms: 0, body: "" };
  for (let attempt = 1; attempt <= 3; attempt++) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${SITE}${path}`, { headers: { "User-Agent": "fierros-watchdog/0.1" }, signal: AbortSignal.timeout(20_000) });
      const body = path === "/" || path === "/api/salud" ? await res.text() : "";
      last = { path, ok: res.ok, status: res.status, ms: Date.now() - t0, body };
      if (res.ok) return last;
    } catch {
      last = { path, ok: false, status: null, ms: Date.now() - t0, body: "" };
    }
    if (attempt < 3) await sleep(DRY ? 500 : 15_000);
  }
  return last;
}

const probed = await Promise.all(["/", "/calendario", "/categorias/tc", "/api/salud"].map(probe));
// /api/salud se juzga aparte: no responder no es "el sitio está caído", es "no sabemos qué versión sirve".
const findings = siteFindings(probed.filter((r) => r.path !== "/api/salud"));
const saludProbe = probed.find((r) => r.path === "/api/salud");
let salud = null;
try {
  if (saludProbe?.ok) salud = JSON.parse(saludProbe.body);
} catch {
  // Respondió pero no es JSON: cuenta como que no responde.
}
findings.push(...saludFindings(salud, NOW));

// Corridas del sincronizador (necesita el token de GitHub; sin él, sólo se vigila el sitio).
if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
  try {
    const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/actions/workflows/sync-season.yml/runs?per_page=6&status=completed`, {
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "fierros-watchdog/0.1" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`GitHub respondió ${res.status}`);
    findings.push(...syncFindings((await res.json()).workflow_runs ?? [], NOW));
  } catch (error) {
    console.error(`No se pudo leer las corridas del sincronizador: ${error.message}`);
  }
} else {
  console.log("(sin GITHUB_TOKEN: no se vigila el sincronizador)");
}

const { send, resolved, state: next } = evaluate(findings, state, NOW);
console.log(`Sitio ${SITE} · hallazgos: ${findings.length} · a avisar: ${send.length} · resueltos: ${resolved.length}`);
for (const f of findings) console.log(`  [${f.severity}] ${f.key} — ${f.title}`);

const text = renderAlerts({ send, resolved });
if (DRY) {
  console.log(text ?? "(nada para avisar)");
  process.exit(0);
}
try {
  if (text) await sendTelegram(text, { token: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID });
} catch (error) {
  console.error(`No se pudo enviar el aviso: ${error.message}`);
  process.exit(1);
}
fs.writeFileSync(STATE_PATH, JSON.stringify(next, null, 2));
