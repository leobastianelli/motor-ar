// Convierte las tablas "Complete ... results" del wikitext de Wikipedia en JSON.
// Uso: node scripts/parse-wiki-results.mjs research/wiki-en-colapinto.txt src/data/colapinto/junior-results.json
import fs from "node:fs";

const [input, output] = process.argv.slice(2);
const text = fs.readFileSync(input, "utf8");

const SERIES = {
  "F4 Spanish Championship": "F4 España",
  "Euroformula Open Championship": "Euroformula Open",
  "Formula Renault Eurocup": "Fórmula Renault Eurocup",
  "Toyota Racing Series": "Toyota Racing Series",
  "Asian Le Mans Series": "Asian Le Mans Series",
  "Formula Regional European Championship": "Fórmula Regional Europea (FRECA)",
  "European Le Mans Series": "European Le Mans Series",
  "FIA Formula 3 Championship": "Fórmula 3 FIA",
  "FIA Formula 2 Championship": "Fórmula 2 FIA",
};

const CELL =
  /('+)?\[\[[^\]|]+\|(?:<span[^>]*>)?([A-ZÜ]{2,4})(?:<br \/>(\w+))?(?:<\/span>)?\]\]'*<br \/>\{\{small\|([^}]+)\}\}/g;

const stripLinks = (s) => s.replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, "$1").trim();

const seasons = [];
for (const [title, name] of Object.entries(SERIES)) {
  const start = text.indexOf(`=== Complete ${title} results ===`);
  if (start === -1) throw new Error(`Sección no encontrada: ${title}`);
  const end = text.indexOf("\n==", start + 10);
  const section = text.slice(start, end === -1 ? undefined : end);

  for (const row of section.split(/\n\|-\n/)) {
    const year = row.match(/\[\[(\d{4}) [^\]|]*\|\d{4}\]\]|\{\{FIAF3\|(\d{4})\}\}/);
    if (!year) continue;
    const bangLines = [...row.matchAll(/^!\s*(?:style="[^"]*"\s*\|\s*)?(.+)$/gm)].map((m) => m[1].trim());
    const teamLine = bangLines.find((l) => /^(scope="row"\s*)?nowrap\|/.test(l) || /^nowrap/.test(l)) ?? bangLines[0];
    const races = [...row.matchAll(CELL)].map((m) => {
      const quotes = m[1]?.length ?? 0;
      const result = m[4].trim();
      const pos = Number.parseInt(result, 10);
      return {
        circuit: m[2],
        race: m[3] ?? null,
        result,
        position: Number.isNaN(pos) ? null : pos,
        pole: quotes === 3 || quotes === 5,
        fastestLap: quotes === 2 || quotes === 5,
      };
    });
    if (races.length === 0) continue;
    const [position, points] = bangLines.slice(-2).map((l) => l.replace(/'''/g, "").trim());
    seasons.push({
      series: name,
      season: Number(year[1] ?? year[2]),
      team: stripLinks(teamLine.replace(/^(scope="row"\s*)?nowrap\|\s*/, "")),
      championshipPosition: position,
      points: Number(points),
      races,
    });
  }
}

seasons.sort((a, b) => a.season - b.season);
fs.writeFileSync(
  output,
  JSON.stringify({ source: "Wikipedia (en) – Franco Colapinto, wikitext descargado 2026-09-13. Licencia CC BY-SA 4.0.", seasons }, null, 2),
);
for (const s of seasons) {
  const wins = s.races.filter((r) => r.position === 1).length;
  console.log(`${s.season} ${s.series} (${s.team}): ${s.races.length} carreras, ${wins} victorias, ${s.championshipPosition}, ${s.points} pts`);
}
