import snapshot from "@/data/season-2026.json";
import { buildSeason } from "./sources/season.mjs";
import { nextIo } from "./sources/io-next";
import { f1OfficialSessions } from "./sources/f1-official.mjs";
import { f1Videos } from "./sources/f1-youtube.mjs";

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
export async function loadRawSeason(): Promise<RawSeason> {
  const base = await loadBase();
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.PISTA_LIVE === "0") return base;
  return withHotSources(base);
}

type HotFn = (io: typeof nextIo, events: unknown[], previous: RawSeason, options?: Record<string, unknown>) => Promise<{ events: unknown[] }>;
const hotResults = f1OfficialSessions as unknown as HotFn;
const hotVideos = f1Videos as unknown as HotFn;
/** Cuánto se espera lo "caliente" antes de mostrar lo que haya: son pocos pedidos con caché, no la temporada entera. */
const HOT_WAIT_MS = 5_000;
const HOT_TTL_MS = 30_000;
let hot: { base: RawSeason; at: number; value: Promise<RawSeason> } | null = null;

/**
 * Lo que tiene que estar al día apenas termina una sesión, sin esperar a reconstruir toda la temporada (que tarda minutos y mientras tanto
 * se muestra la última instantánea): los resultados de F1 que falten (página oficial) y los resúmenes de YouTube. Son unos pocos pedidos
 * con caché por URL; ante cualquier falla se devuelve la base tal cual.
 */
function withHotSources(base: RawSeason): Promise<RawSeason> {
  if (hot && hot.base === base && Date.now() - hot.at < HOT_TTL_MS) return waitHot(hot.value, base);
  const value = (async () => {
    try {
      const names = [...(base.standings.f1 ?? []).map((r) => (r as { driver: string }).driver)];
      const results = await hotResults(nextIo, base.events, base, { knownNames: names, windowDays: 10 });
      const videos = await hotVideos(nextIo, results.events, base, {});
      return { ...base, events: videos.events };
    } catch {
      return base;
    }
  })();
  hot = { base, at: Date.now(), value };
  return waitHot(value, base);
}
const waitHot = (value: Promise<RawSeason>, base: RawSeason) => Promise.race([value, new Promise<RawSeason>((resolve) => setTimeout(() => resolve(base), HOT_WAIT_MS))]);

function loadBase(): Promise<RawSeason> {
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
