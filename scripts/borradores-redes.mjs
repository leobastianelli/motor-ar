// Borradores para redes: lee la última versión de la temporada, arma los textos nuevos para X y los manda por Telegram, cada uno con un botón
// "Publicar en X" que abre la app con el texto escrito (enlace de intención): la persona revisa y toca Publicar. Nada se publica solo.
//   node scripts/borradores-redes.mjs          arma y manda lo que falte (usa TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID; sin ellos, sólo muestra)
//   node scripts/borradores-redes.mjs --dry    arma y muestra todo, sin enviar ni guardar el estado
// Variables: FIERROS_NOW (simular otra hora), REDES_STATE (archivo de estado, por defecto .redes-state.json), SEASON_FILE (respaldo sin almacén).
import fs from "node:fs";
import { broadcastsBySeries } from "../src/data/broadcasts.ts";
import { drivers } from "../src/data/drivers.ts";
import { series } from "../src/data/series.ts";
import { visibleEvents } from "../src/lib/monitor/checks.mjs";
import { sendTelegram } from "../src/lib/monitor/telegram.mjs";
import { borradores, X_LIMIT, xIntentUrl, xLength } from "../src/lib/redes-core.mjs";
import { loadSeason } from "./season-source.mjs";

const DRY = process.argv.includes("--dry");
const NOW = process.env.FIERROS_NOW ?? new Date().toISOString();
const STATE_PATH = process.env.REDES_STATE ?? ".redes-state.json";
/** Las claves llevan la fecha en el nombre o son de sesiones recientes: pasadas dos semanas ya no pueden volver a salir, se olvidan. */
const KEEP_MS = 14 * 86400_000;

// Con almacén (DATABASE_URL) no se cae al archivo del repo: un respaldo viejo no debe generar borradores.
const { raw, label } = await loadSeason(process.env.SEASON_FILE ?? "src/data/season-2026.json", { requireStore: true });
console.log(`Datos: ${label} · ahora: ${NOW}`);
const manual = JSON.parse(fs.readFileSync("src/data/manual-overrides.json", "utf8"));
const events = visibleEvents(raw.events, manual);
const state = fs.existsSync(STATE_PATH) ? JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) : { enviados: {} };
state.enviados ??= {};

const nuevos = borradores(raw, NOW, { enviados: state.enviados, catalog: { drivers, series, broadcasts: broadcastsBySeries }, manual, events });
console.log(`Borradores nuevos: ${nuevos.length}`);

const message = (d) =>
  [
    `📝 Borrador para X (${{ agenda: "agenda del finde", resultado: "resultado", horario: "horario" }[d.kind]})`,
    "",
    d.text,
    "",
    `${xLength(d.text)}/${X_LIMIT} caracteres`,
    ...(d.image ? [`Placa para adjuntar: ${d.image}`] : []),
  ].join("\n");
const keyboard = (d) => ({ inline_keyboard: [[{ text: "Publicar en X", url: xIntentUrl(d.text) }]] });

if (DRY) {
  for (const d of nuevos) console.log(`\n--- ${d.key} ---\n${message(d)}\nBotón → ${xIntentUrl(d.text)}`);
  process.exit(0);
}

const creds = { token: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID };
let failed = false;
for (const d of nuevos) {
  try {
    const { simulated } = await sendTelegram(message(d), { ...creds, replyMarkup: keyboard(d) });
    // Sin credenciales sólo se mostró: no se da por enviado.
    if (!simulated) state.enviados[d.key] = NOW;
  } catch (error) {
    // Lo que no salió no se anota: la próxima corrida lo vuelve a intentar. Lo ya enviado sí queda guardado.
    console.error(`No se pudo enviar ${d.key}: ${error.message}`);
    failed = true;
    break;
  }
}
for (const [key, at] of Object.entries(state.enviados)) if (Date.parse(NOW) - Date.parse(at) > KEEP_MS) delete state.enviados[key];
fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
if (failed) process.exit(1);
