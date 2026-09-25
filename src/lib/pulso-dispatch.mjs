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
