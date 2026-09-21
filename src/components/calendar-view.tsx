"use client";

import Link from "next/link";
import { useSyncExternalStore, type CSSProperties } from "react";
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

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/**
 * Calendario por mes con filtro en el navegador: la página se genera de antemano y abre al instante.
 * El filtro vive en el #hash de la dirección (/calendario#nacional), así se puede enlazar desde el menú y compartir.
 */
export function CalendarView({ cards }: { cards: CalendarCard[] }) {
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash.slice(1),
    () => "",
  );
  const filter: Scope | "all" = FILTERS.some((f) => f.id === hash) ? (hash as Scope) : "all";
  const setFilter = (id: Scope | "all") => {
    window.history.replaceState(null, "", id === "all" ? window.location.pathname : `#${id}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };
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
