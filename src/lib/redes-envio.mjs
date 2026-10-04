// Envío de borradores para redes: función compartida por /api/pulso y scripts/borradores-redes.mjs (herramienta local, --dry).
// Calcula los borradores candidatos con `borradores()` (redes-core.mjs, lógica pura) y, para cada uno, se "reserva" en la tabla `redes_enviados`
// de Neon con INSERT ... ON CONFLICT DO NOTHING RETURNING ANTES de mandarlo por Telegram: si dos llamadas se solapan (el cron externo puede
// pisarse con el reintento horario de GitHub Actions), sólo una gana la reserva y manda el mensaje.
// Sin credenciales de Telegram no se manda nada real, así que tampoco se reserva: si se reservara sin mandar, quedaría marcado como enviado
// para siempre aunque nadie lo haya visto.
import { borradores, X_LIMIT, xIntentUrl, xLength } from "./redes-core.mjs";
import { sendTelegram, sendTelegramPhoto } from "./monitor/telegram.mjs";

const KIND_LABEL = { agenda: "agenda del finde", resultado: "resultado", horario: "horario", resumen: "así quedó el finde" };

// Claves que esta instancia ya sabe que están en `redes_enviados` (las mandó o encontró la reserva tomada). Un borrador sigue siendo candidato
// durante horas después de mandarse: sin esto, cada llamada de /api/pulso (cada 5 min) volvería a preguntarle a Neon por cada uno y no lo dejaría
// dormir. Con esto, cada instancia pregunta una vez por clave.
const conocidos = new Set();
/** Sólo para pruebas. */
export const olvidarConocidos = () => conocidos.clear();

/** Texto del mensaje de Telegram para un borrador (usado también por la herramienta local para mostrarlo). */
export function draftMessage(d) {
  return [
    `📝 Borrador para X (${KIND_LABEL[d.kind]})`,
    "",
    d.text,
    "",
    `${xLength(d.text)}/${X_LIMIT} caracteres`,
    ...(d.image ? [`Placa para adjuntar: ${d.image}`] : []),
  ].join("\n");
}

/** Teclado en línea de Telegram con el botón "Publicar en X" (enlace de intención). */
export const draftKeyboard = (d) => ({ inline_keyboard: [[{ text: "Publicar en X", url: xIntentUrl(d.text) }]] });

/**
 * Calcula los borradores nuevos para este momento y los manda por Telegram.
 * - `sql`: función de Neon (etiqueta de plantilla), o null/undefined si no hay DATABASE_URL. Sólo se consulta si hay candidatos.
 * - `dry`: no reserva ni manda nada; sólo devuelve los candidatos (para la herramienta local).
 * - `creds`: { token, chatId, fetchImpl? } de sendTelegram. Sin token o chatId, se simula (no se reserva ni se manda).
 * → { candidatos, enviados: [{ key, kind }], simulado, motivo?, errores: [string] }
 */
export async function enviarBorradores({ raw, now, catalog, manual = {}, events, sql, dry = false, creds = {} }) {
  // Primero todos los posibles, sin tope; se pregunta a la base cuáles ya salieron (una consulta, sólo por las claves que esta instancia no
  // conoce) y recién con eso se aplica el tope por corrida. Si el tope se aplicara antes, los ya mandados ocupaban los lugares y lo nuevo
  // no salía nunca (la final del TC Pista, 4/10/2026). La reserva de abajo sigue resolviendo las llamadas que se pisan.
  const posibles = borradores(raw, now, { enviados: {}, catalog, manual, events, limit: Infinity });
  const claves = (d) => [d.key, ...(d.legacyKey ? [d.legacyKey] : [])];
  const preguntar = posibles.filter((d) => !claves(d).some((k) => conocidos.has(k))).flatMap(claves);
  if (sql && !dry && preguntar.length) {
    const rows = await sql`SELECT clave FROM redes_enviados WHERE clave = ANY(${preguntar})`;
    for (const { clave } of rows) conocidos.add(clave);
  }
  const todos = borradores(raw, now, { enviados: Object.fromEntries([...conocidos].map((k) => [k, true])), catalog, manual, events });
  const candidatos = dry ? todos : todos.filter((d) => !conocidos.has(d.key));
  if (!candidatos.length) return { candidatos: [], enviados: [], simulado: false, errores: [] };

  const sinCredenciales = !creds.token || !creds.chatId;
  if (dry || sinCredenciales) {
    return { candidatos, enviados: [], simulado: true, motivo: dry ? "--dry" : "sin TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID", errores: [] };
  }

  const enviados = [];
  const errores = [];
  for (const d of candidatos) {
    let reservado = true;
    if (sql) {
      const rows = await sql`INSERT INTO redes_enviados (clave, enviado_at) VALUES (${d.key}, now()) ON CONFLICT (clave) DO NOTHING RETURNING clave`;
      reservado = rows.length > 0;
    }
    // No se reservó: otra llamada (o esta misma, ya corrida) lo mandó primero.
    if (!reservado) {
      conocidos.add(d.key);
      continue;
    }
    try {
      // La agenda del viernes lleva la placa (image) adjunta como foto; el resto son mensajes de texto simples.
      if (d.image) await sendTelegramPhoto(d.image, draftMessage(d), { ...creds, replyMarkup: draftKeyboard(d) });
      else await sendTelegram(draftMessage(d), { ...creds, replyMarkup: draftKeyboard(d) });
      enviados.push({ key: d.key, kind: d.kind });
      conocidos.add(d.key);
    } catch (error) {
      errores.push(`${d.key}: ${error.message}`);
      // No se pudo mandar: se libera la reserva para que la próxima corrida lo vuelva a intentar.
      if (sql) await sql`DELETE FROM redes_enviados WHERE clave = ${d.key}`.catch(() => {});
    }
  }
  return { candidatos, enviados, simulado: false, errores };
}
