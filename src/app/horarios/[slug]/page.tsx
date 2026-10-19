import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { breadcrumb, JsonLd, sportsEventJsonLd } from "@/components/json-ld";
import { HorarioProxima, HorarioRespuesta } from "@/components/en-vivo";
import { CategoryLabel, SectionTitle } from "@/components/pista";
import { getDriver, getNow, getSeason, getSeries, isSimulatedNow, seriesParaElNavegador, type Season } from "@/lib/data";
import { fmtDayShort, fmtRange, fmtTime, raceWinner, sessionStatus } from "@/lib/format";
import { provisionalSuffix } from "@/lib/provisorio.mjs";
import { fechasDeCategoria } from "@/lib/snapshot.mjs";
import { driverKey } from "@/lib/sources/driver-index.mjs";
import { allHorarioSlugs, horarioSeriesSlug, resolveHorario } from "@/lib/horarios";
import { OG_DEFAULTS } from "@/lib/site";
import { descripcionHorario, tituloHorario } from "@/lib/seo-titulos.mjs";

// La respuesta de arriba ("la próxima sesión es…") y el cronograma con el estado de cada sesión se calculan en el navegador con la hora real:
// la regeneración por tiempo puede ser lenta. Los datos nuevos invalidan la página por evento (/api/refresh). El título, la descripción y los
// datos estructurados para buscadores salen de la próxima sesión a la hora de la última regeneración: pueden tener hasta 15 minutos de atraso.
export const revalidate = 900;

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
  const fallback = series.scope === "internacional" ? `Horarios de ${series.name} en hora argentina y dónde verlo.` : `Horarios de ${series.name}: calendario, sesiones y dónde verlo.`;
  let title: string;
  let description: string;
  if (driver) {
    title = `A qué hora corre ${driver.name}: horario y dónde verlo`;
    description = next && nextSession
      ? `${driver.name} corre en ${series.name}. Próxima fecha: ${next.name}, ${fmtRange(next.sessions[0].start, next.sessions.at(-1)!.start)}. ${nextSession.name} el ${when(nextSession)}. Todas las sesiones y dónde verlo.`
      : fallback;
  } else {
    // Título y descripción de la categoría salen del momento (src/lib/seo-titulos.mjs), igual que /categorias.
    const momento = data.season.getMomentoCategoria(series.id, data.now);
    const fecha = momento.fecha ? data.season.getEvent(momento.fecha.id) : undefined;
    title = tituloHorario(series, momento);
    description = descripcionHorario(series, momento, { broadcasts: fecha?.broadcasts, fallback });
  }
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
  // Las sesiones ya corridas dicen cómo le fue al piloto, no sólo "Terminó".
  const keys = driver ? [driver.name, ...(driver.aliases ?? [])].map((n) => driverKey(n)) : undefined;
  // La próxima fecha y su cronograma se calculan en el navegador sobre este recorte de la categoría (src/lib/snapshot.mjs).
  const events = fechasDeCategoria(season.getEventsForSeries(series.id), now, { keys: keys && new Set(keys), pasadas: 0 });
  const { seriesById, tiers } = seriesParaElNavegador([series.id]);
  const simulated = isSimulatedNow();

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
            ...(next ? [sportsEventJsonLd(next, series, answer, now)] : []),
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
          <CategoryLabel series={series} detail={driver ? driver.team : series.org} href={`/categorias/${series.id}`} />
          <h1>{title}</h1>
          <HorarioRespuesta events={events} serie={{ id: series.id, name: series.name }} piloto={driver?.name} seriesById={seriesById} tiers={tiers} serverNow={now} simulated={simulated} />
        </div>
      </section>

      <HorarioProxima events={events} keys={keys} seriesById={seriesById} tiers={tiers} serverNow={now} simulated={simulated} />

      <section className="section-block">
        <SectionTitle title={driver ? "Cómo viene" : "Última fecha"} />
        <div className="date-strip">
          {last && lastRace?.results?.[0] && (
            <Link href={`/eventos/${last.id}`} className="next-card list-link" style={{ "--cat": series.color } as CSSProperties}>
              <CategoryLabel series={series} detail={last.circuit.city} />
              <strong>{driverRow ? `${driver!.name} terminó ${driverRow.pos}.º${provisionalSuffix(lastRace)}` : lastWinner ? `Ganó ${lastWinner.driver}${provisionalSuffix(lastRace)}` : "Terminó"}</strong>
              <time>
                {lastRace.name} · {fmtDayShort(lastRace.start)}
              </time>
            </Link>
          )}
          {standing && (
            <Link href={`/pilotos/${driver!.slug}`} className="next-card list-link" style={{ "--cat": series.color } as CSSProperties}>
              <CategoryLabel series={series} />
              <strong>
                {standing.position}.º en {standing.clase ? `la ${standing.clase}` : "el campeonato"} · {standing.points} pts
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
