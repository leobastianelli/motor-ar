import Link from "next/link";
import { fmtTime, relative } from "@/lib/format";
import type { FeedItem } from "@/lib/data";
import { LiveBadge, SeriesTag } from "./ui";

export function SessionItem({ item, now }: { item: FeedItem; now: string }) {
  const { session, event, series, status } = item;
  const winner = session.results?.[0];
  const argentine = session.results?.find((r) => r.driverSlug && r.pos > 1);

  return (
    <Link
      href={`/eventos/${event.id}`}
      className={`group flex items-center gap-4 rounded-2xl border bg-surface p-3.5 transition-colors hover:bg-surface-2 sm:p-4 ${status === "live" ? "border-live/50" : "border-line hover:border-line-strong"}`}
    >
      <div className="w-14 shrink-0 text-center">
        <div className={`font-display text-2xl leading-none font-bold tabular-nums ${status === "done" ? "text-faint" : "text-ink"}`}>
          {fmtTime(session.start)}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <SeriesTag series={series} />
          <span className="truncate text-xs text-muted">{event.name}</span>
        </div>
        <div className="mt-1 font-medium">{session.name}</div>
      </div>

      <div className="shrink-0 text-right text-sm">
        {status === "live" && <LiveBadge />}
        {status === "upcoming" && <span className="text-muted">{relative(session.start, now)}</span>}
        {status === "done" && winner && (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-ink">
              <span className="text-gold">1°</span> {winner.driver.split(" ").at(-1)}
            </span>
            {winner.driverSlug || argentine ? (
              <span className="text-xs text-celeste">
                {winner.driverSlug ? "¡Ganó un argentino!" : `${argentine!.driver.split(" ").at(-1)} P${argentine!.pos}`}
              </span>
            ) : null}
          </div>
        )}
        {status === "done" && !winner && <span className="text-faint">Finalizada</span>}
      </div>
    </Link>
  );
}
