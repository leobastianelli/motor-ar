import type { Metadata } from "next";
import Link from "next/link";
import { Code, SectionTitle, StateTag } from "@/components/pista";
import { getAllSeries, getNow, getSeason } from "@/lib/data";
import { fmtDayNum, fmtMonthShort } from "@/lib/format";
import type { Scope } from "@/lib/types";

export const metadata: Metadata = { title: "Categorías" };
export const revalidate = 60;

const GROUPS: { scope: Scope; title: string }[] = [
  { scope: "nacional", title: "Nacionales" },
  { scope: "internacional", title: "Internacionales" },
  { scope: "zonal", title: "Zonales" },
];

export default async function CategoriesPage() {
  const now = getNow();
  const season = await getSeason();
  const all = getAllSeries();
  return (
    <>
      <section className="weekend-head">
        <div>
          <h1>Categorías</h1>
        </div>
        <p className="lede">Nacionales, internacionales y zonales. Cada una con su código y su color, sin logos oficiales.</p>
      </section>
      {GROUPS.map((g) => (
        <section key={g.scope} className="section-block">
          <SectionTitle title={g.title} />
          <div className="schedule">
            {all
              .filter((s) => s.scope === g.scope)
              .map((s) => {
                const next = season.getEventsForSeries(s.id).find((e) => season.getNextSession(e, now));
                const date = next?.sessions.at(-1)!.start;
                return (
                  <Link key={s.id} href={`/categorias/${s.id}`} className="schedule-row list-link">
                    <time>{s.founded ?? "—"}</time>
                    <Code series={s} />
                    <div>
                      <strong>{s.name}</strong>
                      <span>{s.org}</span>
                    </div>
                    <b className="channel">{next ? next.circuit.city : "Sin fechas cargadas"}</b>
                    {date ? (
                      <StateTag kind="upcoming">
                        {fmtDayNum(date)} {fmtMonthShort(date)}
                      </StateTag>
                    ) : (
                      <StateTag kind="no-data">Sin datos</StateTag>
                    )}
                  </Link>
                );
              })}
          </div>
        </section>
      ))}
    </>
  );
}
