"use client";

import { useState } from "react";
import type { FeedItem } from "@/lib/data";
import { dayKey, fmtDayShort } from "@/lib/format";
import type { Scope } from "@/lib/types";
import { SessionItem } from "./session-item";

const SCOPES: { id: Scope | "todas"; label: string }[] = [
  { id: "todas", label: "Todo" },
  { id: "nacional", label: "Nacional" },
  { id: "internacional", label: "Internacional" },
  { id: "zonal", label: "Zonales" },
];

export function WeekendFeed({ items, days, today, now }: { items: FeedItem[]; days: { key: string; iso: string }[]; today: string; now: string }) {
  const [day, setDay] = useState(days.some((d) => d.key === today) ? today : days[0]?.key);
  const [scope, setScope] = useState<Scope | "todas">("todas");

  const visible = items.filter((i) => dayKey(i.session.start) === day && (scope === "todas" || i.series.scope === scope));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Día" className="flex rounded-full border border-line bg-surface p-1">
          {days.map((d) => (
            <button
              key={d.key}
              type="button"
              aria-pressed={d.key === day}
              onClick={() => setDay(d.key)}
              className="rounded-full px-3.5 py-1.5 text-sm text-muted capitalize transition-colors hover:text-ink aria-pressed:bg-ink aria-pressed:text-bg"
            >
              {d.key === today ? "Hoy" : fmtDayShort(d.iso)}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Ámbito" className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={s.id === scope}
              onClick={() => setScope(s.id)}
              className="shrink-0 rounded-full border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-line-strong hover:text-ink aria-pressed:border-celeste/60 aria-pressed:text-celeste"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {visible.map((item) => (
            <li key={item.session.id}>
              <SessionItem item={item} now={now} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          No hay actividad para este filtro. Probá con otro día o ámbito.
        </p>
      )}
    </div>
  );
}
