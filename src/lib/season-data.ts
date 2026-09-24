import { unstable_cache } from "next/cache";
import snapshot from "@/data/season-2026.json";
import { sql } from "./db";
import { createReader } from "./season-store-core.mjs";
import { nextIo } from "./sources/io-next";
import { f1OfficialSessions } from "./sources/f1-official.mjs";
import { f1Videos } from "./sources/f1-youtube.mjs";

/** De dónde salió la temporada que se está mostrando (la etapa 03 lo hace visible). */
export interface SeasonSource {
  /** Id de la fila de `season_versions`; null si se sirve la instantánea del repo. */
  versionId: number | null;
  /** "seed" | "sync" | "hot" | "snapshot", con "+hot" si encima se aplicaron los resultados calientes. */
  origin: string;
  generatedAt: string;
  createdAt: string | null;
  /** "store": recién leída del almacén. "memo": última versión vista, porque el almacén falló. "snapshot": instantánea del repo. */
  servedFrom: "store" | "memo" | "snapshot";
  error?: string;
}

export interface RawSeason {
  generatedAt: string;
  events: unknown[];
  standings: Record<string, unknown[]>;
  meta: Record<string, unknown>;
  failures?: string[];
  source?: SeasonSource;
}

const fallback = snapshot as unknown as RawSeason;

interface LatestMeta {
  id: number;
  origin: string;
  generatedAt: string;
  createdAt: string;
}

// Consulta chica, se puede guardar en la caché de datos: se invalida con revalidateTag("season", ...) cuando un escritor publica una versión.
const latest = unstable_cache(
  async (): Promise<LatestMeta | null> => {
    const rows = (await sql()`SELECT id, origin, generated_at::text AS "generatedAt", created_at::text AS "createdAt" FROM season_versions ORDER BY id DESC LIMIT 1`) as unknown as LatestMeta[];
    return rows[0] ?? null;
  },
  ["season-latest"],
  { tags: ["season"] },
);

// Consulta pesada (unos 3 MB): sin envolver. El lector la repite sólo cuando cambia el id de versión.
async function body(id: number): Promise<string> {
  const rows = (await sql()`SELECT body FROM season_versions WHERE id = ${id}`) as unknown as { body: string }[];
  if (!rows[0]) throw new Error(`La versión ${id} no existe`);
  return rows[0].body;
}

const noStore = async (): Promise<null> => {
  throw new Error("Sin DATABASE_URL: se usa la instantánea del repo");
};
const read = createReader({ latest: process.env.DATABASE_URL ? latest : noStore, body, fallback });

let based: { raw: RawSeason; key: string; out: RawSeason } | null = null;

/**
 * Datos de la temporada: la versión vigente del almacén (Neon) más lo "caliente" (resultados de F1 y videos), que se completa al pedir la página.
 * Si el almacén falla se usa la última versión vista o, en su defecto, la instantánea del repo, y `source.servedFrom` lo dice.
 * `PISTA_LIVE=0` o la compilación sin base devuelven la temporada sin lo caliente.
 */
export async function loadRawSeason(): Promise<RawSeason> {
  const { raw, source } = await read();
  const key = JSON.stringify(source);
  // Mismo objeto mientras no cambie la versión ni el estado: getSeason() y lo caliente comparan por identidad.
  if (!based || based.raw !== raw || based.key !== key) based = { raw, key, out: { ...raw, source } };
  const base = based.out;
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

const f1Json = (events: unknown[]) => JSON.stringify(events.filter((e) => (e as { seriesId: string }).seriesId === "f1"));

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
      const changed = f1Json(videos.events) !== f1Json(base.events);
      return changed ? { ...base, events: videos.events, source: { ...base.source!, origin: `${base.source!.origin}+hot` } } : base;
    } catch {
      return base;
    }
  })();
  hot = { base, at: Date.now(), value };
  return waitHot(value, base);
}
const waitHot = (value: Promise<RawSeason>, base: RawSeason) => Promise.race([value, new Promise<RawSeason>((resolve) => setTimeout(() => resolve(base), HOT_WAIT_MS))]);
