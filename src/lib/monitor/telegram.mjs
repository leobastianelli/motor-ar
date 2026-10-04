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

/**
 * Manda una foto a Telegram (la placa del viernes) con el mismo botón "Publicar en X" en el pie. `photoUrl` tiene que
 * ser pública: Telegram la descarga sola, no hace falta subir el archivo. `caption` admite hasta 1024 caracteres
 * (los borradores del sitio entran de sobra). Si `sendPhoto` falla (Telegram no pudo bajar la imagen, error de red),
 * cae a `sendTelegram` con el mismo texto como mensaje simple, como se mandaba antes de adjuntar la imagen.
 */
export async function sendTelegramPhoto(photoUrl, caption, { token, chatId, fetchImpl = fetch, replyMarkup } = {}) {
  if (!token || !chatId) {
    console.log(`\n[telegram simulado: falta TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID]\n[foto] ${photoUrl}\n${caption}\n`);
    return { sent: 0, simulated: true };
  }
  try {
    const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Telegram respondió ${res.status}`);
    return { sent: 1 };
  } catch {
    return sendTelegram(caption, { token, chatId, fetchImpl, replyMarkup });
  }
}

/**
 * Manda varias fotos juntas como álbum (el carrusel del resumen del finde): `urls` son públicas, Telegram las descarga sola (hasta 10 por álbum;
 * con una sola, `sendMediaGroup` no sirve y va como foto suelta). Si falla (Telegram no pudo bajar alguna, error de red), cae a mandar los
 * enlaces como texto para no perder las placas. Nunca escribe el token en ningún mensaje de error.
 */
export async function sendTelegramMediaGroup(urls, { token, chatId, fetchImpl = fetch } = {}) {
  const photos = (urls ?? []).slice(0, 10);
  if (!photos.length) return { sent: 0 };
  if (!token || !chatId) {
    console.log(`\n[telegram simulado: falta TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID]\n[álbum] ${photos.join("\n")}\n`);
    return { sent: 0, simulated: true };
  }
  try {
    const single = photos.length === 1;
    const res = await fetchImpl(`https://api.telegram.org/bot${token}/${single ? "sendPhoto" : "sendMediaGroup"}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(single ? { chat_id: chatId, photo: photos[0] } : { chat_id: chatId, media: photos.map((media) => ({ type: "photo", media })) }),
    });
    if (!res.ok) throw new Error(`Telegram respondió ${res.status}`);
    return { sent: photos.length };
  } catch {
    await sendTelegram(`Placas para adjuntar:\n${photos.join("\n")}`, { token, chatId, fetchImpl });
    return { sent: 0, fallback: true };
  }
}
