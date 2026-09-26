"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import type { FeedItem } from "@/lib/data";
import { dayKey, fmtDayNum, fmtWeekday, sessionState, sessionTime } from "@/lib/format";
import { nombreVisibleSesion } from "@/lib/momento.mjs";
import type { Scope } from "@/lib/types";
import { useNow } from "./live-clock";
import { CategoryLabel, Code, SectionTitle, StateTag } from "./pista";

const FILTERS: { id: Scope | "all"; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "nacional", label: "Nacional" },
  { id: "internacional", label: "Internacional" },
  { id: "zonal", label: "Zonales" },
];

type View = "hora" | "categoria";

const end = (i: FeedItem) => new Date(i.session.start).getTime() + i.session.durationMin * 60000;

/**
 * Con qué otras sesiones del día se superpone cada una (códigos de categoría, sin repetir la propia). Es lo que la gente mira para ver si le
 * da el tiempo de seguir dos cosas: sólo cuentan las de horario confirmado.
 */
function overlaps(rows: FeedItem[]) {
  const timed = rows.filter((r) => r.session.timeKnown !== false);
  return new Map(
    timed.map((r) => {
      const start = new Date(r.session.start).getTime();
      const others = timed.filter((o) => o !== r && o.series.id !== r.series.id && new Date(o.session.start).getTime() < end(r) && end(o) > start);
      return [r.session.id, [...new Set(others.map((o) => o.series.code))]];
    }),
  );
}

/** Agrupa las sesiones por fecha de cada categoría, en el orden en que arrancan (como las ligas en un fixture). */
function byEvent(rows: FeedItem[]) {
  const groups = new Map<string, FeedItem[]>();
  for (const row of rows) groups.set(row.event.id, [...(groups.get(row.event.id) ?? []), row]);
  return [...groups.values()];
}

export function Agenda({ items, days, today, now: serverNow, simulated }: { items: FeedItem[]; days: { key: string; iso: string }[]; today: string; now: string; simulated?: boolean }) {
  // Los estados y las cuentas regresivas ("En 3 min", "En vivo") se recalculan solos en el navegador.
  const now = useNow(serverNow, simulated);
  const [picked, setPicked] = useState(days.some((d) => d.key === today) ? today : days[0]?.key);
  const [filter, setFilter] = useState<Scope | "all">("all");
  // Por defecto, una sola lista por hora cruzando todas las categorías: es una agenda, y así se ve qué coincide con qué.
  const [view, setView] = useState<View>("hora");
  // Sólo los días con sesiones para el filtro elegido; si el día marcado quedó vacío, se pasa al primero que tenga.
  const matching = items.filter((i) => filter === "all" || i.series.scope === filter);
  const visibleDays = days.filter((d) => matching.some((i) => dayKey(i.session.start) === d.key));
  const day = visibleDays.some((d) => d.key === picked) ? picked : visibleDays[0]?.key;
  const setDay = setPicked;
  const rows = matching.filter((i) => dayKey(i.session.start) === day);

  return (
    <section id="agenda" className="section-block agenda" aria-labelledby="agenda-title">
      <SectionTitle id="agenda-title" title="Agenda">
        <div className="filters" role="group" aria-label="Filtrar agenda">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className={f.id === filter ? "is-selected" : undefined} aria-pressed={f.id === filter} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </SectionTitle>

      {visibleDays.length > 1 && (
        <div className="day-tabs" role="group" aria-label="Día" style={{ gridTemplateColumns: `repeat(${visibleDays.length}, 1fr)` }}>
          {visibleDays.map((d) => (
            <button key={d.key} type="button" className={d.key === day ? "active" : undefined} aria-pressed={d.key === day} onClick={() => setDay(d.key)}>
              {fmtWeekday(d.iso)} <b>{fmtDayNum(d.iso)}</b>
            </button>
          ))}
        </div>
      )}

      {/* Cambiar de vista es secundario: un enlace de texto, no otra fila de botones antes de ver la primera sesión. */}
      <button type="button" className="agenda-view-toggle" onClick={() => setView(view === "hora" ? "categoria" : "hora")}>
        {view === "hora" ? "Ver por categoría" : "Ver por hora"}
      </button>

      <div className="schedule">
        {view === "hora" && <ByTime rows={rows} now={now} />}
        {view === "categoria" && byEvent(rows).map((group) => {
          const { event, series } = group[0];
          return (
            <div key={event.id} className="agenda-group" style={{ "--cat": series.color } as CSSProperties}>
              <Link href={`/eventos/${event.id}`} className="agenda-group-head list-link">
                <CategoryLabel series={series} detail={`${event.circuit.city} · Fecha ${event.round}`} />
                <span className="channel">{event.broadcasts[0]?.name ?? "Sin datos de transmisión"}</span>
              </Link>
              {group.map(({ session }) => {
                const state = sessionState(session, now);
                return (
                  <Link key={session.id} href={`/eventos/${event.id}`} className={`schedule-row list-link${state.kind === "live" ? " current" : ""}`}>
                    <time dateTime={session.start} title={session.timeKnown === false ? "Horario a confirmar" : undefined}>
                      {sessionTime(session)}
                    </time>
                    <strong>{nombreVisibleSesion(session, event.sessions)}</strong>
                    <StateTag kind={state.kind}>{state.label}</StateTag>
                  </Link>
                );
              })}
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="empty-state">{days.length ? "No hay sesiones pendientes de este tipo ese día." : "No hay sesiones próximas cargadas."}</p>
        )}
      </div>
    </section>
  );
}

/** Todas las sesiones del día en una sola lista por hora. Las que no tienen hora confirmada van al final, aparte. */
function ByTime({ rows, now }: { rows: FeedItem[]; now: string }) {
  const coincide = overlaps(rows);
  const timed = rows.filter((r) => r.session.timeKnown !== false);
  const pending = rows.filter((r) => r.session.timeKnown === false);
  const row = ({ session, event, series }: FeedItem) => {
    const state = sessionState(session, now);
    const others = coincide.get(session.id) ?? [];
    // "Próxima" en todas las filas es ruido: el estado se muestra sólo cuando dice algo (en vivo, en 20 min, mañana, terminó).
    const showState = !(state.kind === "upcoming" && state.label === "Próxima");
    return (
      <Link key={session.id} href={`/eventos/${event.id}`} className={`schedule-row agenda-row list-link${state.kind === "live" ? " current" : ""}`}>
        <time dateTime={session.start} title={session.timeKnown === false ? "Horario a confirmar" : undefined}>
          {sessionTime(session)}
        </time>
        <div className="agenda-main">
          <strong>{nombreVisibleSesion(session, event.sessions)}</strong>
          <span className="agenda-meta">
            <Code series={series} />
            {series.name} · {event.circuit.city}
          </span>
          {others.length > 0 && <span className="agenda-overlap">Coincide con {others.join(", ")}</span>}
        </div>
        {showState && <StateTag kind={state.kind}>{state.label}</StateTag>}
      </Link>
    );
  };
  return (
    <>
      {timed.map(row)}
      {pending.length > 0 && (
        <>
          <p className="agenda-pending">Horario a confirmar</p>
          {pending.map(row)}
        </>
      )}
    </>
  );
}
