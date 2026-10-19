// Notas de medios: Fierros no republica notas, las reseña y manda a leerlas a su origen.
// Reglas (las verifica `npm test`):
//  · `summary` es un resumen propio, en pocas líneas. Nunca se copian párrafos del medio.
//  · `quote`, si hay, es una cita textual de a lo sumo 25 palabras, entre comillas y atribuida al medio.
//  · Todas llevan medio, titular original, fecha y enlace a la nota completa.
//  · `drivers`, `series` y `events` enlazan la nota con el resto del sitio (slugs de pilotos, ids de categorías y de fechas);
//    además, los nombres de pilotos y categorías que aparezcan en el resumen se enlazan solos.
export interface Nota {
  slug: string;
  /** Titular de Fierros: propio, no el del medio. */
  title: string;
  /** Titular para buscadores y para el <title> de la página, cuando conviene que nombre la categoría (las crónicas: "Fórmula 2 en Baku: …"). Sin esto se usa `title`. */
  seoTitle?: string;
  /** Fecha de publicación de la nota original (AAAA-MM-DD). */
  publishedAt: string;
  source: { medio: string; url: string; headline: string; author?: string };
  summary: string;
  quote?: string;
  drivers?: string[];
  series?: string[];
  events?: string[];
  /** Nota armada sola con los resultados de una fecha (src/lib/notas-auto.ts): no viene de un medio, `source` apunta a la fecha en Fierros. */
  auto?: { sources: string[] };
  /** Párrafos adicionales (en las automáticas, lo ocurrido en los días anteriores del fin de semana). */
  details?: string[];
}

export const notas: Nota[] = [
  {
    slug: "colnaghi-pasa-a-campos-racing-para-la-f3-2027",
    title: "Colnaghi pasa a Campos, el equipo campeón de la F3",
    publishedAt: "2026-10-19",
    source: {
      medio: "Infobae",
      url: "https://www.infobae.com/deportes/2026/10/19/el-argentino-mattia-colnaghi-correra-en-un-equipo-de-punta-en-la-formula-3-la-intervencion-clave-de-red-bull/",
      headline: "El argentino Mattia Colnaghi correrá en un equipo de punta en la Fórmula 3: la intervención clave de Red Bull",
      author: "Darío Coronel",
    },
    summary:
      "Mattia Colnaghi deja MP Motorsport y correrá la Fórmula 3 2027 con Campos Racing, que ganó los títulos de pilotos y equipos este año. El cambio lo empujó Red Bull, que lo mantiene en su programa de juveniles. Cerró su temporada debut 13.º con 54 puntos; esta semana prueba en Jerez y el 26 y 27 de octubre en Barcelona.",
    drivers: ["mattia-colnaghi"],
    series: ["f3"],
  },
  {
    slug: "colapinto-larga-noveno-en-baku-por-la-sancion-a-sainz",
    title: "Colapinto larga noveno en Bakú por la sanción a Sainz",
    publishedAt: "2026-09-25",
    source: {
      medio: "Infobae",
      url: "https://www.infobae.com/deportes/2026/09/25/franco-colapinto-afronta-la-ultima-practica-libre-en-el-gran-premio-de-baku/",
      headline: "Tras una sanción a Sainz, Franco Colapinto largará 9° el Gran Premio de Azerbaiyán en el circuito callejero de Bakú",
    },
    summary:
      "Franco Colapinto clasificó 10.º en Bakú, pero largará 9.º: Carlos Sainz, que había quedado noveno, recibió cinco puestos de sanción por no reducir la velocidad con bandera amarilla y saldrá 14.º. George Russell parte desde la pole; la carrera es el sábado a las 08:00, hora argentina.",
    drivers: ["franco-colapinto"],
    series: ["f1"],
    events: ["f1-2026-15"],
  },
  {
    slug: "bainotti-15-anos-motorhome-y-la-f1",
    title: "Bainotti: 15 años, motorhome y el sueño de la F1",
    publishedAt: "2026-09-16",
    source: {
      medio: "Infobae",
      url: "https://www.infobae.com/deportes/2026/09/16/lazaro-bainotti-el-piloto-argentino-de-15-anos-que-corre-a-230-kmh-y-ya-piensa-en-europa-mi-sueno-de-todo-es-llegar-a-la-formula-1/",
      headline: "Lázaro Bainotti, el piloto argentino de 15 años que corre a 230 km/h y ya piensa en Europa: “Mi sueño de todo es llegar a la Fórmula 1”",
      author: "Brisa Bujakiewicz",
    },
    summary:
      "Perfil de Lázaro Bainotti, cordobés que se mudó a Estados Unidos con su padre a los 13 porque allá se puede correr en monoplazas antes de los 15. Viaja en motorhome entre carreras, estudia a distancia y tiene previstas pruebas de Fórmula 4 en Europa en los próximos meses.",
    quote: "Mi sueño de todo es llegar a la Fórmula 1",
    drivers: ["lazaro-bainotti"],
    series: ["ligier-jfc"],
  },
  {
    slug: "la-promesa-cordobesa-que-ya-suena-para-la-f1",
    title: "La promesa cordobesa que ya suena para la Fórmula 1",
    publishedAt: "2026-09-11",
    source: {
      medio: "Infobae",
      url: "https://www.infobae.com/deportes/2026/09/11/tiene-15-anos-corre-en-autos-desde-los-12-y-afirman-que-sera-el-proximo-argentino-en-la-formula-1/",
      headline: "Tiene 15 años, corre en autos desde los 12 y afirman que será el próximo argentino en la Fórmula 1",
      author: "Darío Coronel",
    },
    summary:
      "Infobae presenta a Lázaro Bainotti como una de las esperanzas argentinas para llegar a la Fórmula 1. Empezó en el karting a los 10 años y hoy corre en la F4 de Estados Unidos; su manager, Eduardo Ramírez, lo compara con Fernando Alonso en sus comienzos.",
    drivers: ["lazaro-bainotti"],
    series: ["ligier-jfc"],
  },
  {
    slug: "bainotti-el-ganador-mas-joven-de-la-f4-ligier",
    title: "Bainotti, el ganador más joven de la F4 Ligier",
    publishedAt: "2026-04-13",
    source: {
      medio: "Carburando",
      url: "https://www.carburando.com/notas/f4-ligier-usa-lazaro-bainotti-gano-en-nueva-orleans-y-logro-un-record-historico",
      headline: "F4 Ligier USA: Lázaro Bainotti ganó en Nueva Orleans y logró un récord histórico",
    },
    summary:
      "Lázaro Bainotti ganó en Nueva Orleans, largando quinto y con más de 10 segundos sobre Beckham Jacir, y se convirtió en el piloto más joven en ganar en la historia de la F4 Ligier de Estados Unidos.",
    drivers: ["lazaro-bainotti"],
    series: ["ligier-jfc"],
    events: ["ligier-jfc-2026-1"],
  },
  {
    slug: "santero-gano-la-final-del-tn-en-rio-cuarto",
    title: "Santero se quedó con la final del TN en Río Cuarto",
    publishedAt: "2026-09-20",
    source: {
      medio: "Sitio Andino",
      url: "https://www.sitioandino.com.ar/andino-sports/julian-santero-gano-rio-cuarto-el-drama-lucas-vicino-y-mendoza-copo-el-podio-del-tn-n5730529",
      headline: "Julián Santero ganó en Río Cuarto tras el drama de Lucas Vicino y Mendoza copó el podio del TN",
      author: "Sitio Andino Deportes",
    },
    summary:
      "Lucas Vicino lideró casi toda la final de la Clase 3 del TN en Río Cuarto, pero una falla de motor sobre el final dejó pasar a Julián Santero, que ganó. Leonel Pernía completó el podio de la novena fecha.",
    drivers: ["julian-santero", "lucas-vicino", "leonel-pernia"],
    series: ["tn"],
    events: ["tn-2026-9"],
  },
];
