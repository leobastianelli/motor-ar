"use client";

import Link from "next/link";
import { useState } from "react";
import type { FeedItem } from "@/lib/data";
import { dayKey, fmtDayNum, fmtWeekday, sessionState, sessionTime } from "@/lib/format";
import type { Scope } from "@/lib/types";
import { Code, SectionTitle, StateTag } from "./pista";

const FILTERS: { id: Scope | "all"; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "nacional", label: "Nacional" },
  { id: "internacional", label: "Internacional" },
  { id: "zonal", label: "Zonales" },
];

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

      <div className="day-tabs" role="group" aria-label="Día">
        {days.map((d) => (
          <button key={d.key} type="button" className={d.key === day ? "active" : undefined} aria-pressed={d.key === day} onClick={() => setDay(d.key)}>
            {fmtWeekday(d.iso)} <b>{fmtDayNum(d.iso)}</b>
          </button>
        ))}
      </div>

      <div className="schedule">
        {rows.map(({ session, event, series }) => {
          const state = sessionState(session, now);
          return (
            <Link key={session.id} href={`/eventos/${event.id}`} className={`schedule-row list-link${state.kind === "live" ? " current" : ""}`}>
              <time dateTime={session.start} title={session.timeKnown === false ? "Horario a confirmar" : undefined}>
                {sessionTime(session)}
              </time>
              <Code series={series} />
              <div>
                <strong>{series.name}</strong>
                <span>
                  {session.name} · {event.circuit.city}
                </span>
              </div>
              <b className="channel">{event.broadcasts[0]?.name ?? "Sin datos de transmisión"}</b>
              <StateTag kind={state.kind}>{state.label}</StateTag>
            </Link>
          );
        })}
        {rows.length === 0 && <p className="empty-state">No hay sesiones cargadas para este día con este filtro.</p>}
      </div>
    </section>
  );
}
