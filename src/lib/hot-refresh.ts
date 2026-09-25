import { revalidatePath, revalidateTag } from "next/cache";
import { sql } from "./db";
import { hotNeeds } from "./hot-refresh-core.mjs";
import { loadRawSeason } from "./season-data";
import { readLatest, writeVersion } from "./season-store-write.mjs";
import { nextIo } from "./sources/io-next";
import { f1OfficialSessions } from "./sources/f1-official.mjs";
import { f1Videos } from "./sources/f1-youtube.mjs";

type Raw = { generatedAt: string; events: unknown[]; standings: Record<string, unknown[]>; [key: string]: unknown };
type HotFn = (io: typeof nextIo, events: unknown[], previous: Raw, options?: Record<string, unknown>) => Promise<{ events: unknown[] }>;
const fetchResults = f1OfficialSessions as unknown as HotFn;
const fetchVideos = f1Videos as unknown as HotFn;
type Store = Parameters<typeof readLatest>[0];

export type HotOutcome =
  | { status: "skipped"; reason: string }
  | { status: "locked" }
  | { status: "unchanged"; versionId: number }
  | { status: "written"; versionId: number; completed: string[] }
  | { status: "error"; error: string };

/** ¿Hay algo de F1 por completar en esta temporada, a esta hora? (En memoria; el layout lo usa para decidir si dispara el refresco.) */
export const hotPending = (events: unknown[]) => hotNeeds(events, Date.now()).needed;

/** Mínimo entre dos corridas del refresco (todas las instancias juntas). */
const LOCK_MINUTES = 3;

/**
 * Refresco caliente: trae los resultados oficiales de F1 y los resúmenes de YouTube que faltan, y si algo cambió publica una versión `hot` del
 * almacén e invalida el sitio. Lo llaman el endpoint /api/caliente y el layout (con `after()`), en el mismo proceso.
 * El candado (`hot_lock`) hace que sólo una instancia trabaje cada 3 minutos. Los pedidos externos conservan su `revalidate` por URL
 * (no se golpea a formula1.com ni se gasta la cuota de YouTube). Nunca tira: devuelve el resultado.
 */
export async function runHotRefresh(): Promise<HotOutcome> {
  if (!process.env.DATABASE_URL) return { status: "skipped", reason: "sin DATABASE_URL" };
  try {
    // Precomprobación con la temporada que el sitio ya tiene en memoria (con caché, no baja el cuerpo si no cambió): si no hace falta nada, no se
    // toca ni el candado ni el cuerpo de 3 MB. La llaman igual el layout, /api/caliente y /api/pulso: la comprobación vive acá para que a
    // ninguno de los tres se le escape.
    const inMemory = await loadRawSeason();
    if (!hotPending(inMemory.events)) return { status: "skipped", reason: "nada pendiente (según la temporada en memoria)" };

    const query = sql();
    const db = query as unknown as Store;
    const locked = await query`UPDATE hot_lock SET at = now() WHERE id = 1 AND at < now() - make_interval(mins => ${LOCK_MINUTES}::integer) RETURNING at`;
    if (!(locked as unknown[]).length) return { status: "locked" };

    const latest = await readLatest(db);
    if (!latest) return { status: "skipped", reason: "el almacén no tiene versiones" };
    const base = latest.raw as Raw;
    const needs = hotNeeds(base.events, Date.now());
    if (!needs.needed) return { status: "skipped", reason: "nada pendiente" };

    // Cada fuente por separado: si una falla, la otra igual se aplica.
    let events = base.events;
    const errors: string[] = [];
    const names = (base.standings.f1 ?? []).map((r) => (r as { driver: string }).driver);
    try {
      events = (await fetchResults(nextIo, events, base, { knownNames: names, windowDays: 10 })).events;
    } catch (error) {
      errors.push(`resultados: ${(error as Error).message}`);
    }
    try {
      events = (await fetchVideos(nextIo, events, base, {})).events;
    } catch (error) {
      errors.push(`videos: ${(error as Error).message}`);
    }
    if (errors.length) console.warn(`Refresco caliente: ${errors.join("; ")}`);

    // Sin cambios no se llama a writeVersion: releería la temporada entera (unos 3 MB) sólo para confirmar que es igual.
    if (JSON.stringify(events) === JSON.stringify(base.events)) {
      return errors.length ? { status: "error", error: errors.join("; ") } : { status: "unchanged", versionId: latest.id };
    }
    const written = await writeVersion(db, { raw: { ...base, events }, parentId: latest.id, origin: "hot" });
    if (written.unchanged) return errors.length ? { status: "error", error: errors.join("; ") } : { status: "unchanged", versionId: written.id };

    // Primero la etiqueta (la consulta de la versión vigente), después las páginas que dependen de ella.
    revalidateTag("season", { expire: 0 });
    revalidatePath("/", "layout");
    const stillMissing = new Set(hotNeeds(written.raw.events, Date.now()).results);
    return { status: "written", versionId: written.id, completed: needs.results.filter((id: string) => !stillMissing.has(id)) };
  } catch (error) {
    return { status: "error", error: (error as Error).message };
  }
}
