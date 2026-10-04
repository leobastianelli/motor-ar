// Guardián de datos: después de cada sincronización revisa qué falta o qué está mal y avisa por Telegram.
//   npm run guardian            revisa y avisa (usa TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID si están; si no, muestra el mensaje)
//   npm run guardian -- --dry   revisa y muestra todo, sin enviar ni guardar el estado (para probar en local)
// Variables: GUARDIAN_NOW (simular otra hora), ALERT_STATE (archivo de estado, por defecto .alert-state.json).
import fs from "node:fs";
import { drivers } from "../src/data/drivers.ts";
import { series } from "../src/data/series.ts";
import { dedupeFindings, emptyState, evaluate, summaryDue } from "../src/lib/monitor/alerts.mjs";
import {
  compareStandings,
  dateIssues,
  dateStatus,
  dayLabel,
  manualExpired,
  parseTc2000Home,
  pendingHours,
  manualDiscarded,
  resultsOverdue,
  sessionResultsMissing,
  sourceFailures,
  weekendWithoutAnyHour,
  staleStandings,
  tnDateConflicts,
  visibleEvents,
  withConflicts,
} from "../src/lib/monitor/checks.mjs";
import { renderAlerts, sendTelegram } from "../src/lib/monitor/telegram.mjs";
import { loadSeason } from "./season-source.mjs";

const DRY = process.argv.includes("--dry");
const NOW = process.env.GUARDIAN_NOW ?? new Date().toISOString();
const STATE_PATH = process.env.ALERT_STATE ?? ".alert-state.json";
const UA = { "User-Agent": "fierros-motor-ar/0.1 (leonelbastianelli@gmail.com)" };

// Mira lo que el sitio muestra: la última versión del almacén (con DATABASE_URL); si no hay o falla, el archivo del repo.
const { raw: snapshot, label: seasonLabel, createdAt: seasonCreatedAt } = await loadSeason(process.env.SEASON_FILE ?? "src/data/season-2026.json");
console.log(`Datos: ${seasonLabel}`);
const manual = JSON.parse(fs.readFileSync("src/data/manual-overrides.json", "utf8"));
const state = fs.existsSync(STATE_PATH) ? JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) : emptyState();

// Prioridad de una categoría (igual que seriesTier en src/lib/data.ts): 1 argentina, 2 internacional con argentinos, 3 el resto.
const withArgentines = new Set(drivers.map((d) => d.seriesId));
const seriesById = Object.fromEntries(series.map((s) => [s.id, s]));
const tierOf = (id) => (seriesById[id]?.scope !== "internacional" ? 1 : withArgentines.has(id) ? 2 : 3);
const name = (id) => seriesById[id]?.name ?? id;

// Categorías cuya fuente publica resultados sola: si pasan 36 h y no hay carrera, algo falló.
const AUTO_RESULTS = new Set(["tc", "tc-pista", "tc-mouras", "tc-pista-mouras", "tc-pick-up", "tc-pista-pick-up", "tn", "f1", "f2", "gt3", "tcr-sa", "rally-argentino", "nuevo-car-show"]);

async function get(url, { json = false } = {}) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${res.status} al pedir ${url}`);
  return json ? res.json() : res.text();
}

const notes = [];
let events = visibleEvents(snapshot.events, manual);

// Si la sincronización que acaba de correr falló, se avisa en el acto (el vigilante horario lo confirmaría más tarde).
const syncFailed = process.env.SYNC_STATUS === "failure";

// Segunda fuente para las fechas del TN: la lista de eventos de Speedhive.
try {
  const list = await get("https://eventresults-api.speedhive.com/api/v0.2.3/eventresults/organizations/381036/events?count=80", { json: true });
  events = withConflicts(events, tnDateConflicts(events, list));
} catch (error) {
  notes.push(`No se pudo cruzar las fechas del TN con Speedhive (${error.message}).`);
}

const findings = [
  ...(syncFailed ? [{ key: "sync:falló", severity: "critical", level: 1, tier: 3, title: "La sincronización de datos falló", body: `Log: ${process.env.RUN_URL ?? "(sin enlace)"}` }] : []),
  ...sourceFailures(snapshot.failures),
  ...dateIssues(events, NOW, { tierOf, name }),
  ...pendingHours(events, NOW, { tierOf, name }),
  ...weekendWithoutAnyHour(events, NOW, { tierOf, name }),
  ...resultsOverdue(events, NOW, { autoSeries: AUTO_RESULTS, tierOf, name }),
  ...sessionResultsMissing(events, NOW, { seriesIds: new Set(["f1"]), tierOf, name }),
  ...staleStandings(snapshot, manual, events, { tierOf, name, now: NOW }),
  ...manualExpired(events, snapshot.events, manual, NOW),
  ...manualDiscarded(snapshot.events, manual),
];

// La portada de TC2000 (la única página de su sitio que su robots.txt permite) vigila la tabla cargada a mano.
try {
  const home = await get("https://tc2000.com.ar/");
  const official = parseTc2000Home(home.replace(/<(script|style)[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, "\n"));
  const mine = manual.standings?.tc2000?.rows;
  if (official.length >= 3 && mine) findings.push(...compareStandings(mine, official.slice(0, 13), { series: "tc2000", name: name("tc2000") }));
  else if (official.length < 3) notes.push("La portada de TC2000 no trajo la tabla de pilotos: puede haber cambiado su diseño.");
} catch (error) {
  // El sitio de TC2000 responde 403 a los servidores de GitHub (no a una PC común): no se evade. Esta comprobación sólo corre en local.
  if (/^403/.test(error.message)) console.log("(portada de TC2000 no disponible desde este servidor: 403; la comprobación de su tabla sólo corre en local)");
  else notes.push(`No se pudo leer la portada de TC2000 (${error.message}).`);
}

const { send, resolved, state: next } = evaluate(findings, state, NOW);

// ——— Resumen diario ———
function summary() {
  const nowMs = Date.parse(NOW);
  const soon = events
    .filter((e) => Date.parse(e.sessions.at(-1).start) >= nowMs - 12 * 3600_000 && Date.parse(e.sessions[0].start) <= nowMs + 5 * 86400_000)
    .sort((a, b) => Date.parse(a.sessions[0].start) - Date.parse(b.sessions[0].start) || tierOf(a.seriesId) - tierOf(b.seriesId));
  const line = (e) => {
    const { status } = dateStatus(e);
    const raceKnown = e.sessions.some((s) => ["final", "carrera", "sprint"].includes(s.kind) && s.timeKnown !== false);
    const mark = status !== "confirmed" ? "❓ fecha sin confirmar" : raceKnown ? "✓ con horario" : "⏳ sin horario";
    return `• ${dayLabel(e.sessions[0].start)} ${name(e.seriesId)} · ${e.circuit?.city ?? e.name}: ${mark}`;
  };
  const active = Object.values(next.alerts).filter((a) => a.active && a.severity !== "info").length;
  // Una sincronización sin cambios no escribe versión nueva, así que la edad es la de la última versión escrita, no la de la última corrida.
  const age = Math.round((nowMs - Date.parse(seasonCreatedAt ?? snapshot.generatedAt)) / 3600_000);
  return [
    `☀️ Fierros: resumen del día`,
    active ? `⚠️ ${active} ${active === 1 ? "problema abierto" : "problemas abiertos"}.` : "✅ Todo al día: ningún problema abierto.",
    `Última versión de datos (${seasonLabel}): hace ${age} h.`,
    "",
    soon.length ? "Próximos 5 días:" : "No hay eventos en los próximos 5 días.",
    ...soon.map(line),
    ...(notes.length ? ["", ...notes.map((n) => `ℹ️ ${n}`)] : []),
  ].join("\n");
}

const alertText = renderAlerts({ send, resolved });
const daily = summaryDue(state, NOW);

console.log(`Hallazgos: ${findings.length} · a avisar: ${send.length} · resueltos: ${resolved.length} · resumen diario: ${daily ? "sí" : "no"}`);
for (const f of dedupeFindings(findings)) console.log(`  [${f.severity}] ${f.key} — ${f.title}`);
for (const n of notes) console.log(`  (nota) ${n}`);

if (DRY) {
  console.log("\n--- mensaje de avisos ---\n" + (alertText ?? "(nada para avisar)"));
  console.log("\n--- resumen diario ---\n" + summary());
  process.exit(0);
}

const creds = { token: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID };
try {
  if (alertText) await sendTelegram(alertText, creds);
  if (daily) {
    await sendTelegram(summary(), creds);
    next.lastSummary = NOW;
  }
} catch (error) {
  // Si el aviso no salió, no se guarda el estado: la próxima corrida lo vuelve a intentar.
  console.error(`No se pudo enviar el aviso: ${error.message}`);
  process.exit(1);
}
fs.writeFileSync(STATE_PATH, JSON.stringify(next, null, 2));
