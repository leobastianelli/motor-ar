import type { Session } from "@/lib/types";
import { resultsStatus } from "@/lib/provisorio.mjs";

/**
 * Aclaración de los resultados de una sesión de la ACTC: "Provisorio · sujeto a revisión de los comisarios" mientras sólo hay planilla del
 * cronometraje, y "Oficial" (con lo que cambió en el podio, si cambió) cuando el PDF de los comisarios la reemplazó. Texto plano en tono
 * secundario, sin chip (DESIGN.md). No dice nada si la sesión es de otra fuente.
 * `tone`: "dark" sobre la banda oscura (#aeb3b4, 8.6:1 sobre tinta), "light" sobre claro (--muted, 4.8:1 sobre papel y 5.4:1 sobre blanco).
 */
export function ResultsStatus({ session, now, tone = "light" }: { session: Pick<Session, "resultsSource" | "start">; now: string; tone?: "dark" | "light" }) {
  const status = resultsStatus(session, now);
  if (!status) return null;
  const [, head, rest] = status.text.match(/^(Provisorio|Oficial|Planilla de la ACTC)([\s\S]*)$/) ?? [null, "", status.text];
  return (
    <p className={`results-status on-${tone}`} data-status={status.kind}>
      <b>{head}</b>
      {rest}
    </p>
  );
}
