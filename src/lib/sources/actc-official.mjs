// Cronogramas oficiales de la ACTC: cada nota de "horarios"/"cronograma" enlaza un PDF (generado desde Word).
// El PDF no incluye el nombre de la categoría en cada fila (va como imagen), así que no se usa como fuente
// independiente sino como verificación oficial: horarios por día y tipo de sesión.
import zlib from "node:zlib";

const CATEGORIES = ["tc", "tcp"];
const DAYS = /^(?:viernes|s[aá]bado|domingo|lunes|martes|mi[eé]rcoles|jueves)\s+(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i;
const MONTHS = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const pad = (n) => String(n).padStart(2, "0");

function inflateStreams(buf) {
  const raw = buf.toString("latin1");
  const out = [];
  let pos = 0;
  while ((pos = raw.indexOf("stream", pos)) !== -1) {
    let start = pos + 6;
    if (raw[start] === "\r") start++;
    if (raw[start] === "\n") start++;
    const end = raw.indexOf("endstream", start);
    if (end === -1) break;
    try {
      out.push(zlib.inflateSync(buf.subarray(start, end)).toString("latin1"));
    } catch {
      // stream sin comprimir o imagen
    }
    pos = end + 9;
  }
  return out;
}

function readString(s, i) {
  let depth = 1;
  let text = "";
  i++;
  while (i < s.length && depth > 0) {
    const c = s[i];
    if (c === "\\") {
      text += s[i + 1] ?? "";
      i += 2;
      continue;
    }
    if (c === "(") depth++;
    if (c === ")" && --depth === 0) break;
    text += c;
    i++;
  }
  return [text, i + 1];
}

/** Texto del PDF en orden de lectura (una línea por coordenada Y). Sin expresiones regulares costosas. */
export function pdfText(buf) {
  const lines = [];
  let page = 0;
  for (const content of inflateStreams(buf)) {
    if (!content.includes("BT")) continue;
    page++;
    let y = 0;
    let current = [];
    for (const rawLine of content.split("\n")) {
      const l = rawLine.trim();
      const tm = l.match(/^1 0 0 1 (\S+) (\S+) Tm$/);
      if (tm) {
        const ny = Math.round(Number(tm[2]));
        if (ny !== y && current.length) {
          lines.push({ page, y, text: current.join("") });
          current = [];
        }
        y = ny;
        continue;
      }
      if (l.endsWith("TJ") || l.endsWith("Tj")) {
        let i = 0;
        while ((i = l.indexOf("(", i)) !== -1) {
          const [text, next] = readString(l, i);
          current.push(text);
          i = next;
        }
      }
    }
    if (current.length) lines.push({ page, y, text: current.join("") });
  }
  return lines
    .sort((a, b) => a.page - b.page || b.y - a.y)
    .map((l) => l.text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function kindOf(label) {
  if (/entrenamiento/i.test(label)) return "practica";
  if (/clasificaci[oó]n/i.test(label) && !/carrera/i.test(label)) return "clasificacion";
  if (/serie/i.test(label)) return "serie";
  if (/final/i.test(label)) return "final";
  return null;
}

/** Horarios oficiales: conjunto de claves "fecha|tipo|HH:MM" (inicio de cada tanda). */
export function officialTimes(text) {
  const keys = new Set();
  let date = null;
  for (const raw of text.split("\n")) {
    const row = raw.trim();
    const day = row.match(DAYS);
    if (day) {
      const month = MONTHS[day[2].toLowerCase()];
      date = month ? `${day[3]}-${pad(month)}-${pad(Number(day[1]))}` : null;
      continue;
    }
    const m = row.match(/^(\d{1,2}):(\d{2})\s*(?:a\s*\d{1,2}:\d{2})?\s*Hs\.?\s*(.+)$/i);
    if (!date || !m) continue;
    const kind = kindOf(m[3]);
    if (kind) keys.add(`${date}|${kind}|${pad(Number(m[1]))}:${m[2]}`);
  }
  return keys;
}

/** Descubre las notas de cronograma recientes de TC y TC Pista y devuelve sus horarios oficiales. */
export async function actcOfficialSchedules(io) {
  const pdfs = new Map();
  for (const category of CATEGORIES) {
    const listing = await io.text(`https://actc.org.ar/${category}/noticias`, { revalidate: 3600 });
    const notes = [...new Set([...listing.matchAll(/href="(\/[a-z]+\/noticias\/[^"]+)"/g)].map((m) => m[1]))].filter((href) => /cronograma|horario/i.test(href));
    for (const href of notes.slice(0, 3)) {
      const html = await io.text(`https://actc.org.ar${href}`, { revalidate: 3600 });
      for (const m of html.matchAll(/(https:\/\/[^"'\s]+\.pdf)/g)) {
        if (!pdfs.has(m[1])) pdfs.set(m[1], `https://actc.org.ar${href}`);
      }
      await io.sleep(500);
    }
  }
  const schedules = [];
  for (const [pdfUrl, noteUrl] of pdfs) {
    try {
      const text = pdfText(Buffer.from(await io.bytes(pdfUrl, { revalidate: 6 * 3600 })));
      schedules.push({ url: noteUrl, pdfUrl, times: officialTimes(text) });
    } catch {
      // PDF ilegible: se ignora, no bloquea la temporada
    }
  }
  return schedules;
}
