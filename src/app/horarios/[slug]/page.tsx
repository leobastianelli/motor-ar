import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { breadcrumb, JsonLd } from "@/components/json-ld";
import { CategoryLabel, SectionTitle, StateTag } from "@/components/pista";
import { getDriver, getNow, getSeason, getSeries, type Season } from "@/lib/data";
import { dayKey, fmtDayShort, fmtRange, fmtTime, fmtWeekday, fmtDayNum, raceWinner, sessionState, sessionStatus, sessionTime } from "@/lib/format";
import { allHorarioSlugs, horarioSeriesSlug, resolveHorario } from "@/lib/horarios";
import { OG_DEFAULTS } from "@/lib/site";
import type { RaceEvent } from "@/lib/types";

export const revalidate = 60;

export function generateStaticParams() {
  return allHorarioSlugs().map((slug) => ({ slug }));
}

/** Próxima fecha con algo pendiente y la última ya corrida. */
function context(season: Season, seriesId: string, now: string) {
  const events = season.getEventsForSeries(seriesId);
  const next = events.find((e) => season.getNextSession(e, now));
  const nextSession = next ? season.getNextSession(next, now) : undefined;
  const last = [...events].reverse().find((e) => e.sessions.some((s) => s.results?.length && sessionStatus(s, now) === "done"));
  return { next, nextSession, last };
}

const when = (s: { start: string; timeKnown?: boolean }) =>
  `${fmtDayShort(s.start).toLowerCase()}${s.timeKnown === false ? ", con horario a confirmar" : ` a las ${fmtTime(s.start)} (hora argentina)`}`;

async function load(slug: string) {
  const target = resolveHorario(slug);
  if (!target) return null;
  const season = await getSeason();
  const now = getNow();
  const series = getSeries(target.seriesId)!;
  const driver = target.kind === "driver" ? getDriver(target.driverSlug) : undefined;
  return { target, season, now, series, driver, ...context(season, series.id, now) };
}

export async function generateMetadata(props: PageProps<"/horarios/[slug]">): Promise<Metadata> {
  const slug = (await props.params).slug;
  const data = await load(slug);
  if (!data) return { title: "Horarios" };
  const { series, driver, next, nextSession } = data;
  const title = driver ? `A qué hora corre ${driver.name}: horario y dónde verlo` : `Horario de ${series.name}: a qué hora es y dónde verlo`;
  const description = next && nextSession
    ? `${driver ? `${driver.name} corre en ${series.name}. ` : ""}Próxima fecha: ${next.name}, ${fmtRange(next.sessions[0].start, next.sessions.at(-1)!.start)}. ${nextSession.name} el ${when(nextSession)}. Todas las sesiones y dónde verlo.`
    : `Horarios de ${series.name} en hora argentina y dónde verlo.`;
  return { title, description, openGraph: { title, description, ...OG_DEFAULTS }, alternates: { canonical: `/horarios/${slug}` } };
}

export default async function HorarioPage(props: PageProps<"/horarios/[slug]">) {
  const slug = (await props.params).slug;
  const data = await load(slug);
  if (!data) notFound();
  const { season, now, series, driver, next, nextSession, last } = data;
  const standing = driver ? season.getStandingPosition(driver) : null;
  const lastRace = last?.sessions.filter((s) => s.results?.length && ["final", "carrera"].includes(s.kind)).at(-1);
  const driverRow = driver && lastRace?.results?.find((r) => r.driverSlug === driver.slug);
  const lastWinner = lastRace && raceWinner(lastRace.results);
  const title = driver ? `A qué hora corre ${driver.name}` : `Horario de ${series.name}`;
  const byDay = next ? Map.groupBy(next.sessions, (s) => dayKey(s.start)) : new Map();

  const answer = next && nextSession
    ? driver
      ? `${driver.name} vuelve a la pista en ${next.name}: la próxima sesión es ${nextSession.name.toLowerCase()} el ${when(nextSession)}.`
      : `La próxima fecha de ${series.name} es ${next.name}. ${nextSession.name} es el ${when(nextSession)}.`
    : `No hay fechas próximas de ${series.name} cargadas por ahora.`;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            ...(next ? [sportsEvent(next, series.name, series.org)] : []),
            breadcrumb([
              ["Inicio", "/"],
              ["Horarios", "/horarios"],
              [title, `/horarios/${slug}`],
            ]),
          ],
        }}
      />
      <section className="weekend-head horario-head" style={{ "--cat": series.color } as CSSProperties}>
        <div>
          <CategoryLabel series={series} detail={driver ? driver.team : series.org} />
          <h1>{title}</h1>
          <p className="horario-answer">{answer}</p>
        </div>
      </section>

      {next && (
        <section className="section-block">
          <SectionTitle title={next.name}>
            <Link href={`/eventos/${next.id}`}>Ver la fecha</Link>
          </SectionTitle>
          <div className="horario-grid">
            <div>
              {[...byDay.entries()].map(([key, sessions]) => (
                <div key={key} className="horario-day">
                  <h3>
                    {fmtWeekday(sessions[0].start)} {fmtDayNum(sessions[0].start)}
                  </h3>
                  <ul>
                    {sessions.map((s: RaceEvent["sessions"][number]) => {
                      const state = sessionState(s, now);
                      return (
                        <li key={s.id}>
                          <time dateTime={s.start}>{sessionTime(s)}</time>
                          <strong>{s.name}</strong>
                          <StateTag kind={state.kind}>{state.label}</StateTag>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <p className="source-note">Horarios de Argentina. {next.sessions.some((s) => s.timeKnown === false) ? "Algunas sesiones todavía no tienen horario oficial." : ""}</p>
            </div>
            <aside className="horario-watch">
              <h3>Dónde verlo</h3>
              {next.broadcasts.length ? (
                <ul>
                  {next.broadcasts.map((b) => (
                    <li key={b.name}>{b.url ? <a href={b.url} target="_blank" rel="noreferrer">{b.name}</a> : b.name}</li>
                  ))}
                </ul>
              ) : (
                <p>Sin transmisión confirmada en Argentina.</p>
              )}
              <p>
                {next.circuit.name} · {next.circuit.city}
                {next.circuit.country && next.circuit.country !== "Argentina" ? `, ${next.circuit.country}` : ""}
              </p>
            </aside>
          </div>
        </section>
      )}

      <section className="section-block">
        <SectionTitle title={driver ? "Cómo viene" : "Última fecha"} />
        <div className="date-strip">
          {last && lastRace?.results?.[0] && (
            <Link href={`/eventos/${last.id}`} className="next-card list-link" style={{ "--cat": series.color } as CSSProperties}>
              <CategoryLabel series={series} detail={last.circuit.city} />
              <strong>{driverRow ? `${driver!.name} terminó ${driverRow.pos}.º` : lastWinner ? `Ganó ${lastWinner.driver}` : "Terminó"}</strong>
              <time>
                {lastRace.name} · {fmtDayShort(lastRace.start)}
              </time>
            </Link>
          )}
          {standing && (
            <Link href={`/pilotos/${driver!.slug}`} className="next-card list-link" style={{ "--cat": series.color } as CSSProperties}>
              <CategoryLabel series={series} />
              <strong>
                {standing.position}.º en el campeonato · {standing.points} pts
              </strong>
              <time>Ver ficha de {driver!.name}</time>
            </Link>
          )}
          <Link href={driver ? `/horarios/${horarioSeriesSlug(series.id)}` : `/categorias/${series.id}`} className="next-card list-link" style={{ "--cat": series.color } as CSSProperties}>
            <CategoryLabel series={series} />
            <strong>{driver ? `Horario de ${series.name}` : `Campeonato e historia de ${series.name}`}</strong>
            <time>{driver ? "Todas las sesiones de la categoría" : "Posiciones, campeones y récords"}</time>
          </Link>
        </div>
      </section>
    </>
  );
}

function sportsEvent(event: RaceEvent, seriesName: string, org: string) {
  // Si el horario todavía no se sabe, sólo se publica la fecha: la hora de relleno (mediodía) no es un dato real.
  const jsonLdDate = (s: RaceEvent["sessions"][number]) => (s.timeKnown === false ? dayKey(s.start) : s.start);
  return {
    "@type": "SportsEvent",
    name: `${seriesName} · ${event.name}`,
    sport: "Automovilismo",
    startDate: jsonLdDate(event.sessions[0]),
    endDate: jsonLdDate(event.sessions.at(-1)!),
    eventStatus: "https://schema.org/EventScheduled",
    location: { "@type": "Place", name: event.circuit.name, address: [event.circuit.city, event.circuit.country].filter(Boolean).join(", ") },
    organizer: { "@type": "Organization", name: org },
  };
}
