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
  flag?: string;
}

export interface Session {
  id: string;
  kind: SessionKind;
  name: string;
  /** ISO 8601 con offset. */
  start: string;
  durationMin: number;
  results?: ResultRow[];
  youtube?: string;
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
  circuit: Circuit;
  sessions: Session[];
  broadcasts: Broadcast[];
}

export interface CareerStint {
  year: string;
  series: string;
  team: string;
  highlight: string;
  stats?: { label: string; value: string }[];
}

export interface Driver {
  slug: string;
  name: string;
  nickname?: string;
  number?: number;
  seriesId: string;
  team: string;
  hometown: string;
  born: string;
  tagline: string;
  seasonStats: { label: string; value: string }[];
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
