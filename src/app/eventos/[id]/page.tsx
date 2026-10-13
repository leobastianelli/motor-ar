import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ComponentProps, CSSProperties } from "react";
import { breadcrumb, JsonLd, sportsEventJsonLd } from "@/components/json-ld";
import { EventoCuerpo, HermanasDeLaFecha, ResultadoDeLaFecha, type HermanaDeLaFecha, type SesionDeLaFecha } from "@/components/evento-vivo";
import { MomentoFecha } from "@/components/en-vivo";
import { LiveTimingEmbed } from "@/components/live-timing-embed";
import { Argentinos } from "@/components/momento";
import { ResultsStatus } from "@/components/results-status";
import { VideoSesion } from "@/components/video-sesion";
import { CategoryLabel, ClassSeal, SectionTitle } from "@/components/pista";
import { broadcastsBySeries } from "@/data/broadcasts";
import { drivers } from "@/data/drivers";
import { getNow, getSeason, getSeries, isSimulatedNow } from "@/lib/data";
import { nombreVisibleSesion } from "@/lib/momento.mjs";
import { provisionalSuffix } from "@/lib/provisorio.mjs";
import { driverCode, fmtDayShort, fmtRange, raceWinner } from "@/lib/format";
import { descripcionMomento, tituloEvento } from "@/lib/seo-titulos.mjs";
import { OG_DEFAULTS } from "@/lib/site";
import { recortarFecha } from "@/lib/snapshot.mjs";
import { sessionDoneAt } from "@/lib/tiempo.mjs";
import type { Broadcast, ResultRow, Session } from "@/lib/types";

// Lo que depende de la hora (el momento, el cronograma, cuál es "el último resultado" y cuáles las "sesiones anteriores", las otras categorías del
// finde) se decide en el navegador con la hora real (src/components/evento-vivo.tsx): la regeneración por tiempo puede ser lenta. Los datos nuevos
// (resultados, horarios) invalidan la página por evento (/api/refresh). El título, la descripción y los datos estructurados para buscadores salen
// del momento a la hora de la última regeneración: pueden tener hasta 15 minutos de atraso.
export const revalidate = 900;

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
      {/* Aviso de la fuente sobre lo que falta (p. ej. TCR: sólo los que sumaron puntos). */}
      {session.resultsSource.note && <> · {session.resultsSource.note}</>}
    </p>
  );
}

export default async function EventPage(props: PageProps<"/eventos/[id]">) {
  const season = await getSeason();
  const event = season.getEvent((await props.params).id);
  if (!event) notFound();
  const now = getNow();
  const nowMs = Date.parse(now);
  const simulated = isSimulatedNow();
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
  const argentineSlugs = series.scope === "internacional" ? drivers.filter((d) => d.seriesId === series.id).map((d) => d.slug) : [];
  // La fecha con lo mínimo para que el navegador recalcule el momento (src/lib/snapshot.mjs): el podio y los argentinos, no las tablas.
  const eventoCorto = recortarFecha(event, () => true);

  // Qué sesiones con resultados ya terminaron se decide en el navegador (src/components/evento-vivo.tsx): el servidor dibuja las tablas una sola
  // vez y manda las de todas; la del "último resultado" (arriba) sólo para las que pueden llegar a serlo: la actual y las que están en pista con parciales.
  const conResultados = event.sessions.filter((s) => s.results?.length);
  const terminadas = conResultados.filter((s) => sessionDoneAt(s) <= nowMs).reverse();
  const latest = terminadas[0];
  // El resumen de estas sesiones se ve más abajo, en esta misma página (por eso el enlace del cronograma es un ancla y no youtube.com).
  const resumenDe = (s: Session) => s.videos?.find((v) => v.kind === "highlights");
  const transmisionDe = (s: Session) => s.videos?.find((v) => v.kind === "live");
  const rows = latest?.results ?? [];
  const rowsComplete = rows.length > 0 && rows[0].pos === 1;
  const streamUrl = event.broadcasts.find((b) => b.url && b.kind !== "timing")?.url;
  const timingUrl = event.broadcasts.find((b) => b.kind === "timing")?.url;
  const broadcastSource = broadcastsBySeries[event.seriesId]?.source;
  const timesUnknown = event.sessions.some((s) => s.timeKnown === false);
  const scheduleSources = [...new Map(event.sessions.flatMap((s) => s.timeSources ?? []).map((x) => [x.url, x])).values()];

  // Datos estructurados para buscadores: evento deportivo con lugar, fechas, organizador y quién compitió.
  const jsonLdWinner = rowsComplete ? rows[0] : undefined;
  const jsonLdDescription = `${series.name} en ${event.circuit.city}: horarios en hora argentina, dónde verlo y resultados de cada sesión${jsonLdWinner ? `. Ganó ${jsonLdWinner.driver}${provisionalSuffix(latest)}` : ""}.`;
  const jsonLd = sportsEventJsonLd(event, series, jsonLdDescription, now);

  /** El último resultado, sobre la banda oscura: ganador, podio y clasificación completa. */
  const heroDe = (s: Session) => {
    const rs = s.results ?? [];
    const isRace = RACE_KINDS.includes(s.kind);
    const complete = rs.length > 0 && rs[0].pos === 1;
    const resumen = resumenDe(s);
    const transmision = transmisionDe(s);
    return (
      <section className="classification-wrap" id="resultados">
        <div className="section-block">
          <SectionTitle title={nombreVisibleSesion(s, event.sessions)} inverse>
            <time dateTime={s.start}>{fmtDayShort(s.start)}</time>
          </SectionTitle>
          <ArgentinosLinea rows={argentinosDe(s)} />
          <div id={s.id}>
            {resumen && (
              <VideoSesion
                videoId={resumen.id}
                title={`Resumen · ${nombreVisibleSesion(s, event.sessions)}${resumen.label ? ` · ${resumen.label}` : ""}`}
                ariaLabel={`Ver el resumen de ${nombreVisibleSesion(s, event.sessions)} en YouTube`}
                liveUrl={transmision ? `https://www.youtube.com/watch?v=${transmision.id}` : undefined}
              />
            )}
            <div className="session-result">
              <div className="pole">
                <span>{rs[0].positionText ?? rs[0].pos}</span>
                <div>
                  <p>{complete ? (isRace ? `Ganador${provisionalSuffix(s)}` : "Mejor tiempo") : "Mejor resultado disponible"}</p>
                  <h3>{rs[0].driver}</h3>
                  <b>{rs[0].gap || rs[0].team}</b>
                </div>
              </div>
              <ol className="podium compact">
                {rs.slice(1, 3).map((r) => (
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
            <ResultsStatus session={s} now={now} tone="dark" />
          </div>
          {!complete && <p className="empty-state">La fuente no publicó la clasificación completa de esta sesión: se muestran sólo las posiciones que informó.</p>}
          {rs.length > 3 && (
            <details className="full-results" open>
              <summary>
                Clasificación completa <span>{rs.length} pilotos</span>
              </summary>
              <Ranking rows={rs.slice(3)} />
            </details>
          )}
          <SourceLink session={s} />
        </div>
      </section>
    );
  };

  /** Una sesión anterior, plegada, sobre fondo claro. */
  const anteriorDe = (s: Session) => {
    const resumen = resumenDe(s);
    const transmision = transmisionDe(s);
    return (
      <details id={s.id} className="full-results">
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
  };
  const heroes = Object.fromEntries(conResultados.filter((s) => s === latest || sessionDoneAt(s) > nowMs).map((s) => [s.id, heroDe(s)]));
  const anteriores = Object.fromEntries(conResultados.map((s) => [s.id, anteriorDe(s)]));

  const sesiones: SesionDeLaFecha[] = event.sessions.map((s) => {
    const winner = raceWinner(s.results);
    // El nombre en negrita es el 1.º; si la fuente sólo publicó parte de la tabla y no incluye al 1.º, se muestra la mejor posición conocida
    // en vez de hacer pasar a otro piloto por ganador.
    const top = winner ?? s.results?.[0];
    const clase = claseDe(s);
    return {
      id: s.id,
      name: nombreVisibleSesion(s, event.sessions),
      start: s.start,
      durationMin: s.durationMin,
      timeKnown: s.timeKnown,
      timeStatus: s.timeStatus,
      fuentes: s.timeSources?.map((x) => x.name) ?? [],
      clase: clase && { code: clase.code, color: clase.color, name: clase.name },
      hasResults: Boolean(s.results?.length),
      resultsUnread: s.resultsUnread,
      top: top ? (winner ? top.driver : `${top.positionText ?? `${top.pos}.º`} ${top.driver}`) : undefined,
      videos: s.videos,
      doneAt: sessionDoneAt(s),
    };
  });

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

  const hermanas: HermanaDeLaFecha[] = siblings.map((e) => {
    const s = getSeries(e.seriesId)!;
    const last = e.sessions.at(-1)!;
    return {
      id: e.id,
      series: { code: s.code, color: s.color, name: s.name },
      porDefecto: `Fecha ${e.round}`,
      candidatas: e.sessions
        .filter((x) => x.results?.length)
        .map((x) => {
          const winner = raceWinner(x.results);
          return { doneAt: sessionDoneAt(x), texto: winner ? `${nombreVisibleSesion(x, e.sessions)}: ganó ${winner.driver}${provisionalSuffix(x)}` : `${nombreVisibleSesion(x, e.sessions)}: terminó` };
        }),
      fecha: fmtDayShort(last.start),
      fechaIso: last.start,
      resumen: `${e.sessions.length} ${e.sessions.length === 1 ? "sesión" : "sesiones"}`,
    };
  });

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
          <ResultadoDeLaFecha event={eventoCorto} argentineSlugs={argentineSlugs} failures={season.failures} serverNow={now} simulated={simulated} />
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

      <MomentoFecha event={eventoCorto} argentineSlugs={argentineSlugs} failures={season.failures} tiemposUrl={timingUrl} serverNow={now} simulated={simulated} />

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

      <EventoCuerpo
        sesiones={sesiones}
        seriesId={event.seriesId}
        failures={season.failures}
        heroes={heroes}
        anteriores={anteriores}
        where={where}
        tiempos={
          timingUrl && (
            <section id="tiempos-en-vivo">
              <SectionTitle title="Tiempos en vivo" />
              <LiveTimingEmbed url={timingUrl} />
            </section>
          )
        }
        serverNow={now}
        simulated={simulated}
      />

      {siblings.length > 0 && (
        <section className="section-block siblings">
          <SectionTitle title="Corren el mismo finde" />
          <HermanasDeLaFecha hermanas={hermanas} serverNow={now} simulated={simulated} />
        </section>
      )}
    </>
  );
}
