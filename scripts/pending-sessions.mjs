// Compuerta del reintento por hora de la sincronización: ¿hay sesiones de F1 que terminaron hace poco y todavía no tienen resultados?
// Es barata (lee la instantánea del repo, sin instalar nada ni pedir a ninguna fuente): si no hay nada pendiente, la sincronización completa
// no corre y no gasta minutos de Actions. Escribe `needed=true|false` en $GITHUB_OUTPUT.
// Uso: node scripts/pending-sessions.mjs
import fs from "node:fs";
import { sessionResultsMissing, visibleEvents } from "../src/lib/monitor/checks.mjs";

const snapshot = JSON.parse(fs.readFileSync("src/data/season-2026.json", "utf8"));
const manual = JSON.parse(fs.readFileSync("src/data/manual-overrides.json", "utf8"));
const events = visibleEvents(snapshot.events, manual);

// Entre 10 minutos y 4 horas después de terminar: más tarde ya lo insiste el guardián por Telegram y lo toma la próxima sincronización.
const pending = sessionResultsMissing(events, new Date().toISOString(), { seriesIds: new Set(["f1"]), after: 10 / 60, before: 4 });
const needed = pending.length > 0;
for (const p of pending) console.log(`Pendiente: ${p.title}. ${p.body}`);
console.log(needed ? "Hay resultados por traer: se sincroniza." : "Nada pendiente: no se sincroniza.");
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `needed=${needed}\n`);
