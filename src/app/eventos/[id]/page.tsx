import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ComponentProps, CSSProperties } from "react";
import { breadcrumb, JsonLd, sportsEventJsonLd } from "@/components/json-ld";
import { AutoRefresh } from "@/components/live-clock";
import { LiveTimingEmbed } from "@/components/live-timing-embed";
import { Argentinos, Momento, ResultadoCarrera } from "@/components/momento";
import { ResultsStatus } from "@/components/results-status";
import { VideoSesion } from "@/components/video-sesion";
import { CategoryLabel, ClassSeal, SectionTitle, StateTag } from "@/components/pista";
import { broadcastsBySeries } from "@/data/broadcasts";
import { getNow, getSeason, getSeries, isSimulatedNow } from "@/lib/data";
import { nombreVisibleSesion } from "@/lib/momento.mjs";
import { provisionalSuffix } from "@/lib/provisorio.mjs";
import { noResultsReason } from "@/lib/salud-core.mjs";
import { dayKey, driverCode, fmtDayNum, fmtDayShort, fmtRange, fmtWeekday, raceWinner, sessionState, sessionStatus, sessionTime } from "@/lib/format";
import { descripcionMomento, tituloEvento } from "@/lib/seo-titulos.mjs";
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
  const season = await getSeason();
  const now = getNow();
  const momento = season.getMomentoEvento(event, now);
  const lastRace = event.sessions.filter((s) => ["final", "carrera"].includes(s.kind) && s.results?.length).at(-1);
  const winner = raceWinner(lastRace?.results);
  const fallback = `${series?.name ?? "Fecha"} en ${event.circuit.city}: horarios en hora argentina, dónde verlo y resultados de cada sesión${winner ? `. Ganó ${winner.driver}${provisionalSuffix(lastRace)}` : ""}.`;
  // Título y descripción salen del momento de la fecha (src/lib/seo-titulos.mjs) y se regeneran con la página.
  const title = series ? tituloEvento(series, { name: event.name, city: event.circuit.city }, event.sessions[0].start.slice(0, 4), momento) : event.name;
  const description = series ? descripcionMomento(series, momento, { broadcasts: event.broadcasts, fallback, fechaPropia: true }) : fallback;
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

/** "Argentinos: Colapinto 11.º", arriba de la tabla, para verlo aunque esté plegada. Sin argentinos en la sesión, no ocupa lugar. */
function ArgentinosLinea({ rows, small }: { rows: ComponentProps<typeof Argentinos>["rows"]; small?: boolean }) {
  if (rows.length === 0) return null;
  const Tag = small ? "small" : "p";
  return (
    <Tag className="arg-line">
      <b>Argentinos</b> <Argentinos rows={rows} />
    </Tag>
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
  // Categoría con clases (Córdoba Pista): cada sesión lleva el sello de su clase y arriba van las finales de todas las clases.
  const clases = series.classes ?? [];
  const claseDe = (s: Session) => clases.find((c) => c.id === s.classId);
  const finalesPorClase = clases
    .map((c) => ({ c, finales: event.sessions.filter((s) => s.classId === c.id && s.kind === "final" && s.results?.length) }))
    .filter((x) => x.finales.length > 0);
  const momento = season.getMomentoEvento(event, now);
  // Los argentinos de cada sesión (posición o "abandonó"), ya calculados con la lista de pilotos de la categoría.
  const argentinosPorSesion = new Map(momento.sesiones.map((m) => [m.id, m.argentinos]));
  const argentinosDe = (s: Session) => argentinosPorSesion.get(s.id) ?? [];

  const byDay = Map.groupBy(event.sessions, (s) => dayKey(s.start));
  // Todas las sesiones con resultados, de la más reciente a la primera.
  const withResults = event.sessions.filter((s) => s.results?.length && sessionStatus(s, now) === "done").reverse();
  const [latest, ...earlier] = withResults;
  // El resumen de estas sesiones se ve más abajo, en esta misma página (por eso el enlace del cronograma es un ancla y no youtube.com).
  const withResultsIds = new Set(withResults.map((s) => s.id));
  const resumenDe = (s: Session) => s.videos?.find((v) => v.kind === "highlights");
  const transmisionDe = (s: Session) => s.videos?.find((v) => v.kind === "live");
  const rows = latest?.results ?? [];
  const isRace = latest ? RACE_KINDS.includes(latest.kind) : false;
  // Si la fuente no publicó al 1.º, `rows[0]` es la mejor posición disponible, no el ganador.
  const rowsComplete = rows.length > 0 && rows[0].pos === 1;
  const latestResumen = latest && resumenDe(latest);
  const latestTransmision = latest && transmisionDe(latest);
  const streamUrl = event.broadcasts.find((b) => b.url && b.kind !== "timing")?.url;
  const timingUrl = event.broadcasts.find((b) => b.kind === "timing")?.url;
  const broadcastSource = broadcastsBySeries[event.seriesId]?.source;
  const timesUnknown = event.sessions.some((s) => s.timeKnown === false);
  const scheduleSources = [...new Map(event.sessions.flatMap((s) => s.timeSources ?? []).map((x) => [x.url, x])).values()];

  // Datos estructurados para buscadores: evento deportivo con lugar, fechas, organizador y quién compitió.
  const jsonLdWinner = rowsComplete ? rows[0] : undefined;
  const jsonLdDescription = `${series.name} en ${event.circuit.city}: horarios en hora argentina, dónde verlo y resultados de cada sesión${jsonLdWinner ? `. Ganó ${jsonLdWinner.driver}${provisionalSuffix(latest)}` : ""}.`;
  const jsonLd = sportsEventJsonLd(event, series, jsonLdDescription, now);

  const where = (
          <aside className="broadcast">
            <h3>Dónde verlo</h3>
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
  );

  const schedule = (
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
                            <strong>
                              {claseDe(s) && <ClassSeal clase={claseDe(s)!} />}
                              {nombreVisibleSesion(s, event.sessions)}
                            </strong>
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
                              {status === "done" && (top ? <a href={`#${s.id}`}>Terminó · ver resultados</a> : `Terminó · ${noResultsReason(s, event.seriesId, season.failures, now)?.toLowerCase() ?? "sin resultados cargados"}`)}
                            </span>
                            {s.videos && s.videos.length > 0 && (
                              <span className="session-videos">
                                {s.videos.map((v) => {
                                  // El resumen se ve en esta misma página (más abajo, en la sesión): el enlace es un ancla, no youtube.com.
                                  const aca = v.kind === "highlights" && withResultsIds.has(s.id);
                                  return aca ? (
                                    <a key={v.id} href={`#${s.id}`}>
                                      <span aria-hidden="true">▶</span> Resumen
                                      {v.label ? ` · ${v.label}` : ""}
                                    </a>
                                  ) : (
                                    <a key={v.id} href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer">
                                      <span aria-hidden="true">▶</span> {v.kind === "live" ? (status === "done" ? "Ver la sesión" : "Ver en vivo") : "Resumen"}
                                      {v.label ? ` · ${v.label}` : ""}
                                    </a>
                                  );
                                })}
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
  );

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
          <ResultadoCarrera carrera={momento.fecha?.carrera} />
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

      <Momento evento data={momento} now={now} simulated={isSimulatedNow()} broadcasts={[]} tiemposUrl={timingUrl} />
      {(momento.modo === "en-pista" || momento.modo === "finde") && <AutoRefresh everyMs={60_000} />}

      {finalesPorClase.length > 0 && (
        <section className="section-block">
          <SectionTitle title="Finales por clase" />
          <ul className="clase-ganadores">
            {finalesPorClase.map(({ c, finales }) => (
              <li key={c.id} style={{ "--cat": c.color } as CSSProperties}>
                <Link href={`/categorias/${series.id}/${c.id}`} className="list-link">
                  <span>
                    <ClassSeal clase={c} />
                    <strong>{c.name}</strong>
                  </span>
                  {finales.map((f) => (
                    <small key={f.id}>
                      {finales.length > 1 ? `${f.name.replace(` ${c.short}`, "")}: ` : ""}1.º {f.results![0].driver}
                    </small>
                  ))}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Con resultados, el último resultado y dónde verlo van antes que el cronograma; sin ellos, el cronograma manda. */}
      {latest && rows.length > 0 && (
        <section className="classification-wrap" id="resultados">
          <div className="section-block">
            <SectionTitle title={nombreVisibleSesion(latest, event.sessions)} inverse>
              <time dateTime={latest.start}>{fmtDayShort(latest.start)}</time>
            </SectionTitle>
            <ArgentinosLinea rows={argentinosDe(latest)} />
            <div id={latest.id}>
              {latestResumen && (
                <VideoSesion
                  videoId={latestResumen.id}
                  title={`Resumen · ${nombreVisibleSesion(latest, event.sessions)}${latestResumen.label ? ` · ${latestResumen.label}` : ""}`}
                  ariaLabel={`Ver el resumen de ${nombreVisibleSesion(latest, event.sessions)} en YouTube`}
                  liveUrl={latestTransmision ? `https://www.youtube.com/watch?v=${latestTransmision.id}` : undefined}
                />
              )}
              <div className="session-result">
                <div className="pole">
                  <span>{rows[0].positionText ?? rows[0].pos}</span>
                  <div>
                    <p>{rowsComplete ? (isRace ? `Ganador${provisionalSuffix(latest)}` : "Mejor tiempo") : "Mejor resultado disponible"}</p>
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
              <ResultsStatus session={latest} now={now} tone="dark" />
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

          </div>
        </section>
      )}

      <section className={`event-grid section-block${latest ? " where-first" : ""}`}>
        {latest ? (
          <>
            {where}
            {schedule}
          </>
        ) : (
          <>
            {schedule}
            {where}
          </>
        )}
      </section>

      {/* Una sola banda oscura por página: la del último resultado, arriba. Las sesiones anteriores van sobre fondo claro. */}
      {earlier.length > 0 && (
        <section className="earlier-wrap">
          <div className="section-block">
              <div className="earlier-sessions">
                  <h3>Sesiones anteriores</h3>
                  {earlier.map((s) => {
                    const resumen = resumenDe(s);
                    const transmision = transmisionDe(s);
                    return (
                      <details key={s.id} id={s.id} className="full-results">
                        <summary>
                          <strong>
                            {claseDe(s) && <ClassSeal clase={claseDe(s)!} />}
                            {nombreVisibleSesion(s, event.sessions)}
                          </strong>{" "}
                          · {fmtDayShort(s.start)} · 1.º {s.results![0].driver}
                          {provisionalSuffix(s)}
                          <span>{s.results!.length === 1 ? "Solo el 1.º" : `${s.results!.length} pilotos`}</span>
                          <ArgentinosLinea rows={argentinosDe(s)} small />
                        </summary>
                        {resumen && (
                          <VideoSesion
                            videoId={resumen.id}
                            title={`Resumen · ${nombreVisibleSesion(s, event.sessions)}${resumen.label ? ` · ${resumen.label}` : ""}`}
                            ariaLabel={`Ver el resumen de ${nombreVisibleSesion(s, event.sessions)} en YouTube`}
                            liveUrl={transmision ? `https://www.youtube.com/watch?v=${transmision.id}` : undefined}
                          />
                        )}
                        <Ranking rows={s.results!} />
                        <ResultsStatus session={s} now={now} />
                        <SourceLink session={s} />
                      </details>
                    );
                  })}
              </div>
          </div>
        </section>
      )}

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
                  <strong>{winner ? `${nombreVisibleSesion(finished!, e.sessions)}: ganó ${winner.driver}${provisionalSuffix(finished)}` : finished ? `${nombreVisibleSesion(finished, e.sessions)}: terminó` : `Fecha ${e.round}`}</strong>
                  <time dateTime={e.sessions.at(-1)!.start}>
                    {fmtDayShort(e.sessions.at(-1)!.start)} · {e.sessions.length} {e.sessions.length === 1 ? "sesión" : "sesiones"}
                  </time>
                </Link>
              );
            })}
          </div>
        </section>
      )}

    </>
  );
}
