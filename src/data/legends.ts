import type { Legend } from "@/lib/types";

// Leyendas del automovilismo argentino, ordenadas por fecha de nacimiento. Fechas, títulos e hitos verificados en
// Wikipedia en español (ver /fuentes); los textos están reescritos.
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
    slug: "oscar-galvez",
    name: "Oscar Alfredo Gálvez",
    nickname: "",
    years: "1913 – 1989",
    hometown: "Buenos Aires",
    tagline: "Cinco veces campeón del Turismo Carretera y uno de los ídolos más queridos de la ruta.",
    keyStats: [
      { label: "Títulos de TC", value: "5" },
      { label: "Victorias en TC", value: "43" },
      { label: "Grandes Premios Argentinos", value: "7" },
    ],
    chapters: [
      {
        period: "1937",
        title: "El Ford negro y blanco",
        body: "Debuta en el Turismo Carretera con un Ford. Tarda diez años en ser campeón, pero la gente ya lo tiene como ídolo por su audacia.",
      },
      {
        period: "1947 – 1961",
        title: "Cinco coronas",
        body: "Gana los campeonatos de 1947, 1948, 1953, 1954 y 1961, suma seis subcampeonatos y en 1952 consigue seis victorias en un mismo año.",
      },
      {
        period: "Legado",
        title: "Un autódromo con su nombre",
        body: "Además de sus triunfos en ruta, gana grandes premios de monoplazas. El autódromo de Buenos Aires lleva su nombre y el de su hermano Juan.",
      },
    ],
  },
  {
    slug: "juan-galvez",
    name: "Juan Gálvez",
    nickname: "",
    years: "1916 – 1963",
    hometown: "Buenos Aires",
    tagline: "El máximo campeón de la historia del Turismo Carretera: nueve títulos.",
    keyStats: [
      { label: "Títulos de TC", value: "9" },
      { label: "Grandes Premios Argentinos", value: "5" },
      { label: "Primera victoria", value: "1949" },
    ],
    chapters: [
      {
        period: "1949",
        title: "El primer triunfo",
        body: "Gana por primera vez en febrero de 1949, en la Vuelta de Santa Fe. Ese mismo año empieza una racha que nadie igualó.",
      },
      {
        period: "1949 – 1960",
        title: "Nueve campeonatos",
        body: "Campeón en 1949, 1950, 1951, 1952, 1955, 1956, 1957, 1958 y 1960. También gana cinco veces el Gran Premio Argentino como piloto.",
      },
      {
        period: "1963",
        title: "Olavarría",
        body: "Muere a los 47 años en la carrera de Olavarría, en el único accidente de su trayectoria. El récord de títulos del TC sigue siendo suyo.",
      },
    ],
  },
  {
    slug: "froilan-gonzalez",
    name: "José Froilán González",
    nickname: "El Cabezón",
    years: "1922 – 2013",
    hometown: "Arrecifes, Buenos Aires",
    tagline: "Le dio a Ferrari su primera victoria en la Fórmula 1 y ganó las 24 Horas de Le Mans.",
    keyStats: [
      { label: "Victorias F1", value: "2" },
      { label: "Subcampeón F1", value: "1954" },
      { label: "24 Horas de Le Mans", value: "1954" },
    ],
    chapters: [
      {
        period: "Arrecifes",
        title: "El Toro de la Pampa",
        body: "Nacido en la ciudad que después se llamó cuna de campeones, se forma en el Turismo Carretera y viaja a Europa junto a la generación de Fangio.",
      },
      {
        period: "1951",
        title: "Silverstone",
        body: "Gana el Gran Premio de Gran Bretaña con Ferrari: es la primera victoria de la escudería en el campeonato mundial de Fórmula 1.",
      },
      {
        period: "1954",
        title: "El año grande",
        body: "Vuelve a ganar en Silverstone, termina subcampeón del mundo y se queda con las 24 Horas de Le Mans con Ferrari.",
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
    slug: "luis-ruben-di-palma",
    name: "Luis Rubén Di Palma",
    nickname: "El Loco",
    years: "1944 – 2000",
    hometown: "Arrecifes, Buenos Aires",
    tagline: "Bicampeón del Turismo Carretera con Torino y fundador de una dinastía de pilotos.",
    keyStats: [
      { label: "Títulos de TC", value: "2" },
      { label: "Sport Prototipo", value: "2" },
      { label: "Le Mans", value: "1973" },
    ],
    chapters: [
      {
        period: "Primeros años",
        title: "De Chevrolet a Torino",
        body: "Gana por primera vez con Chevrolet en Arrecifes y al año siguiente, en Junín, estrena victorias con Torino.",
      },
      {
        period: "1970 – 1973",
        title: "Campeón en todos lados",
        body: "Campeón de Turismo Carretera con Torino en 1970 y 1971, del Sport Prototipo Argentino en 1971 y 1972, y en 1973 corre las 24 Horas de Le Mans con una Ferrari.",
      },
      {
        period: "Legado",
        title: "El clan Di Palma",
        body: "Padre de José Luis, Patricio, Marcos y Andrea, todos pilotos. Muere en el año 2000, cerca de Carlos Tejedor, al caer el helicóptero que pilotaba.",
      },
    ],
  },
  {
    slug: "roberto-mouras",
    name: "Roberto Mouras",
    nickname: "El Toro",
    years: "1948 – 1992",
    hometown: "Moctezuma, Carlos Casares, Buenos Aires",
    tagline: "Cincuenta victorias y tres títulos seguidos de Turismo Carretera con Dodge.",
    keyStats: [
      { label: "Victorias en TC", value: "50" },
      { label: "Títulos de TC", value: "3" },
      { label: "Campeón", value: "1983 – 85" },
    ],
    chapters: [
      {
        period: "1975 – 1976",
        title: "Chevrolet y la racha",
        body: "Se pasa a Chevrolet y en 1976 encadena seis victorias consecutivas en el Turismo Carretera.",
      },
      {
        period: "1983 – 1985",
        title: "Tricampeón con Dodge",
        body: "Gana tres campeonatos seguidos con Dodge y se convierte en uno de los grandes de la historia de la categoría.",
      },
      {
        period: "1992",
        title: "Lobos",
        body: "Muere durante la Vuelta de Lobos, penúltima fecha del año. Dos categorías de la ACTC, el TC Mouras y el TC Pista Mouras, llevan su apellido en su honor.",
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
        period: "2024",
        title: "El récord",
        body: "Muere en Ramallo en mayo de 2024, a los 73 años. Se va con la mayor cantidad de títulos nacionales: su nombre sigue siendo sinónimo de ganar.",
      },
    ],
  },
  {
    slug: "jorge-recalde",
    name: "Jorge Recalde",
    nickname: "El Cóndor de Traslasierra",
    years: "1951 – 2001",
    hometown: "Mina Clavero, Córdoba",
    tagline: "El único argentino que ganó el Rally de Argentina del Mundial.",
    keyStats: [
      { label: "Títulos argentinos de rally", value: "6" },
      { label: "Victoria en el Mundial", value: "1988" },
      { label: "Podios en el Mundial", value: "8" },
    ],
    chapters: [
      {
        period: "1971 – 1979",
        title: "De la montaña al rally",
        body: "Gana su primera carrera en 1971, es campeón de Turismo Nacional en 1974 y en 1979 conquista su primer Campeonato Argentino de Rally.",
      },
      {
        period: "1988",
        title: "Rally de Argentina",
        body: "Gana la fecha argentina del Campeonato Mundial de Rally: es el primer y único argentino en lograrlo. Impulsor de la prueba en Córdoba.",
      },
      {
        period: "2001",
        title: "Villa Dolores",
        body: "Seis veces campeón argentino de rally, muere en 2001 durante el Rally de Villa Dolores, por un infarto, a un costado del camino.",
      },
    ],
  },
];

export const legendBySlug = Object.fromEntries(legends.map((l) => [l.slug, l]));
