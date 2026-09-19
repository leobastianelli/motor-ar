import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { breadcrumb, JsonLd, sportsEventJsonLd } from "@/components/json-ld";
import { LiveTimingEmbed } from "@/components/live-timing-embed";
import { CategoryLabel, SectionTitle, StateTag } from "@/components/pista";
import { broadcastsBySeries } from "@/data/broadcasts";
import { getNow, getSeason, getSeries } from "@/lib/data";
import { dayKey, driverCode, fmtDayNum, fmtDayShort, fmtRange, fmtWeekday, raceWinner, sessionState, sessionStatus, sessionTime } from "@/lib/format";
import { OG_DEFAULTS } from "@/lib/site";
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
  const winner = raceWinner(event.sessions.filter((s) => ["final", "carrera"].includes(s.kind) && s.results?.length).at(-1)?.results);
  const description = `${series?.name ?? "Fecha"} en ${event.circuit.city}: horarios en hora argentina, dónde verlo y resultados de cada sesión${winner ? `. Ganó ${winner.driver}` : ""}.`;
  return { title, description, openGraph: { title, description, ...OG_DEFAULTS }, alternates: { canonical: `/eventos/${event.id}` } };
}

const BROADCAST_KIND: Record<Broadcast["kind"], string> = { tv: "TV", streaming: "Streaming", youtube: "YouTube", timing: "Tiempos" };
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
            {(r.team || r.class) && <small>{[r.team, r.class].filter(Boolean).join(" · ")}</small>}
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
  // Si la fuente no publicó al 1.º, `rows[0]` es la mejor posición disponible, no el ganador.
  const rowsComplete = rows.length > 0 && rows[0].pos === 1;
  const streamUrl = event.broadcasts.find((b) => b.url && b.kind !== "timing")?.url;
  const timingUrl = event.broadcasts.find((b) => b.kind === "timing")?.url;
  const broadcastSource = broadcastsBySeries[event.seriesId]?.source;
  const timesUnknown = event.sessions.some((s) => s.timeKnown === false);
  const scheduleSources = [...new Map(event.sessions.flatMap((s) => s.timeSources ?? []).map((x) => [x.url, x])).values()];

  // Datos estructurados para buscadores: evento deportivo con lugar, fechas, organizador y quién compitió.
  const jsonLdWinner = rowsComplete ? rows[0] : undefined;
  const jsonLdDescription = `${series.name} en ${event.circuit.city}: horarios en hora argentina, dónde verlo y resultados de cada sesión${jsonLdWinner ? `. Ganó ${jsonLdWinner.driver}` : ""}.`;
  const jsonLd = sportsEventJsonLd(event, series, jsonLdDescription);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            jsonLd,
            breadcrumb([
              ["Inicio", "/"],
              [series.name, `/categorias/${series.id}`],
              [event.name, `/eventos/${event.id}`],
            ]),
          ],
        }}
      />
      <section className="event-hero" style={{ "--cat": series.color } as CSSProperties}>
        <div className="event-id">
          <CategoryLabel series={series} detail={`Fecha ${event.round}`} href={`/categorias/${series.id}`} />
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
                    // El nombre en negrita es el 1.º; si la fuente sólo publicó parte de la tabla y no incluye al
                    // 1.º, se muestra la mejor posición conocida en vez de hacer pasar a otro piloto por ganador.
                    const winner = raceWinner(s.results);
                    const top = winner ?? s.results?.[0];
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
                          {s.videos && s.videos.length > 0 && (
                            <span className="session-videos">
                              {s.videos.map((v) => (
                                <a key={v.id} href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer">
                                  <span aria-hidden="true">▶</span> {v.kind === "live" ? (status === "done" ? "Ver la sesión" : "Ver en vivo") : "Resumen"}
                                  {v.label ? ` · ${v.label}` : ""}
                                </a>
                              ))}
                            </span>
                          )}
                        </div>
                        {status === "done" && top ? (
                          <b className="session-winner">{winner ? top.driver : `${top.positionText ?? `${top.pos}.º`} ${top.driver}`}</b>
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
          {timingUrl && (
            <section id="tiempos-en-vivo">
              <SectionTitle title="Tiempos en vivo" />
              <LiveTimingEmbed url={timingUrl} />
            </section>
          )}
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
          {timingUrl && (
            <a href="#tiempos-en-vivo">
              Tiempos en vivo <span aria-hidden="true">↓</span>
            </a>
          )}
          <p>
            {!timesUnknown
              ? "Los horarios ya están convertidos a Argentina."
              : event.sessions.some((s) => s.timeKnown)
                ? "Algunos horarios de esta fecha todavía no se publicaron."
                : "La fuente todavía no publica los horarios de esta fecha."}
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
              const winner = finished && raceWinner(finished.results);
              return (
                <Link key={e.id} href={`/eventos/${e.id}`} className="next-card list-link" style={{ "--cat": s.color } as CSSProperties}>
                  <CategoryLabel series={s} />
                  <strong>{winner ? `${finished!.name}: ganó ${winner.driver}` : finished ? `${finished.name}: terminó` : `Fecha ${e.round}`}</strong>
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
                <span>{rows[0].positionText ?? rows[0].pos}</span>
                <div>
                  <p>{rowsComplete ? (isRace ? "Ganador" : "Mejor tiempo") : "Mejor resultado disponible"}</p>
                  <h3>{rows[0].driver}</h3>
                  <b>{rows[0].gap || rows[0].team}</b>
                </div>
              </div>
              <ol className="podium compact">
                {rows.slice(1, 3).map((r) => (
                  <li key={r.pos}>
                    <b>{r.positionText ?? r.pos}</b>
                    <div>
                      <strong>{r.driver}</strong>
                      <span>{r.team}</span>
                    </div>
                    <time>{r.gap}</time>
                  </li>
                ))}
              </ol>
            </div>
            {!rowsComplete && (
              <p className="empty-state">
                La fuente no publicó la clasificación completa de esta sesión: se muestran sólo las posiciones que informó.
              </p>
            )}
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
                      <span>{s.results!.length === 1 ? "Solo el 1.º" : `${s.results!.length} pilotos`}</span>
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
