// TC2000 2026 desde Wikipedia (es). El sitio oficial bloquea clientes automatizados, así que esta fuente
// está incompleta: fechas "por anunciar" se omiten y sólo hay ganador por fecha.
import { dateOnly, dayMonth } from "./common.mjs";
import { biggest, intOf, section, tables } from "./wikitext.mjs";

const CITY_BY_CIRCUIT = {
  "Circuito callejero de la Ciudad de Buenos Aires": "Buenos Aires",
  "Autódromo Eduardo Copello": "San Juan",
  "Autódromo Municipal Juan Manuel Fangio": "Rosario",
  "Autódromo Martín Miguel de Güemes": "Salta",
  "Autódromo Juan María Traverso": "San Nicolás",
};

const provinceOf = (raw) => raw.match(/bandera\|(?:Provincia de(?:l)?\s+)?([^}|]+)\}\}/i)?.[1]?.trim() ?? "";

export async function tc2000Season(io) {
  const text = await io.wiki("es-tc2000-2026");

  const winners = new Map();
  for (const r of tables(section(text, "Resultados"))[0]?.rows ?? []) {
    const round = intOf(r.cells[0]?.text);
    if (round !== null && r.cells[4]?.text) winners.set(round, { driver: r.cells[4].text, team: r.cells[5]?.text ?? "" });
  }

  const events = tables(section(text, "Calendario"))[0]
    .rows.map((r) => ({ round: intOf(r.cells[0]?.text), circuit: r.cells[1]?.text ?? "", province: provinceOf(r.cells[1]?.raw ?? ""), dm: dayMonth(r.cells[2]?.text ?? "") }))
    .filter((r) => r.round !== null && r.dm)
    .map((r) => {
      const winner = winners.get(r.round);
      const city = CITY_BY_CIRCUIT[r.circuit] ?? r.province;
      return {
        id: `tc2000-2026-${r.round}`,
        seriesId: "tc2000",
        round: r.round,
        name: `Fecha ${r.round} · ${city}`,
        circuit: { name: r.circuit, city, country: "Argentina", flag: "AR", province: r.province },
        sessions: [
          {
            id: `tc2000-2026-${r.round}-race`,
            kind: "carrera",
            name: "Carrera",
            start: dateOnly(2026, r.dm.m, r.dm.d),
            timeKnown: false,
            durationMin: 50,
            ...(winner ? { results: [{ pos: 1, driver: winner.driver, team: winner.team }] } : {}),
          },
        ],
        source: "Wikipedia · Temporada 2026 de TC2000",
      };
    });

  let standings = [];
  try {
    standings = biggest(tables(section(text, "Campeonato de Pilotos")))
      .rows.filter((r) => intOf(r.cells[0]?.text) !== null && r.cells[1]?.text)
      .map((r) => ({ pos: intOf(r.cells[0].text), driver: r.cells[1].text, team: "", points: Number.parseFloat(r.cells.at(-1).text) || 0 }));
  } catch {
    standings = [];
  }

  return { events, standings: { tc2000: standings }, meta: { tc2000: { incomplete: true } } };
}
