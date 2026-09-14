"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import type { Scope } from "@/lib/types";
import { CategoryLabel, SectionTitle } from "./pista";

export interface CalendarCard {
  id: string;
  month: string;
  scope: Scope;
  city: string;
  when: string;
  series: { code: string; color: string; name: string };
}

const FILTERS: { id: Scope | "all"; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "nacional", label: "Nacional" },
  { id: "internacional", label: "Internacional" },
  { id: "zonal", label: "Zonales" },
];

/** Calendario por mes con filtro en el navegador: la página se genera de antemano y abre al instante. */
export function CalendarView({ cards }: { cards: CalendarCard[] }) {
  const [filter, setFilter] = useState<Scope | "all">("all");
  const visible = cards.filter((c) => filter === "all" || c.scope === filter);
  const months = [...new Set(visible.map((c) => c.month))];

  return (
    <>
      {months.map((month, index) => (
        <section key={month} className="section-block">
          <SectionTitle title={month}>
            {index === 0 && (
              <div className="filters" role="group" aria-label="Filtrar por ámbito">
                {FILTERS.map((f) => (
                  <button key={f.id} type="button" className={f.id === filter ? "is-selected" : undefined} aria-pressed={f.id === filter} onClick={() => setFilter(f.id)}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </SectionTitle>
          <div className="date-strip">
            {visible
              .filter((c) => c.month === month)
              .map((c) => (
                <Link key={c.id} href={`/eventos/${c.id}`} className="next-card list-link" style={{ "--cat": c.series.color } as CSSProperties}>
                  <CategoryLabel series={c.series} />
                  <strong>{c.city}</strong>
                  <time>{c.when}</time>
                </Link>
              ))}
          </div>
        </section>
      ))}
      {months.length === 0 && (
        <section className="section-block">
          <div className="filters" role="group" aria-label="Filtrar por ámbito">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" className={f.id === filter ? "is-selected" : undefined} aria-pressed={f.id === filter} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          <p className="empty-state">No hay fechas próximas para este filtro.</p>
        </section>
      )}
    </>
  );
}
