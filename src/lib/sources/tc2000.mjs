// TC2000 2026. El sitio oficial no permite clientes automatizados, así que se combinan dos fuentes abiertas:
// Wikipedia (es), con el calendario de las primeras fechas, y las notas de Campeones (tc2000-campeones.mjs), que suman
// fechas nuevas, hora de la carrera, pole y ganador de cada fin de semana. Lo leído de Campeones se guarda en
// meta.tc2000.campeones y se completa en cada sincronización, así que nada se pierde cuando la nota sale del feed.
import { dateOnly, dayMonth } from "./common.mjs";
import { CAMPEONES, campeonesFeed, mergeWeekends, parseWeekends } from "./tc2000-campeones.mjs";
import { biggest, intOf, section, tables } from "./wikitext.mjs";

const CITY_BY_CIRCUIT = {
  "Circuito callejero de la Ciudad de Buenos Aires": "Buenos Aires",
  "Autódromo Eduardo Copello": "San Juan",
  "Autódromo Municipal Juan Manuel Fangio": "Rosario",
  "Autódromo Martín Miguel de Güemes": "Salta",
  "Autódromo Juan María Traverso": "San Nicolás",
};

const provinceOf = (raw) => raw.match(/bandera\|(?:Provincia de(?:l)?\s+)?([^}|]+)\}\}/i)?.[1]?.trim() ?? "";
const DAY = 86400000;

async function wikiPart(io) {
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
            ...(winner ? { results: [{ pos: 1, driver: winner.driver, team: winner.team, gap: "" }] } : {}),
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
  return { events, standings, roundsWithResults: winners.size };
}

const dayOf = (iso) => iso.slice(0, 10);
const shiftDay = (ymd, days) => new Date(Date.parse(`${ymd}T12:00:00Z`) + days * DAY).toISOString().slice(0, 10);

/** Suma a las fechas lo que publicó Campeones; crea las que Wikipedia todavía no tiene. */
export function applyCampeones(events, weekends) {
  const out = events.map((e) => ({ ...e, sessions: [...e.sessions] }));
  for (const w of weekends) {
    // Por número de fecha sólo se acepta un evento que caiga cerca en el calendario (una fecha reprogramada, no otra): el número que sale de las
    // notas es un voto de ordinales y a veces se equivoca; pegarle a otra fecha los datos de este finde mezcla dos carreras en una.
    let event =
      out.find((e) => Math.abs(Date.parse(dayOf(e.sessions.at(-1).start)) - Date.parse(w.raceDay)) <= 3 * DAY) ??
      (w.round ? out.find((e) => e.round === w.round && Math.abs(Date.parse(dayOf(e.sessions.at(-1).start)) - Date.parse(w.raceDay)) <= 21 * DAY) : undefined);
    if (!event) {
      const before = out.filter((e) => dayOf(e.sessions.at(-1).start) < w.raceDay);
      // Si todo lo anterior está numerado 1..n sin huecos, el número que sigue es n + 1 sea cual sea el que votaron las notas (la de Junín
      // decía "séptima" y el texto anticipaba la "octava"). Sin esa certeza se usa el de las notas o, si no hay, el siguiente al último.
      const consecutive = before.map((e) => e.round).sort((a, b) => a - b).every((r, i) => r === i + 1);
      const round = consecutive ? before.length + 1 : (w.round ?? (before.length ? Math.max(...before.map((e) => e.round)) + 1 : 1));
      if (out.some((e) => e.round === round)) continue;
      event = {
        id: `tc2000-2026-${round}`,
        seriesId: "tc2000",
        round,
        name: `Fecha ${round} · ${w.city}`,
        circuit: { name: w.circuit, city: w.city, country: "Argentina", flag: "AR", province: w.province },
        sessions: [{ id: `tc2000-2026-${round}-race`, kind: "carrera", name: "Carrera", start: dateOnly(...w.raceDay.split("-").map(Number)), timeKnown: false, durationMin: 50 }],
        source: CAMPEONES,
      };
      out.push(event);
    } else {
      // El calendario de Wikipedia es de antes de la temporada; la crónica del finde dice dónde se corrió de verdad.
      if (event.circuit.city !== w.city) {
        event.circuit = { name: w.circuit, city: w.city, country: "Argentina", flag: "AR", province: w.province };
        event.name = `Fecha ${event.round} · ${w.city}`;
      }
      if (!event.source.includes(CAMPEONES)) event.source = `${event.source} · ${CAMPEONES}`;
    }

    const source = { name: CAMPEONES, url: w.winnerUrl ?? w.sources?.[0] ?? "https://campeones.com.ar/category/tc2000/" };
    const raceIndex = event.sessions.findIndex((s) => s.kind === "carrera");
    const race = { ...event.sessions[raceIndex] };
    if (w.raceTime && !race.timeKnown) {
      race.start = `${dayOf(race.start)}T${w.raceTime}:00-03:00`;
      race.timeKnown = true;
      race.timeStatus = "tentative";
      race.timeSources = [{ name: CAMPEONES, url: w.sources?.[0] ?? source.url, start: w.raceTime }];
    }
    if (w.winner && !race.results?.length) {
      race.results = [{ pos: 1, driver: w.winner, team: "", gap: "" }];
      race.resultsSource = source;
    }
    event.sessions[raceIndex] = race;

    if (w.pole && !event.sessions.some((s) => s.kind === "clasificacion")) {
      const day = shiftDay(dayOf(race.start), -1);
      event.sessions.unshift({
        id: `${event.id}-qualy`,
        kind: "clasificacion",
        name: "Clasificación",
        start: dateOnly(...day.split("-").map(Number)),
        timeKnown: false,
        durationMin: 30,
        results: [{ pos: 1, driver: w.pole, team: "", gap: "" }],
        resultsSource: { name: CAMPEONES, url: w.sources?.[0] ?? source.url },
      });
    }
  }
  return out.sort((a, b) => a.round - b.round);
}

/** Nombres completos conocidos de TC2000, para completar los apellidos sueltos de los títulos. */
export const tc2000Names = (events, standings) => [
  ...new Set([...(standings ?? []).map((r) => r.driver), ...events.flatMap((e) => e.sessions.flatMap((s) => s.results?.map((r) => r.driver) ?? []))]),
].filter((n) => n.includes(" "));

export async function tc2000Season(io, previous) {
  let wiki;
  try {
    wiki = await wikiPart(io);
  } catch (error) {
    // Sin Wikipedia se reutilizan las fechas anteriores (sin lo sumado desde Campeones, que se vuelve a aplicar).
    const before = (previous?.events ?? []).filter((e) => e.seriesId === "tc2000");
    if (!before.length && !(previous?.meta?.tc2000?.campeones ?? []).length) throw error;
    wiki = { events: before, standings: previous?.standings?.tc2000 ?? [] };
  }

  const stored = previous?.meta?.tc2000?.campeones ?? [];
  let weekends = stored;
  let feedOk = true;
  try {
    weekends = mergeWeekends(stored, parseWeekends(await campeonesFeed(io), tc2000Names(wiki.events, wiki.standings)));
  } catch {
    feedOk = false;
  }

  const events = applyCampeones(wiki.events, weekends);
  // El campeonato de Wikipedia se actualiza tarde. Si cubre menos fechas que las ya corridas, no se muestra: mejor nada que
  // una tabla vieja presentada como actual.
  const raced = events.filter((e) => e.sessions.some((s) => s.kind === "carrera" && s.results?.length)).length;
  const covered = wiki.roundsWithResults ?? 0;
  const stale = raced > covered;

  return {
    events,
    standings: { tc2000: stale ? [] : wiki.standings },
    meta: { tc2000: { incomplete: true, campeones: weekends, campeonesFeed: feedOk, standingsAsOfRound: covered, standingsHidden: stale } },
  };
}
