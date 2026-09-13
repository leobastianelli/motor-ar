import Link from "next/link";
import type { Broadcast, Series } from "@/lib/types";

export function SeriesTag({ series, size = "sm" }: { series: Series; size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md bg-surface-2 font-display font-semibold tracking-wide uppercase ${size === "md" ? "px-2.5 py-1 text-sm" : "px-1.5 py-0.5 text-xs"}`}
    >
      <span aria-hidden className="h-3 w-1 rounded-full" style={{ background: series.color }} />
      {series.short}
    </span>
  );
}

export function Flag({ code }: { code: string }) {
  return (
    <span className="mr-1.5 inline-block rounded bg-surface-2 px-1 py-px align-[1px] font-mono text-[10px] font-medium text-muted">
      {code}
    </span>
  );
}

export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-2 font-display text-sm font-bold tracking-wider text-live uppercase">
      <span className="live-dot" aria-hidden />
      En vivo
    </span>
  );
}

const BROADCAST_ICON: Record<Broadcast["kind"], string> = { tv: "TV", streaming: "▶", youtube: "YT" };

export function WatchChips({ broadcasts, max }: { broadcasts: Broadcast[]; max?: number }) {
  const list = max ? broadcasts.slice(0, max) : broadcasts;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Dónde verlo">
      {list.map((b) => {
        const content = (
          <>
            <span aria-hidden className="text-[10px] font-bold text-faint">{BROADCAST_ICON[b.kind]}</span>
            {b.name}
          </>
        );
        const cls = "inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-muted";
        return (
          <li key={b.name}>
            {b.url ? (
              <a href={b.url} target="_blank" rel="noreferrer" className={`${cls} transition-colors hover:border-line-strong hover:text-ink`}>
                {content}
              </a>
            ) : (
              <span className={cls}>{content}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: { href: string; label: string } }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <h2 className="font-display text-2xl font-bold tracking-wide uppercase">{title}</h2>
      {action && (
        <Link href={action.href} className="text-sm text-muted transition-colors hover:text-ink">
          {action.label} →
        </Link>
      )}
    </div>
  );
}

export function StatGrid({ stats }: { stats: { label: string; value: string }[] }) {
  return (
    <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line ${stats.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>
      {stats.map((s, i) => (
        <div key={s.label} className={`bg-surface px-4 py-3 ${stats.length % 2 === 1 && i === stats.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}>
          <dt className="text-xs text-muted">{s.label}</dt>
          <dd className="font-display text-3xl font-bold tabular-nums">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}
