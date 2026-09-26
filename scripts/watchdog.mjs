// Vigilante manual: hace lo mismo que GET /api/vigilante (ver src/app/api/vigilante/route.ts), pero contra el archivo .watchdog-state.json
// en vez de Neon. Sirve para correrlo a mano o revisar hallazgos con --dry; el aviso "de verdad" (cada 30 min) lo dispara cron-job.org contra
// el endpoint, no este script (ver .github/workflows/watchdog.yml).
//   npm run watchdog -- --dry   muestra lo que encontró sin enviar ni guardar estado
// Variables: SITE_URL, GITHUB_TOKEN + GITHUB_REPOSITORY (para leer las corridas del sincronizador), ALERT_STATE, TELEGRAM_*.
import fs from "node:fs";
import { emptyState } from "../src/lib/monitor/alerts.mjs";
import { deliverWatchdog, runWatchdog } from "../src/lib/monitor/watchdog-run.mjs";

const DRY = process.argv.includes("--dry");
const NOW = process.env.WATCHDOG_NOW ?? new Date().toISOString();
const SITE = (process.env.SITE_URL ?? "https://www.somosfierros.ar").replace(/\/$/, "");
const STATE_PATH = process.env.ALERT_STATE ?? ".watchdog-state.json";
const state = fs.existsSync(STATE_PATH) ? JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) : emptyState();

const githubRepo = process.env.GITHUB_REPOSITORY;
const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken || !githubRepo) console.log("(sin GITHUB_TOKEN: no se vigila el sincronizador)");

const { findings, send, resolved, state: next, notes } = await runWatchdog({ site: SITE, now: NOW, state, githubToken, githubRepo, dry: DRY });
for (const note of notes) console.error(note);

console.log(`Sitio ${SITE} · hallazgos: ${findings.length} · a avisar: ${send.length} · resueltos: ${resolved.length}`);
for (const f of findings) console.log(`  [${f.severity}] ${f.key} — ${f.title}`);

if (DRY) {
  const { renderAlerts } = await import("../src/lib/monitor/telegram.mjs");
  console.log(renderAlerts({ send, resolved }) ?? "(nada para avisar)");
  process.exit(0);
}
try {
  await deliverWatchdog({ send, resolved }, { token: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID });
} catch (error) {
  console.error(`No se pudo enviar el aviso: ${error.message}`);
  process.exit(1);
}
fs.writeFileSync(STATE_PATH, JSON.stringify(next, null, 2));
