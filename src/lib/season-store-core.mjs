// Lógica pura del almacén de la temporada (sin Next ni Neon), para que `npm test` la cubra.
// Las versiones son inmutables: un memo indexado por id de versión es correcto por construcción.

/** Resumen de una temporada para la tabla `season_versions.summary` y para /api/salud. */
export function summarize(raw) {
  const series = {};
  for (const event of raw.events ?? []) {
    const entry = (series[event.seriesId] ??= { events: 0, sessionsWithResults: 0 });
    entry.events++;
    entry.sessionsWithResults += (event.sessions ?? []).filter((s) => s.results?.length).length;
  }
  return { series, failures: raw.failures ?? [] };
}

/**
 * Lector con memo por id de versión.
 * - `latest()` → { id, origin, generatedAt, createdAt } de la versión vigente (consulta chica).
 * - `body(id)` → texto JSON de esa versión (consulta pesada; sólo cuando cambia el id).
 * - `fallback` → temporada a usar (marcada) si nunca se pudo leer nada.
 */
export function createReader({ latest, body, fallback }) {
  let memo = null; // { meta, raw }
  const source = (meta, servedFrom, error) => ({
    versionId: meta?.id ?? null,
    origin: meta?.origin ?? "snapshot",
    generatedAt: meta?.generatedAt ?? fallback.generatedAt,
    createdAt: meta?.createdAt ?? null,
    servedFrom,
    ...(error ? { error } : {}),
  });
  return async function read() {
    try {
      const meta = await latest();
      if (!meta) throw new Error("El almacén no tiene versiones");
      if (memo?.meta.id !== meta.id) {
        const raw = JSON.parse(await body(meta.id));
        memo = { meta, raw };
      }
      return { raw: memo.raw, source: source(memo.meta, "store") };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      if (memo) return { raw: memo.raw, source: source(memo.meta, "memo", error) };
      return { raw: fallback, source: source(null, "snapshot", error) };
    }
  };
}
