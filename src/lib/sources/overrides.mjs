// Fusión de la carga manual (manual-overrides.json) con las sesiones que traen las fuentes.
// Una sesión manual se reconoce por tipo + nombre. Cuando no coincide con ninguna, pero la fuente ya publicó resultados de esa misma
// clase, tipo y día (p. ej. la carga dice "2 Series Clase 2" y la fuente trae "Serie 1 Clase 2" y "Serie 2 Clase 2"), no se agrega una
// fila fantasma "sin datos": la hora manual pasa a la primera sesión de la fuente que no tenga hora, o se descarta si ya no hace falta.
// Sólo vale si la fuente ya trae ESA sesión: una "Serie 2" manual no es la "Serie 1" de la fuente aunque ambas sean series del mismo día.
// Nada se descarta en silencio: cada carga que no llega a mostrarse se anota en `discarded` (ver manualDiscarded en monitor/checks.mjs).

const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const classOf = (name) => String(name).match(/clase\s*(\d)/i)?.[1] ?? "";
// Número de la sesión dentro de su tipo: "Serie 2", "Clasificación 1 Clase 2", "2° Entrenamiento". Null si el nombre no lo dice
// ("Serie única", "2 Series Clase 2": ahí el 2 es una cantidad, no el número de una serie).
function numberOf(name) {
  const text = String(name);
  return text.match(/(\d)\s*[°ºª]/)?.[1] ?? text.match(/(?:serie|bater[ií]a|clasificaci[oó]n|entrenamiento|pr[aá]ctica|carrera|sprint)\s*(\d)\b(?!\s*clase)/i)?.[1] ?? null;
}
const sameNumber = (a, b) => {
  const [x, y] = [numberOf(a), numberOf(b)];
  return x === null || y === null || x === y;
};
const TIME_FIELDS = ["start", "timeKnown", "timeStatus", "timeSources"];

/** Identidad de una sesión para fusionarla con una carga manual: tipo + nombre (mismo criterio en toda la carga manual). */
export const sessionKey = (s) => `${s.kind}|${norm(s.name)}`;

export function mergeSessionPatches(eventId, sourceSessions, patches, dayKey, discarded = []) {
  const key = sessionKey;
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
      (s) => s.kind === patch.kind && classOf(s.name) === classOf(patch.name) && sameNumber(s.name, patch.name) && s.results?.length && patch.start && dayKey(s.start) === dayKey(patch.start),
    );
    if (candidates.length) {
      const target = candidates.find((s) => s.timeKnown !== true && !touched.has(s.id));
      if (target && patch.timeKnown) {
        for (const f of TIME_FIELDS) if (patch[f] !== undefined) target[f] = patch[f];
        touched.add(target.id);
      } else if (!candidates.every((s) => touched.has(s.id))) {
        // Si todas las candidatas ya recibieron la hora de otra carga, es la fusión prevista ("Clasificación 1" y "Clasificación 2" cargadas
        // para una sola clasificación de la fuente): no es un dato perdido por sorpresa. Cualquier otro descarte queda anotado.
        discarded.push({ eventId, kind: patch.kind, name: patch.name, start: patch.start, reason: `la fuente ya trae "${candidates[0].name}" con resultados` });
      }
      continue;
    }
    sessions.push({ id: `${eventId}-manual-${sessions.length + 1}`, start: sessions[0]?.start ?? "", durationMin: 30, timeKnown: false, ...patch });
  }

  return sessions.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
