import { drivers } from "@/data/drivers";
import { notas, type Nota } from "@/data/notas";
import { series } from "@/data/series";
import { getIndexedDrivers, getNow, getSeason, seriesTier } from "./data";
import { autoNotes } from "./notas-auto";

// Capa de acceso a las notas de medios (src/data/notas.ts) y enlazado con pilotos, categorías y fechas.

// Otras formas en que los medios nombran a una categoría, además de su nombre completo.
const EXTRA_SERIES_NAMES: Record<string, string[]> = {
  tn: ["Turismo Nacional"],
  "ligier-jfc": ["Ligier JFC", "F4 Ligier"],
  f1: ["Fórmula Uno"],
  gt3: ["GT World Challenge"],
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type Target = { kind: "driver" | "series"; id: string; href: string };

// Nombres que se reconocen dentro del texto. Los más largos primero, para que "Turismo Nacional" gane sobre "Turismo".
const NAMES: { name: string; target: Target }[] = [
  ...drivers.flatMap((d) => [d.name, ...(d.aliases ?? [])].map((name) => ({ name, target: { kind: "driver", id: d.slug, href: `/pilotos/${d.slug}` } as Target }))),
  // Pilotos que no tienen ficha propia pero sí página automática con sus resultados (p. ej. Lucas Vicino).
  ...getIndexedDrivers().flatMap((d) => [d.name, ...(d.aliases ?? [])].map((name) => ({ name, target: { kind: "driver", id: d.slug, href: `/pilotos/${d.slug}` } as Target }))),
  ...series.flatMap((s) => [s.name, ...(EXTRA_SERIES_NAMES[s.id] ?? [])].map((name) => ({ name, target: { kind: "series", id: s.id, href: `/categorias/${s.id}` } as Target }))),
].sort((a, b) => b.name.length - a.name.length);

const MATCHER = new RegExp(`(?<![\\p{L}\\p{N}])(${NAMES.map((n) => escape(n.name)).join("|")})(?![\\p{L}\\p{N}])`, "giu");
const TARGET_BY_NAME = new Map(NAMES.map((n) => [norm(n.name), n.target]));

export type Piece = { text: string; href?: string };

/** Parte el texto en tramos y enlaza la primera mención de cada piloto o categoría con su página. */
export function linkMentions(text: string): Piece[] {
  const seen = new Set<string>();
  const pieces: Piece[] = [];
  let last = 0;
  for (const m of text.matchAll(MATCHER)) {
    const target = TARGET_BY_NAME.get(norm(m[0]));
    if (!target) continue;
    const key = `${target.kind}:${target.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (m.index > last) pieces.push({ text: text.slice(last, m.index) });
    pieces.push({ text: m[0], href: target.href });
    last = m.index + m[0].length;
  }
  if (last < text.length) pieces.push({ text: text.slice(last) });
  return pieces;
}

/** Pilotos, categorías y fechas a los que se enlaza una nota: los cargados a mano más los que aparecen nombrados en el titular y el resumen. */
export function related(nota: Nota) {
  const found = { drivers: new Set(nota.drivers ?? []), series: new Set(nota.series ?? []) };
  for (const m of `${nota.title}. ${nota.summary}`.matchAll(MATCHER)) {
    const target = TARGET_BY_NAME.get(norm(m[0]));
    if (target) found[target.kind === "driver" ? "drivers" : "series"].add(target.id);
  }
  return { drivers: [...found.drivers], series: [...found.series], events: nota.events ?? [] };
}

const byDate = (a: Nota, b: Nota) => b.publishedAt.localeCompare(a.publishedAt);

/** Notas de medios cargadas a mano (src/data/notas.ts). Síncrono: lo usan el menú y el mapa del sitio. */
export const getNotes = (): Nota[] => [...notas].sort(byDate);

/**
 * Todas las notas: las de medios y las crónicas automáticas de las fechas de estos días (una por fecha, se arman con los resultados
 * apenas entran). A igual día, las de medios primero; las crónicas ya vienen ordenadas por prioridad de categoría.
 */
export async function getAllNotes(): Promise<Nota[]> {
  const season = await getSeason();
  const seriesOf = new Map(series.map((s) => [s.id, s]));
  const auto = autoNotes(season.getAllEvents(), {
    now: getNow(),
    argentines: new Set(drivers.map((d) => d.slug)),
    tierOf: (id) => (seriesOf.get(id) ? seriesTier(seriesOf.get(id)!) : 3),
    seriesName: (id) => seriesOf.get(id),
  });
  const rank = new Map(auto.map((n, i) => [n.slug, i]));
  return [...notas, ...auto].sort((a, b) => byDate(a, b) || Number(!!a.auto) - Number(!!b.auto) || (rank.get(a.slug) ?? 0) - (rank.get(b.slug) ?? 0));
}

export const getNote = async (slug: string) => (await getAllNotes()).find((n) => n.slug === slug);
export const notesForDriver = async (slug: string) => (await getAllNotes()).filter((n) => related(n).drivers.includes(slug));
export const notesForSeries = async (id: string) => (await getAllNotes()).filter((n) => related(n).series.includes(id));
export const notesForEvent = async (id: string) => (await getAllNotes()).filter((n) => n.events?.includes(id));
