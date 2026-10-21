// Lógica pura de la Fórmula Nacional Argentina fuera de GitHub Actions: formulanacional.com.ar (Cloudflare) le contesta 403 a las IPs de Actions, donde
// corre la sincronización, pero responde 200 desde una PC. La publica scripts/sync-formula-nacional.mjs (`npm run sync:fna`), que escribe sólo lo suyo;
// la sincronización, en Actions, se saltea la fuente y deja intacto lo que escribió la PC. Mismo mecanismo que el Rally (pc-refresh-core.mjs).
import { pcRefresh } from "./pc-refresh-core.mjs";

export const FNA = "formula-nacional";
/** Rótulo de la fuente en SOURCES (season.mjs) y prefijo de sus fallas. */
export const FNA_LABEL = "Fórmula Nacional";

export const fnaRefresh = pcRefresh({ seriesId: FNA, label: FNA_LABEL, sourceKey: "formulaNacional", stateKey: "pc" });

/** Lo que `raw` tiene de la Fórmula Nacional: eventos, tabla (si hay), `meta[formula-nacional]`, `meta.formulaNacional` (sin `pc`) y fallas. */
export const fnaOf = fnaRefresh.of;
/** Reemplaza en `season` todo lo de la Fórmula Nacional por lo de `from` (sin tocar el resto). */
export const carryFna = fnaRefresh.carry;
/**
 * Pone la Fórmula Nacional que trajo `part` (resultado de `formulaNacionalSeason`) sobre la temporada `base`, tocando sólo lo suyo y sin achicarlo.
 * Anota el intento en `meta.formulaNacional.pc = { at, ok, errors }` y sus fallas en `failures`. → { raw, changed, flipped, write }
 */
export const mergeFna = fnaRefresh.merge;
