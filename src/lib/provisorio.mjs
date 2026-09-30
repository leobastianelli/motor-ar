// Resultados provisorios de la ACTC (docs/plan-datos/tc-provisorios.md): la planilla del cronometraje sale a los pocos minutos de la bandera y el PDF
// de los comisarios, que puede mover posiciones por sanciones, horas después. Una sesión con resultados provisorios lleva
// `resultsSource.status === "provisional"`; "oficial" es la ausencia de ese campo (todas las demás fuentes). Cuando el oficial reemplaza a un provisorio,
// `resultsSource.provisional` guarda cómo era el podio y `resultsSource.note` lo que cambió ("Oficial: ..."), para decirlo sin recalcular.
// JavaScript puro, sin Next ni alias `@/`, para que `npm test` lo cubra. Lo usan la sincronización, el almacén, las páginas y los borradores.

export const PROVISIONAL = "provisional";
export const PROVISIONAL_LABEL = "Provisorio · sujeto a revisión de los comisarios";
/** Pasado este plazo una planilla sin oficial ya no es "todavía no revisada": el portal nunca publicó la clasificación oficial. */
export const STALE_DAYS = 7;

const DAY = 86400000;

export const isProvisional = (session) => session?.resultsSource?.status === PROVISIONAL;

/** " (provisorio)" para pegar al final de una frase que anuncia un resultado ("ganó X (provisorio)"); "" si es oficial. */
export const provisionalSuffix = (session) => (isProvisional(session) ? " (provisorio)" : "");

/**
 * Qué decir debajo de los resultados de una sesión. `null` si no hay nada que aclarar.
 * - provisorio: la advertencia; si pasó más de una semana, que el portal nunca publicó el oficial.
 * - oficial que reemplazó a un provisorio: "Oficial" y, si cambió el podio, qué cambió.
 */
export function resultsStatus(session, now) {
  const src = session?.resultsSource;
  if (!src) return null;
  if (src.status === PROVISIONAL) {
    const old = Number.isFinite(Date.parse(now)) && Date.parse(now) - Date.parse(session.start) > STALE_DAYS * DAY;
    return { kind: "provisional", text: old ? "Planilla de la ACTC · la clasificación oficial no se publicó en el portal" : PROVISIONAL_LABEL };
  }
  if (src.provisional) return { kind: "official", text: src.note || "Oficial" };
  return null;
}

const classified = (r) => !r.positionText || /^\d+$/.test(r.positionText);

/** Podio (hasta 3) de una sesión con resultados, tal como se mostró: lo que hace falta para decir después qué cambió. */
export function podiumSnapshot(session) {
  const podium = (session.results ?? [])
    .filter((r) => classified(r) && r.pos <= 3 && r.number)
    .map((r) => ({ pos: r.pos, number: String(r.number), driver: r.driver }));
  return { url: session.resultsSource?.url, podium };
}

/**
 * Entre lo que la sincronización trae hoy (`next`) y lo que ya estaba guardado (`previous`) para la misma sesión, cuál vale.
 * - Un provisorio nunca pisa un oficial.
 * - Un provisorio con menos filas que el provisorio anterior no lo reemplaza (las fuentes no se achican).
 * - Un oficial que reemplaza a un provisorio arrastra el podio provisorio (o el que ya traía el anterior oficial), para explicar el cambio.
 * Sin `previous` (o sin resultados), vale `next`.
 */
export function reconcileSession(next, previous) {
  if (!previous?.results?.length) return next;
  if (!next?.results?.length) return previous;
  const prevProvisional = isProvisional(previous);
  if (isProvisional(next)) {
    if (!prevProvisional) return previous;
    return next.results.length < previous.results.length ? previous : next;
  }
  const carried = prevProvisional ? podiumSnapshot(previous) : previous.resultsSource?.provisional;
  if (carried && !next.resultsSource?.provisional) return { ...next, resultsSource: { ...next.resultsSource, provisional: carried } };
  return next;
}

// ─── Observaciones del PDF oficial ───────────────────────────────────────────────────────────────────────────────

/** Sanciones que el oficial anota en "OBSERVACIONES": [{ number, kind: "excluido" | "recargo" | "sancion", seconds? }]. El auto sancionado es el primero que se nombra. */
export function penaltiesFrom(lines) {
  const out = [];
  for (const raw of lines ?? []) {
    const line = String(raw).toUpperCase();
    const number = line.match(/N\s*[°º]\s*(\d{1,3})/)?.[1];
    if (!number) continue;
    if (/EXCLUID|DESCALIF/.test(line)) out.push({ number, kind: "excluido" });
    else if (/RECARGO|SEGUNDO|\d+\s*(?:"|SEG)/.test(line)) {
      const seconds = line.match(/(\d{1,3})\s*(?:"|SEG)/)?.[1];
      out.push({ number, kind: "recargo", ...(seconds ? { seconds: Number(seconds) } : {}) });
    } else if (/PASE Y SIGA|STOP|DRIVE/.test(line)) out.push({ number, kind: "sancion" });
  }
  return out;
}

const ordinal = (n) => `${n}.º`;

/**
 * La línea de "Oficial: ..." al reemplazar un provisorio. `official` es la sesión oficial (con `results`), `snapshot` el podio provisorio y
 * `penalties` las sanciones del PDF. Si el podio no cambió: "Oficial". Si cambió y se puede derivar por sanciones: quién cayó o quedó excluido y por qué.
 * Si cambió y no se puede derivar: "Oficial: cambió el podio".
 */
export function describeOfficialChange(official, snapshot, penalties = []) {
  if (!snapshot?.podium?.length) return "Oficial";
  const now = podiumSnapshot(official).podium;
  const same = snapshot.podium.length === now.length && snapshot.podium.every((p, i) => now[i]?.number === p.number);
  if (same) return "Oficial";

  const posOf = new Map((official.results ?? []).filter(classified).map((r) => [String(r.number), r.pos]));
  const parts = [];
  for (const before of snapshot.podium) {
    const sanction = penalties.find((p) => p.number === before.number);
    if (!sanction) continue;
    const after = posOf.get(before.number);
    if (sanction.kind === "excluido" || !after) {
      parts.push(`${before.driver} (${ordinal(before.pos)} en el provisorio) fue excluido`);
    } else if (after !== before.pos) {
      const why = sanction.kind === "recargo" ? `un recargo${sanction.seconds ? ` de ${sanction.seconds} s` : ""}` : "una sanción";
      parts.push(`${before.driver} pasó del ${ordinal(before.pos)} al ${ordinal(after)} por ${why}`);
    }
  }
  if (snapshot.podium[0].number !== now[0]?.number && !parts.length) return "Oficial: cambió el ganador";
  return parts.length ? `Oficial: ${parts.join("; ")}` : "Oficial: cambió el podio";
}
