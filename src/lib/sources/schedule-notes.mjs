// Horarios de categorías nacionales a partir de notas de cronograma publicadas por medios y entes oficiales.
// Diseño extensible: cada fuente es un adaptador que devuelve texto de notas; un lector común extrae las sesiones
// y un consenso decide qué horarios mostrar como confirmados (fuente oficial o dos fuentes que coinciden).

const DAYS = "lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo";
const MONTHS = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };

// Del más específico al más general: "TCP" no debe leerse como "TC".
const SERIES_TOKENS = [
  [/\bTC\s*Pista\s*Pick\s*Up\b|\bTCPPK\b/i, "tc-pista-pick-up"],
  [/\bTC\s*Pick\s*Up\b|\bTCPK\b/i, "tc-pick-up"],
  [/\bTC\s*Pista\s*Mouras\b|\bTCPM\b/i, "tc-pista-mouras"],
  [/\bTC\s*Mouras\b|\bTCM\b/i, "tc-mouras"],
  [/\bTC\s*Pista\b|\bTCP\b/i, "tc-pista"],
  [/\bTC\s*2000\b/i, "tc2000"],
  [/\bTop\s*Race\b/i, "top-race"],
  [/\bTurismo\s*Carretera\b|\bTC\b/i, "tc"],
  [/\bTN\b|\bClase\s*[23]\b/i, "tn"],
];

const pad = (n) => String(n).padStart(2, "0");

export function htmlToText(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<\/(p|h\d|li|tr|div)>/g, "\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&#8217;/g, "’")
    .replace(/&#176;|&deg;/g, "°")
    .replace(/&#186;|&ordm;/g, "º")
    .replace(/&#170;|&ordf;/g, "ª")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n");
}

function sessionOf(label) {
  const ordinal = label.match(/(\d)\s*[°ºª]/)?.[1];
  if (/entrenamiento|práctica|practica|ensayo|libre/i.test(label)) return { kind: "practica", name: `${ordinal ?? 1}° Entrenamiento` };
  if (/clasificaci/i.test(label)) return { kind: "clasificacion", name: "Clasificación" };
  if (/serie|batería|bateria/i.test(label)) return { kind: "serie", name: `Serie ${ordinal ?? 1}` };
  if (/sprint/i.test(label)) return { kind: "sprint", name: "Carrera sprint" };
  if (/final|carrera/i.test(label)) return { kind: "final", name: "Final" };
  return null;
}

const seriesOf = (label) => SERIES_TOKENS.find(([re]) => re.test(label))?.[1] ?? null;

/**
 * Lee un bloque de cronograma en texto plano.
 * Formatos aceptados: "Sábado 12 de septiembre" o "Sábado 27/06:" como encabezado de día, y líneas
 * "9.25 a 9.55 – 1° Entrenamiento TCP (Grupo A)" o "13.00: TC2000 – Final".
 */
export function parseSchedule(text, { year, defaultSeries = null } = {}) {
  const entries = [];
  let date = null;
  const dayHeader = new RegExp(`^(?:${DAYS})\\s+(\\d{1,2})(?:\\s*[°º])?(?:\\s+de\\s+([a-záéíóú]+)|\\s*\\/\\s*(\\d{1,2}))`, "i");
  const line = /^(\d{1,2})[.:](\d{2})\s*(?:(?:a|al|-|–)\s*(\d{1,2})[.:](\d{2}))?\s*(?:hs?\.?|horas)?\s*[:–—-]?\s*(.+)$/i;

  for (const raw of text.split("\n")) {
    const row = raw.trim();
    if (!row) continue;
    const day = row.match(dayHeader);
    if (day) {
      const month = day[2] ? MONTHS[day[2].toLowerCase()] : Number(day[3]);
      date = month ? `${year}-${pad(month)}-${pad(Number(day[1]))}` : null;
      const rest = row.slice(day[0].length).replace(/^[:\s]+/, "");
      if (!rest) continue;
    }
    if (!date) continue;
    const m = row.replace(new RegExp(`^(?:${DAYS})[^:]*:\\s*`, "i"), "").match(line);
    if (!m) continue;
    const label = m[5];
    if (/\bpor\b\s+(canal|tv|motorplay|dep|youtube)/i.test(label)) continue; // horarios de transmisión, no de pista
    const series = seriesOf(label) ?? defaultSeries;
    const session = sessionOf(label);
    if (!series || !session) continue;
    entries.push({
      seriesId: series,
      date,
      ...session,
      start: `${pad(Number(m[1]))}:${m[2]}`,
      end: m[3] ? `${pad(Number(m[3]))}:${m[4]}` : null,
      label,
    });
  }
  return groupParts(entries);
}

/** Une tandas partidas (grupos A/B, tercios, cuartos) en una sola sesión. */
function groupParts(entries) {
  const byKey = new Map();
  for (const e of entries) {
    const key = `${e.seriesId}|${e.date}|${e.name}`;
    const prev = byKey.get(key);
    if (!prev) byKey.set(key, { ...e });
    else {
      if (e.start < prev.start) prev.start = e.start;
      if (e.end && (!prev.end || e.end > prev.end)) prev.end = e.end;
    }
  }
  return [...byKey.values()];
}

/** Extrae la sección de cronograma de una nota (ignora la grilla de TV). */
export function scheduleSection(text) {
  const start = text.search(/^\s*cronograma\b.*$/im);
  return start === -1 ? text : text.slice(start);
}

// ——— Adaptadores ———

/** SoloTC (WordPress, robots.txt permite todo): notas "Horarios de TV y cronograma" de las categorías de la ACTC. */
export async function solotcNotes(io, { sinceDays = 200 } = {}) {
  const after = new Date(Date.now() - sinceDays * 86400000).toISOString().slice(0, 19);
  const url = `https://www.solotc.com.ar/wp-json/wp/v2/posts?categories=25,26,27,28,29,1180&search=cronograma&after=${after}&per_page=100&_fields=id,date,link,title,content`;
  const posts = JSON.parse(await io.text(url, { revalidate: 3600, headers: { "Accept-Encoding": "identity" } }));
  return posts
    .filter((p) => /cronograma/i.test(p.title.rendered))
    .map((p) => ({
      source: { id: "solotc", name: "SoloTC", official: false },
      url: p.link,
      published: p.date,
      title: htmlToText(p.title.rendered).trim(),
      text: scheduleSection(htmlToText(p.content.rendered)),
    }));
}

// ——— Consenso y aplicación ———

/**
 * Agrupa las sesiones de todas las fuentes. Una sesión queda "confirmed" si la publica una fuente oficial o si dos
 * fuentes distintas coinciden en el horario de inicio; si no, "tentative" (se muestra con su fuente).
 */
export function buildConsensus(notes, officialSchedules = []) {
  const bySession = new Map();
  for (const note of notes) {
    const year = Number(String(note.published).slice(0, 4));
    for (const s of parseSchedule(note.text, { year, defaultSeries: note.defaultSeries })) {
      const key = `${s.seriesId}|${s.date}|${s.name}`;
      const list = bySession.get(key) ?? [];
      if (!list.some((x) => x.source.id === note.source.id)) list.push({ ...s, source: note.source, url: note.url });
      bySession.set(key, list);
    }
  }
  const sessions = [];
  for (const list of bySession.values()) {
    const officialNote = list.find((x) => x.source.official);
    const counts = new Map();
    for (const x of list) counts.set(x.start, (counts.get(x.start) ?? 0) + 1);
    const [agreedStart, votes] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const chosen = officialNote ?? list.find((x) => x.start === agreedStart);
    const sources = list.map((x) => ({ name: x.source.name, url: x.url, start: x.start }));
    // Verificación oficial: el cronograma de la ACTC tiene una tanda del mismo tipo que empieza a esa hora ese día.
    const officialPdf = officialSchedules.find((o) => o.times.has(`${chosen.date}|${chosen.kind}|${chosen.start}`));
    if (officialPdf) sources.push({ name: "ACTC (cronograma oficial)", url: officialPdf.url, start: chosen.start });
    sessions.push({
      seriesId: chosen.seriesId,
      date: chosen.date,
      kind: chosen.kind,
      name: chosen.name,
      start: chosen.start,
      end: chosen.end,
      status: officialNote || officialPdf || votes >= 2 ? "confirmed" : "tentative",
      conflict: counts.size > 1,
      sources,
    });
  }
  return sessions.sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
}

const ORDER = { practica: 0, clasificacion: 1, serie: 2, sprint: 3, final: 4, carrera: 4 };
const DEFAULT_MINUTES = { practica: 30, clasificacion: 45, serie: 20, sprint: 30, final: 45, carrera: 50 };

/** Reemplaza las sesiones sin horario de cada fecha nacional por las del cronograma, conservando resultados. */
export function applySchedules(events, sessions) {
  let applied = 0;
  const updated = events.map((event) => {
    const lastDay = event.sessions.at(-1)?.start?.slice(0, 10);
    if (!lastDay || event.sessions.some((s) => s.timeKnown)) return event;
    const from = new Date(new Date(`${lastDay}T12:00:00-03:00`).getTime() - 3 * 86400000).toISOString().slice(0, 10);
    const found = sessions.filter((s) => s.seriesId === event.seriesId && s.date >= from && s.date <= lastDay);
    if (!found.some((s) => s.kind === "final" || s.kind === "carrera")) return event;
    applied++;
    const previousFinal = event.sessions.find((s) => s.kind === "final" || s.kind === "carrera");
    const next = found
      .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`) || ORDER[a.kind] - ORDER[b.kind])
      .map((s) => {
        const start = `${s.date}T${s.start}:00-03:00`;
        const minutes = s.end ? Math.max(5, (new Date(`${s.date}T${s.end}:00-03:00`) - new Date(start)) / 60000) : DEFAULT_MINUTES[s.kind];
        const isFinal = s.kind === "final" || s.kind === "carrera";
        return {
          id: `${event.id}-${s.kind}-${s.name.replace(/\W+/g, "").toLowerCase()}`,
          kind: s.kind,
          name: s.name,
          start,
          timeKnown: true,
          durationMin: minutes,
          timeStatus: s.status,
          timeSources: s.sources,
          ...(isFinal && previousFinal?.results ? { results: previousFinal.results } : {}),
        };
      });
    return { ...event, sessions: next };
  });
  return { events: updated, applied };
}
