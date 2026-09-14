import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { CategoryLabel, SectionTitle, StateTag } from "@/components/pista";
import { broadcastsBySeries } from "@/data/broadcasts";
import { getNow, getSeason, getSeries } from "@/lib/data";
import { dayKey, driverCode, fmtDayNum, fmtDayShort, fmtRange, fmtWeekday, sessionState, sessionStatus, sessionTime } from "@/lib/format";
import type { Broadcast, ResultRow, Session } from "@/lib/types";

export const revalidate = 60;

export async function generateStaticParams() {
  return (await getSeason()).getAllEvents().map((e) => ({ id: e.id }));
}

export async function generateMetadata(props: PageProps<"/eventos/[id]">): Promise<Metadata> {
  const event = (await getSeason()).getEvent((await props.params).id);
  if (!event) return { title: "Evento" };
  const series = getSeries(event.seriesId);
  const title = `${series?.name ?? ""} · ${event.name}`.replace(/^ · /, "");
  const winner = event.sessions.filter((s) => ["final", "carrera"].includes(s.kind) && s.results?.length).at(-1)?.results?.[0];
  const description = `${series?.name ?? "Fecha"} en ${event.circuit.city}: horarios en hora argentina, dónde verlo y resultados de cada sesión${winner ? `. Ganó ${winner.driver}` : ""}.`;
  return { title, description, openGraph: { title, description }, alternates: { canonical: `/eventos/${event.id}` } };
}

const BROADCAST_KIND: Record<Broadcast["kind"], string> = { tv: "TV", streaming: "Streaming", youtube: "YouTube" };
const RACE_KINDS = ["carrera", "final", "sprint", "serie"];

// Número del auto si la fuente lo publica; sigla sólo para pilotos individuales (en tripulaciones no identifica a nadie).
const tag = (r: ResultRow) => (r.number ? `#${r.number}` : r.driver.includes(" / ") ? "" : driverCode(r));

/** Diferencia o estado. Los estados en inglés de las fuentes ("Finished", "+1 Lap") no se muestran como texto. */
const STATUS_ES: Record<string, string> = { Retired: "Abandonó", Accident: "Abandonó", Collision: "Abandonó", Disqualified: "Descalificado", "Did not start": "No largó" };
function shownGap(r: ResultRow) {
  const status = r.status;
  if (!status || /^(finished|lapped)$/i.test(status)) return r.gap;
  const lapped = status.match(/^\+(\d+) Laps?$/i);
  if (lapped) return `+${lapped[1]} ${lapped[1] === "1" ? "vuelta" : "vueltas"}`;
  return STATUS_ES[status] ?? (/^[A-Za-z ]+$/.test(status) && !/[áéíóúñ]/.test(status) && !["Abandonó", "No largó", "Descalificado", "Sin tiempo"].includes(status) ? "Abandonó" : status);
}

function Ranking({ rows }: { rows: ResultRow[] }) {
  return (
    <div className="ranking">
      {rows.map((r) => (
        <div key={`${r.pos}-${r.driver}`} className={`rank-row${r.driverSlug ? " argentine" : ""}`}>
          <b>{r.positionText ?? r.pos}</b>
          <span className="driver-code">{tag(r)}</span>
          <strong>
            {r.driver}
            {r.team && <small>{r.team}</small>}
          </strong>
          <time>{shownGap(r)}</time>
        </div>
      ))}
    </div>
  );
}

function SourceLink({ session }: { session: Session }) {
  if (!session.resultsSource) return null;
  return (
    <p className="results-source">
      Fuente:{" "}
      <a href={session.resultsSource.url} target="_blank" rel="noreferrer">
        {session.resultsSource.name}
      </a>
    </p>
  );
}

export default async function EventPage(props: PageProps<"/eventos/[id]">) {
  const season = await getSeason();
  const event = season.getEvent((await props.params).id);
  if (!event) notFound();
  const now = getNow();
  const series = getSeries(event.seriesId)!;
  const siblings = season.getSiblingEvents(event);

  const byDay = Map.groupBy(event.sessions, (s) => dayKey(s.start));
  // Todas las sesiones con resultados, de la más reciente a la primera.
  const withResults = event.sessions.filter((s) => s.results?.length && sessionStatus(s, now) === "done").reverse();
  const [latest, ...earlier] = withResults;
  const rows = latest?.results ?? [];
  const isRace = latest ? RACE_KINDS.includes(latest.kind) : false;
  const streamUrl = event.broadcasts.find((b) => b.url)?.url;
  const broadcastSource = broadcastsBySeries[event.seriesId]?.source;
  const timesUnknown = event.sessions.some((s) => s.timeKnown === false);
  const scheduleSources = [...new Map(event.sessions.flatMap((s) => s.timeSources ?? []).map((x) => [x.url, x])).values()];

  // Datos estructurados para buscadores: evento deportivo con lugar, fechas y organizador.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${series.name} · ${event.name}`,
    sport: "Automovilismo",
    startDate: event.sessions[0].start,
    endDate: event.sessions.at(-1)!.start,
    eventStatus: "https://schema.org/EventScheduled",
    location: { "@type": "Place", name: event.circuit.name, address: [event.circuit.city, event.circuit.province, event.circuit.country].filter(Boolean).join(", ") },
    organizer: { "@type": "Organization", name: series.org },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="event-hero" style={{ "--cat": series.color } as CSSProperties}>
        <div className="event-id">
          <CategoryLabel series={series} detail={`Fecha ${event.round}`} />
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
          <span>
            {event.sessions.length === 1 ? "sesión" : "sesiones"}
            {event.circuit.province ? ` · ${event.circuit.province}` : event.circuit.country ? ` · ${event.circuit.country}` : ""}
          </span>
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
                    const status = sessionStatus(s, now);
                    const state = sessionState(s, now);
                    const top = s.results?.[0];
                    return (
                      <div key={s.id} className={`session${status === "live" ? " live-session" : ""}${status === "done" ? " done" : ""}`}>
                        <time dateTime={s.start}>{sessionTime(s)}</time>
                        <div>
                          <strong>{s.name}</strong>
                          <span>
                            {status === "live" && "En curso"}
                            {status === "upcoming" &&
                              (s.timeKnown === false
                                ? "Horario a confirmar"
                                : s.timeStatus === "confirmed"
                                  ? "Horario confirmado"
                                  : s.timeStatus === "tentative"
                                    ? `Horario según ${s.timeSources?.map((x) => x.name).join(", ")}`
                                    : `${s.durationMin} min estimados`)}
                            {status === "done" && (top ? <a href={`#${s.id}`}>Terminó · ver resultados</a> : "Terminó · sin resultados cargados")}
                          </span>
                        </div>
                        {status === "done" && top ? (
                          <b className="session-winner">{top.driver}</b>
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
              <strong>No tenemos una transmisión confirmada en Argentina</strong>
            </div>
          )}
          {streamUrl && (
            <a href={streamUrl} target="_blank" rel="noreferrer">
              Abrir transmisión <span aria-hidden="true">↗</span>
            </a>
          )}
          <p>
            {timesUnknown ? "La fuente todavía no publica los horarios de esta fecha." : "Los horarios ya están convertidos a Argentina."}
            {event.source && ` Datos: ${event.source}.`}
            {scheduleSources.length > 0 && " Horarios: "}
            {scheduleSources.map((x, i) => (
              <span key={x.url}>
                {i > 0 && " · "}
                <a href={x.url} target="_blank" rel="noreferrer">
                  {x.name}
                </a>
              </span>
            ))}
            {scheduleSources.length > 0 && "."}
            {broadcastSource && (
              <>
                {" "}
                <a href={broadcastSource} target="_blank" rel="noreferrer">
                  Fuente de la transmisión
                </a>
              </>
            )}
          </p>
        </aside>
      </section>

      {siblings.length > 0 && (
        <section className="section-block siblings">
          <SectionTitle title="Corren el mismo finde" />
          <div className="date-strip">
            {siblings.map((e) => {
              const s = getSeries(e.seriesId)!;
              const finished = e.sessions.filter((x) => x.results?.length && sessionStatus(x, now) === "done").at(-1);
              return (
                <Link key={e.id} href={`/eventos/${e.id}`} className="next-card list-link" style={{ "--cat": s.color } as CSSProperties}>
                  <CategoryLabel series={s} />
                  <strong>{finished ? `${finished.name}: ganó ${finished.results![0].driver}` : `Fecha ${e.round}`}</strong>
                  <time dateTime={e.sessions.at(-1)!.start}>
                    {fmtDayShort(e.sessions.at(-1)!.start)} · {e.sessions.length} {e.sessions.length === 1 ? "sesión" : "sesiones"}
                  </time>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {latest && rows.length > 0 && (
        <section className="classification-wrap" id="resultados">
          <div className="section-block">
            <SectionTitle title={latest.name} inverse>
              <time dateTime={latest.start}>{fmtDayShort(latest.start)}</time>
            </SectionTitle>
            <div id={latest.id} className="session-result">
              <div className="pole">
                <span>1</span>
                <div>
                  <p>{isRace ? "Ganador" : "Mejor tiempo"}</p>
                  <h3>{rows[0].driver}</h3>
                  <b>{rows[0].gap || rows[0].team}</b>
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
              <details className="full-results" open>
                <summary>
                  Clasificación completa <span>{rows.length} pilotos</span>
                </summary>
                <Ranking rows={rows.slice(3)} />
              </details>
            )}
            <SourceLink session={latest} />

            {earlier.length > 0 && (
              <div className="earlier-sessions">
                <h3>Sesiones anteriores</h3>
                {earlier.map((s) => (
                  <details key={s.id} id={s.id} className="full-results">
                    <summary>
                      <strong>{s.name}</strong> · {fmtDayShort(s.start)} · 1.º {s.results![0].driver}
                      <span>{s.results!.length} pilotos</span>
                    </summary>
                    <Ranking rows={s.results!} />
                    <SourceLink session={s} />
                  </details>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
