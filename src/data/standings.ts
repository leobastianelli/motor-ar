import f1 from "./f1-2026.json";

export interface StandingRow {
  driver: string;
  team: string;
  points: number;
  wins?: number;
  driverSlug?: string;
}

const f1Rows: StandingRow[] = f1.standings.map((s) => ({
  driver: s.driver,
  team: s.team,
  points: s.points,
  wins: s.wins,
  driverSlug: s.driverId === "colapinto" ? "franco-colapinto" : undefined,
}));

export const standings: Record<string, StandingRow[]> = {
  // Real (Jolpica-F1).
  f1: f1Rows,
  // De ejemplo (ficticios) hasta conectar las fuentes.
  f2: [
    { driver: "Piloto Dos", team: "Equipo B", points: 164 },
    { driver: "Piloto Uno", team: "Equipo A", points: 151 },
    { driver: "Piloto Tres", team: "Equipo C", points: 139 },
    { driver: "Nicolás Varrone", team: "Equipo F", points: 61, driverSlug: "nicolas-varrone" },
  ],
  tc: [
    { driver: "Mariano Werner", team: "Ford", points: 356, wins: 3 },
    { driver: "Julián Santero", team: "Ford", points: 330, wins: 2 },
    { driver: "Agustín Canapino", team: "Chevrolet", points: 312, wins: 2, driverSlug: "agustin-canapino" },
    { driver: "José Manuel Urcera", team: "Torino", points: 288, wins: 1 },
    { driver: "Christian Ledesma", team: "Chevrolet", points: 251, wins: 0 },
  ],
};
