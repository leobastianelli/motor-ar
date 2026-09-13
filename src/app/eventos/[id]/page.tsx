import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatMark, SectionTitle, StateTag } from "@/components/pista";
import { getAllEvents, getEvent, getSeries, NOW } from "@/lib/data";
import { dayKey, driverCode, fmtDayNum, fmtDayShort, fmtRange, fmtTime, fmtWeekday, sessionState, sessionStatus } from "@/lib/format";
import type { Broadcast } from "@/lib/types";

export function generateStaticParams() {
  return getAllEvents().map((e) => ({ id: e.id }));
}

export async function generateMetadata(props: PageProps<"/eventos/[id]">): Promise<Metadata> {
  const event = getEvent((await props.params).id);
  return { title: event?.name ?? "Evento" };
}

const BROADCAST_KIND: Record<Broadcast["kind"], string> = { tv: "TV", streaming: "Streaming", youtube: "YouTube" };
const RACE_KINDS = ["carrera", "final", "sprint", "serie"];

export default async function EventPage(props: PageProps<"/eventos/[id]">) {
  const event = getEvent((await props.params).id);
  if (!event) notFound();
  const series = getSeries(event.seriesId)!;

  const byDay = Map.groupBy(event.sessions, (s) => dayKey(s.start));
  const last = event.sessions.filter((s) => s.results?.length && sessionStatus(s, NOW) === "done").at(-1);
  const rows = last?.results ?? [];
  const isRace = last ? RACE_KINDS.includes(last.kind) : false;
  const streamUrl = event.sessions.find((s) => s.youtube)?.youtube ?? event.broadcasts.find((b) => b.url)?.url;

  return (
    <>
      <section className="event-hero">
        <div className="event-id">
          <CatMark series={series} />
          <p>
            {series.name} · Fecha {event.round}
          </p>
        </div>
        <div>
          <p className="kicker">
            {fmtRange(event.sessions[0].start, event.sessions.at(-1)!.start)} · {event.circuit.city}
          </p>
          <h1>{event.name}</h1>
        </div>
        <div className="event-meta">
          <p>{event.circuit.name}</p>
          <b>{event.sessions.length}</b>
          <span>sesiones · {event.circuit.country}</span>
        </div>
      </section>

      <section className="event-grid section-block">
        <div>
          <SectionTitle title="Cronograma" />
          <div className="event-days">
            {[...byDay.entries()].map(([key, sessions]) => (
              <section key={key}>
                <h3>
                  {fmtWeekday(sessions[0].start)} {fmtDayNum(sessions[0].start)}
                </h3>
                <div>
                  {sessions.map((s) => {
                    const status = sessionStatus(s, NOW);
                    const state = sessionState(s, NOW);
                    const top = s.results?.[0];
                    return (
                      <div key={s.id} className={`session${status === "live" ? " live-session" : ""}${status === "done" ? " done" : ""}`}>
                        <time dateTime={s.start}>{fmtTime(s.start)}</time>
                        <div>
                          <strong>{s.name}</strong>
                          <span>
                            {status === "live" && "En curso"}
                            {status === "upcoming" && `${s.durationMin} min estimados`}
                            {status === "done" && (top ? (s.id === last?.id ? <a href="#resultados">Terminó · ver resultados</a> : "Terminó") : "Terminó · sin resultados cargados")}
                          </span>
                        </div>
                        {status === "done" && top ? (
                          <b>
                            {driverCode(top)} {top.gap}
                          </b>
                        ) : (
                          <StateTag as="b" kind={state.kind}>
                            {state.label}
                          </StateTag>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>

        <aside className="broadcast">
          <h2>Dónde verlo</h2>
          {event.broadcasts.map((b) => (
            <div key={b.name}>
              <span>{BROADCAST_KIND[b.kind]}</span>
              <strong>{b.name}</strong>
            </div>
          ))}
          {event.broadcasts.length === 0 && (
            <div>
              <span>Sin datos</span>
              <strong>Todavía no hay transmisión confirmada</strong>
            </div>
          )}
          {streamUrl && (
            <a href={streamUrl} target="_blank" rel="noreferrer">
              Abrir transmisión <span aria-hidden="true">↗</span>
            </a>
          )}
          <p>Los horarios ya están convertidos a Argentina.</p>
        </aside>
      </section>

      {last && rows.length > 0 && (
        <section className="classification-wrap" id="resultados">
          <div className="section-block">
            <SectionTitle title={last.name} inverse>
              <time dateTime={last.start}>
                {fmtDayShort(last.start)} {fmtTime(last.start)}
              </time>
            </SectionTitle>
            <div className="session-result">
              <div className="pole">
                <span>1</span>
                <div>
                  <p>{isRace ? "Ganador" : "Mejor tiempo"}</p>
                  <h3>{rows[0].driver}</h3>
                  <b>{rows[0].gap}</b>
                </div>
              </div>
              <ol className="podium compact">
                {rows.slice(1, 3).map((r) => (
                  <li key={r.pos}>
                    <b>{r.pos}</b>
                    <div>
                      <strong>{r.driver}</strong>
                      <span>{r.team}</span>
                    </div>
                    <time>{r.gap}</time>
                  </li>
                ))}
              </ol>
            </div>
            {rows.length > 3 && (
              <details className="full-results" open={rows.slice(3).some((r) => r.driverSlug)}>
                <summary>
                  Ver clasificación completa <span>{rows.length} pilotos</span>
                </summary>
                <div className="ranking">
                  {rows.slice(3).map((r) => (
                    <div key={r.pos} className={`rank-row${r.driverSlug ? " argentine" : ""}`}>
                      <b>{r.pos}</b>
                      <span className="driver-code">{driverCode(r)}</span>
                      <strong>{r.driver}</strong>
                      <time>{r.gap}</time>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </section>
      )}
    </>
  );
}
