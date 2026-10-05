// Lógica pura del Rally Argentino fuera de GitHub Actions: rallyargentino.com y api.rallyargentino.com (Cloudflare) le contestan 403 a las IPs de
// Actions, donde corre la sincronización. Vercel también recibe 403: el Rally lo publica scripts/sync-rally.mjs desde una PC, que escribe sólo lo suyo;
// la sincronización, en Actions, se saltea la fuente y deja intacto lo que escribió Vercel. Sin red ni base, así `npm test` la cubre.
import { protectSeason, protectStandings } from "./sources/guard.mjs";

export const RALLY = "rally-argentino";
/** Rótulo de la fuente en SOURCES (season.mjs) y prefijo de sus fallas (salud-core.mjs, FAILURE_OF). */
export const RALLY_LABEL = "Rally Argentino";
const FAILURE = /^Rally Argentino\b/;

/** ¿Estamos en GitHub Actions? Ahí el Rally no se puede leer (403): la sincronización lo saltea. */
export const inActions = (env = process.env) => env.GITHUB_ACTIONS === "true";

const isRallyEvent = (e) => e.seriesId === RALLY;
const startOf = (e) => Date.parse(e.sessions?.[0]?.start ?? "") || 0;
const json = JSON.stringify;

/** Lo que `raw` tiene del Rally: eventos, tabla (si hay), `meta[rally-argentino]`, `meta.rallyArgentino` (sin `vercel`) y fallas. */
export function rallyOf(raw) {
  const { vercel, ...meta } = raw.meta?.rallyArgentino ?? {};
  return {
    events: (raw.events ?? []).filter(isRallyEvent),
    standings: raw.standings?.[RALLY],
    campeonato: raw.meta?.[RALLY],
    meta: raw.meta?.rallyArgentino ? meta : undefined,
    vercel,
    failures: (raw.failures ?? []).filter((f) => FAILURE.test(String(f))),
  };
}

/** Reemplaza en `season` todo lo del Rally por lo de `from` (sin tocar el resto). Pura: no modifica los argumentos. */
export function carryRally(season, from) {
  const events = [...(season.events ?? []).filter((e) => !isRallyEvent(e)), ...(from.events ?? []).filter(isRallyEvent)];
  events.sort((a, b) => startOf(a) - startOf(b));
  const standings = { ...season.standings };
  const meta = { ...season.meta };
  for (const [target, key, value] of [[standings, RALLY, from.standings?.[RALLY]], [meta, RALLY, from.meta?.[RALLY]], [meta, "rallyArgentino", from.meta?.rallyArgentino]]) {
    if (value === undefined) delete target[key];
    else target[key] = value;
  }
  const failures = [...(season.failures ?? []).filter((f) => !FAILURE.test(String(f))), ...(from.failures ?? []).filter((f) => FAILURE.test(String(f)))];
  return { ...season, events, standings, meta, failures };
}

/**
 * Pone el Rally que trajo `part` (resultado de `rallyArgentinoSeason`) sobre la temporada `base`, tocando sólo lo del Rally y sin achicarlo
 * (mismas protecciones que la sincronización: fechas, resultados y campeonato que ya estaban no se pierden por un mal día de la fuente).
 * Anota el intento en `meta.rallyArgentino.vercel = { at, ok, errors }` y las fallas del Rally en `failures`.
 * → { raw, changed, flipped, write }: `write` es si vale la pena publicar una versión: cambiaron los datos o cambió el estado ok/bloqueado.
 */
export function mergeRally(base, part, { at }) {
  const before = rallyOf(base);
  const scope = { events: before.events, standings: base.standings?.[RALLY] ? { [RALLY]: base.standings[RALLY] } : {}, meta: base.meta?.[RALLY] ? { [RALLY]: base.meta[RALLY] } : {} };
  const guarded = protectSeason(part.events, scope, Date.parse(at));
  const standings = { ...part.standings };
  const meta = { ...part.meta };
  const warnings = [...guarded.warnings, ...protectStandings(standings, meta, scope)];

  const errors = [...(meta.rallyArgentino?.errors ?? [])];
  const vercel = { at, ok: errors.length === 0, errors };
  const failures = [...errors, ...warnings].map((f) => `${RALLY_LABEL}: ${f}`);
  const withoutVercel = {
    ...base,
    events: [...base.events.filter((e) => !isRallyEvent(e)), ...guarded.events].sort((a, b) => startOf(a) - startOf(b)),
    standings: { ...base.standings, ...(standings[RALLY] ? { [RALLY]: standings[RALLY] } : {}) },
    meta: { ...base.meta, ...(meta[RALLY] ? { [RALLY]: meta[RALLY] } : {}), ...(meta.rallyArgentino ? { rallyArgentino: meta.rallyArgentino } : {}) },
    failures: [...(base.failures ?? []).filter((f) => !FAILURE.test(String(f))), ...failures],
  };
  const after = rallyOf(withoutVercel);
  const changed = json([before.events, before.standings, before.campeonato, before.meta]) !== json([after.events, after.standings, after.campeonato, after.meta]);
  const flipped = before.vercel?.ok !== vercel.ok;
  const raw = { ...withoutVercel, meta: { ...withoutVercel.meta, rallyArgentino: { ...withoutVercel.meta.rallyArgentino, vercel } } };
  return { raw: changed || flipped ? raw : base, changed, flipped, write: changed || flipped };
}
