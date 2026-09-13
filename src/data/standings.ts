// Campeonatos de ejemplo (ficticios) para el prototipo.
export interface StandingRow {
  driver: string;
  team: string;
  points: number;
  driverSlug?: string;
}

export const standings: Record<string, StandingRow[]> = {
  f1: [
    { driver: "Lando Norris", team: "McLaren", points: 298 },
    { driver: "Oscar Piastri", team: "McLaren", points: 276 },
    { driver: "Max Verstappen", team: "Red Bull", points: 241 },
    { driver: "Charles Leclerc", team: "Ferrari", points: 214 },
    { driver: "George Russell", team: "Mercedes", points: 190 },
    { driver: "Franco Colapinto", team: "Alpine", points: 18, driverSlug: "franco-colapinto" },
  ],
  f2: [
    { driver: "Piloto Dos", team: "Equipo B", points: 164 },
    { driver: "Piloto Uno", team: "Equipo A", points: 151 },
    { driver: "Piloto Tres", team: "Equipo C", points: 139 },
    { driver: "Nicolás Varrone", team: "Equipo F", points: 61, driverSlug: "nicolas-varrone" },
  ],
  tc: [
    { driver: "Mariano Werner", team: "Werner Competición", points: 356 },
    { driver: "Julián Santero", team: "Dole Racing", points: 330 },
    { driver: "Agustín Canapino", team: "Canapino Sport", points: 312, driverSlug: "agustin-canapino" },
    { driver: "José Manuel Urcera", team: "JP Carrera", points: 288 },
  ],
};
