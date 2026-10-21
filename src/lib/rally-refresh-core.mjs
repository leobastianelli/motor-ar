// Lógica pura del Rally Argentino fuera de GitHub Actions: rallyargentino.com y api.rallyargentino.com (Cloudflare) le contestan 403 a las IPs de
// Actions, donde corre la sincronización. Vercel también recibe 403: el Rally lo publica scripts/sync-rally.mjs desde una PC, que escribe sólo lo suyo;
// la sincronización, en Actions, se saltea la fuente y deja intacto lo que escribió la PC. El mecanismo es común con la Fórmula Nacional (pc-refresh-core.mjs).
import { inActions, pcRefresh } from "./pc-refresh-core.mjs";

export { inActions };
export const RALLY = "rally-argentino";
/** Rótulo de la fuente en SOURCES (season.mjs) y prefijo de sus fallas (salud-core.mjs, FAILURE_OF). */
export const RALLY_LABEL = "Rally Argentino";

// El estado del intento se llama `vercel` por historia (la primera versión corría en Vercel): las versiones ya guardadas lo traen así.
export const rallyRefresh = pcRefresh({ seriesId: RALLY, label: RALLY_LABEL, sourceKey: "rallyArgentino", stateKey: "vercel" });

/** Lo que `raw` tiene del Rally: eventos, tabla (si hay), `meta[rally-argentino]`, `meta.rallyArgentino` (sin `vercel`) y fallas. */
export const rallyOf = (raw) => {
  const { state, ...rest } = rallyRefresh.of(raw);
  return { ...rest, vercel: state };
};

/** Reemplaza en `season` todo lo del Rally por lo de `from` (sin tocar el resto). Pura: no modifica los argumentos. */
export const carryRally = rallyRefresh.carry;

/**
 * Pone el Rally que trajo `part` (resultado de `rallyArgentinoSeason`) sobre la temporada `base`, tocando sólo lo del Rally y sin achicarlo.
 * Anota el intento en `meta.rallyArgentino.vercel = { at, ok, errors }` y las fallas del Rally en `failures`.
 * → { raw, changed, flipped, write }
 */
export const mergeRally = rallyRefresh.merge;
