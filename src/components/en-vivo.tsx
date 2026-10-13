"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { momentoDeCategoria, momentoDeEvento, momentoDePiloto } from "@/lib/momento.mjs";
import { CategoryLabel, SectionTitle, StateTag } from "@/components/pista";
import { dayKey, fmtDayNum, fmtDayShort, fmtTime, fmtWeekday, sessionState, sessionTime } from "@/lib/format";
import { driverKey } from "@/lib/sources/driver-index.mjs";
import { createTimeViews } from "@/lib/tiempo.mjs";
import type { RaceEvent, Series } from "@/lib/types";
import { AgregarCalendario } from "./agregar-calendario";
import { AutoRefresh, useNow } from "./live-clock";
import { Momento, ProximaSesion } from "./momento";

/**
 * Lo que depende de "ahora" en las páginas de categoría, de fecha, de piloto y de nota, dibujado en el navegador con la hora real.
 * El servidor manda un recorte de la temporada (src/lib/snapshot.mjs) y estas piezas vuelven a calcular el momento, los estados y los
 * contadores con `useNow` (src/components/live-clock.tsx): el HTML de la página puede ser de hace 15 minutos (`revalidate = 900`) y igual se ve
 * lo correcto. El primer render usa la hora del servidor, así que hidrata sin diferencias; después pasa a la hora real y se actualiza solo.
 */

/** Dónde verlo y los tiempos en vivo de cada fecha (por id). */
export type Transmisiones = Record<string, { names: string[]; timingUrl?: string }>;

type MomentoProps = {
  events: RaceEvent[];
  /** Los pilotos de la categoría que cuentan como "los nuestros" (sólo en las categorías internacionales). */
  argentineSlugs?: string[];
  failures: string[];
  transmisiones: Transmisiones;
  serverNow: string;
  simulated: boolean;
};

const nombres = (t: Transmisiones[string] | undefined) => (t?.names ?? []).map((name) => ({ name }));
const enVivoOFinde = (modo: string) => modo === "en-pista" || modo === "finde";

/** "Este fin de semana en…" de una categoría. */
export function MomentoCategoria({ events, argentineSlugs = [], failures, transmisiones, serverNow, simulated }: MomentoProps) {
  const now = useNow(serverNow, simulated);
  const data = momentoDeCategoria(events, now, { argentineSlugs, failures });
  const t = data.fecha ? transmisiones[data.fecha.id] : undefined;
  return (
    <>
      <Momento data={data} now={serverNow} simulated={simulated} broadcasts={nombres(t)} tiemposUrl={t?.timingUrl} />
      {enVivoOFinde(data.modo) && <AutoRefresh everyMs={60_000} />}
    </>
  );
}

/** La franja "Ahora" de la página de una fecha. */
export function MomentoFecha({ event, argentineSlugs = [], failures, tiemposUrl, serverNow, simulated }: Omit<MomentoProps, "events" | "transmisiones"> & { event: RaceEvent; tiemposUrl?: string }) {
  const now = useNow(serverNow, simulated);
  const data = momentoDeEvento(event, now, { argentineSlugs, failures });
  return (
    <>
      <Momento evento data={data} now={serverNow} simulated={simulated} broadcasts={[]} tiemposUrl={tiemposUrl} />
      {enVivoOFinde(data.modo) && <AutoRefresh everyMs={60_000} />}
    </>
  );
}

/**
 * "Este fin de semana en <ciudad>" en la ficha de un piloto, con su posición en cada sesión. Un piloto sin ficha sólo lo muestra si figura en
 * los resultados de la fecha (si no, no sabemos que corre); con la hora del navegador eso también se decide acá.
 */
export function MomentoDelPiloto({ events, keys, failures, confirmado, slug, transmisiones, serverNow, simulated }: Omit<MomentoProps, "argentineSlugs"> & { keys: string[]; confirmado: boolean; slug: string }) {
  const now = useNow(serverNow, simulated);
  const data = momentoDePiloto(events, now, keys, { failures });
  if (!confirmado && !data.participa) return null;
  if (data.modo === "resultados" && !data.participa) return null;
  const t = data.fecha ? transmisiones[data.fecha.id] : undefined;
  return (
    <>
      <Momento data={data} now={serverNow} simulated={simulated} piloto broadcasts={nombres(t)} tiemposUrl={t?.timingUrl} />
      {enVivoOFinde(data.modo) && <AutoRefresh everyMs={60_000} />}
      <AgregarCalendario kind="piloto" id={slug} />
    </>
  );
}

/** "Próxima sesión" en la portada de la ficha de un piloto. */
export function ProximaDelPiloto({ events, keys, failures, serverNow, simulated }: Pick<MomentoProps, "events" | "failures" | "serverNow" | "simulated"> & { keys: string[] }) {
  const now = useNow(serverNow, simulated);
  const data = momentoDePiloto(events, now, keys, { failures });
  return <ProximaSesion data={data} now={serverNow} simulated={simulated} />;
}

/** Cuántas fechas de la categoría ya se corrieron: "7/13". `hechas` trae el instante (ms) en que cada una termina. */
export function Disputadas({ hechas, serverNow, simulated }: { hechas: number[]; serverNow: string; simulated: boolean }) {
  const now = new Date(useNow(serverNow, simulated)).getTime();
  return <>{hechas.filter((at) => at <= now).length}</>;
}

/** "Próxima: 18 OCT · Rosario" de la ficha de la categoría: la primera fecha que todavía no terminó. */
export function ProximaFecha({ fechas, serverNow, simulated }: { fechas: { doneAt: number; value: string; note: string }[]; serverNow: string; simulated: boolean }) {
  const now = new Date(useNow(serverNow, simulated)).getTime();
  const next = fechas.find((f) => f.doneAt > now);
  return (
    <>
      <strong>{next ? next.value : "—"}</strong>
      {next && <small>{next.note}</small>}
    </>
  );
}

/** Una fila del calendario de la categoría: "done" cuando la fecha ya terminó. */
export function FilaFecha({ doneAt, serverNow, simulated, children }: { doneAt: number; serverNow: string; simulated: boolean; children: ReactNode }) {
  const now = new Date(useNow(serverNow, simulated)).getTime();
  return <li className={doneAt <= now ? "done" : undefined}>{children}</li>;
}

/** "Último resultado: 7.º · Final, San Martín" de un piloto con ficha, siempre al día. `candidatos` viene de `ultimosResultados` (src/lib/snapshot.mjs). */
export function UltimoResultado({ candidatos, serverNow, simulated }: { candidatos: { doneAt: number; pos: number; session: string; city: string }[]; serverNow: string; simulated: boolean }) {
  const now = new Date(useNow(serverNow, simulated)).getTime();
  const last = candidatos.find((c) => c.doneAt <= now);
  return <em>{last ? `Último resultado: ${last.pos}.º · ${last.session}, ${last.city}` : "Sin resultados cargados todavía"}</em>;
}


/** Un piloto con ficha para el estado en vivo: lo que hace falta de él y de su categoría, sin la ficha entera. */
export type PilotoCard = { slug: string; name: string; number?: number; team: string; seriesId: string; standing?: string };

type Sociedad = { seriesById: Record<string, Series>; tiers: Record<string, 1 | 2 | 3> };
const vistas = (events: RaceEvent[], { seriesById, tiers }: Sociedad) => createTimeViews({ events, seriesById, tierOf: (s) => tiers[s.id] ?? 3, driversAbroad: [] });

/**
 * Las tarjetas de "Destacados" de /pilotos con el estado de cada uno ("En pista", "Próxima", "Final", "Sin datos") al día. `events` viene de
 * `fechasDeLosPilotos` (src/lib/snapshot.mjs).
 */
export function TarjetasDePilotos({ pilotos, events, seriesById, tiers, serverNow, simulated }: Sociedad & { pilotos: PilotoCard[]; events: RaceEvent[]; serverNow: string; simulated: boolean }) {
  const now = useNow(serverNow, simulated);
  const views = vistas(events, { seriesById, tiers });
  return (
    <div className="runner-cards">
      {pilotos.map((d) => {
        const series = seriesById[d.seriesId];
        const status = views.getRunnerStatus(d, now);
        return (
          <Link key={d.slug} href={`/pilotos/${d.slug}`} className="runner-card list-link" style={{ "--cat": series.color } as CSSProperties}>
            <CategoryLabel series={series} detail={d.team} />
            <strong className="runner-name">
              {d.name}
              {d.number && <span>#{d.number}</span>}
            </strong>
            <p className="runner-status">
              <StateTag kind={status.state}>{status.stateLabel}</StateTag>
              <b>{status.headline}</b>
            </p>
            <p className="runner-meta">{[status.detail, d.standing].filter(Boolean).join(" · ")}</p>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * El costado de una nota ("En Fierros"): los pilotos con su estado y las categorías con su próxima fecha, al día. Lo que no depende de la hora
 * (las fechas mencionadas) llega como `children`, ya dibujado por el servidor.
 */
export function NotaRelacionados({
  pilotos,
  categorias,
  eventosPilotos,
  seriesById,
  tiers,
  serverNow,
  simulated,
  children,
}: Sociedad & {
  /** Con `ficha` el piloto tiene ficha propia (su estado se calcula); sin ella sólo se lista el nombre. */
  pilotos: { slug: string; name: string; ficha?: Pick<PilotoCard, "seriesId" | "team"> }[];
  categorias: { id: string; events: RaceEvent[] }[];
  eventosPilotos: RaceEvent[];
  serverNow: string;
  simulated: boolean;
  children?: ReactNode;
}) {
  const now = useNow(serverNow, simulated);
  const views = vistas(eventosPilotos, { seriesById, tiers });
  return (
    <>
      {pilotos.length > 0 && (
        <section>
          <h3>Pilotos</h3>
          {pilotos.map((d) => {
            const series = d.ficha ? seriesById[d.ficha.seriesId] : undefined;
            const status = d.ficha && series ? views.getRunnerStatus({ slug: d.slug, seriesId: d.ficha.seriesId, team: d.ficha.team }, now) : undefined;
            return (
              <Link key={d.slug} href={`/pilotos/${d.slug}`} className="nota-rel list-link" style={series ? ({ "--cat": series.color } as CSSProperties) : undefined}>
                <strong>{d.name}</strong>
                {series && <CategoryLabel series={series} />}
                {status && (
                  <span className="nota-rel-status">
                    <StateTag kind={status.state}>{status.stateLabel}</StateTag> {status.headline}
                  </span>
                )}
              </Link>
            );
          })}
        </section>
      )}
      {categorias.length > 0 && (
        <section>
          <h3>Categorías</h3>
          {categorias.map((c) => {
            const series = seriesById[c.id];
            const v = vistas(c.events, { seriesById, tiers });
            const next = [...c.events].sort((a, b) => Date.parse(a.sessions[0].start) - Date.parse(b.sessions[0].start)).find((e) => v.getNextSession(e, now));
            return (
              <Link key={c.id} href={`/categorias/${c.id}`} className="nota-rel list-link">
                <CategoryLabel series={series} />
                <span className="nota-rel-status">{next ? `Próxima: ${next.name}` : "Sin fechas próximas cargadas"}</span>
              </Link>
            );
          })}
        </section>
      )}
      {children}
    </>
  );
}

// ——— Horarios ———

const cuando = (s: { start: string; timeKnown?: boolean }) => `${fmtDayShort(s.start).toLowerCase()}${s.timeKnown === false ? ", con horario a confirmar" : ` a las ${fmtTime(s.start)} (hora argentina)`}`;

/** La próxima fecha con algo pendiente y su próxima sesión, a la hora del navegador. */
function proximaFecha(events: RaceEvent[], now: string, soc: Sociedad) {
  const views = vistas(events, soc);
  const next = [...events].sort((a, b) => Date.parse(a.sessions[0].start) - Date.parse(b.sessions[0].start)).find((e) => views.getNextSession(e, now));
  return { next, nextSession: next ? views.getNextSession(next, now) : undefined };
}

type HorarioProps = Sociedad & { events: RaceEvent[]; serie: { id: string; name: string }; piloto?: string; serverNow: string; simulated: boolean };

/** La respuesta de arriba de /horarios/<categoría o piloto>: "La próxima fecha de TC es…", siempre con la próxima sesión de verdad. */
export function HorarioRespuesta({ events, serie, piloto, seriesById, tiers, serverNow, simulated }: HorarioProps) {
  const now = useNow(serverNow, simulated);
  const { next, nextSession } = proximaFecha(events, now, { seriesById, tiers });
  const answer =
    next && nextSession
      ? piloto
        ? `${piloto} vuelve a la pista en ${next.name}: la próxima sesión es ${nextSession.name.toLowerCase()} el ${cuando(nextSession)}.`
        : `La próxima fecha de ${serie.name} es ${next.name}. ${nextSession.name} es el ${cuando(nextSession)}.`
      : `No hay fechas próximas de ${serie.name} cargadas por ahora.`;
  return <p className="horario-answer">{answer}</p>;
}

/** El cronograma de la próxima fecha, con el estado de cada sesión al día (y cómo le fue al piloto en las que ya corrió). */
export function HorarioProxima({ events, keys, seriesById, tiers, serverNow, simulated }: Omit<HorarioProps, "serie" | "piloto"> & { keys?: string[] }) {
  const now = useNow(serverNow, simulated);
  const { next } = proximaFecha(events, now, { seriesById, tiers });
  if (!next) return null;
  const mine = keys ? new Set(keys) : null;
  const myRow = (s: RaceEvent["sessions"][number]) => (mine ? s.results?.find((r) => r.driver.split(" / ").some((part) => mine.has(driverKey(part)))) : undefined);
  const byDay: { key: string; sessions: RaceEvent["sessions"] }[] = [];
  for (const s of next.sessions) {
    const key = dayKey(s.start);
    const group = byDay.find((g) => g.key === key);
    if (group) group.sessions.push(s);
    else byDay.push({ key, sessions: [s] });
  }
  return (
    <section className="section-block">
      <SectionTitle title={next.name}>
        <Link href={`/eventos/${next.id}`}>Ver la fecha</Link>
      </SectionTitle>
      <div className="horario-grid">
        <div>
          {byDay.map(({ key, sessions }) => (
            <div key={key} className="horario-day">
              <h3>
                {fmtWeekday(sessions[0].start)} {fmtDayNum(sessions[0].start)}
              </h3>
              <ul>
                {sessions.map((s) => {
                  const state = sessionState(s, now);
                  const row = state.kind === "finished" ? myRow(s) : undefined;
                  return (
                    <li key={s.id}>
                      <time dateTime={s.start}>{sessionTime(s)}</time>
                      <strong>{s.name}</strong>
                      {row && (
                        <b className="horario-pos">
                          {row.positionText && !/^d+$/.test(row.positionText) ? row.positionText : `${row.pos}.º`}
                          {row.gap ? <small> {row.gap}</small> : null}
                        </b>
                      )}
                      <StateTag kind={state.kind}>{state.label}</StateTag>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <p className="source-note">Horarios de Argentina. {next.sessions.some((s) => s.timeKnown === false) ? "Algunas sesiones todavía no tienen horario oficial." : ""}</p>
        </div>
        <aside className="horario-watch">
          <h3>Dónde verlo</h3>
          {next.broadcasts.length ? (
            <ul>
              {next.broadcasts.map((b) => (
                <li key={b.name}>
                  {b.url ? (
                    <a href={b.url} target="_blank" rel="noreferrer">
                      {b.name}
                    </a>
                  ) : (
                    b.name
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>Sin transmisión confirmada en Argentina.</p>
          )}
          <p>
            {next.circuit.name} · {next.circuit.city}
            {next.circuit.country && next.circuit.country !== "Argentina" ? `, ${next.circuit.country}` : ""}
          </p>
        </aside>
      </div>
    </section>
  );
}
