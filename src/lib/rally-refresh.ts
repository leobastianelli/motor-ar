import { revalidatePath, revalidateTag } from "next/cache";
import { sql } from "./db";
import { mergeRally, RALLY } from "./rally-refresh-core.mjs";
import { readLatest, writeVersion } from "./season-store-write.mjs";
import { nextIo, type IoOptions } from "./sources/io-next";
import { rallyArgentinoSeason } from "./sources/rally-argentino.mjs";

type Raw = { generatedAt: string; events: unknown[]; standings: Record<string, unknown[]>; meta: Record<string, unknown>; failures?: string[]; [key: string]: unknown };
type Part = { events: unknown[]; standings: Record<string, unknown>; meta: Record<string, unknown> };
type RallyFn = (io: typeof nextIo, previous: Raw, options?: Record<string, unknown>) => Promise<Part>;
type Merge = (base: Raw, part: Part, options: { at: string }) => { raw: Raw; changed: boolean; flipped: boolean; write: boolean };
type Store = Parameters<typeof readLatest>[0];
const fetchRally = rallyArgentinoSeason as unknown as RallyFn;
const merge = mergeRally as unknown as Merge;

export type RallyOutcome =
  | { status: "skipped"; reason: string }
  | { status: "locked" }
  | { status: "unchanged"; versionId: number; ok: boolean; errors: string[] }
  | { status: "written"; versionId: number; ok: boolean; errors: string[] }
  | { status: "error"; error: string };

/** Mínimo entre dos corridas (todas las instancias juntas): la fuente no cambia más seguido y cada corrida pide ~10 URLs a un sitio con Cloudflare. */
const LOCK_MINUTES = 30;
/** Pausa entre pedidos de resultados. Con 9 fechas la corrida entera queda bien por debajo de los 60 s de /api/pulso. */
const DELAY_MS = 100;
/** Tope por pedido: un sitio que no contesta no puede comerse el tiempo de /api/pulso. */
const TIMEOUT_MS = 8_000;

// Candado propio (no comparte fila con el de F1, `hot_lock`). La tabla se crea sola la primera vez: no hay migraciones a mano.
let lockReady = false;
async function ensureLock(query: ReturnType<typeof sql>) {
  if (lockReady) return;
  await query`CREATE TABLE IF NOT EXISTS rally_lock (id INTEGER PRIMARY KEY, at TIMESTAMPTZ NOT NULL)`;
  await query`INSERT INTO rally_lock (id, at) VALUES (1, 'epoch') ON CONFLICT (id) DO NOTHING`;
  lockReady = true;
}

/** Los pedidos del Rally salen siempre a la red (sin caché de datos de Next), una sola vez y con tope: lo que se quiere ver es si el sitio contesta o da 403. */
const rallyIo: typeof nextIo = {
  ...nextIo,
  text: (url, options?: IoOptions) => nextIo.text(url, { ...options, noStore: true, attempts: 1, timeoutMs: TIMEOUT_MS }),
  json: async (url, options?: IoOptions) => JSON.parse(await rallyIo.text(url, options)),
};

/**
 * Trae el Rally Argentino desde Vercel, porque rallyargentino.com y su API (Cloudflare) le dan 403 a GitHub Actions, donde corre la sincronización
 * completa. Sólo toca lo del Rally (eventos, campeonato y metadatos) sobre la última versión del almacén y no lo achica nunca; si no cambió nada
 * no escribe. Anota cada intento en `meta.rallyArgentino.vercel = { at, ok, errors }` y las fallas en `failures`; para no hacer una versión cada
 * 30 minutos, sólo publica si cambiaron los datos o si pasó de funcionar a estar bloqueado (o al revés). Nunca tira: devuelve el resultado.
 */
export async function runRallyRefresh(): Promise<RallyOutcome> {
  if (!process.env.DATABASE_URL) return { status: "skipped", reason: "sin DATABASE_URL" };
  try {
    const query = sql();
    const db = query as unknown as Store;
    await ensureLock(query);
    const locked = await query`UPDATE rally_lock SET at = now() WHERE id = 1 AND at < now() - make_interval(mins => ${LOCK_MINUTES}::integer) RETURNING at`;
    if (!(locked as unknown[]).length) return { status: "locked" };

    const latest = await readLatest(db);
    if (!latest) return { status: "skipped", reason: "el almacén no tiene versiones" };
    const base = latest.raw as Raw;

    const part = await fetchRally(rallyIo, base, { delayMs: DELAY_MS });
    const at = new Date().toISOString();
    const result = merge(base, part, { at });
    const vercel = (result.raw.meta.rallyArgentino as { vercel: { ok: boolean; errors: string[] } }).vercel;
    const state = { ok: vercel.ok, errors: vercel.errors };
    if (!result.write) return { status: "unchanged", versionId: latest.id, ...state };

    // Si otro escritor (la sincronización) entró mientras tanto, se parte de su versión y se le pone encima sólo el Rally de esta corrida
    // (con las mismas protecciones, contra lo que haya dejado esa versión): lo demás es de ellos.
    const reconcile = (candidate: Raw, newer: Raw) => {
      const mine = candidate.meta;
      const again = merge(newer, { events: candidate.events.filter((e) => (e as { seriesId: string }).seriesId === RALLY), standings: {}, meta: { [RALLY]: mine[RALLY], rallyArgentino: mine.rallyArgentino } }, { at });
      return again.raw;
    };
    const written = await writeVersion(db, { raw: result.raw, parentId: latest.id, origin: "hot", reconcile });
    if (written.unchanged) return { status: "unchanged", versionId: written.id, ...state };

    revalidateTag("season", { expire: 0 });
    revalidatePath("/", "layout");
    return { status: "written", versionId: written.id, ...state };
  } catch (error) {
    return { status: "error", error: (error as Error).message };
  }
}
