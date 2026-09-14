import type { Legend } from "@/lib/types";

export const legends: Legend[] = [
  {
    slug: "juan-manuel-fangio",
    name: "Juan Manuel Fangio",
    nickname: "El Chueco",
    years: "1911 – 1995",
    hometown: "Balcarce, Buenos Aires",
    tagline: "Cinco títulos mundiales con cuatro marcas distintas. La vara con la que se mide a todos.",
    keyStats: [
      { label: "Títulos F1", value: "5" },
      { label: "Victorias", value: "24" },
      { label: "Marcas campeonas", value: "4" },
    ],
    chapters: [
      {
        period: "1938 – 1949",
        title: "Los caminos de tierra",
        body: "Mecánico de Balcarce, se hace nombre en el Turismo Carretera con Chevrolet: grandes premios de ruta de miles de kilómetros, noches sin dormir y campeonatos en 1940 y 1941.",
      },
      {
        period: "1950 – 1951",
        title: "Europa y el primer título",
        body: "Llega a Europa con casi 40 años. Con Alfa Romeo pelea el primer campeonato del mundo y lo gana en 1951.",
      },
      {
        period: "1954 – 1956",
        title: "Mercedes, Ferrari y la dinastía",
        body: "Tres títulos consecutivos entre Maserati, Mercedes y Ferrari. Adaptarse a cualquier auto era su marca registrada.",
      },
      {
        period: "1957",
        title: "Nürburgring",
        body: "Con la Maserati 250F remonta casi un minuto en el Nürburgring y gana la carrera que muchos consideran la mejor de la historia. Quinto título.",
      },
    ],
  },
  {
    slug: "carlos-reutemann",
    name: "Carlos Reutemann",
    nickname: "Lole",
    years: "1942 – 2021",
    hometown: "Santa Fe",
    tagline: "Velocidad pura y elegancia. Estuvo a un punto de ser campeón del mundo.",
    keyStats: [
      { label: "Victorias F1", value: "12" },
      { label: "Temporadas", value: "10" },
      { label: "Subcampeón", value: "1981" },
    ],
    chapters: [
      {
        period: "1972",
        title: "Pole en el debut",
        body: "Debuta con Brabham en el Gran Premio de Argentina y sale desde la pole position ante su gente.",
      },
      {
        period: "1974 – 1978",
        title: "Brabham y Ferrari",
        body: "Primeras victorias con Brabham y luego el salto a Ferrari, donde se consolida como candidato permanente.",
      },
      {
        period: "1981",
        title: "Un punto",
        body: "Con Williams lidera buena parte del campeonato y lo pierde por un punto en la última fecha de Las Vegas.",
      },
    ],
  },
  {
    slug: "juan-maria-traverso",
    name: "Juan María Traverso",
    nickname: "El Flaco",
    years: "1950 – 2024",
    hometown: "Ramallo, Buenos Aires",
    tagline: "El piloto con más campeonatos del automovilismo argentino. Ídolo total.",
    keyStats: [
      { label: "Títulos nacionales", value: "16" },
      { label: "Categorías", value: "TC · TC2000 · TN" },
      { label: "Marca", value: "Chevrolet" },
    ],
    chapters: [
      {
        period: "Años 70",
        title: "De Ramallo a las pistas",
        body: "Irrumpe en el automovilismo nacional con un estilo agresivo que lo convierte rápidamente en favorito del público.",
      },
      {
        period: "Años 80 – 90",
        title: "La era dorada",
        body: "Domina el TC2000 y se transforma en referencia de Chevrolet en el Turismo Carretera, con duelos que marcaron generaciones.",
      },
      {
        period: "Legado",
        title: "El récord",
        body: "Acumula la mayor cantidad de títulos nacionales. Su nombre sigue siendo sinónimo de ganar.",
      },
    ],
  },
];

export const legendBySlug = Object.fromEntries(legends.map((l) => [l.slug, l]));
