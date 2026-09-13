import Link from "next/link";
import { EventCard } from "@/components/event-card";
import { ResultCard } from "@/components/results";
import { Flag, LiveBadge, SectionTitle, SeriesTag, WatchChips } from "@/components/ui";
import { WeekendFeed } from "@/components/weekend-feed";
import {
  getArgentinosPulse,
  getLatestResults,
  getLiveItems,
  getUpcomingEvents,
  getWeekendDays,
  getWeekendItems,
  NOW,
} from "@/lib/data";
import { dayKey, fmtDayLong, fmtTime } from "@/lib/format";

export default function Home() {
  const live = getLiveItems();
  const pulse = getArgentinosPulse();
  const results = getLatestResults(3);
  const upcoming = getUpcomingEvents().filter((e) => new Date(e.sessions[0].start) > new Date("2026-09-14T00:00:00-03:00")).slice(0, 4);

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="text-sm text-muted first-letter:uppercase">{fmtDayLong(NOW)}</p>
        <h1 className="font-display text-4xl font-bold tracking-wide uppercase sm:text-5xl">Este finde</h1>
      </header>

      {live.length > 0 && (
        <section aria-label="En vivo ahora" className="flex flex-col gap-3">
          {live.map(({ session, event, series }) => (
            <div key={session.id} className="flex flex-col gap-4 rounded-2xl border border-live/40 bg-surface p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <LiveBadge />
                  <SeriesTag series={series} size="md" />
                </div>
                <Link href={`/eventos/${event.id}`} className="mt-2 block hover:underline">
                  <span className="font-display text-3xl font-bold uppercase">{session.name}</span>
                  <span className="block text-muted">
                    <Flag code={event.circuit.flag} />
                    {event.name} · largó {fmtTime(session.start)}
                  </span>
                </Link>
                <div className="mt-3">
                  <WatchChips broadcasts={event.broadcasts} />
                </div>
              </div>
              {session.youtube && (
                <a
                  href={session.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-live px-5 py-3 font-medium text-white transition-opacity hover:opacity-90"
                >
                  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
                    <path d="M8 5.5v13l11-6.5z" />
                  </svg>
                  Ver en YouTube
                </a>
              )}
            </div>
          ))}
        </section>
      )}

      <section aria-labelledby="argentinos">
        <SectionTitle title="Los nuestros" action={{ href: "/pilotos", label: "Todos" }} />
        <ul id="argentinos" className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0">
          {pulse.map((p) => (
            <li key={p.driver.slug} className="w-64 shrink-0 snap-start sm:w-auto">
              <Link
                href={p.href}
                className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.driver.name}</span>
                  <SeriesTag series={p.series} />
                </div>
                <div className="flex items-end justify-between gap-3">
                  <span
                    className={`font-display text-4xl leading-none font-bold whitespace-nowrap ${p.tone === "result" ? "text-celeste" : p.tone === "live" ? "text-live" : "text-ink"}`}
                  >
                    {p.headline}
                  </span>
                  <span className="text-right text-xs text-muted">{p.detail}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle title="Agenda" action={{ href: "/calendario", label: "Calendario" }} />
        <WeekendFeed items={getWeekendItems()} days={getWeekendDays()} today={dayKey(NOW)} now={NOW} />
      </section>

      <section>
        <SectionTitle title="Resultados" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => (
            <ResultCard key={r.session.id} event={r.event} series={r.series} session={r.session} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title="Lo que viene" action={{ href: "/calendario", label: "Ver todo" }} />
        <div className="grid gap-2 sm:grid-cols-2">
          {upcoming.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      </section>
    </div>
  );
}
