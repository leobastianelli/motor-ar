import Link from "next/link";
import { getNextSession, getSeries, NOW } from "@/lib/data";
import { fmtDate, fmtTime, relative } from "@/lib/format";
import type { RaceEvent } from "@/lib/types";
import { Flag, SeriesTag } from "./ui";

export function EventCard({ event }: { event: RaceEvent }) {
  const series = getSeries(event.seriesId)!;
  const next = getNextSession(event);
  return (
    <Link
      href={`/eventos/${event.id}`}
      className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-2"
    >
      <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-surface-2 py-1.5">
        <span className="text-[10px] text-muted uppercase">{fmtDate(event.sessions.at(-1)!.start).split(" ")[1]}</span>
        <span className="font-display text-2xl leading-none font-bold">{fmtDate(event.sessions.at(-1)!.start).split(" ")[0]}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <SeriesTag series={series} />
          <span className="text-xs text-faint">Fecha {event.round}</span>
        </div>
        <div className="mt-1 truncate font-medium">
          <Flag code={event.circuit.flag} />
          {event.name}
        </div>
      </div>
      {next && (
        <div className="shrink-0 text-right text-sm">
          <div className="text-ink">{relative(next.start, NOW)}</div>
          <div className="text-xs text-faint">
            {next.name} {fmtTime(next.start)}
          </div>
        </div>
      )}
    </Link>
  );
}
