import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Classification, Podium } from "@/components/results";
import { Flag, LiveBadge, SeriesTag, WatchChips } from "@/components/ui";
import { getAllEvents, getEvent, getSeries, NOW } from "@/lib/data";
import { dayKey, fmtDayLong, fmtTime, relative, sessionStatus } from "@/lib/format";

export function generateStaticParams() {
  return getAllEvents().map((e) => ({ id: e.id }));
}

export async function generateMetadata(props: PageProps<"/eventos/[id]">): Promise<Metadata> {
  const event = getEvent((await props.params).id);
  return { title: event ? `${event.name}` : "Evento" };
}

export default async function EventPage(props: PageProps<"/eventos/[id]">) {
  const event = getEvent((await props.params).id);
  if (!event) notFound();
  const series = getSeries(event.seriesId)!;

  const byDay = Map.groupBy(event.sessions, (s) => dayKey(s.start));

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 border-l-4 pl-4" style={{ borderColor: series.color }}>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Link href={`/categorias/${series.id}`} className="hover:text-ink">
            <SeriesTag series={series} size="md" />
          </Link>
          Fecha {event.round}
        </div>
        <h1 className="font-display text-4xl font-bold uppercase sm:text-5xl">{event.name}</h1>
        <p className="text-muted">
          <Flag code={event.circuit.flag} />
          {event.circuit.name} · {event.circuit.city}
        </p>
      </header>

      <section aria-labelledby="donde-ver" className="rounded-2xl border border-line bg-surface p-4">
        <h2 id="donde-ver" className="mb-2 text-sm font-medium text-muted">
          Dónde verlo
        </h2>
        <WatchChips broadcasts={event.broadcasts} />
      </section>

      <div className="flex flex-col gap-8">
        {[...byDay.entries()].map(([key, sessions]) => (
          <section key={key}>
            <h2 className="mb-3 font-display text-xl font-semibold tracking-wide text-muted uppercase">{fmtDayLong(sessions[0].start)}</h2>

            <ol className="flex flex-col gap-3">
              {sessions.map((session) => {
                const status = sessionStatus(session, NOW);
                const rows = session.results ?? [];
                return (
                  <li
                    key={session.id}
                    className={`rounded-2xl border bg-surface p-4 ${status === "live" ? "border-live/50" : "border-line"}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`font-display text-2xl font-bold tabular-nums ${status === "done" ? "text-faint" : ""}`}>
                        {fmtTime(session.start)}
                      </span>
                      <span className="flex-1 font-medium">{session.name}</span>
                      {status === "live" && <LiveBadge />}
                      {status === "upcoming" && <span className="text-sm text-muted">{relative(session.start, NOW)}</span>}
                      {status === "done" && rows.length === 0 && <span className="text-sm text-faint">Resultados pendientes</span>}
                    </div>

                    {status === "live" && session.youtube && (
                      <a
                        href={session.youtube}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 rounded-full bg-live px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                      >
                        Ver en vivo en YouTube
                      </a>
                    )}

                    {rows.length > 0 && (
                      <div className="mt-4 flex flex-col gap-4">
                        {rows.length >= 3 && session.kind !== "practica" && session.kind !== "clasificacion" && (
                          <div className="mx-auto w-full max-w-sm">
                            <Podium rows={rows} />
                          </div>
                        )}
                        <Classification rows={rows} defaultOpen={session.kind === "practica" || session.kind === "clasificacion"} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </article>
  );
}
