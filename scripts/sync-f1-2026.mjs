// Descarga datos reales de F1 2026 desde Jolpica-F1 y los guarda en src/data/f1-2026.json.
// Uso: node scripts/sync-f1-2026.mjs
import fs from "node:fs";

const BASE = "https://api.jolpi.ca/ergast/f1";

async function get(path) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(BASE + path, { headers: { "User-Agent": "pista-motor-ar/0.1" } });
      if (res.ok) return (await res.json()).MRData;
    } catch {
      // reintento
    }
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
  throw new Error(`No se pudo descargar ${path}`);
}

const fullName = (d) => `${d.givenName} ${d.familyName}`;

const standingsData = await get("/2026/driverstandings.json?limit=40");
const list = standingsData.StandingsTable.StandingsLists[0];
const monza = (await get("/2026/13/results.json")).RaceTable.Races[0];
const madridQ = (await get("/2026/14/qualifying.json")).RaceTable.Races[0];

const out = {
  source: "Jolpica-F1 API (api.jolpi.ca)",
  fetchedAt: new Date().toISOString(),
  standingsAfterRound: Number(list.round),
  standings: list.DriverStandings.map((s) => ({
    position: Number(s.position),
    driver: fullName(s.Driver),
    code: s.Driver.code,
    driverId: s.Driver.driverId,
    team: s.Constructors.at(-1)?.name ?? "",
    points: Number(s.points),
    wins: Number(s.wins),
  })),
  monza: {
    raceName: monza.raceName,
    date: monza.date,
    results: monza.Results.map((r) => ({
      pos: Number(r.position),
      driver: fullName(r.Driver),
      code: r.Driver.code,
      driverId: r.Driver.driverId,
      team: r.Constructor.name,
      grid: Number(r.grid),
      gap: r.Time?.time ?? r.status,
      points: Number(r.points),
    })),
  },
  madridQualifying: {
    raceName: madridQ.raceName,
    date: madridQ.date,
    results: madridQ.QualifyingResults.map((r) => ({
      pos: Number(r.position),
      driver: fullName(r.Driver),
      code: r.Driver.code,
      driverId: r.Driver.driverId,
      team: r.Constructor.name,
      gap: r.Q3 || r.Q2 || r.Q1 || "",
    })),
  },
};

fs.writeFileSync("src/data/f1-2026.json", JSON.stringify(out, null, 2));
console.log(
  `Campeonato tras fecha ${out.standingsAfterRound}: ${out.standings.length} pilotos · Monza: ${out.monza.results.length} · Clasificación Madrid: ${out.madridQualifying.results.length}`,
);
