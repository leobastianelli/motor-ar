// IndyCar 2026 desde Wikipedia (en): calendario con hora (ET), resultados por carrera y campeonato.
import { dateOnly, dayMonth, easternIso, resultsFromStandings } from "./common.mjs";
import { biggest, intOf, section, tables } from "./wikitext.mjs";

export async function indycarSeason(io) {
  const text = await io.wiki("en-indycar-2026");

  const schedule = tables(section(text, "Schedule"))
    .find((t) => t.rows[0]?.cells.some((c) => c.text === "Rd."))
    .rows.filter((r) => intOf(r.cells[0]?.text) !== null && r.cells.length >= 6)
    .map((r) => {
      const dm = dayMonth(r.cells[1].text);
      const timed = dm ? easternIso(2026, dm.m, dm.d, r.cells[5].text) : null;
      return {
        round: intOf(r.cells[0].text),
        name: r.cells[2].text,
        track: r.cells[3].text,
        city: r.cells[4].text.split(",")[0].trim(),
        start: timed ?? (dm ? dateOnly(2026, dm.m, dm.d) : null),
        timeKnown: Boolean(timed),
      };
    })
    .filter((s) => s.start);

  const table = biggest(tables(section(text, "Driver standings")));
  const rows = table.rows
    .filter((r) => intOf(r.cells[0]?.text) !== null && r.cells[1]?.text)
    .map((r) => ({ pos: intOf(r.cells[0].text), driver: r.cells[1].text, results: r.cells.slice(2, -1).map((c) => c.text), points: intOf(r.cells.at(-1).text) ?? 0 }));
  const perRace = resultsFromStandings(rows, schedule.length);

  const events = schedule.map((s, i) => ({
    id: `indycar-2026-${s.round}`,
    seriesId: "indycar",
    round: s.round,
    name: s.name,
    circuit: { name: s.track, city: s.city, country: "Estados Unidos", flag: "US" },
    sessions: [
      {
        id: `indycar-2026-${s.round}-race`,
        kind: "carrera",
        name: "Carrera",
        start: s.start,
        timeKnown: s.timeKnown,
        durationMin: 180,
        ...(perRace[i]?.length ? { results: perRace[i] } : {}),
      },
    ],
    source: "Wikipedia · 2026 IndyCar Series",
  }));

  return { events, standings: { indycar: rows.map((r) => ({ pos: r.pos, driver: r.driver, team: "", points: r.points })) }, meta: {} };
}
