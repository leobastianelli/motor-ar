// Archivo histórico por categoría: campeones por año y récords derivados.
// Fuentes: Wikipedia (CC BY-SA 4.0) y Jolpica-F1. Requiere scripts/fetch-wiki.mjs.
// Uso: node scripts/sync-history.mjs
import fs from "node:fs";
import { repairMojibake } from "../src/lib/sources/common.mjs";
import { wikiRawUrl } from "../src/lib/sources/wiki-pages.mjs";
import { clean, flagOf, intOf, section, tables, texts } from "../src/lib/sources/wikitext.mjs";

const pages = {};
for (const key of ["es-tc", "es-tc2000", "es-tn", "en-f2"]) {
  const res = await fetch(wikiRawUrl(key), { headers: { "User-Agent": "fierros-motor-ar/0.1 (leonelbastianelli@gmail.com)" } });
  if (!res.ok) throw new Error(`No se pudo descargar ${key}: ${res.status}`);
  pages[key] = await res.text();
  await new Promise((r) => setTimeout(r, 400));
}
const wiki = (key) => pages[key];
const url = (lang, title) => `https://${lang}.wikipedia.org/wiki/${title}`;
const WIKI_LICENSE = "CC BY-SA 4.0";
const brand = (s) => (s || "").split(" ")[0];
const isData = (row) => row.cells.some((c) => !c.header);

function summarize(champions, makeLabel) {
  const byDriver = new Map();
  for (const c of champions) {
    const entry = byDriver.get(c.driver) ?? { driver: c.driver, titles: 0, years: [] };
    entry.titles++;
    entry.years.push(c.year);
    byDriver.set(c.driver, entry);
  }
  const byMake = new Map();
  for (const c of champions) if (c.make) byMake.set(c.make, (byMake.get(c.make) ?? 0) + 1);
  const years = champions.map((c) => c.year);
  return {
    firstYear: Math.min(...years),
    lastYear: Math.max(...years),
    seasons: new Set(years).size,
    distinctChampions: byDriver.size,
    topChampions: [...byDriver.values()].sort((a, b) => b.titles - a.titles || a.years[0] - b.years[0]).slice(0, 6),
    makeLabel,
    topMakes: [...byMake.entries()].map(([name, titles]) => ({ name, titles })).sort((a, b) => b.titles - a.titles).slice(0, 6),
  };
}

function tc() {
  const table = tables(section(wiki("es-tc"), "Campeones"))[0];
  const champions = table.rows
    .filter(isData)
    .map(texts)
    .filter((c) => /^\d{4}$/.test(c[0]) && c[1])
    .map((c) => ({ year: Number(c[0]), driver: c[1], detail: c[2], make: brand(c[2]) }));
  const winsLeaders = section(wiki("es-tc"), "Pilotos con más carreras ganadas")
    .split("\n")
    .filter((l) => l.startsWith("*"))
    .map((l) => clean(l.slice(1)).match(/^(.+?):\s*(\d+)\s+victorias/))
    .filter(Boolean)
    .map((m) => ({ driver: m[1], wins: Number(m[2]) }))
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 5);
  return {
    source: { label: "Wikipedia · Turismo Carretera", url: url("es", "Turismo_Carretera"), license: WIKI_LICENSE },
    champions,
    winsLeaders,
    ...summarize(champions, "Marcas campeonas"),
  };
}

function tc2000() {
  const table = tables(section(wiki("es-tc2000"), "Campeones"))[0];
  const champions = table.rows
    .map(texts)
    .filter((c) => /^\d{4}$/.test(c[0]) && c[1])
    .map((c) => ({ year: Number(c[0]), driver: c[1], detail: [c[2], c[3]].filter(Boolean).join(" · "), make: brand(c[2]) }));
  return {
    source: { label: "Wikipedia · Turismo Competición 2000", url: url("es", "Turismo_Competición_2000"), license: WIKI_LICENSE },
    champions,
    ...summarize(champions, "Marcas campeonas"),
  };
}

function tn() {
  const table = tables(section(wiki("es-tn"), "Campeones"))[0];
  const champions = table.rows
    .map(texts)
    .filter((c) => /^\d{4}/.test(c[0]) && c[2])
    .map((c) => ({ year: Number(c[0].slice(0, 4)), driver: c[2], detail: `${c[1]} · ${c[3]}`, make: brand(c[3]), group: c[1] }));
  return {
    source: { label: "Wikipedia · Turismo Nacional", url: url("es", "Turismo_Nacional"), license: WIKI_LICENSE },
    champions,
    note: "Campeones de todas las clases. Hoy se corren la Clase 2 y la Clase 3.",
    ...summarize(champions, "Marcas campeonas"),
  };
}

function f1() {
  // La descarga se guardó leyendo UTF-8 como Windows-1252 ("HÃ¤kkinen"): se repara al leer.
  const rows = JSON.parse(repairMojibake(fs.readFileSync("research/jolpica-f1-champions.json", "utf8").replace(/^﻿/, "")));
  const champions = rows.map((r) => ({ year: r.season, driver: r.driver, detail: r.team, make: r.team, argentine: r.nationality === "Argentine" }));
  return {
    source: { label: "Jolpica-F1 API", url: "https://api.jolpi.ca/ergast/f1/", license: "Datos abiertos" },
    champions,
    argentineTitles: champions.filter((c) => c.argentine).length,
    ...summarize(champions, "Equipos campeones"),
  };
}

function f2() {
  const table = tables(section(wiki("en-f2"), "Drivers' Championship"))[0];
  const champions = table.rows
    .filter((r) => /^\d{4}$/.test(r.cells[0]?.text))
    .map((r) => ({
      year: Number(r.cells[0].text),
      driver: r.cells[1].text,
      detail: r.cells[2].text,
      make: r.cells[2].text,
      argentine: flagOf(r.cells[1].raw) === "ARG",
      wins: intOf(r.cells[4].text),
    }));
  return {
    source: { label: "Wikipedia · FIA Formula 2 Championship", url: url("en", "FIA_Formula_2_Championship"), license: WIKI_LICENSE },
    champions,
    ...summarize(champions, "Equipos campeones"),
  };
}

const series = { tc: tc(), tc2000: tc2000(), tn: tn(), f1: f1(), f2: f2() };
fs.writeFileSync("src/data/history.json", JSON.stringify({ generatedAt: new Date().toISOString(), series }, null, 2));

for (const [id, h] of Object.entries(series)) {
  const top = h.topChampions[0];
  const last = h.champions.at(-1);
  console.log(
    `${id.padEnd(8)} ${h.champions.length} campeones (${h.firstYear}–${h.lastYear}) · máximo: ${top.driver} ${top.titles} · último: ${last.year} ${last.driver}`,
  );
}
