import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { CategoryLabel, SectionTitle } from "@/components/pista";
import { getAllSeries, getNow, getSeason } from "@/lib/data";
import { fmtDayShort, fmtMonthShort } from "@/lib/format";
import type { Scope } from "@/lib/types";

export const metadata: Metadata = {
  title: "Categorías",
  description: "Categorías nacionales, internacionales y zonales: próximas fechas, campeonatos e historia.",
  alternates: { canonical: "/categorias" },
};
// Los datos nuevos la invalidan por evento; por tiempo sólo cambia cuál es la "próxima" fecha de cada categoría (una recién terminada tarda a lo sumo 15 min en cambiar).
export const revalidate = 900;

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
        <h1>Categorías</h1>
        <p className="lede">Nacionales, internacionales y zonales.</p>
      </section>
      {GROUPS.map((g) => (
        <section key={g.scope} className="section-block">
          <SectionTitle title={g.title} />
          <div className="date-strip">
            {all
              .filter((s) => s.scope === g.scope)
              .map((s) => {
                const next = season.getEventsForSeries(s.id).find((e) => season.getNextSession(e, now));
                const date = next?.sessions.at(-1)!.start;
                return (
                  <Link key={s.id} href={`/categorias/${s.id}`} className="next-card list-link" style={{ "--cat": s.color } as CSSProperties}>
                    <CategoryLabel series={s} detail={s.founded ? `desde ${s.founded}` : undefined} />
                    <strong>{next ? `Próxima: ${next.circuit.city}` : "Sin fechas cargadas"}</strong>
                    {date ? (
                      <time dateTime={date}>
                        {fmtDayShort(date)} {fmtMonthShort(date)} · {s.org}
                      </time>
                    ) : (
                      <time>{s.org}</time>
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
