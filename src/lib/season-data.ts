import snapshot from "@/data/season-2026.json";
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

/**
 * Datos de la temporada: la instantánea del repo (la deja la sincronización) más lo "caliente" (resultados de F1 y videos), que se completa
 * al pedir la página. Reconstruir la temporada entera desde las fuentes tarda minutos, así que no se hace durante el render.
 * En la compilación (o con PISTA_LIVE=0) se devuelve la instantánea sola.
 */
export async function loadRawSeason(): Promise<RawSeason> {
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.PISTA_LIVE === "0") return fallback;
  return withHotSources(fallback);
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
