// Estado de avisos del vigilante (qué ya se avisó, para no repetir) en una tabla de Neon de una fila (`vigilante_estado`, ver
// scripts/init-season-db.mjs): reemplaza la caché de GitHub Actions (.watchdog-state.json) ahora que GET /api/vigilante corre por
// cron-job.org. Mismo patrón que `pulso_estado` (ver pulso-dispatch.mjs).
import { emptyState } from "./alerts.mjs";

export async function leerVigilanteEstado(sql) {
  const rows = await sql`SELECT estado FROM vigilante_estado WHERE id = 1`;
  return rows[0]?.estado ?? emptyState();
}

export async function guardarVigilanteEstado(sql, estado) {
  await sql`
    INSERT INTO vigilante_estado (id, estado, actualizado)
    VALUES (1, ${JSON.stringify(estado)}::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET estado = EXCLUDED.estado, actualizado = now()
  `;
}
