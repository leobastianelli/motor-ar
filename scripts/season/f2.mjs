// Fórmula 2 2026 desde Wikipedia (en): calendario, resultados por carrera (desde la tabla de campeonato) y puntos.
import { tables, biggest, intOf, section, flagOf } from "../lib/wikitext.mjs";
import { FLAGICON_ISO, dateOnly, dayMonth, resultsFromStandings, wiki } from "./common.mjs";

export function f2Season() {
  const text = wiki("en-f2-2026");

  const teamOf = new Map();
  for (const r of tables(section(text, "Entries"))[0].rows) {
    const cells = r.cells.map((c) => c.text);
    if (cells.length >= 4 && intOf(cells[1]) !== null && cells[2]) teamOf.set(cells[2], { team: cells[0], number: intOf(cells[1]) });
  }

  const calendar = tables(section(text, "Race calendar"))[0]
    .rows.filter((r) => intOf(r.cells[0]?.text) !== null && r.cells.length >= 4)
    .map((r) => {
      const [circuitName, city] = r.cells[1].text.includes(",")
        ? [r.cells[1].text.slice(0, r.cells[1].text.lastIndexOf(",")).trim(), r.cells[1].text.slice(r.cells[1].text.lastIndexOf(",") + 1).trim()]
        : [r.cells[1].text, r.cells[1].text];
      return { round: intOf(r.cells[0].text), circuitName, city, flag: FLAGICON_ISO[flagOf(r.cells[1].raw)] ?? "", sprint: dayMonth(r.cells[2].text), feature: dayMonth(r.cells[3].text) };
    });

  const table = biggest(tables(section(text, "Drivers' Championship standings")));
  const rows = table.rows
    .filter((r) => intOf(r.cells[0]?.text) !== null && r.cells[1]?.text)
    .map((r) => ({ pos: intOf(r.cells[0].text), driver: r.cells[1].text, results: r.cells.slice(2, -1).map((c) => c.text), points: Number.parseFloat(r.cells.at(-1).text) || 0 }));

  const columns = calendar.length * 2;
  const perRace = resultsFromStandings(rows, columns, (d) => teamOf.get(d)?.team ?? "");

  const events = calendar.map((c) => {
    const i = (c.round - 1) * 2;
    const session = (kind, name, dm, index) => ({
      id: `f2-2026-${c.round}-${kind}`,
      kind,
      name,
      start: dateOnly(2026, dm.m, dm.d),
      timeKnown: false,
      durationMin: kind === "sprint" ? 45 : 65,
      ...(perRace[index]?.length ? { results: perRace[index] } : {}),
    });
    return {
      id: `f2-2026-${c.round}`,
      seriesId: "f2",
      round: c.round,
      name: c.city,
      circuit: { name: c.circuitName, city: c.city, country: "", flag: c.flag },
      sessions: [session("sprint", "Carrera sprint", c.sprint, i), session("carrera", "Carrera principal", c.feature, i + 1)],
      source: "Wikipedia · 2026 Formula 2 Championship",
    };
  });

  const standings = rows.map((r) => ({ pos: r.pos, driver: r.driver, team: teamOf.get(r.driver)?.team ?? "", points: r.points }));
  return { events, standings: { f2: standings }, meta: { f2: { source: "Wikipedia", numbers: Object.fromEntries([...teamOf].map(([d, v]) => [d, v.number])) } } };
}
