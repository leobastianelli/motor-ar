import manual from "@/data/manual-overrides.json";
import { getNow } from "@/lib/data";
import { sql } from "@/lib/db";
import { visibleEvents } from "@/lib/monitor/checks.mjs";
import { healthReport } from "@/lib/salud-core.mjs";
import { loadRawSeason } from "@/lib/season-data";

// Salud de los datos: qué versión sirve el sitio, cuál es la última del almacén y qué resultados faltan. Público y sin datos sensibles.
// Sin caché a propósito: si `sirviendo` y `almacen` difieren, la invalidación de las páginas no funcionó.
export const dynamic = "force-dynamic";

export async function GET() {
  const now = getNow();
  const raw = await loadRawSeason();
  let stored: { id: number; origin: string; createdAt: string } | null = null;
  let storeError: string | undefined;
  try {
    const rows = (await sql()`SELECT id, origin, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt" FROM season_versions ORDER BY id DESC LIMIT 1`) as unknown as { id: number; origin: string; createdAt: string }[];
    stored = rows[0] ?? null;
  } catch (error) {
    storeError = error instanceof Error ? error.message : String(error);
  }
  const events = visibleEvents(raw.events as never, manual);
  const notes = (await getAllNotes()).map((n) => ({ slug: n.slug, title: n.title, auto: n.auto }));
  const body = healthReport({ source: raw.source!, stored, storeError, failures: raw.failures ?? [], events, notes, now });
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
