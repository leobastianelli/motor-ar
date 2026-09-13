import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventCard } from "@/components/event-card";
import { ResultCard } from "@/components/results";
import { SectionTitle, WatchChips } from "@/components/ui";
import { getAllSeries, getEventsForSeries, getNextSession, getSeries, getStandings, NOW } from "@/lib/data";
import { fmtDate, sessionStatus } from "@/lib/format";

export function generateStaticParams() {
  return getAllSeries().map((s) => ({ slug: s.id }));
}

export async function generateMetadata(props: PageProps<"/categorias/[slug]">): Promise<Metadata> {
  return { title: getSeries((await props.params).slug)?.name ?? "Categoría" };
}

export default async function SeriesPage(props: PageProps<"/categorias/[slug]">) {
  const series = getSeries((await props.params).slug);
  if (!series) notFound();

  const events = getEventsForSeries(series.id);
  const next = events.find((e) => getNextSession(e));
  const lastRace = events
    .flatMap((e) => e.sessions.map((s) => ({ event: e, session: s })))
    .filter(({ session }) => session.results && ["carrera", "final"].includes(session.kind) && sessionStatus(session, NOW) === "done")
    .at(-1);
  const table = getStandings(series.id);
  const leader = table[0]?.points ?? 1;

  return (
    <div className="flex flex-col gap-10">
      <header className="border-l-4 pl-4" style={{ borderColor: series.color }}>
        <p className="text-sm text-muted">
          {series.org} · {series.scope}
        </p>
        <h1 className="font-display text-5xl font-bold uppercase">{series.name}</h1>
      </header>

      {events.length > 0 && (
        <section aria-label="Temporada">
          <ol className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {events.map((e) => {
              const done = !getNextSession(e);
              const isNext = e.id === next?.id;
              return (
                <li key={e.id} className="shrink-0">
                  <Link
                    href={`/eventos/${e.id}`}
                    className={`flex w-24 flex-col gap-1 rounded-xl border p-3 transition-colors hover:bg-surface-2 ${isNext ? "border-celeste/60 bg-surface" : "border-line"} ${done ? "opacity-60" : ""}`}
                  >
                    <span className="font-display text-sm font-semibold text-muted">F{e.round}</span>
                    <span className="font-mono text-xs text-muted">{e.circuit.flag}</span>
                    <span className="truncate text-xs">{e.circuit.city}</span>
                    <span className="text-[11px] text-faint">{fmtDate(e.sessions.at(-1)!.start)}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {next && (
        <section>
          <SectionTitle title="Próxima fecha" />
          <div className="flex flex-col gap-3">
            <EventCard event={next} />
            <WatchChips broadcasts={next.broadcasts} />
          </div>
        </section>
      )}

      <div className="grid gap-10 md:grid-cols-2">
        {table.length > 0 && (
          <section>
            <SectionTitle title="Campeonato" />
            <ol className="flex flex-col gap-3">
              {table.map((row, i) => (
                <li key={row.driver} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span>
                      <span className="mr-2 inline-block w-4 font-display font-bold text-faint">{i + 1}</span>
                      {row.driverSlug ? (
                        <Link href={`/pilotos/${row.driverSlug}`} className="font-medium text-celeste hover:underline">
                          {row.driver}
                        </Link>
                      ) : (
                        <span className="font-medium">{row.driver}</span>
                      )}
                      <span className="ml-2 text-xs text-faint">{row.team}</span>
                    </span>
                    <span className="font-display text-lg font-bold tabular-nums">{row.points}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(row.points / leader) * 100}%`, background: row.driverSlug ? "var(--color-celeste)" : series.color }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {lastRace && (
          <section>
            <SectionTitle title="Última carrera" />
            <ResultCard event={lastRace.event} series={series} session={lastRace.session} />
          </section>
        )}
      </div>
    </div>
  );
}
