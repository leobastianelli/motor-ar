// Fórmula 1 2026 desde Jolpica-F1: cronograma con horarios, resultados, campeonato y campeonato tras cada fecha.
import { COUNTRY_ISO } from "./common.mjs";

const BASE = "https://api.jolpi.ca/ergast/f1/2026";

const GP_ES = {
  "Australian Grand Prix": "GP de Australia",
  "Chinese Grand Prix": "GP de China",
  "Japanese Grand Prix": "GP de Japón",
  "Bahrain Grand Prix": "GP de Baréin",
  "Saudi Arabian Grand Prix": "GP de Arabia Saudita",
  "Miami Grand Prix": "GP de Miami",
  "Canadian Grand Prix": "GP de Canadá",
  "Monaco Grand Prix": "GP de Mónaco",
  "Barcelona Grand Prix": "GP de Barcelona",
  "Spanish Grand Prix": "GP de España",
  "Austrian Grand Prix": "GP de Austria",
  "British Grand Prix": "GP de Gran Bretaña",
  "Belgian Grand Prix": "GP de Bélgica",
  "Hungarian Grand Prix": "GP de Hungría",
  "Dutch Grand Prix": "GP de Países Bajos",
  "Italian Grand Prix": "GP de Italia",
  "Azerbaijan Grand Prix": "GP de Azerbaiyán",
  "Singapore Grand Prix": "GP de Singapur",
  "United States Grand Prix": "GP de Estados Unidos",
  "Mexico City Grand Prix": "GP de la Ciudad de México",
  "Brazilian Grand Prix": "GP de Brasil",
  "São Paulo Grand Prix": "GP de San Pablo",
  "Las Vegas Grand Prix": "GP de Las Vegas",
  "Qatar Grand Prix": "GP de Qatar",
  "Abu Dhabi Grand Prix": "GP de Abu Dabi",
};

const COUNTRY_ES = {
  Australia: "Australia", China: "China", Japan: "Japón", Bahrain: "Baréin", "Saudi Arabia": "Arabia Saudita", USA: "Estados Unidos",
  "United States": "Estados Unidos", Canada: "Canadá", Monaco: "Mónaco", Spain: "España", Austria: "Austria", UK: "Reino Unido",
  "United Kingdom": "Reino Unido", Belgium: "Bélgica", Hungary: "Hungría", Netherlands: "Países Bajos", Italy: "Italia",
  Azerbaijan: "Azerbaiyán", Singapore: "Singapur", Mexico: "México", Brazil: "Brasil", Qatar: "Qatar", UAE: "Emiratos Árabes Unidos",
  "United Arab Emirates": "Emiratos Árabes Unidos", Malaysia: "Malasia",
};

// Jolpica a veces nombra una fecha "<Gran Premio> in <País>" cuando se corre en un país distinto
// al habitual (ronda 16 de 2026: "Bahrain Grand Prix in Malaysia", corrida en Sepang). Traducimos
// el nombre del GP y agregamos la aclaración del país en castellano en vez de dejar el texto en inglés.
export function translateRaceName(raceName) {
  if (GP_ES[raceName]) return GP_ES[raceName];
  const relocated = raceName.match(/^(.+) in ([A-Za-zÀ-ÿ ]+)$/);
  if (relocated) {
    const [, baseName, country] = relocated;
    const baseEs = GP_ES[baseName];
    const countryEs = COUNTRY_ES[country];
    if (baseEs && countryEs) return `${baseEs} (en ${countryEs})`;
  }
  return raceName;
}

const SESSIONS = [
  ["FirstPractice", "practica", "Práctica 1", 60],
  ["SecondPractice", "practica", "Práctica 2", 60],
  ["ThirdPractice", "practica", "Práctica 3", 60],
  ["SprintQualifying", "clasificacion", "Clasificación sprint", 45],
  ["SprintShootout", "clasificacion", "Clasificación sprint", 45],
  ["Sprint", "sprint", "Sprint", 45],
  ["Qualifying", "clasificacion", "Clasificación", 60],
];

const fullName = (d) => `${d.givenName} ${d.familyName}`;

/** Estado de Jolpica → texto. "Finished" y "+N Laps" no son estados para mostrar: van en la diferencia. */
const LAPPED = /^\+(\d+) Laps?$/;
const STATUS_ES = { Retired: "Abandonó", Accident: "Abandonó", Collision: "Abandonó", Disqualified: "Descalificado", "Did not start": "No largó", Withdrew: "No largó" };
const statusOf = (s) => (!s || s === "Finished" || s === "Lapped" || LAPPED.test(s) ? undefined : STATUS_ES[s] ?? "Abandonó");
const raceGap = (r) => {
  if (r.Time?.time) return r.Time.time;
  const lapped = r.status?.match(LAPPED);
  return lapped ? `+${lapped[1]} ${lapped[1] === "1" ? "vuelta" : "vueltas"}` : "";
};

const row = (r, gap) => ({
  pos: Number(r.position),
  positionText: r.positionText,
  status: statusOf(r.status),
  driver: fullName(r.Driver),
  code: r.Driver.code,
  team: r.Constructor.name,
  gap,
  points: r.points === undefined ? undefined : Number(r.points),
  grid: r.grid === undefined ? undefined : Number(r.grid),
});

export async function f1Season(io) {
  const json = (path, revalidate = 900) => io.json(`${BASE}${path}`, { revalidate });

  async function paged(path) {
    const byRound = new Map();
    let offset = 0;
    let total = Infinity;
    while (offset < total) {
      const data = (await json(`/${path}.json?limit=100&offset=${offset}`)).MRData;
      total = Number(data.total);
      for (const race of data.RaceTable.Races) {
        const list = race.Results ?? race.QualifyingResults ?? race.SprintResults ?? [];
        const prev = byRound.get(race.round);
        if (prev) prev.push(...list);
        else byRound.set(race.round, [...list]);
      }
      offset += 100;
      await io.sleep(300);
    }
    return byRound;
  }

  const schedule = (await json(".json?limit=40", 3600)).MRData.RaceTable.Races;
  const races = await paged("results");
  const qualifying = await paged("qualifying");
  const sprints = await paged("sprint");
  const standingsData = (await json("/driverstandings.json?limit=40")).MRData.StandingsTable.StandingsLists[0];

  const progression = [];
  for (const round of [...races.keys()].map(Number).sort((a, b) => a - b)) {
    const list = (await json(`/${round}/driverstandings.json?limit=40`, 7 * 86400)).MRData.StandingsTable.StandingsLists[0];
    if (list) progression.push({ round, standings: list.DriverStandings.map((s) => ({ driver: fullName(s.Driver), pos: Number(s.position), points: Number(s.points) })) });
    await io.sleep(250);
  }

  const events = schedule.map((race) => {
    const sessions = [];
    for (const [key, kind, name, durationMin] of SESSIONS) {
      if (!race[key]) continue;
      const s = { id: `f1-2026-${race.round}-${key.toLowerCase()}`, kind, name, start: `${race[key].date}T${race[key].time}`, timeKnown: true, durationMin };
      if (key === "Qualifying" && qualifying.has(race.round)) {
        s.results = qualifying.get(race.round).map((r) => row(r, r.Q3 || r.Q2 || r.Q1 || "")).sort((a, b) => a.pos - b.pos);
      }
      if (key === "Sprint" && sprints.has(race.round)) {
        s.results = sprints.get(race.round).map((r) => row(r, raceGap(r))).sort((a, b) => a.pos - b.pos);
      }
      sessions.push(s);
    }
    const raceSession = { id: `f1-2026-${race.round}-race`, kind: "carrera", name: "Carrera", start: `${race.date}T${race.time}`, timeKnown: true, durationMin: 120 };
    if (races.has(race.round)) raceSession.results = races.get(race.round).map((r) => row(r, raceGap(r))).sort((a, b) => a.pos - b.pos);
    sessions.push(raceSession);
    sessions.sort((a, b) => new Date(a.start) - new Date(b.start));
    return {
      id: `f1-2026-${race.round}`,
      seriesId: "f1",
      round: Number(race.round),
      name: translateRaceName(race.raceName),
      officialName: race.raceName,
      circuit: {
        name: race.Circuit.circuitName,
        city: race.Circuit.Location.locality,
        country: COUNTRY_ES[race.Circuit.Location.country] ?? race.Circuit.Location.country,
        flag: COUNTRY_ISO[race.Circuit.Location.country] ?? "",
      },
      sessions,
      source: "Jolpica-F1",
    };
  });

  const standings = standingsData.DriverStandings.map((s) => ({
    pos: Number(s.position),
    driver: fullName(s.Driver),
    team: s.Constructors.at(-1)?.name ?? "",
    points: Number(s.points),
    wins: Number(s.wins),
  }));

  // `standingsAsOfRound`: hasta qué fecha llega esta tabla. Lo usa createSeason (data.ts) para no mostrarla si
  // ya se corrieron más carreras y la fuente quedó atrás (la misma regla que ACTC y TC2000).
  return { events, standings: { f1: standings }, meta: { f1: { standingsAsOfRound: Number(standingsData.round), progression } } };
}
