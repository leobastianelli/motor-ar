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
  scope: Scope;
  /** Color de identidad de la categoría (no es el logo oficial). */
  color: string;
  founded?: number;
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
  /** Documento oficial del que salen los resultados de esta sesión. */
  resultsSource?: { name: string; url: string };
}

export interface Broadcast {
  name: string;
  kind: "tv" | "streaming" | "youtube";
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
