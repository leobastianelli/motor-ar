import type { Metadata } from "next";
import { DriverDirectory, type DirectoryEntry } from "@/components/driver-directory";
import { TarjetasDePilotos } from "@/components/en-vivo";
import { SectionTitle } from "@/components/pista";
import { getAllDrivers, getAllSeries, getIndexedDrivers, getNow, getSeason, getSeries, isSimulatedNow, seriesParaElNavegador } from "@/lib/data";
import { fechasDeLosPilotos } from "@/lib/snapshot.mjs";
import { driverKey } from "@/lib/sources/driver-index.mjs";

export const metadata: Metadata = {
  title: "Pilotos argentinos",
  description: "Todos los pilotos argentinos con resultados en 2026: Colapinto, Varrone, Canapino y los de TC, TC Pista, TN, Mouras y Pick Up, con su temporada fecha por fecha.",
  alternates: { canonical: "/pilotos" },
};
// El estado de cada piloto destacado ("En pista", "Próxima", "Final") se calcula en el navegador con la hora real: la regeneración por tiempo puede
// ser lenta. Los datos nuevos invalidan la página por evento (/api/refresh).
export const revalidate = 900;

export default async function DriversPage() {
  const now = getNow();
  const season = await getSeason();
  const featured = getAllDrivers();
  const { seriesById, tiers } = seriesParaElNavegador();

  // Los destacados (fichas completas) van también en la tabla y el buscador: no tiene sentido que sólo
  // aparezcan en las tarjetas de arriba. getIndexedDrivers() ya los excluye (CURATED_KEYS en data.ts), así que
  // no hay duplicados al sumarlos acá.
  const curatedEntries: DirectoryEntry[] = featured.flatMap((d) => {
    const series = getSeries(d.seriesId);
    if (!series) return [];
    const keys = [d.name, ...(d.aliases ?? [])].map(driverKey);
    const stats = season.getDriverSeason({ key: keys[0], keys }).bySeries[d.seriesId];
    const standing = season.getStandingPosition(d);
    return [
      {
        slug: d.slug,
        name: d.name,
        number: d.number !== undefined ? String(d.number) : undefined,
        team: d.team,
        standing: standing ? `${standing.position}.º en el campeonato` : undefined,
        wins: stats?.wins ?? 0,
        races: stats?.races ?? 0,
        series: { id: series.id, name: series.name, code: series.code, color: series.color },
      },
    ];
  });

  // Categoría principal de cada piloto indexado: donde más carreras corrió.
  const indexedEntries: DirectoryEntry[] = getIndexedDrivers().flatMap((d) => {
    const stats = season.getDriverSeason(d);
    const main = [...d.series].sort((a, b) => (stats.bySeries[b]?.races ?? 0) - (stats.bySeries[a]?.races ?? 0))[0];
    const series = getSeries(main);
    if (!series) return [];
    const standing = season.getDriverStanding(main, d.keys ?? [d.key]);
    return [
      {
        slug: d.slug,
        name: d.name,
        number: d.numbers[main],
        team: d.teams[main],
        standing: standing ? `${standing.pos}.º en el campeonato` : undefined,
        wins: stats.bySeries[main]?.wins ?? 0,
        races: stats.bySeries[main]?.races ?? 0,
        series: { id: series.id, name: series.name, code: series.code, color: series.color },
      },
    ];
  });
  const entries: DirectoryEntry[] = [...curatedEntries, ...indexedEntries];
  // Dentro de cada categoría: primero el campeonato, después victorias y nombre.
  const rank = (e: DirectoryEntry) => Number.parseInt(e.standing ?? "", 10) || 999;
  entries.sort((a, b) => rank(a) - rank(b) || b.wins - a.wins || a.name.localeCompare(b.name, "es"));
  const groups = getAllSeries()
    .filter((s) => entries.some((e) => e.series.id === s.id))
    .map((s) => ({ id: s.id, name: s.name, code: s.code, color: s.color }));

  return (
    <>
      <section className="weekend-head">
        <h1>Pilotos</h1>
        <p className="lede">
          <span>{entries.length} pilotos argentinos con resultados en 2026</span>
        </p>
      </section>

      <section className="section-block">
        <SectionTitle title="Destacados" />
        {/* El estado de cada uno ("En pista", "Próxima", "Final") se calcula en el navegador con la hora real. */}
        <TarjetasDePilotos
          pilotos={featured.map((d) => {
            const standing = season.getStandingPosition(d);
            return { slug: d.slug, name: d.name, number: d.number, team: d.team, seriesId: d.seriesId, standing: standing ? `${standing.position}.º en el campeonato · ${standing.points} pts` : undefined };
          })}
          events={fechasDeLosPilotos(season.getAllEvents(), now, featured)}
          seriesById={seriesById}
          tiers={tiers}
          serverNow={now}
          simulated={isSimulatedNow()}
        />
      </section>

      <section className="section-block">
        <SectionTitle title="Todos los pilotos" />
        <DriverDirectory entries={entries} groups={groups} />
      </section>
    </>
  );
}
