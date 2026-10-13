"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type CSSProperties } from "react";
import { dayKey, fmtDayNum, fmtMonthLong, fmtWeekday } from "@/lib/format";
import { fechaLarga, nombreDia } from "@/lib/hoy.mjs";
import { createTimeViews } from "@/lib/tiempo.mjs";
import type { RaceEvent, Scope, Series } from "@/lib/types";
import { ByTime } from "./agenda";
import { useNow } from "./live-clock";
import { CategoryLabel, SectionTitle } from "./pista";

const FILTERS: { id: Scope | "all"; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "nacional", label: "Nacional" },
  { id: "internacional", label: "Internacional" },
];

/**
 * El cuerpo de `/hoy`, dibujado en el navegador con la hora real: qué corre hoy (o el próximo día con actividad), lo que está en vivo y los
 * estados de cada sesión. El servidor manda las sesiones de los próximos días (src/lib/snapshot.mjs, `fechasDeHoy`) y la página es ISR con
 * `revalidate = 900`, así que a medianoche el día cambia solo, sin esperar una regeneración. Reutiliza la fila de la agenda de la home
 * (`ByTime`, src/components/agenda.tsx).
 */
export function HoyView({
  events,
  seriesById,
  tiers,
  cubreHasta,
  serverNow,
  simulated,
}: {
  events: RaceEvent[];
  /** Último día (YYYY-MM-DD) del que el recorte trae todas las sesiones. */
  cubreHasta: string;
  seriesById: Record<string, Series>;
  tiers: Record<string, 1 | 2 | 3>;
  serverNow: string;
  simulated?: boolean;
}) {
  const router = useRouter();
  const now = useNow(serverNow, simulated);
  const views = useMemo(() => createTimeViews({ events, seriesById, tierOf: (s) => tiers[s.id] ?? 3, driversAbroad: [] }), [events, seriesById, tiers]);
  const dia = views.getToday(now);
  const { items, isToday } = dia;
  const live = items.find((i) => i.status === "live");
  const [filter, setFilter] = useState<Scope | "all">("all");
  // El recorte cubre unos días hacia adelante: si la pestaña quedó abierta más que eso, no se muestra una agenda a medias; se pide la página nueva.
  const outOfRange = dayKey(now) > cubreHasta;
  const hasScopes = new Set(items.map((i) => i.series.scope)).size > 1;
  const rows = items.filter((i) => filter === "all" || i.series.scope === filter);

  if (outOfRange) {
    return (
      <section className="weekend-head">
        <h1>Hoy</h1>
        <p className="stale-notice" role="status">
          Pasó un tiempo desde que se cargó esta página.{" "}
          <button type="button" onClick={() => router.refresh()}>
            Ver la agenda de hoy
          </button>
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="weekend-head">
        <h1>{isToday ? "Hoy" : "Hoy no hay carreras"}</h1>
        <p className="lede">
          {isToday && (
            <span>
              {fmtWeekday(now)} {fmtDayNum(now)} de {fmtMonthLong(now)}
            </span>
          )}
          {!isToday && dia.key && (
            <span>
              Próximo: {nombreDia(dia.key).toLowerCase()} {fechaLarga(dia.key)}
            </span>
          )}
          {!dia.key && <span>No hay carreras próximas cargadas.</span>}
          {!isToday && (
            <span>
              <Link href="/calendario">Ver el calendario</Link>
            </span>
          )}
        </p>
      </section>

      {live && (
        <div className="live-callout" style={{ "--cat": live.series.color } as CSSProperties}>
          <span className="pulse" aria-hidden="true" />
          <div>
            <CategoryLabel series={live.series} detail={live.event.circuit.city} href={`/categorias/${live.series.id}`} />
            <strong>{live.session.name}</strong>
          </div>
          <Link href={`/eventos/${live.event.id}`}>
            Ver en vivo <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <section className="section-block">
          <SectionTitle as="h2" title={isToday ? "Todo lo de hoy, por hora" : "Lo de esa fecha, por hora"} />
          {hasScopes && (
            <div className="filters" role="group" aria-label="Filtrar por alcance">
              {FILTERS.map((f) => (
                <button key={f.id} type="button" className={f.id === filter ? "is-selected" : undefined} aria-pressed={f.id === filter} onClick={() => setFilter(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
          <div className="schedule">
            <ByTime rows={rows} now={now} />
            {rows.length === 0 && <p className="empty-state">No hay sesiones de este alcance.</p>}
          </div>
        </section>
      )}
    </>
  );
}
