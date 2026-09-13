import type { Broadcast, RaceEvent, ResultRow, Session, SessionKind } from "@/lib/types";
import f1 from "./f1-2026.json";

// DATOS FICTICIOS DE EJEMPLO para el prototipo. Horarios en hora argentina (-03:00).
// Serán reemplazados por la ingesta real (APIs + scraping + carga en el panel).

const DRIVER_SLUGS: Record<string, string> = {
  Colapinto: "franco-colapinto",
  Varrone: "nicolas-varrone",
  Canapino: "agustin-canapino",
};

function s(
  id: string,
  kind: SessionKind,
  name: string,
  start: string,
  durationMin: number,
  extra: Partial<Session> = {},
): Session {
  return { id, kind, name, start, durationMin, ...extra };
}

function results(rows: [driver: string, team: string, gap: string, points?: number][]): ResultRow[] {
  return rows.map(([driver, team, gap, points], i) => {
    const surname = driver.split(" ").at(-1) ?? driver;
    return { pos: i + 1, driver, team, gap, points, driverSlug: DRIVER_SLUGS[surname] };
  });
}

/** Filas reales de F1 (Jolpica). */
function f1Rows(rows: { pos: number; driver: string; code: string; driverId: string; team: string; gap: string; points?: number }[]): ResultRow[] {
  return rows.map((r) => ({
    pos: r.pos,
    driver: r.driver,
    code: r.code,
    team: r.team,
    gap: r.gap,
    points: r.points,
    driverSlug: r.driverId === "colapinto" ? "franco-colapinto" : undefined,
  }));
}

const F1_TV: Broadcast[] = [
  { name: "Disney+ Premium", kind: "streaming" },
  { name: "ESPN", kind: "tv" },
  { name: "F1 TV Pro", kind: "streaming" },
];
const F2_TV: Broadcast[] = [
  { name: "Disney+ Premium", kind: "streaming" },
  { name: "F1 TV Pro", kind: "streaming" },
];
const ACTC_TV: Broadcast[] = [
  { name: "TV Pública", kind: "tv" },
  { name: "YouTube ACTC", kind: "youtube", url: "https://www.youtube.com/results?search_query=ACTC+en+vivo" },
];
const CDA_TV: Broadcast[] = [
  { name: "TV Pública", kind: "tv" },
  { name: "YouTube oficial", kind: "youtube", url: "https://www.youtube.com/results?search_query=TC2000+en+vivo" },
];

export const events: RaceEvent[] = [
  // ——— Pasados ———
  {
    id: "f1-2026-monza",
    seriesId: "f1",
    round: 15,
    name: "GP de Italia",
    circuit: { name: "Autodromo Nazionale Monza", city: "Monza", country: "Italia", flag: "IT" },
    broadcasts: F1_TV,
    sessions: [
      s("f1-monza-q", "clasificacion", "Clasificación", "2026-09-05T11:00:00-03:00", 60),
      s("f1-monza-r", "carrera", "Carrera", "2026-09-06T10:00:00-03:00", 110, {
        results: f1Rows(f1.monza.results),
      }),
    ],
  },
  {
    id: "tc-2026-r12",
    seriesId: "tc",
    round: 12,
    name: "Fecha 12 · Rafaela",
    circuit: { name: "Autódromo Ciudad de Rafaela", city: "Rafaela", country: "Argentina", flag: "AR" },
    broadcasts: ACTC_TV,
    sessions: [
      s("tc-r12-final", "final", "Final", "2026-08-30T12:30:00-03:00", 45, {
        results: results([
          ["Mariano Werner", "Werner Competición", "25 vueltas", 45],
          ["Agustín Canapino", "Canapino Sport", "+0.884", 40],
          ["Julián Santero", "Dole Racing", "+2.301", 37],
          ["José Manuel Urcera", "JP Carrera", "+3.577", 34],
          ["Christian Ledesma", "Las Toscas Racing", "+4.019", 32],
          ["Matías Rossi", "Toyota Gazoo Racing", "+6.640", 30],
        ]),
      }),
    ],
  },
  {
    id: "indycar-2026-finale",
    seriesId: "indycar",
    round: 17,
    name: "Final de temporada",
    circuit: { name: "Nashville Superspeedway", city: "Nashville", country: "Estados Unidos", flag: "US" },
    broadcasts: [{ name: "Disney+ Premium", kind: "streaming" }],
    sessions: [
      s("indy-finale-r", "carrera", "Carrera", "2026-08-30T15:30:00-03:00", 150, {
        results: results([
          ["Alex Palou", "Chip Ganassi", "1:52:30.441", 50],
          ["Pato O'Ward", "Arrow McLaren", "+1.207", 40],
          ["Scott McLaughlin", "Penske", "+3.880", 35],
          ["Josef Newgarden", "Penske", "+4.412", 32],
          ["Álex Rossi", "Ed Carpenter", "+6.020", 30],
        ]),
      }),
    ],
  },

  // ——— Este fin de semana (11 al 13 de septiembre) ———
  {
    id: "f1-2026-madrid",
    seriesId: "f1",
    round: 16,
    name: "GP de España · Madrid",
    circuit: { name: "Madring", city: "Madrid", country: "España", flag: "ES" },
    broadcasts: F1_TV,
    sessions: [
      s("f1-madrid-fp1", "practica", "Práctica 1", "2026-09-11T08:30:00-03:00", 60),
      s("f1-madrid-fp2", "practica", "Práctica 2", "2026-09-11T12:00:00-03:00", 60),
      s("f1-madrid-fp3", "practica", "Práctica 3", "2026-09-12T07:30:00-03:00", 60),
      s("f1-madrid-q", "clasificacion", "Clasificación", "2026-09-12T11:00:00-03:00", 60, {
        results: f1Rows(f1.madridQualifying.results),
      }),
      s("f1-madrid-r", "carrera", "Carrera", "2026-09-13T10:00:00-03:00", 110),
    ],
  },
  {
    id: "f2-2026-madrid",
    seriesId: "f2",
    round: 12,
    name: "Madrid",
    circuit: { name: "Madring", city: "Madrid", country: "España", flag: "ES" },
    broadcasts: F2_TV,
    sessions: [
      s("f2-madrid-q", "clasificacion", "Clasificación", "2026-09-11T10:30:00-03:00", 30),
      s("f2-madrid-sprint", "sprint", "Carrera sprint", "2026-09-12T05:15:00-03:00", 45, {
        results: results([
          ["Piloto Uno", "Equipo A", "28 vueltas", 10],
          ["Piloto Dos", "Equipo B", "+1.402", 8],
          ["Piloto Tres", "Equipo C", "+2.911", 6],
          ["Piloto Cuatro", "Equipo D", "+3.300", 5],
          ["Piloto Cinco", "Equipo E", "+4.781", 4],
          ["Nicolás Varrone", "Equipo F", "+5.020", 3],
        ]),
      }),
      s("f2-madrid-feature", "carrera", "Carrera principal", "2026-09-13T05:05:00-03:00", 65, {
        results: results([
          ["Piloto Dos", "Equipo B", "38 vueltas", 25],
          ["Piloto Tres", "Equipo C", "+3.114", 18],
          ["Piloto Uno", "Equipo A", "+4.870", 15],
          ["Nicolás Varrone", "Equipo F", "+6.002", 12],
          ["Piloto Cinco", "Equipo E", "+9.315", 10],
          ["Piloto Seis", "Equipo G", "+11.448", 8],
        ]),
      }),
    ],
  },
  {
    id: "tc-2026-r13",
    seriesId: "tc",
    round: 13,
    name: "Fecha 13 · Alta Gracia",
    circuit: { name: "Autódromo Oscar Cabalén", city: "Alta Gracia", country: "Argentina", flag: "AR" },
    broadcasts: ACTC_TV,
    sessions: [
      s("tc-r13-q", "clasificacion", "Clasificación", "2026-09-12T15:00:00-03:00", 40, {
        results: results([
          ["Julián Santero", "Dole Racing", "1:31.402"],
          ["Agustín Canapino", "Canapino Sport", "+0.041"],
          ["Mariano Werner", "Werner Competición", "+0.095"],
        ]),
      }),
      s("tc-r13-serie1", "serie", "Serie 1", "2026-09-13T10:40:00-03:00", 20),
      s("tc-r13-final", "final", "Final", "2026-09-13T12:30:00-03:00", 45, {
        youtube: "https://www.youtube.com/results?search_query=ACTC+en+vivo",
      }),
    ],
  },
  {
    id: "tcp-2026-r13",
    seriesId: "tc-pista",
    round: 13,
    name: "Fecha 13 · Alta Gracia",
    circuit: { name: "Autódromo Oscar Cabalén", city: "Alta Gracia", country: "Argentina", flag: "AR" },
    broadcasts: ACTC_TV,
    sessions: [
      s("tcp-r13-final", "final", "Final", "2026-09-13T09:10:00-03:00", 40, {
        youtube: "https://www.youtube.com/results?search_query=ACTC+en+vivo",
      }),
    ],
  },
  {
    id: "tc2000-2026-r9",
    seriesId: "tc2000",
    round: 9,
    name: "Fecha 9 · Buenos Aires",
    circuit: { name: "Autódromo Oscar y Juan Gálvez", city: "CABA", country: "Argentina", flag: "AR" },
    broadcasts: CDA_TV,
    sessions: [
      s("tc2000-r9-q", "clasificacion", "Clasificación", "2026-09-12T16:00:00-03:00", 30),
      s("tc2000-r9-final", "carrera", "Carrera", "2026-09-13T11:30:00-03:00", 50),
    ],
  },
  {
    id: "tn-2026-r10",
    seriesId: "tn",
    round: 10,
    name: "Fecha 10 · Concepción del Uruguay",
    circuit: { name: "Autódromo de Concepción del Uruguay", city: "Concepción del Uruguay", country: "Argentina", flag: "AR" },
    broadcasts: [{ name: "TV Pública", kind: "tv" }],
    sessions: [s("tn-r10-final", "final", "Final Clase 3", "2026-09-13T13:15:00-03:00", 35)],
  },
  {
    id: "nascar-2026-playoffs",
    seriesId: "nascar",
    round: 29,
    name: "Playoffs · Ronda de 16",
    circuit: { name: "Circuito oval", city: "Estados Unidos", country: "Estados Unidos", flag: "US" },
    broadcasts: [{ name: "Fox Sports", kind: "tv" }],
    sessions: [s("nascar-playoffs-r", "carrera", "Carrera", "2026-09-13T16:00:00-03:00", 200)],
  },
  {
    id: "procar-2026-r8",
    seriesId: "zonal-bsas",
    round: 8,
    name: "Fecha 8 · La Plata",
    circuit: { name: "Autódromo Roberto Mouras", city: "La Plata", country: "Argentina", flag: "AR" },
    broadcasts: [{ name: "Streaming en YouTube", kind: "youtube", url: "https://www.youtube.com/results?search_query=Procar4000" }],
    sessions: [s("procar-r8-final", "final", "Final", "2026-09-13T11:00:00-03:00", 30)],
  },

  // ——— Próximos ———
  {
    id: "gt3-2026-barcelona",
    seriesId: "gt3",
    round: 9,
    name: "Barcelona",
    circuit: { name: "Circuit de Barcelona-Catalunya", city: "Barcelona", country: "España", flag: "ES" },
    broadcasts: [{ name: "YouTube GT World", kind: "youtube", url: "https://www.youtube.com/results?search_query=GT+World+live" }],
    sessions: [s("gt3-bcn-r", "carrera", "Carrera", "2026-09-20T09:00:00-03:00", 180)],
  },
  {
    id: "f1-2026-baku",
    seriesId: "f1",
    round: 17,
    name: "GP de Azerbaiyán",
    circuit: { name: "Circuito Urbano de Bakú", city: "Bakú", country: "Azerbaiyán", flag: "AZ" },
    broadcasts: F1_TV,
    sessions: [
      s("f1-baku-q", "clasificacion", "Clasificación", "2026-09-25T09:00:00-03:00", 60),
      s("f1-baku-r", "carrera", "Carrera", "2026-09-26T08:00:00-03:00", 110),
    ],
  },
  {
    id: "f2-2026-baku",
    seriesId: "f2",
    round: 13,
    name: "Bakú",
    circuit: { name: "Circuito Urbano de Bakú", city: "Bakú", country: "Azerbaiyán", flag: "AZ" },
    broadcasts: F2_TV,
    sessions: [s("f2-baku-feature", "carrera", "Carrera principal", "2026-09-26T04:00:00-03:00", 65)],
  },
  {
    id: "tc-2026-r14",
    seriesId: "tc",
    round: 14,
    name: "Fecha 14 · Balcarce",
    circuit: { name: "Autódromo Juan Manuel Fangio", city: "Balcarce", country: "Argentina", flag: "AR" },
    broadcasts: ACTC_TV,
    sessions: [s("tc-r14-final", "final", "Final", "2026-09-27T12:30:00-03:00", 45)],
  },
  {
    id: "tc2000-2026-r10",
    seriesId: "tc2000",
    round: 10,
    name: "Fecha 10 · Córdoba",
    circuit: { name: "Autódromo Oscar Cabalén", city: "Alta Gracia", country: "Argentina", flag: "AR" },
    broadcasts: CDA_TV,
    sessions: [s("tc2000-r10-final", "carrera", "Carrera", "2026-10-04T11:30:00-03:00", 50)],
  },
  {
    id: "f1-2026-singapur",
    seriesId: "f1",
    round: 18,
    name: "GP de Singapur",
    circuit: { name: "Marina Bay", city: "Singapur", country: "Singapur", flag: "SG" },
    broadcasts: F1_TV,
    sessions: [s("f1-sin-r", "carrera", "Carrera", "2026-10-11T09:00:00-03:00", 120)],
  },
];
