import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle, StateTag } from "@/components/pista";
import { getAllDrivers, getDriversAbroad, getNow, getRunnerStatus, getSeries } from "@/lib/data";

export const metadata: Metadata = { title: "Pilotos argentinos" };
export const revalidate = 60;

export default function DriversPage() {
  const now = getNow();
  const abroad = getDriversAbroad();
  const home = getAllDrivers().filter((d) => !abroad.includes(d));

  const list = (drivers: typeof abroad) => (
    <div className="arg-runners" style={{ display: "block" }}>
      {drivers.map((d) => {
        const series = getSeries(d.seriesId)!;
        const status = getRunnerStatus(d, now);
        return (
          <Link key={d.slug} href={`/pilotos/${d.slug}`} className="runner-line list-link">
            <b>{d.number ?? "—"}</b>
            <div>
              <strong>{d.name}</strong>
              <span>
                {series.name} · {d.team}
              </span>
            </div>
            <p>
              <StateTag kind={status.state}>{status.stateLabel}</StateTag> {status.headline}
            </p>
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      <section className="weekend-head">
        <div>
          <h1>Pilotos</h1>
        </div>
        <p className="lede">Los argentinos que corren hoy, afuera y en el país, con su estado del fin de semana.</p>
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
