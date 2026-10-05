// Escritura de versiones en `season_versions`. La usan la sincronización (Node puro) y el refresco caliente (dentro de Next):
// no importa nada de Next ni usa alias `@/`, y recibe la función `sql` (etiqueta de plantilla de @neondatabase/serverless) como parámetro.
import { decodeBody, encodeBody } from "./season-body.mjs";
import { summarize } from "./season-store-core.mjs";
import { mergeOnto } from "./sources/season-merge.mjs";

export const MAX_ATTEMPTS = 3;
const KEEP_LAST = 50;
const KEEP_DAYS = 30;

/** Última versión: { id, origin, createdAt, raw } o null si la tabla está vacía. */
export async function readLatest(sql) {
  // Se escriben los dos formatos (el comprimido y, por compatibilidad con código anterior que lea `body`, el plano); se lee sólo el comprimido,
  // y el plano únicamente en versiones viejas que no lo tienen. Lo que consume la transferencia de Neon es leer, no escribir.
  const rows = await sql`SELECT id, origin, created_at::text AS "createdAt", body_br, CASE WHEN body_br IS NULL THEN body END AS body FROM season_versions ORDER BY id DESC LIMIT 1`;
  if (!rows[0]) return null;
  return { id: rows[0].id, origin: rows[0].origin, createdAt: rows[0].createdAt, raw: JSON.parse(decodeBody(rows[0])) };
}

// "Igual" = mismos eventos, campeonatos, metadatos y fallas de fuentes (el guardián las lee del almacén: si una fuente empieza o deja de fallar,
// tiene que quedar registrado). `generatedAt` cambia en cada corrida y no cuenta.
const content = (raw) => JSON.stringify([raw.events, raw.standings, raw.meta, raw.failures ?? []]);

/**
 * Publica `raw` como versión nueva, hija de `parentId`. Sólo se inserta si `parentId` sigue siendo la última versión: si otro escritor entró
 * en el medio, se fusiona con lo que escribió (`mergeOnto`) y se reintenta. Si el resultado es idéntico a la última versión no se escribe nada.
 * `reconcile(candidate, latest)` reemplaza a `mergeOnto` como forma de fusionar (el Rally lo usa para tocar sólo lo suyo sobre lo más nuevo).
 * Devuelve { id, unchanged, raw }: `raw` es lo que quedó vigente (ya fusionado).
 */
export async function writeVersion(sql, { raw, parentId = null, origin, reconcile = mergeOnto }) {
  let candidate = raw;
  let parent = parentId;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const latest = await readLatest(sql);
    if (latest && latest.id !== parent) {
      candidate = reconcile(candidate, latest.raw);
      parent = latest.id;
    }
    if (latest && content(candidate) === content(latest.raw)) return { id: latest.id, unchanged: true, raw: latest.raw };
    const inserted = await sql`
      INSERT INTO season_versions (parent_id, origin, generated_at, summary, body_br, body)
      SELECT ${parent}::integer, ${origin}, ${candidate.generatedAt}::timestamptz, ${JSON.stringify(summarize(candidate))}::jsonb, ${encodeBody(JSON.stringify(candidate))}, ${JSON.stringify(candidate)}
      WHERE (SELECT max(id) FROM season_versions) IS NOT DISTINCT FROM ${parent}::integer
      RETURNING id
    `;
    if (inserted.length) {
      await prune(sql).catch((e) => console.warn(`No se pudo podar versiones viejas: ${e.message}`));
      return { id: inserted[0].id, unchanged: false, raw: candidate };
    }
  }
  throw new Error(`No se pudo escribir la versión: otro escritor entró ${MAX_ATTEMPTS} veces seguidas`);
}

/** Borra versiones de más de 30 días, conservando siempre las últimas 50. (Sólo esto borra; ninguna versión se modifica.) */
export async function prune(sql) {
  await sql`
    DELETE FROM season_versions
    WHERE created_at < now() - make_interval(days => ${KEEP_DAYS}::integer)
      AND id NOT IN (SELECT id FROM season_versions ORDER BY id DESC LIMIT ${KEEP_LAST}::integer)
  `;
}
