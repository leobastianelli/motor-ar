// Fusión de la carga manual (manual-overrides.json) con las sesiones que traen las fuentes.
// Una sesión manual se reconoce por tipo + nombre. Cuando no coincide con ninguna, pero la fuente ya publicó resultados de esa misma
// clase, tipo y día (p. ej. la carga dice "2 Series Clase 2" y la fuente trae "Serie 1 Clase 2" y "Serie 2 Clase 2"), no se agrega una
// fila fantasma "sin datos": la hora manual pasa a la primera sesión de la fuente que no tenga hora, o se descarta si ya no hace falta.

const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const classOf = (name) => String(name).match(/clase\s*(\d)/i)?.[1] ?? "";
const TIME_FIELDS = ["start", "timeKnown", "timeStatus", "timeSources"];

export function mergeSessionPatches(eventId, sourceSessions, patches, dayKey) {
  const key = (s) => `${s.kind}|${norm(s.name)}`;
  const sessions = sourceSessions.map((s) => ({ ...s }));
  const touched = new Set();
  const unmatched = [];

  for (const patch of patches ?? []) {
    const i = sessions.findIndex((s) => key(s) === key(patch));
    if (i >= 0) {
      sessions[i] = { ...sessions[i], ...patch };
      touched.add(sessions[i].id);
    } else unmatched.push(patch);
  }

  for (const patch of unmatched) {
    const candidates = sessions.filter(
      (s) => s.kind === patch.kind && classOf(s.name) === classOf(patch.name) && s.results?.length && patch.start && dayKey(s.start) === dayKey(patch.start),
    );
    if (candidates.length) {
      const target = candidates.find((s) => s.timeKnown !== true && !touched.has(s.id));
      if (target && patch.timeKnown) {
        for (const f of TIME_FIELDS) if (patch[f] !== undefined) target[f] = patch[f];
        touched.add(target.id);
      }
      continue;
    }
    sessions.push({ id: `${eventId}-manual-${sessions.length + 1}`, start: sessions[0]?.start ?? "", durationMin: 30, timeKnown: false, ...patch });
  }

  return sessions.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
