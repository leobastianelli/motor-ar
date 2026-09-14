import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { CategoryLabel, SectionTitle, StateTag } from "@/components/pista";
import { getAllDrivers, getDriversAbroad, getNow, getSeason, getSeries } from "@/lib/data";

export const metadata: Metadata = { title: "Pilotos argentinos" };
export const revalidate = 60;

export default async function DriversPage() {
  const now = getNow();
  const season = await getSeason();
  const abroad = getDriversAbroad();
  const home = getAllDrivers().filter((d) => !abroad.includes(d));

  // Mismas tarjetas que en la home: categoría bien visible, piloto y qué pasó.
  const list = (drivers: typeof abroad) => (
    <div className="runner-cards">
      {drivers.map((d) => {
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
  );

  return (
    <>
      <section className="weekend-head">
        <h1>Pilotos</h1>
        <p className="lede">Los argentinos que corren hoy, afuera y en el país.</p>
      </section>
      <section className="section-block">
        <SectionTitle title="Los nuestros afuera" />
        {list(abroad)}
      </section>
      <section className="section-block">
        <SectionTitle title="En el país" />
        {list(home)}
      </section>
    </>
  );
}
