"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FeedItem } from "@/lib/data";
import { dayKey } from "@/lib/format";
import type { Scope } from "@/lib/types";
import { ByTime } from "./agenda";
import { useNow } from "./live-clock";

const FILTERS: { id: Scope | "all"; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "nacional", label: "Nacional" },
  { id: "internacional", label: "Internacional" },
];

/**
 * La lista de `/hoy`: reutiliza la fila de la agenda de la home (`ByTime`, src/components/agenda.tsx) para no
 * duplicarla. Estados y el aviso de cambio de día se recalculan en el navegador con `useNow`.
 */
export function HoyAgenda({ items, serverNow, simulated }: { items: FeedItem[]; serverNow: string; simulated?: boolean }) {
  const router = useRouter();
  const now = useNow(serverNow, simulated);
  const [filter, setFilter] = useState<Scope | "all">("all");
  // Como la página es ISR, poco después de medianoche puede servirse todavía la versión de ayer: si el día
  // calendario argentino que ve el navegador ya no es el que trajo el servidor, se avisa y se pide la nueva.
  const dayChanged = dayKey(now) !== dayKey(serverNow);
  const hasScopes = new Set(items.map((i) => i.series.scope)).size > 1;
  const rows = items.filter((i) => filter === "all" || i.series.scope === filter);

  return (
    <>
      {dayChanged && (
        <p className="stale-notice" role="status">
          Cambió el día desde que se cargó esta página.{" "}
          <button type="button" onClick={() => router.refresh()}>
            Ver la agenda de hoy
          </button>
        </p>
      )}
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
    </>
  );
}
