// Trayectoria de Franco Colapinto. Datos verificados contra:
// - Jolpica-F1 API (resultados F1 2024–2026) → f1-races.json
// - Wikipedia (en), wikitext al 2026-09-13 (CC BY-SA 4.0) → junior-results.json y este archivo
// Las fuentes primarias de cada hito están en `source`.

export interface CareerSeason {
  season: number;
  series: string;
  team: string;
  races: number;
  wins: number;
  poles: number;
  fastestLaps: number;
  podiums: number;
  points: number | null;
  position: string;
  note?: string;
}

/** Resumen oficial por temporada (tabla "Racing career summary"). */
export const careerSummary: CareerSeason[] = [
  { season: 2018, series: "F4 España", team: "Drivex School", races: 4, wins: 1, poles: 2, fastestLaps: 0, podiums: 2, points: 49, position: "9°" },
  { season: 2019, series: "F4 España", team: "Drivex School", races: 21, wins: 11, poles: 10, fastestLaps: 10, podiums: 13, points: 325, position: "Campeón" },
  { season: 2019, series: "Euroformula Open", team: "Drivex School", races: 2, wins: 0, poles: 0, fastestLaps: 0, podiums: 0, points: 0, position: "27°" },
  { season: 2019, series: "Fórmula Renault Eurocup", team: "FA Racing by Drivex", races: 4, wins: 0, poles: 0, fastestLaps: 0, podiums: 0, points: null, position: "NC", note: "Piloto invitado, sin puntos" },
  { season: 2020, series: "Fórmula Renault Eurocup", team: "MP Motorsport", races: 20, wins: 2, poles: 0, fastestLaps: 2, podiums: 9, points: 213.5, position: "3°" },
  { season: 2020, series: "Toyota Racing Series", team: "Kiwi Motorsport", races: 15, wins: 1, poles: 1, fastestLaps: 2, podiums: 8, points: 315, position: "3°", note: "Mejor novato" },
  { season: 2021, series: "Fórmula Regional Europea (FRECA)", team: "MP Motorsport", races: 16, wins: 2, poles: 3, fastestLaps: 4, podiums: 4, points: 140, position: "6°" },
  { season: 2021, series: "Asian Le Mans Series · LMP2", team: "G-Drive Racing", races: 4, wins: 0, poles: 3, fastestLaps: 3, podiums: 3, points: 66, position: "3°" },
  { season: 2021, series: "European Le Mans Series · LMP2", team: "G-Drive Racing", races: 6, wins: 1, poles: 1, fastestLaps: 1, podiums: 2, points: 74, position: "4°" },
  { season: 2021, series: "24 Horas de Le Mans · LMP2", team: "G-Drive Racing", races: 1, wins: 0, poles: 0, fastestLaps: 0, podiums: 0, points: null, position: "7° en clase", note: "12° en la general, 358 vueltas, con Rusinov y De Vries" },
  { season: 2021, series: "GT World Challenge Europe Endurance · Silver", team: "ROFGO Racing with Team WRT", races: 1, wins: 0, poles: 0, fastestLaps: 0, podiums: 0, points: 11, position: "27°", note: "24 Horas de Spa como reemplazo de último momento" },
  { season: 2022, series: "Fórmula 3 FIA", team: "Van Amersfoort Racing", races: 18, wins: 2, poles: 1, fastestLaps: 0, podiums: 5, points: 76, position: "9°" },
  { season: 2023, series: "Fórmula 3 FIA", team: "MP Motorsport", races: 18, wins: 2, poles: 0, fastestLaps: 0, podiums: 5, points: 110, position: "4°" },
  { season: 2023, series: "Fórmula 2 FIA", team: "MP Motorsport", races: 2, wins: 0, poles: 0, fastestLaps: 0, podiums: 0, points: 0, position: "25°", note: "Solo la fecha final en Abu Dabi" },
  { season: 2024, series: "Fórmula 2 FIA", team: "MP Motorsport", races: 20, wins: 1, poles: 0, fastestLaps: 3, podiums: 3, points: 96, position: "9°", note: "Dejó la categoría tras Spa para subir a F1" },
  { season: 2024, series: "Fórmula 1", team: "Williams", races: 9, wins: 0, poles: 0, fastestLaps: 0, podiums: 0, points: 5, position: "19°" },
  { season: 2025, series: "Fórmula 1", team: "Alpine", races: 18, wins: 0, poles: 0, fastestLaps: 0, podiums: 0, points: 0, position: "20°" },
  { season: 2026, series: "Fórmula 1", team: "Alpine", races: 13, wins: 0, poles: 0, fastestLaps: 0, podiums: 0, points: 21, position: "12°", note: "En curso: posición tras la fecha 14" },
];

export interface Milestone {
  date: string;
  title: string;
  detail: string;
  quote?: { text: string; context: string };
  source: string;
}

export const milestones: Milestone[] = [
  {
    date: "2003-05-27",
    title: "Nace en Pilar",
    detail: "Hijo de Aníbal, que años después fue parte de un equipo de Turismo Carretera. Hincha de Boca; sus ídolos son Hamilton y Senna.",
    source: "https://en.wikipedia.org/wiki/Franco_Colapinto",
  },
  {
    date: "2016",
    title: "Campeón argentino de karting",
    detail: "Gana el Argentino y el Metropolitano en Pre-Junior. En 2017 se va solo a Italia, con 14 años.",
    source: "https://francolapinto.com/franco/",
  },
  {
    date: "2018-10-15",
    title: "Oro en los Juegos Olímpicos de la Juventud",
    detail: "Gana la exhibición de karting eléctrico en Buenos Aires 2018 junto a María García Puig.",
    source: "https://www.fia.com/news/fia-supports-e-kart-race-buenos-aires",
  },
  {
    date: "2018-11-04",
    title: "Debut y victoria en autos",
    detail: "Corre solo la última fecha de la F4 España en Navarra y gana la última carrera. Su padre vendió la casa para pagar la temporada.",
    source: "https://formulascout.com/f4-round-up-ojeda-secures-australian-title-in-new-zealand-cordeel-takes-close-triumph-in-spain/46183",
  },
  {
    date: "2019-11-09",
    title: "Campeón de la F4 España",
    detail: "11 victorias, 10 poles y 13 podios en 21 carreras. Cierra el año ganando las tres de Barcelona.",
    source: "https://formularapida.net/colapinto-gana-en-montmelo-y-se-proclama-campeon-de-la-f4-espanola/",
  },
  {
    date: "2021-06-06",
    title: "Primera victoria en resistencia",
    detail: "Gana las 4 Horas de Le Castellet en LMP2 con G-Drive. Ese mismo año corre las 24 Horas de Le Mans (7° en clase).",
    source: "https://francolapinto.com/2021/06/07/colapinto-celebrates-maiden-victory-in-sports-cars/",
  },
  {
    date: "2022-04-23",
    title: "Primera victoria en F3",
    detail: "Gana la sprint de Imola superando a Collet en la última vuelta. Primera victoria también para Van Amersfoort en la categoría.",
    source: "https://www.motorsport.com/fia-f3/news/f3-imola-colapinto-wins-sprint-as-collet-hadjar-collide/10143129/",
  },
  {
    date: "2023-01-09",
    title: "Se suma a la Academia Williams",
    detail: "Firma con MP Motorsport en F3 y entra al programa de jóvenes de Williams.",
    source: "https://www.williamsf1.com/posts/4a325da4-5ed8-4db6-812f-a6921f86a0bb/franco-colapinto-williams-racing-driver-academy-announcement",
  },
  {
    date: "2024-05-18",
    title: "Primera victoria en F2",
    detail: "Gana la sprint de Imola con un sobrepaso a Paul Aron en la última vuelta.",
    source: "https://www.fiaformula2.com/Latest/XKPGkYH2OiRl4HHiXFpSn/sprint-race-colapinto-produces-final-lap-overtake-to-achieve-maiden-f2",
  },
  {
    date: "2024-07-05",
    title: "Primera práctica en F1",
    detail: "Maneja el Williams en la FP1 de Silverstone.",
    quote: { text: "It's a historic moment", context: "Sobre representar a Argentina en la F1" },
    source: "https://www.formula1.com/en/latest/article/its-a-historic-moment-colapinto-on-his-mega-fp1-chance-at-silverstone-with.3pX4QW9X76vxWa6uvCafr4",
  },
  {
    date: "2024-09-01",
    title: "Debut en Fórmula 1",
    detail: "Reemplaza a Logan Sargeant en Williams desde Monza: larga 18° y termina 12°. Primer argentino en la F1 desde Gastón Mazzacane en 2001.",
    source: "https://feederseries.net/2024/08/27/colapinto-to-make-f1-debut-for-williams-at-monza-replacing-sargeant/",
  },
  {
    date: "2024-09-15",
    title: "Primeros puntos en Bakú",
    detail: "Clasifica 9° y termina 8°. Primer argentino en sumar en F1 desde Reutemann en Sudáfrica 1982.",
    quote: { text: "A dream come true", context: "Tras sumar sus primeros puntos" },
    source: "https://www.formula1.com/en/latest/article/colapinto-declares-points-finish-a-dream-come-true-as-williams-celebrate.4jVwmupqRiGAcmGplBs24O",
  },
  {
    date: "2024-11-23",
    title: "Golpe de 50G en Las Vegas",
    detail: "Fuerte accidente en clasificación; lo habilitan a correr y larga desde boxes.",
    source: "https://www.formula1.com/en/latest/article/colapinto-declared-fit-to-race-in-las-vegas-grand-prix-after-50g-qualifying.bckip5T9rs7wZXNUjmvoz",
  },
  {
    date: "2025-01-09",
    title: "Pasa a Alpine",
    detail: "Firma como piloto de pruebas y reserva por varios años.",
    source: "https://media.alpinecars.com/bwt-alpine-formula-one-team-enters-into-agreement-with-williams-racing-to-secure-services-of-franco-colapinto-on-multi-year-deal/?lang=eng",
  },
  {
    date: "2025-05-18",
    title: "Titular en Alpine",
    detail: "Reemplaza a Jack Doohan desde Imola, primero por cinco carreras y luego fecha a fecha.",
    source: "https://www.formula1.com/en/latest/article/alpine-confirm-colapinto-to-replace-doohan-for-next-five-rounds-as-team-opt.4lH96VnGHyC45S3yjeJOMK",
  },
  {
    date: "2025-11-07",
    title: "Confirmado para 2026",
    detail: "Alpine lo ratifica junto a Pierre Gasly para el nuevo reglamento.",
    source: "https://www.formula1.com/en/latest/article/colapinto-earns-new-deal-as-alpine-complete-2026-driver-line-up.5KBTVHBlPBBR0Ld91fSJim",
  },
  {
    date: "2026-03-08",
    title: "La salvada del año en Australia",
    detail: "Esquiva por centímetros a Lawson, detenido en la largada. George Russell la llamó \"la salvada de la temporada\".",
    source: "https://www.motorsport.com/f1/news/franco-colapintos-australian-grand-prix-turns-viral-with-incredible-save-and-strange-on-screen-error/10803701/",
  },
  {
    date: "2026-05-24",
    title: "Mejor resultado: 6° en Canadá",
    detail: "Larga 10° y termina 6°, su mejor resultado en la F1.",
    source: "https://www.formula1.com/en/results/2026/races/1285/canada/race-result",
  },
  {
    date: "2026-08-27",
    title: "Renueva con Alpine para 2027",
    detail: "El equipo confirma la misma dupla con Gasly.",
    source: "https://www.formula1.com/en/latest/article/alpine-announce-colapinto-contract-extension-as-team-confirms-unchanged-2027-line-up.DL3dVyZLJm5cHryWcHyPq",
  },
];
