import { drivers } from "@/data/drivers";
import { notas, type Nota } from "@/data/notas";
import { series } from "@/data/series";
import { getIndexedDrivers } from "./data";

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

export const getNotes = (): Nota[] => [...notas].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
export const getNote = (slug: string) => notas.find((n) => n.slug === slug);
export const notesForDriver = (slug: string) => getNotes().filter((n) => related(n).drivers.includes(slug));
export const notesForSeries = (id: string) => getNotes().filter((n) => related(n).series.includes(id));
export const notesForEvent = (id: string) => getNotes().filter((n) => n.events?.includes(id));
