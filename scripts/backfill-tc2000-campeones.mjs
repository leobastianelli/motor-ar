// Suma a la instantánea las fechas de TC2000 leídas de las notas guardadas por crawl-campeones-tc2000.mjs.
// Después, cada sincronización las conserva en meta.tc2000.campeones y completa lo nuevo desde el feed.
// Uso: node scripts/backfill-tc2000-campeones.mjs && npm run sync:season
import fs from "node:fs";
import { mergeWeekends, parseWeekends } from "../src/lib/sources/tc2000-campeones.mjs";
import { applyCampeones, tc2000Names } from "../src/lib/sources/tc2000.mjs";

const SEASON = "src/data/season-2026.json";
const posts = JSON.parse(fs.readFileSync("research/campeones/posts.json", "utf8"));
const season = JSON.parse(fs.readFileSync(SEASON, "utf8"));
const current = season.events.filter((e) => e.seriesId === "tc2000");

const weekends = mergeWeekends(season.meta?.tc2000?.campeones, parseWeekends(posts, tc2000Names(current, season.standings?.tc2000)));
for (const w of weekends) console.log(`${w.raceDay} · fecha ${w.round ?? "?"} · ${w.city} · ${w.raceTime ?? "--:--"} · pole ${w.pole ?? "-"} · ganó ${w.winner ?? "-"}`);

season.meta = { ...season.meta, tc2000: { ...season.meta?.tc2000, campeones: weekends } };
season.events = [...season.events.filter((e) => e.seriesId !== "tc2000"), ...applyCampeones(current, weekends)].sort(
  (a, b) => new Date(a.sessions[0].start) - new Date(b.sessions[0].start),
);
fs.writeFileSync(SEASON, JSON.stringify(season, null, 2));
console.log(`${weekends.length} fines de semana de TC2000 → ${SEASON}`);
