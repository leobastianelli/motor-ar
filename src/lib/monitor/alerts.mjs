// Motor de avisos: decide qué mandar ahora y qué callar, a partir de los hallazgos de esta corrida y de lo que ya se avisó antes.
//  · Un problema nuevo se avisa una vez; si sigue, se recuerda cada tanto según su gravedad; si empeora (sube de nivel), se avisa en el acto.
//  · Un problema que necesita `consecutive` corridas seguidas (una falla suelta de una fuente puede ser un mal momento) no avisa antes.
//  · Cuando un problema desaparece, se avisa "resuelto" una sola vez.
// El estado es un JSON chico (en GitHub Actions viaja en la caché): si se pierde, lo peor que pasa es que un aviso se repite.

const HOUR = 3600_000;
export const COOLDOWN_HOURS = { critical: 3, high: 6, medium: 24, info: 72 };
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, info: 3 };
const KEEP_RESOLVED_DAYS = 14;

export const emptyState = () => ({ alerts: {}, fails: {}, lastSummary: null });

/**
 * @param findings  hallazgos de esta corrida ({ key, severity, level, title, body, tier?, consecutive? })
 * @param state     estado guardado de la corrida anterior
 * @param now       hora actual (ISO)
 * @returns { send, resolved, state }
 */
export function evaluate(findings, state, now) {
  const nowMs = Date.parse(now);
  const next = { alerts: { ...(state?.alerts ?? {}) }, fails: { ...(state?.fails ?? {}) }, lastSummary: state?.lastSummary ?? null };
  const send = [];
  const resolved = [];
  const present = new Set();

  for (const f of findings) {
    present.add(f.key);
    const prev = next.alerts[f.key];
    const count = (next.fails[f.key] ?? 0) + 1;
    next.fails[f.key] = count;
    if (count < (f.consecutive ?? 1)) continue;

    if (!prev?.active) {
      send.push({ ...f, kind: "nuevo" });
      next.alerts[f.key] = { active: true, level: f.level, severity: f.severity, lastSent: now, firstSeen: prev?.firstSeen ?? now, title: f.title };
      continue;
    }
    const escalated = f.level > prev.level;
    const due = nowMs - Date.parse(prev.lastSent) >= (COOLDOWN_HOURS[f.severity] ?? 24) * HOUR;
    if (escalated || due) {
      send.push({ ...f, kind: escalated ? "sube" : "recordatorio" });
      next.alerts[f.key] = { ...prev, level: f.level, lastSent: now, title: f.title };
    } else {
      next.alerts[f.key] = { ...prev, title: f.title };
    }
  }

  for (const [key, st] of Object.entries(next.alerts)) {
    if (present.has(key)) continue;
    if (st.active) {
      resolved.push({ key, title: st.title });
      next.alerts[key] = { ...st, active: false, resolvedAt: now };
    } else if (nowMs - Date.parse(st.resolvedAt ?? now) > KEEP_RESOLVED_DAYS * 24 * HOUR) {
      delete next.alerts[key];
    }
  }
  for (const key of Object.keys(next.fails)) if (!present.has(key)) delete next.fails[key];

  send.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || (a.tier ?? 3) - (b.tier ?? 3) || (a.hours ?? 1e9) - (b.hours ?? 1e9));
  return { send, resolved, state: next };
}

const TZ = "America/Argentina/Buenos_Aires";
const dayOf = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const hourOf = (iso) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(new Date(iso)));

/** El resumen diario sale en la primera corrida a partir de las 06:00 (hora argentina) de cada día. */
export const summaryDue = (state, now) => hourOf(now) >= 6 && (!state?.lastSummary || dayOf(state.lastSummary) !== dayOf(now));
