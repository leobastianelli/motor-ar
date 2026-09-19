// GT World Challenge Europe: enlaza cada sesión con su transmisión (en inglés, la principal) y su resumen del canal oficial de YouTube
// @GTWorld, con la API oficial de YouTube Data v3 (clave en YOUTUBE_API_KEY). Sólo se usa la lista de subidas del canal
// (playlistItems, 1 unidad de cuota por página de 50): no se raspa YouTube ni se usa `search` (100 unidades).
// Los títulos del canal tienen forma fija: "LIVE | Race 1 | Zandvoort | GT World Challenge powered by AWS 2026 (English)".
const API = "https://www.googleapis.com/youtube/v3/playlistItems";
// Lista "Subidas" del canal @GTWorld (id de canal UC-yHapH6mW1ceZ_5PDUf1_g).
const UPLOADS = "UU-yHapH6mW1ceZ_5PDUf1_g";
const CHANNEL_URL = "https://www.youtube.com/@GTWorld";
export const YOUTUBE_SOURCE = "YouTube · GT World";
const SEASON_START = "2026-02-01";

// Circuito en el título → fecha nuestra.
const VENUES = [
  [/paul ricard/, "gt3-2026-e1"],
  [/brands hatch/, "gt3-2026-s1"],
  [/monza/, "gt3-2026-e2"],
  [/\bspa\b|francorchamps/, "gt3-2026-e3"],
  [/misano/, "gt3-2026-s2"],
  [/magny cours/, "gt3-2026-s3"],
  [/nurburgring/, "gt3-2026-e4"],
  [/zandvoort/, "gt3-2026-s4"],
  [/barcelona/, "gt3-2026-s5"],
  [/portimao/, "gt3-2026-e5"],
];

const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9#]+/g, " ").trim();

/**
 * Título de un video del canal → { eventId, session, kind, label } o null si no es de GT World Challenge Europe (otros campeonatos del
 * canal, cámaras a bordo, conferencias, avances y videos sueltos de momentos). Sólo el audio en inglés; los demás idiomas se descartan.
 */
export function parseTitle(rawTitle) {
  const title = String(rawTitle).replace(/\s+/g, " ").trim();
  if (!/GT World Challenge (Europe )?(powered|pwd|pwrd)/i.test(title)) return null;
  if (/Australia|Asia|America|GT4|GT2|Sydney|Monochrome|IGTC|\bOB #|onboard|press conference|preview|aftermovie/i.test(title)) return null;
  const lang = title.match(/\((English|Deutsch|Italiano|Français|Nederlands|Español|Português)\)\s*$/)?.[1];
  if (lang && lang !== "English") return null;
  const text = norm(title);
  const eventId = VENUES.find(([re]) => re.test(text))?.[1];
  if (!eventId) return null;

  // Las transmisiones de resistencia en otros idiomas no llevan el idioma entre paréntesis: se reconocen por el nombre de la carrera.
  if (/\b24 (horas|ore|stunden|heures)\b/.test(text)) return null;

  const highlights = /highlights/.test(text);
  const live = /^(live|en direct|replay)\b/.test(text);
  const fullRace = /^full race\b/.test(text);
  if (!highlights && !live && !fullRace) return null;
  if (/\bhours? \d/.test(text) || /\bfirst hour\b/.test(text)) return null; // resúmenes parciales de la carrera de 24 horas
  // Sin el nombre de la carrera de 24 horas (que trae "Hours" y "Spa"), lo que queda dice qué sesión es. Las transmisiones en otros
  // idiomas de resistencia (Rennen, Gara, Course…) usan palabras que no coinciden y quedan afuera.
  const sessionText = text.replace(/\b(crowdstrike )?24 (hours of|horas de|ore di|stunden von) spa\b/g, " ");
  let session;
  let m;
  if ((m = sessionText.match(/free practice (\d)/))) session = `fp${m[1]}`;
  else if (/night practice/.test(sessionText)) session = "np";
  else if (/super ?pole/.test(sessionText)) session = "sp";
  else if (/warm ?up/.test(sessionText)) session = "wu";
  else if ((m = sessionText.match(/qualifying (\d)/))) session = `q${m[1]}`;
  else if (/qualifying/.test(sessionText)) session = "q";
  else if ((m = sessionText.match(/race (\d)/))) session = `r${m[1]}`;
  else if (/\brace\b/.test(sessionText)) session = "race";
  else return null;

  const part = title.match(/\(Part (\d)\)/i)?.[1];
  const label = part ? `Parte ${part}` : /final 7 hours/i.test(title) ? "Últimas 7 horas" : fullRace ? "Carrera completa" : /extended/i.test(title) ? "Extendido" : undefined;
  return { eventId, session, kind: highlights ? "highlights" : "live", label };
}

/** Sesión de la fecha a la que corresponde el video (id `<fecha>-<clave>`), si esa sesión existe. */
const sessionFor = (event, key) => {
  const sprint = event.id.startsWith("gt3-2026-s");
  // "Race" sin número sólo existe en Endurance; en Sprint sería ambiguo (Carrera 1 o 2).
  if (key === "race" && sprint) return undefined;
  return event.sessions.find((s) => s.id === `${event.id}-${key}`);
};

async function uploads(io, apiKey, sinceIso) {
  const out = [];
  let token = "";
  for (let page = 0; page < 60; page++) {
    const url = `${API}?part=snippet,contentDetails&maxResults=50&playlistId=${UPLOADS}${token ? `&pageToken=${token}` : ""}`;
    const data = await io.json(url, { revalidate: 900, headers: { "x-goog-api-key": apiKey } });
    for (const item of data.items ?? []) out.push({ id: item.contentDetails?.videoId, title: item.snippet?.title ?? "", at: item.contentDetails?.videoPublishedAt ?? "" });
    token = data.nextPageToken;
    if (!token || (out.at(-1)?.at ?? "9") < sinceIso) break;
  }
  return out;
}

/** Idioma de audio declarado por cada video (`snippet.defaultAudioLanguage`, p. ej. "en", "de", "nl-BE"); 1 unidad de cuota por 50 videos. */
async function audioLanguages(io, apiKey, ids) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&maxResults=50&id=${ids.slice(i, i + 50).join(",")}`;
    const data = await io.json(url, { revalidate: 900, headers: { "x-goog-api-key": apiKey } });
    for (const v of data.items ?? []) if (v.snippet?.defaultAudioLanguage) out.set(v.id, v.snippet.defaultAudioLanguage);
  }
  return out;
}

/**
 * Transmisión primero, después resúmenes; sin repetir ids y, dentro de cada tipo, del más antiguo al más nuevo ("Parte 1" antes que
 * "Parte 2"). Sale `{ id, kind, label? }`: la URL se arma como youtube.com/watch?v=<id>.
 */
function organise(list) {
  const seen = new Set();
  let plainLive = false; // una sola transmisión sin etiqueta por sesión: la repetición ("REPLAY") duplica la del vivo
  return list
    .filter((v) => !seen.has(v.id) && seen.add(v.id))
    .sort((a, b) => a.at.localeCompare(b.at))
    .filter((v) => {
      if (v.kind !== "live" || v.label) return true;
      if (plainLive) return false;
      plainLive = true;
      return true;
    })
    .sort((a, b) => (a.kind === "live" ? 0 : 1) - (b.kind === "live" ? 0 : 1) || a.at.localeCompare(b.at))
    .slice(0, 6)
    .map((v) => ({ id: v.id, kind: v.kind, ...(v.label ? { label: v.label } : {}) }));
}

/**
 * Suma a cada sesión de GT3 sus videos del canal (`session.videos`). Las sesiones fuera de la ventana reciente conservan lo que
 * ya tenían; las de la ventana se reemplazan, así un video borrado o privado deja de mostrarse.
 */
export async function gtwcYoutube(io, events, previous, { apiKey, windowDays = 21, now = new Date() } = {}) {
  if (!apiKey) return { events, meta: { gtwcYoutube: { skipped: "sin YOUTUBE_API_KEY" } } };
  const cutoff = new Date(Math.max(Date.parse(SEASON_START), now.getTime() - windowDays * 86400000)).toISOString();
  let items;
  try {
    items = await uploads(io, apiKey, cutoff);
  } catch (error) {
    throw new Error(String(error.message).replaceAll(apiKey, "***"));
  }
  const candidates = items.map((item) => ({ item, parsed: item.id ? parseTitle(item.title) : null })).filter((c) => c.parsed);
  // Las transmisiones en otros idiomas a veces tienen el mismo título en inglés: se distingue por el idioma de audio del video.
  let languages;
  try {
    languages = await audioLanguages(io, apiKey, candidates.filter((c) => c.parsed.kind === "live").map((c) => c.item.id));
  } catch (error) {
    throw new Error(String(error.message).replaceAll(apiKey, "***"));
  }
  const found = new Map(); // id de sesión → videos
  for (const { item, parsed } of candidates) {
    const audio = languages.get(item.id);
    if (parsed.kind === "live" && audio && !/^en\b/i.test(audio)) continue;
    const event = events.find((e) => e.id === parsed.eventId);
    const session = event && sessionFor(event, parsed.session);
    if (!session) continue;
    const list = found.get(session.id) ?? [];
    list.push({ id: item.id, kind: parsed.kind, ...(parsed.label ? { label: parsed.label } : {}), at: item.at });
    found.set(session.id, list);
  }

  const before = new Map((previous.events ?? []).flatMap((e) => e.sessions.map((s) => [s.id, s.videos])));
  let linked = 0;
  const result = events.map((e) => {
    if (e.seriesId !== "gt3") return e;
    return {
      ...e,
      sessions: e.sessions.map(({ videos: current, ...s }) => {
        const recent = Date.parse(s.start) >= Date.parse(cutoff);
        const videos = recent ? organise(found.get(s.id) ?? []) : (current ?? before.get(s.id) ?? []);
        if (!videos.length) return s;
        linked++;
        return { ...s, videos };
      }),
    };
  });
  return { events: result, meta: { gtwcYoutube: { scanned: items.length, sessions: linked, channel: CHANNEL_URL } } };
}

/** Si la API de YouTube falla: se conservan los videos de la versión anterior. */
export function keepPreviousYoutube(events, previous) {
  const before = new Map((previous.events ?? []).flatMap((e) => e.sessions.map((s) => [s.id, s.videos])));
  return events.map((e) =>
    e.seriesId !== "gt3" ? e : { ...e, sessions: e.sessions.map((s) => (before.get(s.id)?.length ? { ...s, videos: before.get(s.id) } : s)) },
  );
}
