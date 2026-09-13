import Link from "next/link";
import { fmtDate } from "@/lib/format";
import type { RaceEvent, ResultRow, Series, Session } from "@/lib/types";
import { Flag, SeriesTag } from "./ui";

const PODIUM = [
  { place: 2, color: "text-silver", height: "h-14" },
  { place: 1, color: "text-gold", height: "h-20" },
  { place: 3, color: "text-bronze", height: "h-10" },
];

const surname = (name: string) => name.split(" ").at(-1);

export function Podium({ rows }: { rows: ResultRow[] }) {
  return (
    <ol className="grid grid-cols-3 items-end gap-2">
      {PODIUM.map(({ place, color, height }) => {
        const row = rows[place - 1];
        if (!row) return <li key={place} />;
        return (
          <li key={place} className="flex min-w-0 flex-col items-center text-center">
            <span className={`truncate text-sm font-medium ${row.driverSlug ? "text-celeste" : "text-ink"}`}>{surname(row.driver)}</span>
            <span className="mb-1.5 truncate text-[11px] text-faint">{row.team}</span>
            <div className={`flex w-full items-start justify-center rounded-t-lg border border-b-0 border-line bg-surface-2 pt-1.5 ${height}`}>
              <span className={`font-display text-2xl font-bold ${color}`}>{place}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ResultCard({ event, series, session }: { event: RaceEvent; series: Series; session: Session }) {
  const rows = session.results ?? [];
  const argentines = rows.filter((r) => r.driverSlug && r.pos > 3);
  return (
    <Link
      href={`/eventos/${event.id}`}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-2"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <SeriesTag series={series} />
          <span className="truncate text-sm">
            <Flag code={event.circuit.flag} />
            {event.name}
          </span>
        </div>
        <span className="shrink-0 text-xs text-faint">{fmtDate(session.start)}</span>
      </div>
      <Podium rows={rows} />
      <div className="flex items-center justify-between border-t border-line pt-3 text-xs">
        <span className="text-muted">{session.name}</span>
        {argentines.length > 0 ? (
          <span className="text-celeste">
            {argentines.map((r) => `${surname(r.driver)} P${r.pos}`).join(" · ")}
          </span>
        ) : (
          <span className="text-faint">Ver clasificación</span>
        )}
      </div>
    </Link>
  );
}

export function Classification({ rows, defaultOpen = false }: { rows: ResultRow[]; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-xl border border-line">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm text-muted transition-colors hover:text-ink">
        Clasificación completa
        <svg viewBox="0 0 24 24" className="chevron size-4 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <ol className="border-t border-line">
        {rows.map((r) => (
          <li
            key={r.pos}
            className={`flex items-center gap-3 border-b border-line px-4 py-2.5 text-sm last:border-b-0 ${r.driverSlug ? "bg-celeste/8" : ""}`}
          >
            <span className="w-6 font-display text-lg font-bold text-faint tabular-nums">{r.pos}</span>
            <span className="min-w-0 flex-1">
              {r.driverSlug ? (
                <Link href={`/pilotos/${r.driverSlug}`} className="font-medium text-celeste hover:underline">
                  {r.driver}
                </Link>
              ) : (
                <span className="font-medium">{r.driver}</span>
              )}
              <span className="block truncate text-xs text-faint">{r.team}</span>
            </span>
            <span className="text-right text-muted tabular-nums">{r.gap}</span>
            {r.points !== undefined && (
              <span className="w-10 text-right text-xs text-faint tabular-nums">+{r.points}</span>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}
