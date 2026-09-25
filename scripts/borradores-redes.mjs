// Borradores para redes: herramienta local para revisar lo que armaría /api/pulso (que es quien manda de verdad, cada 5 min). Usa la misma
// función (src/lib/redes-envio.mjs), así que el estado de lo ya enviado vive en la tabla `redes_enviados` de Neon, no en un archivo.
//   node scripts/borradores-redes.mjs          calcula y manda lo que falte (con DATABASE_URL y las variables de Telegram; sin ellas, simula)
//   node scripts/borradores-redes.mjs --dry    sólo muestra los candidatos: no reserva nada en la base ni manda nada
// Variables: FIERROS_NOW (simular otra hora), SEASON_FILE (respaldo sin almacén).
import fs from "node:fs";
import { broadcastsBySeries } from "../src/data/broadcasts.ts";
import { drivers } from "../src/data/drivers.ts";
import { series } from "../src/data/series.ts";
import { visibleEvents } from "../src/lib/monitor/checks.mjs";
import { draftMessage, enviarBorradores } from "../src/lib/redes-envio.mjs";
import { connect, loadSeason } from "./season-source.mjs";

const DRY = process.argv.includes("--dry");
const NOW = process.env.FIERROS_NOW ?? new Date().toISOString();

// Con almacén (DATABASE_URL) no se cae al archivo del repo: un respaldo viejo no debe generar borradores.
const { raw, label } = await loadSeason(process.env.SEASON_FILE ?? "src/data/season-2026.json", { requireStore: true });
console.log(`Datos: ${label} · ahora: ${NOW}`);
const manual = JSON.parse(fs.readFileSync("src/data/manual-overrides.json", "utf8"));
const events = visibleEvents(raw.events, manual);
const sql = DRY ? null : await connect();
const creds = { token: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID };
const catalog = { drivers, series, broadcasts: broadcastsBySeries };

const { candidatos, enviados, simulado, motivo, errores } = await enviarBorradores({ raw, now: NOW, catalog, manual, events, sql, dry: DRY, creds });

console.log(`Borradores candidatos: ${candidatos.length}`);
for (const d of candidatos) console.log(`\n--- ${d.key} ---\n${draftMessage(d)}`);
if (simulado) console.log(`\n(simulado: ${motivo}; no se reservó ni mandó nada)`);
else console.log(`\nMandados: ${enviados.length}/${candidatos.length}`);
for (const error of errores) console.error(`No se pudo enviar: ${error}`);
if (errores.length) process.exit(1);
