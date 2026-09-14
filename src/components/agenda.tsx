"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import type { FeedItem } from "@/lib/data";
import { dayKey, fmtDayNum, fmtWeekday, sessionState, sessionTime } from "@/lib/format";
import type { Scope } from "@/lib/types";
import { CategoryLabel, SectionTitle, StateTag } from "./pista";

const FILTERS: { id: Scope | "all"; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "nacional", label: "Nacional" },
  { id: "internacional", label: "Internacional" },
  { id: "zonal", label: "Zonales" },
];

/** Agrupa las sesiones por fecha de cada categoría, en el orden en que arrancan (como las ligas en un fixture). */
function byEvent(rows: FeedItem[]) {
  const groups = new Map<string, FeedItem[]>();
  for (const row of rows) groups.set(row.event.id, [...(groups.get(row.event.id) ?? []), row]);
  return [...groups.values()];
}

export function Agenda({ items, days, today, now }: { items: FeedItem[]; days: { key: string; iso: string }[]; today: string; now: string }) {
  const [day, setDay] = useState(days.some((d) => d.key === today) ? today : days[0]?.key);
  const [filter, setFilter] = useState<Scope | "all">("all");
  const rows = items.filter((i) => dayKey(i.session.start) === day && (filter === "all" || i.series.scope === filter));

  return (
    <section className="section-block agenda" aria-labelledby="agenda-title">
      <SectionTitle id="agenda-title" title="Agenda">
        <div className="filters" role="group" aria-label="Filtrar agenda">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className={f.id === filter ? "is-selected" : undefined} aria-pressed={f.id === filter} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </SectionTitle>

      {days.length > 1 && (
        <div className="day-tabs" role="group" aria-label="Día">
          {days.map((d) => (
            <button key={d.key} type="button" className={d.key === day ? "active" : undefined} aria-pressed={d.key === day} onClick={() => setDay(d.key)}>
              {fmtWeekday(d.iso)} <b>{fmtDayNum(d.iso)}</b>
            </button>
          ))}
        </div>
      )}

      <div className="schedule">
        {byEvent(rows).map((group) => {
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
                    <strong>{session.name}</strong>
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
