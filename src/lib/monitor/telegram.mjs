// Mensajes de aviso: formato y envío a Telegram. El bot sólo envía; no lee ni escribe datos del sitio.

const ICON = {
  horarios: "⏰",
  fecha: "📅",
  "fecha-duplicada": "📅",
  fuente: "🔴",
  tabla: "📊",
  "manual-desactualizado": "🧩",
  "manual-vencida": "🧹",
  resultados: "🏁",
  sitio: "🌐",
  sync: "🔄",
};
const iconOf = (key) => ICON[String(key).split(":")[0]] ?? "⚠️";
const KIND = { sube: " ⬆️ sube de nivel", recordatorio: " (recordatorio)", nuevo: "" };

/** Arma el texto de los avisos de una corrida. Devuelve null si no hay nada que decir. */
export function renderAlerts({ send, resolved }, { context = "" } = {}) {
  if (!send.length && !resolved.length) return null;
  const lines = [];
  if (send.length) {
    lines.push(`🚨 Fierros: ${send.length} ${send.length === 1 ? "aviso" : "avisos"}`);
    for (const f of send) {
      lines.push("", `${iconOf(f.key)} ${f.title}${KIND[f.kind] ?? ""}`, f.body);
    }
    lines.push("", "Para resolverlo: pegale este mensaje a Claude en el proyecto motor-ar.");
  }
  if (resolved.length) {
    lines.push(...(send.length ? [""] : []), ...resolved.map((r) => `✅ Resuelto: ${r.title}`));
  }
  if (context) lines.push("", context);
  return lines.join("\n");
}

/** Corta un texto largo en partes que entren en un mensaje de Telegram (límite: 4096 caracteres). */
export function chunk(text, size = 3800) {
  const parts = [];
  let rest = text;
  while (rest.length > size) {
    const cut = rest.lastIndexOf("\n", size);
    const at = cut > size / 2 ? cut : size;
    parts.push(rest.slice(0, at));
    rest = rest.slice(at).replace(/^\n+/, "");
  }
  if (rest) parts.push(rest);
  return parts;
}

/**
 * Manda el texto a Telegram. Sin token o sin chat (todavía no se creó el bot) no falla: lo muestra en el log como simulado.
 * `replyMarkup` (opcional) es un teclado en línea de Telegram, p. ej. { inline_keyboard: [[{ text, url }]] }: va en la última parte del mensaje.
 * Nunca escribe el token en ningún mensaje de error.
 */
export async function sendTelegram(text, { token, chatId, fetchImpl = fetch, replyMarkup } = {}) {
  if (!text) return { sent: 0 };
  if (!token || !chatId) {
    console.log(`\n[telegram simulado: falta TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID]\n${text}\n`);
    return { sent: 0, simulated: true };
  }
  let sent = 0;
  const parts = chunk(text);
  for (const [i, part] of parts.entries()) {
    let res;
    try {
      res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: part,
          disable_web_page_preview: true,
          ...(replyMarkup && i === parts.length - 1 ? { reply_markup: replyMarkup } : {}),
        }),
      });
    } catch {
      throw new Error("no se pudo conectar con Telegram");
    }
    if (!res.ok) throw new Error(`Telegram respondió ${res.status}`);
    sent++;
  }
  return { sent };
}
