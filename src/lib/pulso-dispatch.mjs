// Candado de "último disparo" de la sincronización completa por /api/pulso: una tabla de una fila (`pulso_estado`), mismo patrón que `hot_lock`
// del refresco caliente (src/lib/hot-refresh.ts). A diferencia de `hot_lock`, la hora "ahora" la manda quien llama (getNow(), que respeta
// FIERROS_NOW) en vez de usar el now() de Postgres: así se puede probar con un `sql` falso sin depender del reloj de la base.
import { DISPATCH_LOCK_MINUTES } from "./pulso-core.mjs";

/**
 * Marca el disparo si pasaron `lockMinutes` desde el último (o si nunca se disparó). Sólo se llama cuando ya se sabe que hay algo pendiente
 * (pendingForDispatch), para no consultar la base sin necesidad.
 * → true si se pudo reservar (hay que disparar el workflow); false si otra llamada ya disparó hace menos de `lockMinutes`.
 */
export async function claimDispatch(sql, now, { lockMinutes = DISPATCH_LOCK_MINUTES } = {}) {
  const rows = await sql`
    UPDATE pulso_estado
    SET last_dispatch_at = ${now}::timestamptz
    WHERE id = 1 AND (last_dispatch_at IS NULL OR last_dispatch_at < ${now}::timestamptz - make_interval(mins => ${lockMinutes}::integer))
    RETURNING last_dispatch_at
  `;
  return rows.length > 0;
}

/** Último documento de la ACTC que motivó un disparo y cuántas veces seguidas (columnas `evidence_*` de `pulso_estado`; ver scripts/init-season-db.mjs). */
export async function readEvidence(sql) {
  const rows = await sql`SELECT evidence_doc, evidence_tries FROM pulso_estado WHERE id = 1`;
  const row = rows[0];
  return row?.evidence_doc ? { doc: row.evidence_doc, tries: row.evidence_tries ?? 0 } : null;
}

/** Guarda qué documento motivó el disparo recién reservado, para medir después cuánto tardó cada uno. */
export async function recordEvidence(sql, now, { doc, tries }) {
  await sql`UPDATE pulso_estado SET evidence_doc = ${doc}, evidence_at = ${now}::timestamptz, evidence_tries = ${tries}::integer WHERE id = 1`;
}
