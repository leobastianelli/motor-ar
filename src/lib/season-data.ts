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
/** Si reconstruir la temporada tarda más que esto, se responde con lo último que haya y la reconstrucción sigue sola. */
const WAIT_MS = 6_000;
let memo: { at: number; value: Promise<RawSeason> } | null = null;
let lastGood: RawSeason = fallback;

/**
 * Datos de la temporada. En la compilación (o con PISTA_LIVE=0) se usa la instantánea del repo; en ejecución se
 * reconstruyen desde las fuentes, que tienen caché por URL, y ante cualquier error se vuelve a la instantánea.
 */
export function loadRawSeason(): Promise<RawSeason> {
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.PISTA_LIVE === "0") return Promise.resolve(fallback);
  if (memo && Date.now() - memo.at < TTL_MS) return waitOrLast(memo.value);
  const value = build(nextIo, fallback)
    .then((season) => {
      const ok = season.events.length > 0 ? season : fallback;
      lastGood = ok;
      return ok;
    })
    .catch(() => lastGood);
  memo = { at: Date.now(), value };
  return waitOrLast(value);
}

/** Espera la temporada nueva unos segundos; si no llega, devuelve la última buena (instantánea o reconstrucción anterior). */
function waitOrLast(value: Promise<RawSeason>): Promise<RawSeason> {
  return Promise.race([value, new Promise<RawSeason>((resolve) => setTimeout(() => resolve(lastGood), WAIT_MS))]);
}
