import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { DriverDirectory, type DirectoryEntry } from "@/components/driver-directory";
import { CategoryLabel, SectionTitle, StateTag } from "@/components/pista";
import { getAllDrivers, getAllSeries, getIndexedDrivers, getNow, getSeason, getSeries } from "@/lib/data";

export const metadata: Metadata = {
  title: "Pilotos argentinos",
  description: "Todos los pilotos argentinos con resultados en 2026: Colapinto, Varrone, Canapino y los de TC, TC Pista, TN, Mouras y Pick Up, con su temporada fecha por fecha.",
};
export const revalidate = 60;

export default async function DriversPage() {
  const now = getNow();
  const season = await getSeason();
  const featured = getAllDrivers();

  // Categoría principal de cada piloto: donde más carreras corrió.
  const entries: DirectoryEntry[] = getIndexedDrivers().flatMap((d) => {
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
        <div className="runner-cards">
          {featured.map((d) => {
            const series = getSeries(d.seriesId)!;
            const status = season.getRunnerStatus(d, now);
            const standing = season.getStandingPosition(d);
            return (
              <Link key={d.slug} href={`/pilotos/${d.slug}`} className="runner-card list-link" style={{ "--cat": series.color } as CSSProperties}>
                <CategoryLabel series={series} detail={d.team} />
                <strong className="runner-name">
                  {d.name}
                  {d.number && <span>#{d.number}</span>}
                </strong>
                <p className="runner-status">
                  <StateTag kind={status.state}>{status.stateLabel}</StateTag>
                  <b>{status.headline}</b>
                </p>
                <p className="runner-meta">
                  {[status.detail, standing && `${standing.position}.º en el campeonato · ${standing.points} pts`].filter(Boolean).join(" · ")}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section-block">
        <SectionTitle title="Todos los pilotos" />
        <DriverDirectory entries={entries} groups={groups} />
      </section>
    </>
  );
}
