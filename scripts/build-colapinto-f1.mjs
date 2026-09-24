// Arma src/data/colapinto/f1-races.json a partir de las descargas de Jolpica en research/.
// Uso: node scripts/build-colapinto-f1.mjs
import fs from "node:fs";
import { repairMojibake } from "../src/lib/sources/common.mjs";

const R = "research/";
// Las descargas de research/ se guardaron leyendo UTF-8 como Windows-1252 ("SÃ£o Paulo"): se reparan al leer.
const read = (f) => repairMojibake(fs.readFileSync(R + f, "utf8").replace(/^﻿/, ""));
const load = (f) => JSON.parse(read(f)).MRData.RaceTable.Races;
const TEAMMATE = { 2024: "albon", 2025: "gasly", 2026: "gasly" };

const races = [];
for (const season of [2024, 2025, 2026]) {
  const mate = TEAMMATE[season];
  const res = load(`jolpica-${season}-results.json`);
  const quali = load(`jolpica-${season}-qualifying.json`);
  const sprint = load(`jolpica-${season}-sprint.json`);
  const mateRes = load(`jolpica-${season}-${mate}-results.json`);
  const mateQuali = load(`jolpica-${season}-${mate}-qualifying.json`);

  for (const race of res) {
    const r = race.Results[0];
    const q = quali.find((x) => x.round === race.round);
    const s = sprint.find((x) => x.round === race.round);
    const mr = mateRes.find((x) => x.round === race.round);
    const mq = mateQuali.find((x) => x.round === race.round);
    races.push({
      season,
      round: Number(race.round),
      race: race.raceName,
      circuit: race.Circuit.circuitName,
      locality: race.Circuit.Location.locality,
      country: race.Circuit.Location.country,
      date: race.date,
      team: r.Constructor.name,
      quali: q ? Number(q.QualifyingResults[0].position) : null,
      grid: Number(r.grid),
      finish: r.positionText,
      finishPos: /^\d+$/.test(r.positionText) ? Number(r.positionText) : null,
      status: r.status,
      points: Number(r.points),
      laps: Number(r.laps),
      sprint: s ? { finish: s.SprintResults[0].positionText, points: Number(s.SprintResults[0].points) } : null,
      teammate: mr
        ? {
            driver: mr.Results[0].Driver.familyName,
            quali: mq ? Number(mq.QualifyingResults[0].position) : null,
            grid: Number(mr.Results[0].grid),
            finish: mr.Results[0].positionText,
            finishPos: /^\d+$/.test(mr.Results[0].positionText) ? Number(mr.Results[0].positionText) : null,
            points: Number(mr.Results[0].points),
          }
        : null,
    });
  }
}

const progression = JSON.parse(read("jolpica-2026-progression.json"));

fs.writeFileSync(
  "src/data/colapinto/f1-races.json",
  JSON.stringify(
    {
      source: "Jolpica-F1 API (api.jolpi.ca), descargado 2026-09-13",
      races,
      standings2026: progression.map((p) => ({
        round: p.round,
        position: Number(p.colapintoPos),
        points: Number(p.colapintoPts),
        teammatePosition: Number(p.gaslyPos),
        teammatePoints: Number(p.gaslyPts),
      })),
    },
    null,
    2,
  ),
);
console.log(`${races.length} carreras; con clasificación del compañero: ${races.filter((r) => r.teammate?.quali).length}`);
