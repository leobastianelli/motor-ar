import { keepSessionData, missingEvents } from "./guard.mjs";

/**
 * Fusiona la temporada que armó la sincronización (`next`) sobre una versión más nueva del almacén (`latest`) que `next` no conocía
 * (la escribió el refresco caliente o una corrida manual mientras la sincronización trabajaba). Nada de lo que `latest` agregó se pierde.
 * - Eventos: los de `next`, sin perder sesiones ni resultados que `latest` tenga y `next` no (regla de `keepSessionData`); los que sólo estén
 *   en `latest` se suman (misma regla que `missingEvents`).
 * - Campeonatos y metadatos: salen de `next` (la sincronización completa es la autoridad), salvo una categoría que `next` deja sin tabla y `latest` sí tiene.
 * Pura: no modifica ninguno de los dos argumentos.
 */
export function mergeOnto(next, latest) {
  const before = new Map((latest.events ?? []).map((e) => [e.id, e]));
  const seriesIds = [...new Set((latest.events ?? []).map((e) => e.seriesId))];
  const merged = next.events.map((e) => keepSessionData(e, before.get(e.id)).event);
  const events = [...merged, ...missingEvents(next.events, latest.events, seriesIds)];

  const standings = { ...next.standings };
  const meta = { ...next.meta };
  for (const [id, rows] of Object.entries(latest.standings ?? {})) {
    if (rows?.length && !standings[id]?.length) {
      standings[id] = rows;
      if (latest.meta?.[id]) meta[id] = latest.meta[id];
    }
  }
  return { ...next, events, standings, meta };
}
