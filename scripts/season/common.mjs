import fs from "node:fs";

export const UA = { "User-Agent": "pista-motor-ar/0.1 (leonelbastianelli@gmail.com)" };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const wiki = (key) => fs.readFileSync(`research/wiki/${key}.txt`, "utf8");
export const pad = (n) => String(n).padStart(2, "0");

export async function getText(url, { attempts = 4 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (res.ok) return await res.text();
    } catch {
      // reintento
    }
    await sleep(1500 * attempt);
  }
  throw new Error(`No se pudo descargar ${url}`);
}

export const getJson = async (url) => JSON.parse(await getText(url));

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

/** Fecha sin horario conocido: mediodía argentino, solo para ordenar y agrupar por día. */
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

export const slug = (s) =>
  String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** "APELLIDO, NOMBRE" → "Nombre Apellido" */
export function properName(text) {
  const t = String(text).trim().replace(/\s+/g, " ");
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
