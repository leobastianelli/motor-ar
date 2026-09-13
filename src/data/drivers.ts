import type { Driver } from "@/lib/types";

// Pilotos argentinos seguidos por el sitio. Números y equipos 2026 verificados contra las fuentes
// de temporada (Jolpica-F1, Wikipedia, ACTC/APAT). Las estadísticas se calculan desde los datos, no se escriben acá.
export const drivers: Driver[] = [
  {
    slug: "franco-colapinto",
    name: "Franco Colapinto",
    number: 43,
    seriesId: "f1",
    team: "Alpine",
    hometown: "Pilar, Buenos Aires",
    born: "27/05/2003",
    tagline: "El primer argentino en la F1 desde Gastón Mazzacane en 2001.",
    career: [],
  },
  {
    slug: "nicolas-varrone",
    name: "Nicolás Varrone",
    aliases: ["Nico Varrone"],
    number: 22,
    seriesId: "f2",
    team: "Van Amersfoort Racing",
    hometown: "Argentina",
    born: "(a verificar)",
    tagline: "Campeón en Le Mans y de vuelta en los monoplazas camino a la F1.",
    career: [
      { year: "2022", series: "Fórmula 3 FIA", team: "Van Amersfoort Racing", highlight: "Temporada en la F3 de la FIA." },
      { year: "2023", series: "WEC · GTE Am", team: "Corvette Racing", highlight: "Campeón del mundo de la clase y ganador en las 24 Horas de Le Mans." },
      { year: "2026", series: "Fórmula 2", team: "Van Amersfoort Racing", highlight: "Temporada completa en la F2 con el número 22." },
    ].reverse(),
  },
  {
    slug: "agustin-canapino",
    name: "Agustín Canapino",
    aliases: ["Agustin Canapino"],
    number: 1,
    seriesId: "tc",
    team: "Chevrolet Camaro ZL1",
    hometown: "Arrecifes, Buenos Aires",
    born: "(a verificar)",
    tagline: "Pentacampeón del Turismo Carretera; pasó por IndyCar y volvió a casa.",
    career: [
      { year: "2010–25", series: "Turismo Carretera", team: "Chevrolet", highlight: "Campeón en 2010, 2017, 2018, 2019 y 2025." },
      { year: "2023–24", series: "IndyCar", team: "Juncos Hollinger Racing", highlight: "Dos temporadas en IndyCar con un equipo argentino." },
      { year: "2026", series: "TC · TN APAT", team: "Chevrolet", highlight: "Corre el Turismo Carretera con el número 1 y la Clase 3 del TN." },
    ].reverse(),
  },
];

export const driverBySlug = Object.fromEntries(drivers.map((d) => [d.slug, d]));
