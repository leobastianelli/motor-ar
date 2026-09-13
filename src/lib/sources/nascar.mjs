// NASCAR Cup 2026 desde Wikipedia (en): calendario con hora (ET), resultados por carrera y campeonato.
import { dateOnly, dayMonth, easternIso } from "./common.mjs";
import { biggest, intOf, section, tables } from "./wikitext.mjs";

export async function nascarSeason(io) {
  const text = await io.wiki("en-nascar-2026");

  const schedule = tables(section(text, "Schedule"))
    .find((t) => t.rows[0]?.cells.some((c) => /Race name/i.test(c.text)))
    .rows.filter((r) => intOf(r.cells[0]?.text) !== null && r.cells.length >= 6)
    .map((r) => {
      const dm = dayMonth(r.cells[4].text);
      const timed = dm ? easternIso(2026, dm.m, dm.d, r.cells[5].text) : null;
      return {
        round: intOf(r.cells[0].text),
        name: r.cells[1].text,
        track: r.cells[2].text,
        city: r.cells[3].text.split(",")[0].trim(),
        start: timed ?? (dm ? dateOnly(2026, dm.m, dm.d) : null),
        timeKnown: Boolean(timed),
      };
    })
    .filter((s) => s.start);

  const table = biggest(tables(section(text, "Drivers' championship")));
  const header = table.rows[0].cells.map((c) => c.text);
  const ptsIndex = header.findIndex((h) => /^Pts/i.test(h));
  const separator = header.findIndex((h, i) => i > 1 && i < ptsIndex && h === "");
  const raceIndexes = header.map((_, i) => i).filter((i) => i > 1 && i < ptsIndex && i !== separator);

  const perRace = raceIndexes.map(() => []);
  const standings = [];
  for (const r of table.rows.slice(1)) {
    const cells = r.cells.map((c) => c.text);
    if (intOf(cells[0]) === null || !cells[1]) continue;
    if (separator !== -1 && cells.length === header.length - 1) cells.splice(separator, 0, "");
    raceIndexes.forEach((col, i) => {
      const pos = intOf(cells[col]);
      if (pos !== null) perRace[i].push({ pos, driver: cells[1], team: "" });
    });
    standings.push({ pos: intOf(cells[0]), driver: cells[1], team: "", points: intOf(cells[ptsIndex]) ?? 0 });
  }
  perRace.forEach((list) => list.sort((a, b) => a.pos - b.pos));

  const events = schedule.map((s, i) => ({
    id: `nascar-2026-${s.round}`,
    seriesId: "nascar",
    round: s.round,
    name: s.name,
    circuit: { name: s.track, city: s.city, country: "Estados Unidos", flag: "US" },
    sessions: [
      {
        id: `nascar-2026-${s.round}-race`,
        kind: "carrera",
        name: "Carrera",
        start: s.start,
        timeKnown: s.timeKnown,
        durationMin: 210,
        ...(perRace[i]?.length ? { results: perRace[i] } : {}),
      },
    ],
    source: "Wikipedia · 2026 NASCAR Cup Series",
  }));

  return { events, standings: { nascar: standings }, meta: {} };
}
