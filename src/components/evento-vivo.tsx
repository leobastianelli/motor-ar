"use client";

import Link from "next/link";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { dayKey, fmtDayNum, fmtTime, fmtWeekday, sessionState } from "@/lib/format";
import { momentoDeEvento } from "@/lib/momento.mjs";
import { noResultsReason } from "@/lib/salud-core.mjs";
import { sessionStatus } from "@/lib/session-status.mjs";
import type { RaceEvent, Series, SeriesClass, Session } from "@/lib/types";
import { useNow } from "./live-clock";
import { ResultadoCarrera } from "./momento";
import { CategoryLabel, ClassSeal, SectionTitle, StateTag } from "./pista";

/**
 * La página de una fecha, con lo que depende de "ahora" decidido en el navegador (`useNow`): el cronograma con el estado de cada sesión, cuál es
 * "el último resultado" y cuáles van en "Sesiones anteriores", y el ganador de la fecha arriba de todo. El servidor (src/app/eventos/[id]/page.tsx)
 * dibuja las tablas de resultados una sola vez (son pesadas) y manda cuáles hay; acá se elige cuáles se ven según qué sesiones ya terminaron.
 * El primer render usa la hora del servidor, así que hidrata sin diferencias.
 */

/** Una sesión de la fecha con lo mínimo para el cronograma y para saber si terminó. */
export type SesionDeLaFecha = {
  id: string;
  /** Nombre tal como se muestra (`nombreVisibleSesion`). */
  name: string;
  start: string;
  durationMin: number;
  timeKnown?: boolean;
  timeStatus?: "confirmed" | "tentative";
  /** Nombres de las fuentes del horario (sólo si es tentativo). */
  fuentes: string[];
  clase?: Pick<SeriesClass, "code" | "color" | "name">;
  hasResults: boolean;
  resultsUnread?: boolean;
  /** Quién ganó (o la mejor posición conocida): "Verstappen" o "3.º Verstappen", como se muestra en la fila. */
  top?: string;
  videos?: { id: string; kind: "live" | "highlights"; label?: string }[];
  /** Desde qué instante (ms) la sesión figura como terminada. */
  doneAt: number;
};

function Cronograma({ sesiones, seriesId, failures, hechas, now, tiempos }: { sesiones: SesionDeLaFecha[]; seriesId: string; failures: string[]; hechas: Set<string>; now: string; tiempos: ReactNode }) {
  const nowMs = Date.parse(now);
  const days: { key: string; sessions: SesionDeLaFecha[] }[] = [];
  for (const s of sesiones) {
    const key = dayKey(s.start);
    const group = days.find((d) => d.key === key);
    if (group) group.sessions.push(s);
    else days.push({ key, sessions: [s] });
  }
  return (
    <div>
      <SectionTitle title="Cronograma" />
      <div className="event-days">
        {days.map(({ key, sessions }) => (
          <section key={key}>
            <h3>
              {fmtWeekday(sessions[0].start)} {fmtDayNum(sessions[0].start)}
            </h3>
            <div>
              {sessions.map((s) => {
                const status = s.doneAt <= nowMs ? "done" : sessionStatus({ start: s.start, durationMin: s.durationMin, timeKnown: s.timeKnown, hasResults: s.hasResults }, now);
                const state = sessionState(comoSesion(s), now);
                return (
                  <div key={s.id} className={`session${status === "live" ? " live-session" : ""}${status === "done" ? " done" : ""}`}>
                    <time dateTime={s.start}>{s.timeKnown === false ? "—" : fmtTime(s.start)}</time>
                    <div>
                      <strong>
                        {s.clase && <ClassSeal clase={s.clase} />}
                        {s.name}
                      </strong>
                      <span>
                        {status === "live" && "En curso"}
                        {status === "upcoming" &&
                          (s.timeKnown === false
                            ? "Horario a confirmar"
                            : s.timeStatus === "confirmed"
                              ? "Horario confirmado"
                              : s.timeStatus === "tentative"
                                ? `Horario según ${s.fuentes.join(", ")}`
                                : `${s.durationMin} min estimados`)}
                        {status === "done" &&
                          (s.top ? (
                            <a href={`#${s.id}`}>Terminó · ver resultados</a>
                          ) : (
                            `Terminó · ${noResultsReason({ start: s.start, durationMin: s.durationMin, timeKnown: s.timeKnown, resultsUnread: s.resultsUnread, results: s.hasResults ? [{}] : undefined }, seriesId, failures, now)?.toLowerCase() ?? "sin resultados cargados"}`
                          ))}
                      </span>
                      {s.videos && s.videos.length > 0 && (
                        <span className="session-videos">
                          {s.videos.map((v) => {
                            // El resumen se ve en esta misma página (más abajo, en la sesión): el enlace es un ancla, no youtube.com.
                            const aca = v.kind === "highlights" && hechas.has(s.id);
                            return aca ? (
                              <a key={v.id} href={`#${s.id}`}>
                                <span aria-hidden="true">▶</span> Resumen
                                {v.label ? ` · ${v.label}` : ""}
                              </a>
                            ) : (
                              <a key={v.id} href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer">
                                <span aria-hidden="true">▶</span> {v.kind === "live" ? (status === "done" ? "Ver la sesión" : "Ver en vivo") : "Resumen"}
                                {v.label ? ` · ${v.label}` : ""}
                              </a>
                            );
                          })}
                        </span>
                      )}
                    </div>
                    {status === "done" && s.top ? (
                      <b className="session-winner">{s.top}</b>
                    ) : (
                      <StateTag as="b" kind={state.kind}>
                        {state.label}
                      </StateTag>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {tiempos}
    </div>
  );
}

/** La sesión resumida como `Session`, para usar `sessionState` (src/lib/format.ts): el mismo texto y criterio que en el resto del sitio. */
const comoSesion = (s: SesionDeLaFecha) =>
  ({ id: s.id, kind: "carrera", name: s.name, start: s.start, durationMin: s.durationMin, timeKnown: s.timeKnown, results: s.hasResults ? [{}] : undefined }) as unknown as Session;

/**
 * El centro de la página de una fecha: el último resultado (arriba, sobre la banda oscura), el cronograma junto a "dónde verlo" y las sesiones
 * anteriores. `heroes` y `anteriores` traen las tablas ya dibujadas por el servidor, por id de sesión: se muestra la de la última sesión que terminó
 * con resultados y, abajo, las demás. `heroes` sólo trae las que pueden llegar a ser "la última": la actual y las que están en pista con resultados parciales.
 */
export function EventoCuerpo({
  sesiones,
  seriesId,
  failures,
  heroes,
  anteriores,
  where,
  tiempos,
  serverNow,
  simulated,
}: {
  sesiones: SesionDeLaFecha[];
  seriesId: string;
  failures: string[];
  heroes: Record<string, ReactNode>;
  anteriores: Record<string, ReactNode>;
  where: ReactNode;
  /** El cronometraje en vivo incrustado, si la fecha lo tiene. */
  tiempos: ReactNode;
  serverNow: string;
  simulated: boolean;
}) {
  const now = useNow(serverNow, simulated);
  const nowMs = Date.parse(now);
  // Todas las sesiones con resultados que ya terminaron, de la más reciente a la primera (una sesión en pista con resultados parciales no cuenta).
  const hechas = sesiones.filter((s) => s.hasResults && s.doneAt <= nowMs).reverse();
  const [latest, ...earlier] = hechas;
  const schedule = <Cronograma sesiones={sesiones} seriesId={seriesId} failures={failures} hechas={new Set(hechas.map((s) => s.id))} now={now} tiempos={tiempos} />;
  return (
    <>
      {/* Con resultados, el último resultado y dónde verlo van antes que el cronograma; sin ellos, el cronograma manda. */}
      {latest && heroes[latest.id]}

      <section className={`event-grid section-block${latest ? " where-first" : ""}`}>
        {latest ? (
          <>
            {where}
            {schedule}
          </>
        ) : (
          <>
            {schedule}
            {where}
          </>
        )}
      </section>

      {/* Una sola banda oscura por página: la del último resultado, arriba. Las sesiones anteriores van sobre fondo claro. */}
      {earlier.length > 0 && (
        <section className="earlier-wrap">
          <div className="section-block">
            <div className="earlier-sessions">
              <h3>Sesiones anteriores</h3>
              {earlier.map((s) => (
                <Fragment key={s.id}>{anteriores[s.id]}</Fragment>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/** "Ganó X" arriba de la página de una fecha ya corrida (sólo si la carrera principal ya terminó y tiene ganador). */
export function ResultadoDeLaFecha({ event, argentineSlugs, failures, serverNow, simulated }: { event: RaceEvent; argentineSlugs: string[]; failures: string[]; serverNow: string; simulated: boolean }) {
  const now = useNow(serverNow, simulated);
  const data = momentoDeEvento(event, now, { argentineSlugs, failures });
  return <ResultadoCarrera carrera={data.fecha?.carrera} />;
}

/** Las otras categorías que corren el mismo fin de semana, con cómo va cada una: la última sesión terminada con resultados, o "Fecha N". */
export type HermanaDeLaFecha = {
  id: string;
  series: Pick<Series, "code" | "color" | "name">;
  /** "Fecha 12" si todavía no terminó ninguna sesión con resultados. */
  porDefecto: string;
  /** Las sesiones con resultados, en orden: el texto que corresponde si esa es la última terminada. */
  candidatas: { doneAt: number; texto: string }[];
  fecha: string;
  fechaIso: string;
  resumen: string;
};

export function HermanasDeLaFecha({ hermanas, serverNow, simulated }: { hermanas: HermanaDeLaFecha[]; serverNow: string; simulated: boolean }) {
  const nowMs = Date.parse(useNow(serverNow, simulated));
  return (
    <div className="date-strip">
      {hermanas.map((h) => {
        const ultima = h.candidatas.filter((c) => c.doneAt <= nowMs).at(-1);
        return (
          <Link key={h.id} href={`/eventos/${h.id}`} className="next-card list-link" style={{ "--cat": h.series.color } as CSSProperties}>
            <CategoryLabel series={h.series} />
            <strong>{ultima ? ultima.texto : h.porDefecto}</strong>
            <time dateTime={h.fechaIso}>
              {h.fecha} · {h.resumen}
            </time>
          </Link>
        );
      })}
    </div>
  );
}
