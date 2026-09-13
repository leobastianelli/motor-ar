import snapshot from "@/data/season-2026.json";
import { buildSeason } from "./sources/season.mjs";
import { nextIo } from "./sources/io-next";

export interface RawSeason {
  generatedAt: string;
  events: unknown[];
  standings: Record<string, unknown[]>;
  meta: Record<string, unknown>;
  failures?: string[];
}

const fallback = snapshot as unknown as RawSeason;
const build = buildSeason as unknown as (io: typeof nextIo, previous: RawSeason) => Promise<RawSeason>;
const TTL_MS = 60_000;
let memo: { at: number; value: Promise<RawSeason> } | null = null;

/**
 * Datos de la temporada. En la compilación (o con PISTA_LIVE=0) se usa la instantánea del repo; en ejecución se
 * reconstruyen desde las fuentes, que tienen caché por URL, y ante cualquier error se vuelve a la instantánea.
 */
export function loadRawSeason(): Promise<RawSeason> {
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.PISTA_LIVE === "0") return Promise.resolve(fallback);
  if (memo && Date.now() - memo.at < TTL_MS) return memo.value;
  const value = build(nextIo, fallback)
    .then((season) => (season.events.length > 0 ? season : fallback))
    .catch(() => fallback);
  memo = { at: Date.now(), value };
  return value;
}
