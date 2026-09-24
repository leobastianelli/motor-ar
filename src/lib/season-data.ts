import { unstable_cache } from "next/cache";
import snapshot from "@/data/season-2026.json";
import { sql } from "./db";
import { createReader } from "./season-store-core.mjs";

/** De dónde salió la temporada que se está mostrando (la etapa 03 lo hace visible). */
export interface SeasonSource {
  /** Id de la fila de `season_versions`; null si se sirve la instantánea del repo. */
  versionId: number | null;
  /** "seed" | "sync" | "hot" | "snapshot". */
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
    // Fechas en ISO 8601 estricto: el texto por defecto de Postgres ("2026-09-24 19:14:06.888+00") Safari no lo entiende, y el pie de página lo
    // parsea en el navegador.
    const rows = (await sql()`SELECT id, origin, to_char(generated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "generatedAt", to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt" FROM season_versions ORDER BY id DESC LIMIT 1`) as unknown as LatestMeta[];
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
 * Datos de la temporada: la versión vigente del almacén (Neon). El render sólo lee: no busca nada en fuentes externas. Los escritores son la
 * sincronización completa y el refresco caliente (src/lib/hot-refresh.ts), que publican versiones nuevas e invalidan las páginas.
 * Si el almacén falla se usa la última versión vista o, en su defecto, la instantánea del repo, y `source.servedFrom` lo dice.
 */
export async function loadRawSeason(): Promise<RawSeason> {
  const { raw, source } = await read();
  const key = JSON.stringify(source);
  // Mismo objeto mientras no cambie la versión ni el estado: getSeason() compara por identidad.
  if (!based || based.raw !== raw || based.key !== key) based = { raw, key, out: { ...raw, source } };
  return based.out;
}
