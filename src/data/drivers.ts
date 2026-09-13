import type { Driver } from "@/lib/types";

// Trayectorias con hitos públicos conocidos; cifras de temporada actual son de ejemplo.
// Todo el contenido debe verificarse en la fase de carga de datos reales.
export const drivers: Driver[] = [
  {
    slug: "franco-colapinto",
    name: "Franco Colapinto",
    nickname: "Franco",
    number: 43,
    seriesId: "f1",
    team: "Alpine",
    hometown: "Pilar, Buenos Aires",
    born: "27/05/2003",
    tagline: "El primer argentino en la F1 desde Gastón Mazzacane en 2001.",
    seasonStats: [
      { label: "Puesto", value: "14°" },
      { label: "Puntos", value: "18" },
      { label: "Mejor resultado", value: "P6" },
      { label: "Carreras", value: "16" },
    ],
    career: [
      {
        year: "2026",
        series: "Fórmula 1",
        team: "Alpine",
        highlight: "Primera temporada completa como titular en la era del nuevo reglamento.",
      },
      {
        year: "2025",
        series: "Fórmula 1",
        team: "Alpine",
        highlight: "Arranca como reserva y asume la butaca titular desde Imola.",
      },
      {
        year: "2024",
        series: "Fórmula 1",
        team: "Williams",
        highlight: "Debut en Monza reemplazando a Sargeant. Suma puntos en Bakú (P8) y Austin (P10).",
        stats: [
          { label: "Carreras", value: "9" },
          { label: "Puntos", value: "5" },
        ],
      },
      {
        year: "2024",
        series: "Fórmula 2",
        team: "MP Motorsport",
        highlight: "Temporada de debut en F2 hasta el salto a la F1 a mitad de año.",
      },
      {
        year: "2023",
        series: "Fórmula 3 FIA",
        team: "MP Motorsport",
        highlight: "Segunda temporada en F3, peleando en la parte alta del campeonato.",
      },
      {
        year: "2022",
        series: "Fórmula 3 FIA",
        team: "Van Amersfoort Racing",
        highlight: "Debut en la F3 de la FIA, antesala del Mundial.",
      },
      {
        year: "2020–21",
        series: "Eurocup / FRECA",
        team: "MP Motorsport",
        highlight: "Fórmula Regional europea y primeras experiencias en resistencia.",
      },
      {
        year: "2019",
        series: "F4 España",
        team: "Drivex",
        highlight: "Primer año completo en monoplazas en Europa.",
      },
      {
        year: "Infancia",
        series: "Karting",
        team: "Argentina → Italia",
        highlight: "De los kartódromos de Buenos Aires a mudarse solo a Italia con 14 años.",
      },
    ],
  },
  {
    slug: "nicolas-varrone",
    name: "Nicolás Varrone",
    nickname: "Nico",
    seriesId: "f2",
    team: "Equipo a confirmar",
    hometown: "Buenos Aires",
    born: "(a verificar)",
    tagline: "Campeón en Le Mans y de vuelta en los monoplazas camino a la F1.",
    seasonStats: [
      { label: "Puesto", value: "9°" },
      { label: "Puntos", value: "61" },
      { label: "Podios", value: "2" },
      { label: "Carreras", value: "20" },
    ],
    career: [
      {
        year: "2026",
        series: "Fórmula 2",
        team: "Equipo a confirmar",
        highlight: "Temporada en F2 con foco en sumar podios.",
      },
      {
        year: "2023",
        series: "WEC · GTE Am",
        team: "Corvette Racing",
        highlight: "Campeón del mundo de la clase y ganador en las 24 Horas de Le Mans.",
      },
      {
        year: "2022",
        series: "Fórmula 3 FIA",
        team: "Van Amersfoort Racing",
        highlight: "Temporada en la F3 de la FIA.",
      },
    ],
  },
  {
    slug: "agustin-canapino",
    name: "Agustín Canapino",
    nickname: "Titán",
    seriesId: "tc",
    team: "Canapino Sport",
    hometown: "Arrecifes, Buenos Aires",
    born: "(a verificar)",
    tagline: "Multicampeón nacional, pasó por IndyCar y volvió a casa.",
    seasonStats: [
      { label: "Puesto", value: "3°" },
      { label: "Puntos", value: "312" },
      { label: "Victorias", value: "2" },
      { label: "Fechas", value: "13" },
    ],
    career: [
      {
        year: "2023–24",
        series: "IndyCar",
        team: "Juncos Hollinger Racing",
        highlight: "Dos temporadas en IndyCar representando a un equipo argentino.",
      },
      {
        year: "2010–22",
        series: "TC · TC2000 · Top Race",
        team: "Varios",
        highlight: "Títulos en las principales categorías del país.",
      },
    ],
  },
];

export const driverBySlug = Object.fromEntries(drivers.map((d) => [d.slug, d]));
