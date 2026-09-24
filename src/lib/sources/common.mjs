// Utilidades compartidas por las fuentes de temporada. No hacen I/O: las fuentes reciben un objeto `io`
// ({ text(url, { revalidate }), json(url, { revalidate }), wiki(key), sleep(ms) }) para correr igual
// en los scripts de Node y dentro de Next (con caché de fetch).

export const pad = (n) => String(n).padStart(2, "0");

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  ene: 1, feb: 2, mar: 3, abr: 4, jun: 6, jul: 7, ago: 8, sep: 9, sept: 9, oct: 10, nov: 11, dic: 12,
};

/** "7 March", "March 1", "15 de marzo", "15 feb" → { m, d } */
export function dayMonth(text) {
  const s = String(text).toLowerCase();
  let m = s.match(/(\d{1,2})\s*(?:de\s+)?([a-záéíóú]+)/);
  if (m && MONTHS[m[2]]) return { d: Number(m[1]), m: MONTHS[m[2]] };
  m = s.match(/([a-z]+)\s+(\d{1,2})/);
  if (m && MONTHS[m[1]]) return { d: Number(m[2]), m: MONTHS[m[1]] };
  return null;
}

/** Fecha sin horario conocido: mediodía argentino, sólo para ordenar y agrupar por día. */
export const dateOnly = (y, m, d) => `${y}-${pad(m)}-${pad(d)}T12:00:00-03:00`;

/** Hora del Este de EE. UU. en 2026 (horario de verano del 8/3 al 1/11). */
export function easternIso(y, m, d, timeText) {
  const t = String(timeText).toLowerCase().match(/(\d{1,2})(?::(\d{2}))?\s*(a|p)\.?\s*m/);
  if (!t) return null;
  let h = Number(t[1]) % 12;
  if (t[3] === "p") h += 12;
  const dst = Date.UTC(y, m - 1, d) >= Date.UTC(2026, 2, 8) && Date.UTC(y, m - 1, d) < Date.UTC(2026, 10, 1);
  return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${t[2] ?? "00"}:00${dst ? "-04:00" : "-05:00"}`;
}

export const FLAGICON_ISO = {
  AUS: "AU", USA: "US", CAN: "CA", MON: "MC", MCO: "MC", ESP: "ES", AUT: "AT", GBR: "GB", UK: "GB", BEL: "BE", HUN: "HU",
  ITA: "IT", AZE: "AZ", QAT: "QA", ARE: "AE", UAE: "AE", NLD: "NL", NED: "NL", BRA: "BR", MEX: "MX", JPN: "JP", CHN: "CN",
  SGP: "SG", BHR: "BH", SAU: "SA", ARG: "AR", DEU: "DE", GER: "DE", FRA: "FR", POR: "PT", PRT: "PT", MYS: "MY",
};

export const COUNTRY_ISO = {
  Australia: "AU", China: "CN", Japan: "JP", USA: "US", "United States": "US", Canada: "CA", Monaco: "MC", Spain: "ES",
  Austria: "AT", UK: "GB", "United Kingdom": "GB", Belgium: "BE", Hungary: "HU", Netherlands: "NL", Italy: "IT",
  Azerbaijan: "AZ", Singapore: "SG", Mexico: "MX", Brazil: "BR", Qatar: "QA", UAE: "AE", "United Arab Emirates": "AE",
  Bahrain: "BH", "Saudi Arabia": "SA", Malaysia: "MY", Argentina: "AR",
};

/** "APELLIDO, NOMBRE" → "Nombre Apellido" */
export function properName(text) {
  // Se repara antes de pasar a minúscula: después, "CALDERÃ“N" sería "Calderã“n" y la lectura rota quedaría escondida.
  const t = repairMojibake(String(text)).trim().replace(/\s+/g, " ");
  const [last, first] = t.includes(",") ? t.split(",").map((s) => s.trim()) : [null, t];
  const title = (s) => s.toLowerCase().replace(/(^|[\s-])([a-záéíóúñü])/g, (m, p, c) => p + c.toUpperCase());
  return last ? `${title(first)} ${title(last)}` : title(t);
}

/** Resultados por carrera a partir de una tabla de campeonato con una columna por carrera. */
export function resultsFromStandings(rows, columnCount, driverTeam = () => "") {
  const perRace = Array.from({ length: columnCount }, () => []);
  for (const row of rows) {
    row.results.forEach((cell, i) => {
      const pos = String(cell).match(/^\s*(\d+)/)?.[1];
      if (pos && i < columnCount) perRace[i].push({ pos: Number(pos), driver: row.driver, team: driverTeam(row.driver) });
    });
  }
  return perRace.map((list) => list.sort((a, b) => a.pos - b.pos));
}

// Windows-1252 → byte, para los caracteres que caen fuera de Latin-1 (0x80–0x9F).
const CP1252 = { 0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f };

const byteOf = (ch) => {
  const code = ch.codePointAt(0);
  return code < 256 ? code : CP1252[code];
};
// Un carácter que, leído como Windows-1252, fue un byte de continuación de UTF-8 (0x80–0xBF): los de Latin-1 y los signos propios de 1252.
const SIGNS = `[${Object.keys(CP1252).map((c) => `\\u${Number(c).toString(16).padStart(4, "0")}`).join("")}]`;
const CONT = `(?:[\\u0080-\\u00bf]|${SIGNS})`;
// "Ã¡" (dos bytes: á é í ó ú ñ Á É Í Ó Ú Ñ…), "Â°" y "â€™" (tres bytes: comillas y guiones tipográficos). Y la misma "Ã" pasada a minúscula
// por un "Nombre Propio" hecho después de leer mal ("CALDERÃ“N" → "Calderã“n", "PERNÃ­A" → "Pernãa"). Una "ã" portuguesa real puede ir
// seguida de un espacio duro o de una comilla o un guion ("irmã”"), así que en minúscula el espacio duro no cuenta y los signos de 1252
// sólo cuentan dentro de una palabra.
const MOJIBAKE = new RegExp(`[ÂÃ]${CONT}|â${CONT}{2}|ã(?:[\\u0080-\\u009f\\u00a1-\\u00bf]|${SIGNS}(?=\\p{L}))`, "gu");
const utf8 = new TextDecoder("utf-8", { fatal: true });

/**
 * Repara texto UTF-8 que se leyó como Windows-1252 ("OberÃ¡" → "Oberá", "CalderÃ“N" → "CalderÓN", "Calderã“n" → "Calderón"). Repara cada
 * tramo roto por separado, así una página con partes bien escritas y partes rotas queda bien entera; lo que no es UTF-8 válido queda igual.
 */
export function repairMojibake(text) {
  const fix = (s) =>
    s.replace(MOJIBAKE, (seq) => {
      const lower = seq[0] === "ã";
      const bytes = [lower ? 0xc3 : byteOf(seq[0]), ...[...seq.slice(1)].map(byteOf)];
      try {
        const ch = utf8.decode(Uint8Array.from(bytes));
        return lower ? ch.toLowerCase() : ch;
      } catch {
        return seq;
      }
    });
  // Dos pasadas: el texto que se leyó mal dos veces ("ÃƒÂ¡") queda bien en la segunda.
  const once = fix(String(text));
  return once === text ? text : fix(once);
}
