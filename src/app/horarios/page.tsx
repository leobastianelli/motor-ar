import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { CategoryLabel, SectionTitle } from "@/components/pista";
import { getAllDrivers, getAllSeries, getNow, getSeason, getSeries } from "@/lib/data";
import { fmtDayShort, fmtTime } from "@/lib/format";
import { horarioSeriesSlug } from "@/lib/horarios";

// Los datos nuevos la invalidan por evento; por tiempo sólo cambia cuál es la próxima sesión de cada categoría (a lo sumo 1 hora de atraso). Sin estados "en vivo": esos van en la página de cada categoría.
export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Horarios de automovilismo en hora argentina",
  description: "A qué hora corren la Fórmula 1, el Turismo Carretera, el TN y los pilotos argentinos, y dónde verlos. Siempre en hora argentina.",
  alternates: { canonical: "/horarios" },
};

export default async function HorariosPage() {
  const now = getNow();
  const season = await getSeason();
  const next = (seriesId: string) => {
    const event = season.getEventsForSeries(seriesId).find((e) => season.getNextSession(e, now));
    const session = event && season.getNextSession(event, now);
    return event && session ? `${event.circuit.city} · ${fmtDayShort(session.start)}${session.timeKnown === false ? "" : ` ${fmtTime(session.start)}`}` : "Sin fechas próximas cargadas";
  };

  return (
    <>
      <section className="weekend-head">
        <h1>Horarios</h1>
        <p className="lede">
          <span>A qué hora corre cada categoría y cada argentino, en hora argentina</span>
        </p>
      </section>

      <section className="section-block">
        <SectionTitle title="Por categoría" />
        <div className="date-strip">
          {getAllSeries()
            .filter((s) => s.scope !== "zonal")
            .map((s) => (
              <Link key={s.id} href={`/horarios/${horarioSeriesSlug(s.id)}`} className="next-card list-link" style={{ "--cat": s.color } as CSSProperties}>
                <CategoryLabel series={s} />
                <strong>Horario de {s.name}</strong>
                <time>{next(s.id)}</time>
              </Link>
            ))}
        </div>
      </section>

      <section className="section-block">
        <SectionTitle title="Por piloto" />
        <div className="date-strip">
          {getAllDrivers().map((d) => {
            const s = getSeries(d.seriesId)!;
            return (
              <Link key={d.slug} href={`/horarios/${d.slug}`} className="next-card list-link" style={{ "--cat": s.color } as CSSProperties}>
                <CategoryLabel series={s} />
                <strong>A qué hora corre {d.name}</strong>
                <time>{next(d.seriesId)}</time>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
