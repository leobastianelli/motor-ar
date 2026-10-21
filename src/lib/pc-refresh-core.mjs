// Lógica pura de las categorías que se publican desde una PC (sin red ni base, así `npm test` la cubre). Hay fuentes que le contestan 403 a las IPs de
// GitHub Actions (Cloudflare): el Rally Argentino (rallyargentino.com) y la Fórmula Nacional (formulanacional.com.ar). Esas categorías las publica un
// script desde la PC (`npm run sync:rally`, `npm run sync:fna`) que escribe sólo lo suyo; la sincronización, en Actions, las saltea y deja intacto
// lo que escribió la PC. Acá está el mecanismo común: cada categoría lo instancia con sus nombres (ver rally-refresh-core.mjs y fna-refresh-core.mjs).
import { protectSeason, protectStandings } from "./sources/guard.mjs";

/** ¿Estamos en GitHub Actions? Ahí estas fuentes no se pueden leer (403): la sincronización las saltea. */
export const inActions = (env = process.env) => env.GITHUB_ACTIONS === "true";

const startOf = (e) => Date.parse(e.sessions?.[0]?.start ?? "") || 0;
const json = JSON.stringify;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * @param {{ seriesId: string, label: string, sourceKey: string, stateKey?: string }} config
 *   `seriesId`: la categoría (`meta[seriesId]` es su campeonato); `label`: rótulo en SOURCES y prefijo de sus fallas;
 *   `sourceKey`: la clave de `meta` con lo que dejó la fuente (`{ events, errors }`); `stateKey`: dónde se anota el intento desde la PC.
 */
export function pcRefresh({ seriesId, label, sourceKey, stateKey = "pc" }) {
  const failure = new RegExp(`^${escape(label)}\\b`);
  const isMine = (e) => e.seriesId === seriesId;

  /** Lo que `raw` tiene de la categoría: eventos, tabla (si hay), `meta[seriesId]`, `meta[sourceKey]` (sin el estado de la PC) y fallas. */
  function of(raw) {
    const { [stateKey]: state, ...meta } = raw.meta?.[sourceKey] ?? {};
    return {
      events: (raw.events ?? []).filter(isMine),
      standings: raw.standings?.[seriesId],
      campeonato: raw.meta?.[seriesId],
      meta: raw.meta?.[sourceKey] ? meta : undefined,
      state,
      failures: (raw.failures ?? []).filter((f) => failure.test(String(f))),
    };
  }

  /** Reemplaza en `season` todo lo de la categoría por lo de `from` (sin tocar el resto). Pura: no modifica los argumentos. */
  function carry(season, from) {
    const events = [...(season.events ?? []).filter((e) => !isMine(e)), ...(from.events ?? []).filter(isMine)];
    events.sort((a, b) => startOf(a) - startOf(b));
    const standings = { ...season.standings };
    const meta = { ...season.meta };
    for (const [target, key, value] of [[standings, seriesId, from.standings?.[seriesId]], [meta, seriesId, from.meta?.[seriesId]], [meta, sourceKey, from.meta?.[sourceKey]]]) {
      if (value === undefined) delete target[key];
      else target[key] = value;
    }
    const failures = [...(season.failures ?? []).filter((f) => !failure.test(String(f))), ...(from.failures ?? []).filter((f) => failure.test(String(f)))];
    return { ...season, events, standings, meta, failures };
  }

  /**
   * Pone lo que trajo `part` (resultado de la fuente de la categoría) sobre la temporada `base`, tocando sólo lo de la categoría y sin achicarlo
   * (mismas protecciones que la sincronización: fechas, resultados y campeonato que ya estaban no se pierden por un mal día de la fuente).
   * Anota el intento en `meta[sourceKey][stateKey] = { at, ok, errors }` y las fallas de la categoría en `failures`.
   * → { raw, changed, flipped, write }: `write` es si vale la pena publicar una versión: cambiaron los datos o cambió el estado ok/bloqueado.
   */
  function merge(base, part, { at }) {
    const before = of(base);
    const scope = { events: before.events, standings: base.standings?.[seriesId] ? { [seriesId]: base.standings[seriesId] } : {}, meta: base.meta?.[seriesId] ? { [seriesId]: base.meta[seriesId] } : {} };
    const guarded = protectSeason(part.events, scope, Date.parse(at));
    const standings = { ...part.standings };
    const meta = { ...part.meta };
    const warnings = [...guarded.warnings, ...protectStandings(standings, meta, scope)];

    const errors = [...(meta[sourceKey]?.errors ?? [])];
    const state = { at, ok: errors.length === 0, errors };
    const failures = [...errors, ...warnings].map((f) => `${label}: ${f}`);
    const withoutState = {
      ...base,
      events: [...base.events.filter((e) => !isMine(e)), ...guarded.events].sort((a, b) => startOf(a) - startOf(b)),
      standings: { ...base.standings, ...(standings[seriesId] ? { [seriesId]: standings[seriesId] } : {}) },
      meta: { ...base.meta, ...(meta[seriesId] ? { [seriesId]: meta[seriesId] } : {}), ...(meta[sourceKey] ? { [sourceKey]: meta[sourceKey] } : {}) },
      failures: [...(base.failures ?? []).filter((f) => !failure.test(String(f))), ...failures],
    };
    const after = of(withoutState);
    const changed = json([before.events, before.standings, before.campeonato, before.meta]) !== json([after.events, after.standings, after.campeonato, after.meta]);
    const flipped = before.state?.ok !== state.ok;
    const raw = { ...withoutState, meta: { ...withoutState.meta, [sourceKey]: { ...withoutState.meta[sourceKey], [stateKey]: state } } };
    return { raw: changed || flipped ? raw : base, changed, flipped, write: changed || flipped };
  }

  /**
   * Para `writeVersion`: si otro escritor entró mientras tanto, se parte de su versión (`newer`) y se le pone encima sólo la categoría de `candidate`.
   */
  const reconcile = (at) => (candidate, newer) =>
    merge(
      newer,
      {
        events: candidate.events.filter(isMine),
        standings: candidate.standings?.[seriesId] ? { [seriesId]: candidate.standings[seriesId] } : {},
        meta: { [seriesId]: candidate.meta[seriesId], [sourceKey]: candidate.meta[sourceKey] },
      },
      { at },
    ).raw;

  return { seriesId, label, sourceKey, stateKey, of, carry, merge, reconcile };
}
