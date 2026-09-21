// ¿Esta sesión puede pertenecer a este evento? Los resultados guardados en una versión anterior se reasignan por id de evento; si un id
// cambia de significado (una fecha que se renumera, como la "Fecha 7" que la ACTC listaba dos veces) los resultados de otra fecha
// quedan pegados a un evento que todavía no se corrió. Una sesión sólo se conserva si su día cae en la ventana del evento.
const DAY = 86400000;

export function belongsToEvent(event, session, { before = 4, after = 2 } = {}) {
  const times = (event.sessions ?? []).map((s) => Date.parse(s.start)).filter(Number.isFinite);
  const t = Date.parse(session.start);
  if (!times.length || !Number.isFinite(t)) return true;
  return t >= Math.min(...times) - before * DAY && t <= Math.max(...times) + after * DAY;
}
