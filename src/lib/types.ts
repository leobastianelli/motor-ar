// Modelo de dominio. Pensado para mapear 1:1 a tablas de Postgres más adelante
// (series, events, sessions, results, drivers, broadcasts, favorites).

export type Scope = "internacional" | "nacional" | "zonal";

export interface Series {
  id: string;
  name: string;
  short: string;
  /** Código de 2–3 caracteres para el sello de color. */
  code: string;
  org: string;
  /** Sitio oficial de quien organiza la categoría (no el sitio de la categoría en sí, si son distintos). */
  orgUrl?: string;
  scope: Scope;
  /** Color de identidad de la categoría (no es el logo oficial). */
  color: string;
  founded?: number;
  /** Si sólo cargamos parte de la temporada, qué falta. Con esto las estadísticas de los pilotos no se muestran como si fueran las del año. */
  partialResults?: string;
  /**
   * Clases de la categoría que corren juntas en cada fecha (p. ej. Córdoba Pista: TC 4000, Clase 3…). Cada clase tiene su propio sello,
   * sus sesiones (`Session.classId`) y su campeonato. Los ids son propios de la categoría: la "Clase 3" de Córdoba Pista no tiene nada que ver
   * con la del TN, aunque se llamen igual.
   */
  classes?: SeriesClass[];
}

export interface SeriesClass {
  /** Único dentro de la categoría (no entre categorías): "tc4000", "clase3". */
  id: string;
  name: string;
  short: string;
  /** Sello de 2–5 caracteres. */
  code: string;
  color: string;
}

export interface Circuit {
  name: string;
  city: string;
  country: string;
  province?: string;
  /** Código ISO 3166-1 alfa-2. Los emojis de bandera no se ven en Windows. */
  flag: string;
}

export type SessionKind =
  | "practica"
  | "clasificacion"
  | "sprint"
  | "serie"
  | "final"
  | "carrera";

export interface ResultRow {
  pos: number;
  driver: string;
  /** Código oficial de tres letras, si la fuente lo publica. */
  code?: string;
  driverSlug?: string;
  team: string;
  gap: string;
  points?: number;
  grid?: number;
  /** Número del auto, si la fuente lo publica. */
  number?: string;
  /** Clase dentro de la carrera (GT: Pro, Gold, Silver o Bronze Cup), si la fuente la publica. */
  class?: string;
  /** Vueltas completadas, si la fuente las publica (el puntaje de Córdoba Pista exige el 75 % de las del ganador). */
  laps?: number;
  /** Posición tal como la publica la fuente ("R" = abandono, etc.). */
  positionText?: string;
  status?: string;
}

export interface Session {
  id: string;
  kind: SessionKind;
  name: string;
  /** ISO 8601 con offset. Si `timeKnown` es falso, sólo la fecha es confiable. */
  start: string;
  timeKnown?: boolean;
  /** "confirmed": fuente oficial o dos fuentes coinciden; "tentative": una sola fuente. */
  timeStatus?: "confirmed" | "tentative";
  timeSources?: { name: string; url: string; start: string }[];
  durationMin: number;
  results?: ResultRow[];
  /** Clase de la categoría a la que pertenece la sesión (ver `SeriesClass`). Sólo las categorías con clases la llevan. */
  classId?: string;
  /**
   * Documento del que salen los resultados de esta sesión. Sin `status` es un resultado oficial. Con `status: "provisional"` es la planilla del
   * cronometraje de la ACTC, publicada antes de que los comisarios revisen (src/lib/provisorio.mjs). Si el oficial reemplazó a un provisorio,
   * `provisional` guarda el podio que se había mostrado y `note` qué cambió ("Oficial: ...").
   */
  resultsSource?: {
    name: string;
    url: string;
    status?: "provisional";
    provisional?: { url?: string; podium: { pos: number; number: string; driver: string }[] };
    note?: string;
  };
  /** La sesión terminó y el organizador ya publicó la clasificación, pero ninguna fuente automática la pudo leer (p. ej. sólo salió en PDF). */
  resultsUnread?: boolean;
  /** La fuente publicó el documento oficial pero con filas sueltas (sin podio): no se muestra nada hasta que lo corrijan. */
  resultsGap?: { reason: "incompleto"; url: string; rows?: number };
  /** Videos oficiales de la sesión en YouTube: la transmisión y los resúmenes. La dirección es youtube.com/watch?v=<id>. */
  videos?: { id: string; kind: "live" | "highlights"; label?: string }[];
}

export interface Broadcast {
  name: string;
  kind: "tv" | "streaming" | "youtube" | "timing";
  url?: string;
}

export interface RaceEvent {
  id: string;
  seriesId: string;
  round: number;
  name: string;
  /** Nombre original en la fuente (p. ej. "Spanish Grand Prix"). */
  officialName?: string;
  circuit: Circuit;
  sessions: Session[];
  broadcasts: Broadcast[];
  /** De dónde salen los datos del evento. */
  source?: string;
}

export interface StandingRow {
  pos: number;
  driver: string;
  team: string;
  points: number;
  wins?: number;
  driverSlug?: string;
  /** En una categoría con clases, la clase de esta tabla. */
  classId?: string;
}

export interface CareerStint {
  year: string;
  series: string;
  team: string;
  highlight: string;
}

export interface Driver {
  slug: string;
  name: string;
  /** Otras formas en que las fuentes escriben el nombre. */
  aliases?: string[];
  number?: number;
  seriesId: string;
  team: string;
  hometown: string;
  born: string;
  tagline: string;
  career: CareerStint[];
}

export interface LegendChapter {
  period: string;
  title: string;
  body: string;
}

export interface Legend {
  slug: string;
  name: string;
  nickname: string;
  years: string;
  hometown: string;
  tagline: string;
  keyStats: { label: string; value: string }[];
  chapters: LegendChapter[];
}

export interface ChampionEntry {
  year: number;
  label?: string;
  driver: string;
  detail?: string;
  make?: string;
  argentine?: boolean;
  group?: string;
}

export interface CategoryHistory {
  source: { label: string; url: string; license: string };
  champions: ChampionEntry[];
  winsLeaders?: { driver: string; wins: number }[];
  note?: string;
  argentineTitles?: number;
  firstYear: number;
  lastYear: number;
  seasons: number;
  distinctChampions: number;
  topChampions: { driver: string; titles: number; years: number[] }[];
  makeLabel: string;
  topMakes: { name: string; titles: number }[];
}
