// Fórmula 1: enlaza cada sesión con su resumen ("FP1 Highlights | 2026 Azerbaijan Grand Prix") del canal oficial de YouTube @Formula1.
// Sin clave se lee el feed público del canal (los últimos ~15 videos: alcanza para el fin de semana en curso); con YOUTUBE_API_KEY se
// recorre además la lista de subidas con la API oficial (sólo playlistItems, 1 unidad de cuota por página de 50) para completar hacia atrás.
// Los videos sólo se suman: uno que ya estaba enlazado no se pierde porque el feed ya no lo muestre.
const FEED = "https://www.youtube.com/feeds/videos.xml?channel_id=UCB_qr75-ydFVKSF9Dmo6izg";
const API = "https://www.googleapis.com/youtube/v3/playlistItems";
const UPLOADS = "UUB_qr75-ydFVKSF9Dmo6izg";
export const F1_YOUTUBE_SOURCE = "YouTube · Formula 1";
const CHANNEL_URL = "https://www.youtube.com/@Formula1";

const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Nombre de la sesión en el título → nuestra sesión. */
const SESSIONS = [
  [/^fp1$|^practice 1$/, "Práctica 1"],
  [/^fp2$|^practice 2$/, "Práctica 2"],
  [/^fp3$|^practice 3$/, "Práctica 3"],
  [/^sprint (qualifying|shootout)$/, "Clasificación sprint"],
  [/^sprint$/, "Sprint"],
  [/^qualifying$/, "Clasificación"],
  [/^(race|extended)$/, "Carrera"],
];

/**
 * Título de un video del canal → { gp, session, label } o null si no es el resumen de una sesión de 2026 (podcasts, cortos, avances,
 * carreras de otros años). Ej.: "FP1 Highlights | 2026 Azerbaijan Grand Prix".
 */
export function parseTitle(rawTitle) {
  const title = String(rawTitle).replace(/\s+/g, " ").trim();
  const m = title.match(/^(.+?) Highlights \| 2026 (.+ Grand Prix)$/i);
  if (!m) return null;
  const key = norm(m[1]);
  const session = SESSIONS.find(([re]) => re.test(key))?.[1];
  if (!session) return null;
  return { gp: norm(m[2]), session, ...(key === "extended" ? { label: "Extendido" } : {}) };
}

/** Feed público del canal → [{ id, title, at }]. */
export function parseFeed(xml) {
  return [...String(xml).matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => ({
    id: m[1].match(/<yt:videoId>([^<]+)</)?.[1] ?? "",
    title: (m[1].match(/<title>([^<]*)</)?.[1] ?? "").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"'),
    at: m[1].match(/<published>([^<]+)</)?.[1] ?? "",
  }));
}

async function uploads(io, apiKey, sinceIso) {
  const out = [];
  let token = "";
  for (let page = 0; page < 20; page++) {
    const url = `${API}?part=snippet,contentDetails&maxResults=50&playlistId=${UPLOADS}${token ? `&pageToken=${token}` : ""}`;
    const data = await io.json(url, { revalidate: 900, headers: { "x-goog-api-key": apiKey } });
    for (const item of data.items ?? []) out.push({ id: item.contentDetails?.videoId, title: item.snippet?.title ?? "", at: item.contentDetails?.videoPublishedAt ?? "" });
    token = data.nextPageToken;
    if (!token || (out.at(-1)?.at ?? "9") < sinceIso) break;
  }
  return out;
}

const sameVideo = (a, b) => a.id === b.id;

/** Suma a cada sesión de F1 sus resúmenes (`session.videos`). Un video ya enlazado se conserva siempre. */
export async function f1Videos(io, events, previous, { apiKey, windowDays = 21, now = new Date() } = {}) {
  const items = parseFeed(await io.text(FEED, { revalidate: 300 }));
  if (!items.length) throw new Error("el feed del canal vino vacío");
  let scanned = items.length;
  if (apiKey) {
    try {
      const older = await uploads(io, apiKey, new Date(now.getTime() - windowDays * 86400000).toISOString());
      const known = new Set(items.map((i) => i.id));
      for (const item of older) if (item.id && !known.has(item.id)) items.push(item);
      scanned = items.length;
    } catch (error) {
      // La API es un complemento del feed público: si falla, el feed alcanza para lo reciente.
      scanned = `${scanned} (API: ${String(error.message).replaceAll(apiKey, "***")})`;
    }
  }

  const found = new Map(); // id de sesión → videos
  for (const item of items) {
    const parsed = item.id ? parseTitle(item.title) : null;
    if (!parsed) continue;
    const event = events.find((e) => e.seriesId === "f1" && norm(e.officialName ?? "") === parsed.gp);
    const session = event?.sessions.find((s) => s.name === parsed.session);
    if (!session || Date.parse(session.start) > now.getTime()) continue;
    const list = found.get(session.id) ?? [];
    list.push({ id: item.id, kind: "highlights", ...(parsed.label ? { label: parsed.label } : {}) });
    found.set(session.id, list);
  }

  const before = new Map((previous?.events ?? []).flatMap((e) => e.sessions.map((s) => [s.id, s.videos ?? []])));
  let linked = 0;
  const out = events.map((e) => {
    if (e.seriesId !== "f1") return e;
    return {
      ...e,
      sessions: e.sessions.map((s) => {
        const videos = [...(s.videos ?? before.get(s.id) ?? [])];
        for (const v of found.get(s.id) ?? []) if (!videos.some((x) => sameVideo(x, v))) videos.push(v);
        if (!videos.length) return s;
        linked++;
        return { ...s, videos };
      }),
    };
  });
  return { events: out, meta: { f1Youtube: { scanned, sessions: linked, channel: CHANNEL_URL } } };
}

/** Si el canal no responde: se conservan los videos de la versión anterior. */
export function keepPreviousF1Videos(events, previous) {
  const before = new Map((previous?.events ?? []).flatMap((e) => e.sessions.map((s) => [s.id, s.videos])));
  return events.map((e) => (e.seriesId !== "f1" ? e : { ...e, sessions: e.sessions.map((s) => (!s.videos?.length && before.get(s.id)?.length ? { ...s, videos: before.get(s.id) } : s)) }));
}
