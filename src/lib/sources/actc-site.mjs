// Sitio oficial de la ACTC (actc.org.ar): la fuente de las seis categorías (TC, TC Pista, TC Mouras, TC Pista Mouras, TC Pick Up y
// TC Pista Pick Up) para cronogramas con hora y campeonato. El calendario lo lee actc.mjs de la misma web.
//
//  · Cronogramas: cada fin de semana la ACTC publica en las noticias de cada categoría una nota "Cronograma para el fin de semana…"
//    con la hora de cada tanda. Suele salir el viernes. Es fuente oficial: sus horarios quedan "confirmados".
//  · Campeonato: /{categoría}/campeonato trae la tabla con los puntos de cada fecha.
import { htmlToText } from "./schedule-notes.mjs";

const entities = (s) => s.replace(/&(\w+);/g, (m, n) => ({ aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ", uuml: "ü", ordm: "º", deg: "°" })[n] ?? m);

export const ACTC_CATEGORIES = [
  { path: "tc", seriesId: "tc" },
  { path: "tcp", seriesId: "tc-pista" },
  { path: "tcm", seriesId: "tc-mouras" },
  { path: "tcpm", seriesId: "tc-pista-mouras" },
  { path: "tcpk", seriesId: "tc-pick-up" },
  { path: "tcppk", seriesId: "tc-pista-pick-up" },
];

const pad = (n) => String(n).padStart(2, "0");
const MONTH_NAME = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WEEKDAYS = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
const plain = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Primer día ≥ `from` (AAAA-MM-DD) que cae en ese día de la semana. */
export function nextWeekday(from, weekday) {
  const d = new Date(`${from}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || !(weekday >= 0 && weekday <= 6)) throw new Error(`fecha o día inválido: ${from} / ${weekday}`);
  while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Del más específico al más general. `null`: lo que no es una categoría (el show de la recta principal) no se atribuye a la anterior.
const HEADINGS = [
  [/^formula 2$/, "F2"],
  [/^tc pista pick[ -]?up$/, "TCPPK"],
  [/^tc pick[ -]?up$/, "TCPK"],
  [/^tc pista mouras$/, "TCPM"],
  [/^tc mouras$/, "TCM"],
  [/^tc pista$/, "TCP"],
  [/^turismo carretera$/, "TC"],
  [/^espectaculo/, null],
];

const ORDINAL = { "1er": "1°", "2do": "2°", "3er": "3°", "4to": "4°", primer: "1°", primero: "1°", segundo: "2°", tercer: "3°", tercero: "3°" };

/**
 * Nota de cronograma de la ACTC → texto en el formato que entiende `parseSchedule` (encabezado "Sábado 15 de agosto" y líneas
 * "10:40 a 11:00 – 1° Entrenamiento TCPM"). Los días vienen sin fecha ("SÁBADO", "DOMINGO"): se ubican en el primer día así de la
 * semana desde la publicación de la nota.
 */
export function normalizeActcNote(text, publishedDay) {
  const out = [];
  let category = null;
  for (const raw of String(text).split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const day = plain(line).match(/^(viernes|sabado|domingo)\b[\s:.-]*$/);
    if (day) {
      const iso = nextWeekday(publishedDay, WEEKDAYS[day[1]]);
      const [y, m, d] = iso.split("-").map(Number);
      const name = line.replace(/[\s:.-]+$/, "").toLowerCase();
      out.push(`${name.charAt(0).toUpperCase()}${name.slice(1)} ${d} de ${MONTH_NAME[m - 1]} de ${y}`);
      category = null;
      continue;
    }
    // Encabezado de grupo del bloque "Todos los horarios" ("Fórmula 2", "TC Pista", "Turismo Carretera", "Espectáculo"): cambia la categoría de las líneas que siguen.
    const heading = HEADINGS.find(([re]) => re.test(plain(line).replace(/\s+/g, " ")));
    if (heading) {
      category = heading[1];
      continue;
    }
    // "TCPM" solo en una línea, o "TCPM | 10:40 a 11:00 Hs. …", o "TCPM| 13:08 …".
    const cat = line.match(/^(TCPPK|TCPK|TCPM|TCM|TCP|TC)\s*\|?\s*(.*)$/i);
    let rest = line;
    if (cat && (cat[2] === "" || /^\d{1,2}[:.]\d{2}/.test(cat[2]))) {
      category = cat[1].toUpperCase();
      rest = cat[2];
      if (!rest) continue;
    }
    const row = rest.match(/^(\d{1,2})[:.](\d{2})\s*(?:a\s*(\d{1,2})[:.](\d{2}))?\s*Hs?\.?\s*(.+)$/i);
    if (!row || !category) continue;
    const label = row[5]
      .replace(/^(1er|2do|3er|4to|primer|primero|segundo|tercer|tercero)\.?\s+/i, (m, o) => `${ORDINAL[o.toLowerCase()]} `)
      .replace(/\(.*?\)/g, "")
      .replace(/,\s*\d+\s*(vueltas?|min\.?).*$/i, "")
      .replace(/\s+\d+\s*(vueltas?|min\.?).*$/i, "")
      .replace(/\s{2,}/g, " ")
      .replace(/[,\s]+$/, "")
      .trim();
    out.push(`${pad(Number(row[1]))}:${row[2]}${row[3] ? ` a ${pad(Number(row[3]))}:${row[4]}` : ""} – ${label} ${category}`);
  }
  return out.join("\n");
}

/** Día de publicación de una nota de la ACTC: la firma "Prensa ACTC · 14/08/2026" o, si no está, la primera fecha AAAA-MM-DD de la página. */
export function publishedDay(html) {
  const signed = String(html).match(/(?:Prensa|Redacci[oó]n) ACTC[^0-9]{0,12}(\d{1,2})\/(\d{1,2})\/(20\d\d)/);
  if (signed) return `${signed[3]}-${pad(Number(signed[2]))}-${pad(Number(signed[1]))}`;
  return String(html).match(/\b(20\d\d-\d\d-\d\d)\b/)?.[1] ?? null;
}

/**
 * Notas de cronograma de las seis categorías, listas para `buildConsensus` (fuente oficial). Mira las notas más recientes de cada
 * categoría cuyo título hable de cronograma u horarios.
 */
export async function actcNotes(io, { perCategory = 2, minDay = null } = {}) {
  const notes = [];
  for (const { path, seriesId } of ACTC_CATEGORIES) {
    const listing = await io.text(`https://actc.org.ar/${path}/noticias`, { revalidate: 3600 });
    const hrefs = [...new Set([...listing.matchAll(/href="(\/[a-z]+\/noticias\/[^"?#]+)"/g)].map((m) => m[1]))]
      .filter((h) => /cronograma|horario/i.test(h))
      .sort((a, b) => (Number(b.match(/_(\d+)$/)?.[1]) || 0) - (Number(a.match(/_(\d+)$/)?.[1]) || 0))
      .slice(0, perCategory);
    for (const href of hrefs) {
      const html = await io.text(`https://actc.org.ar${href}`, { revalidate: 3600 });
      const clean = entities(htmlToText(html));
      const day = publishedDay(clean);
      if (!day || (minDay && day < minDay)) continue;
      const text = normalizeActcNote(clean, day);
      if (!text) continue;
      notes.push({
        source: { id: "actc", name: "ACTC (cronograma oficial)", official: true },
        url: `https://actc.org.ar${href}`,
        published: day,
        title: href.split("/").at(-1),
        text,
        defaultSeries: seriesId,
      });
      await io.sleep(400);
    }
    await io.sleep(300);
  }
  return notes;
}

// ——— Campeonato ———

const cell = (html) =>
  html
    .replace(/<sup[^>]*>([\s\S]*?)<\/sup>/g, " $1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();

const title = (s) => s.toLowerCase().replace(/(^|[\s-])([a-záéíóúñü])/g, (m, p, c) => p + c.toUpperCase());

/** "WERNER, MARIANO 2" → { driver: "Mariano Werner", wins: 2 }. El número al final son las victorias del año. */
export function actcDriver(raw) {
  const m = String(raw).trim().match(/^(.*?)(?:\s+(\d{1,2}))?$/);
  const name = m[1].trim();
  const [last, first] = name.includes(",") ? name.split(",").map((s) => s.trim()) : ["", name];
  return { driver: last ? `${title(first)} ${title(last)}` : title(name), wins: m[2] ? Number(m[2]) : 0 };
}

/**
 * Tabla de campeonato de una categoría de la ACTC: filas ordenadas y cuántas fechas cubre (una columna por fecha corrida).
 * Devuelve null si la página no trae una tabla reconocible: hay que fallar, no inventar una tabla vacía.
 */
export function parseActcStandings(html) {
  const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/g)].map((m) => m[0]);
  const head = tables.find((t) => /<th[^>]*>\s*Pos\s*<\/th>/i.test(t));
  const body = tables.find((t) => t !== head && /<td/i.test(t));
  if (!head || !body) return null;
  const dateColumns = [...head.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => cell(m[1])).filter((h) => /^\d{1,2}\/\d{1,2}\b/.test(h));
  const rows = [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
    .map((m) => [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => cell(c[1])))
    .filter((c) => /^\d+$/.test(c[0] ?? "") && c[2])
    .map((c) => {
      const { driver, wins } = actcDriver(c[2]);
      return { pos: Number(c[0]), driver, team: c[3] ?? "", points: Number.parseFloat(c[4]) || 0, wins, number: c[1] || undefined };
    });
  return rows.length ? { rows, asOfRound: dateColumns.length } : null;
}

/** Campeonato de cada categoría de la ACTC que se pida. Cada una falla por separado. */
export async function actcStandings(io, categories) {
  const standings = {};
  const meta = {};
  const failures = [];
  for (const { path, seriesId } of categories) {
    try {
      const url = `https://actc.org.ar/${path}/campeonato`;
      const parsed = parseActcStandings(await io.text(url, { revalidate: 1800 }));
      if (!parsed) throw new Error("la tabla no tiene el formato esperado");
      standings[seriesId] = parsed.rows.map(({ number, ...row }) => row);
      meta[seriesId] = { standingsLabel: "Tabla oficial de la ACTC", standingsAsOfRound: parsed.asOfRound, standingsSource: url };
    } catch (error) {
      failures.push(`Campeonato ACTC ${path}: ${error.message}`);
    }
    await io.sleep(400);
  }
  return { standings, meta, failures };
}
