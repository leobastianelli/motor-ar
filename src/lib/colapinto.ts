import { careerSummary, milestones } from "@/data/colapinto/career";
import f1 from "@/data/colapinto/f1-races.json";

// Estadísticas derivadas de datos verificados (Jolpica-F1 + Wikipedia). Nada se escribe a mano.

export type F1Race = (typeof f1.races)[number];

const GP: Record<string, [code: string, name: string]> = {
  "Australian Grand Prix": ["AUS", "Australia"],
  "Chinese Grand Prix": ["CHN", "China"],
  "Japanese Grand Prix": ["JPN", "Japón"],
  "Bahrain Grand Prix": ["BHR", "Baréin"],
  "Saudi Arabian Grand Prix": ["KSA", "Arabia Saudita"],
  "Miami Grand Prix": ["MIA", "Miami"],
  "Emilia Romagna Grand Prix": ["EMI", "Imola"],
  "Monaco Grand Prix": ["MON", "Mónaco"],
  "Spanish Grand Prix": ["ESP", "España"],
  "Barcelona Grand Prix": ["BCN", "Barcelona"],
  "Canadian Grand Prix": ["CAN", "Canadá"],
  "Austrian Grand Prix": ["AUT", "Austria"],
  "British Grand Prix": ["GBR", "Gran Bretaña"],
  "Belgian Grand Prix": ["BEL", "Bélgica"],
  "Hungarian Grand Prix": ["HUN", "Hungría"],
  "Dutch Grand Prix": ["NED", "Países Bajos"],
  "Italian Grand Prix": ["ITA", "Italia"],
  "Azerbaijan Grand Prix": ["AZE", "Azerbaiyán"],
  "Singapore Grand Prix": ["SIN", "Singapur"],
  "United States Grand Prix": ["USA", "Estados Unidos"],
  "Mexico City Grand Prix": ["MEX", "México"],
  "São Paulo Grand Prix": ["BRA", "San Pablo"],
  "Las Vegas Grand Prix": ["LVG", "Las Vegas"],
  "Qatar Grand Prix": ["QAT", "Qatar"],
  "Abu Dhabi Grand Prix": ["ABU", "Abu Dabi"],
};

export const raceCode = (race: string) => GP[race]?.[0] ?? race.slice(0, 3).toUpperCase();
export const raceName = (race: string) => GP[race]?.[1] ?? race.replace(" Grand Prix", "");

const NOT_CLASSIFIED: Record<string, string> = { R: "DNF", W: "DNS", D: "DSQ", E: "EXC", N: "NC", F: "DNQ" };
export const finishLabel = (r: F1Race) => (r.finishPos ? String(r.finishPos) : (NOT_CLASSIFIED[r.finish] ?? r.finish));

const STATUS_ES: Record<string, string> = {
  Retired: "Abandono",
  "Did not start": "No largó",
  Disqualified: "Descalificado",
  Accident: "Accidente",
  Collision: "Choque",
};
export const statusLabel = (status: string) => STATUS_ES[status] ?? status;

export const seasonRaces = (season: number) => f1.races.filter((r) => r.season === season);

function duel(races: F1Race[], mine: (r: F1Race) => number | null, theirs: (r: F1Race) => number | null) {
  let ahead = 0;
  let behind = 0;
  for (const r of races) {
    const a = mine(r) ?? 99;
    const b = theirs(r) ?? 99;
    if (a === 99 && b === 99) continue;
    if (a < b) ahead++;
    else behind++;
  }
  return { ahead, behind };
}

export function seasonStats(season: number) {
  const races = seasonRaces(season);
  const withMate = races.filter((r) => r.teammate);
  const classified = races.filter((r) => r.finishPos !== null);
  const best = [...classified].sort((a, b) => a.finishPos! - b.finishPos! || b.points - a.points)[0];
  const gains = classified
    .filter((r) => r.grid > 0)
    .map((r) => ({ code: raceCode(r.race), name: raceName(r.race), gain: r.grid - r.finishPos! }));

  return {
    races: races.length,
    points: races.reduce((sum, r) => sum + r.points + (r.sprint?.points ?? 0), 0),
    best,
    teammate: withMate.at(-1)?.teammate?.driver ?? null,
    raceDuel: duel(withMate, (r) => r.finishPos, (r) => r.teammate!.finishPos),
    qualiDuel: duel(withMate, (r) => r.quali, (r) => r.teammate!.quali),
    netGain: gains.reduce((sum, g) => sum + g.gain, 0),
    topGains: gains.filter((g) => g.gain > 0).sort((a, b) => b.gain - a.gain).slice(0, 3),
    dnfs: races.length - classified.length,
  };
}

export const standings2026 = f1.standings2026;

export function championshipTrend() {
  const last = standings2026.at(-1)!;
  const prev = standings2026.at(-2);
  const change = prev ? prev.position - last.position : 0;
  const label = change > 0 ? `subió ${change}` : change < 0 ? `bajó ${-change}` : "sin cambios";
  return { ...last, change, label };
}

export const quotes = milestones.filter((m) => m.quote);
export const recentMilestones = [...milestones].reverse().slice(0, 3);

const sumBy = (match: (series: string) => boolean, key: "wins" | "podiums" | "poles") =>
  careerSummary.filter((s) => match(s.series)).reduce((sum, s) => sum + s[key], 0);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function careerStages() {
  const f4 = (s: string) => s === "F4 España";
  const regional = (s: string) => /Eurocup|Toyota|Regional|Euroformula/.test(s);
  const f3 = (s: string) => s === "Fórmula 3 FIA";
  const f2 = (s: string) => s === "Fórmula 2 FIA";

  return [
    { years: "2012–18", title: "Karting", text: "Campeón argentino en 2016 y 2018. A los 14 años se muda solo a Italia.", stat: "Oro olímpico juvenil 2018", major: false },
    { years: "2018–19", title: "F4 España", text: "Campeón en su primera temporada completa, en 2019.", stat: `${plural(sumBy(f4, "wins"), "victoria", "victorias")} · ${sumBy(f4, "poles")} poles`, major: false },
    { years: "2019–21", title: "Eurocup · TRS · FRECA", text: "Tercero en Eurocup y en Toyota Racing Series; sexto en FRECA.", stat: `${plural(sumBy(regional, "wins"), "victoria", "victorias")} · ${sumBy(regional, "podiums")} podios`, major: false },
    { years: "2021", title: "Resistencia", text: "Gana en Le Castellet con G-Drive y corre las 24 Horas de Le Mans.", stat: "7.º en LMP2 en Le Mans", major: false },
    { years: "2022–23", title: "Fórmula 3", text: "Ganador en su temporada debut; cuarto en 2023.", stat: `${plural(sumBy(f3, "wins"), "victoria", "victorias")} · ${sumBy(f3, "podiums")} podios`, major: false },
    { years: "2023–24", title: "Fórmula 2", text: "Primera victoria en la sprint de Imola 2024.", stat: `${plural(sumBy(f2, "wins"), "victoria", "victorias")} · ${sumBy(f2, "podiums")} podios`, major: false },
    { years: "2024", title: "Williams · F1", text: "Nueve grandes premios y primeros puntos en Bakú.", stat: `${seasonStats(2024).points} pts · mejor ${seasonStats(2024).best?.finishPos}.º`, major: true },
    { years: "2025–", title: "Alpine · F1", text: "Titular desde Imola 2025, renovado hasta 2027.", stat: `${seasonStats(2026).points} pts en 2026`, major: true },
  ];
}
