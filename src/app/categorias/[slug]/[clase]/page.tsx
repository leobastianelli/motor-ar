import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { CampeonatoClase } from "@/components/campeonato-clase";
import { breadcrumb, JsonLd } from "@/components/json-ld";
import { ClassSeal, SectionTitle } from "@/components/pista";
import { getAllSeries, getSeason, getSeries } from "@/lib/data";
import { fmtDayNum, fmtMonthShort, fmtRange } from "@/lib/format";
import { OG_DEFAULTS } from "@/lib/site";

export const revalidate = 60;

/** Una página por clase de cada categoría con clases: /categorias/cordoba-pista/tc4000. El id de la clase sólo vale dentro de su categoría. */
export function generateStaticParams() {
  return getAllSeries().flatMap((s) => (s.classes ?? []).map((c) => ({ slug: s.id, clase: c.id })));
}

const find = (slug: string, clase: string) => {
  const series = getSeries(slug);
  const cls = series?.classes?.find((c) => c.id === clase);
  return series && cls ? { series, cls } : undefined;
};

export async function generateMetadata(props: PageProps<"/categorias/[slug]/[clase]">): Promise<Metadata> {
  const { slug, clase } = await props.params;
  const found = find(slug, clase);
  if (!found) return { title: "Clase" };
  const { series, cls } = found;
  const standing = (await getSeason()).getClassStanding(series.id, cls.id);
  const leader = standing && standing.status !== "sin-campeonato" ? standing.rows[0] : undefined;
  const title = `${cls.name} en ${series.name} 2026: campeonato y resultados`;
  const description = `${cls.name} de ${series.name}: resultados de cada fecha, horarios en hora argentina y ${leader ? `campeonato ${standing!.status === "oficial" ? "oficial" : "calculado"} (lidera ${leader.driver}, tras la fecha ${standing!.asOfRound})` : "campeonato (todavía sin tabla publicada)"}.`;
  return { title, description, openGraph: { title, description, ...OG_DEFAULTS }, alternates: { canonical: `/categorias/${series.id}/${cls.id}` } };
}

const shortDate = (iso: string) => `${fmtDayNum(iso).padStart(2, "0")} ${fmtMonthShort(iso)}`;

export default async function ClassPage(props: PageProps<"/categorias/[slug]/[clase]">) {
  const { slug, clase } = await props.params;
  const found = find(slug, clase);
  if (!found) notFound();
  const { series, cls } = found;
  const season = await getSeason();
  const standing = season.getClassStanding(series.id, cls.id)!;

  // Las fechas en que corrió la clase, de la última a la primera, con el ganador de cada final.
  const fechas = season
    .getEventsForSeries(series.id)
    .map((event) => ({ event, sessions: event.sessions.filter((s) => s.classId === cls.id) }))
    .filter((f) => f.sessions.length > 0)
    .reverse();
  const conFinales = fechas.filter((f) => f.sessions.some((s) => s.kind === "final" && s.results?.length));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            breadcrumb([
              ["Inicio", "/"],
              ["Categorías", "/categorias"],
              [series.name, `/categorias/${series.id}`],
              [cls.name, `/categorias/${series.id}/${cls.id}`],
            ]),
          ],
        }}
      />
      <section className="section-block" style={{ "--cat": cls.color } as CSSProperties}>
        <p className="kicker">
          <Link href={`/categorias/${series.id}`}>{series.name}</Link> · {series.org}
        </p>
        <div className="clase-head">
          <ClassSeal clase={cls} />
          <h1>{cls.name}</h1>
        </div>
        <p className="lede">
          Clase de {series.name} 2026. Corre en el mismo fin de semana que las demás clases, siempre en hora argentina.
        </p>
      </section>

      <section className="section-block">
        <CampeonatoClase standing={standing} className={cls.name} seriesId={series.id} playOff={series.id === "cordoba-pista" && (cls.id === "tc4000" || cls.id === "tcp4000")} />
      </section>

      <section className="section-block">
        <SectionTitle title={`Resultados · ${cls.name}`} />
        {conFinales.length > 0 ? (
          <ol className="clase-fechas">
            {conFinales.map(({ event, sessions }) => {
              const finales = sessions.filter((s) => s.kind === "final" && s.results?.length);
              return (
                <li key={event.id}>
                  <Link href={`/eventos/${event.id}`} className="list-link">
                    <strong>
                      Fecha {event.round} · {event.circuit.city}
                      <br />
                      <span>{fmtRange(event.sessions[0].start, event.sessions.at(-1)!.start)}</span>
                    </strong>
                    <em>
                      {finales.map((s) => {
                        const top = s.results!.filter((r) => r.pos <= 3 && (!r.positionText || /^\d+$/.test(r.positionText)));
                        return (
                          <span key={s.id}>
                            <b>{finales.length > 1 ? s.name.replace(` ${cls.short}`, "") : "Final"}:</b> {top.map((r) => `${r.pos}.º ${r.driver}`).join(" · ")}
                          </span>
                        );
                      })}
                    </em>
                  </Link>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="empty-state">Todavía no hay resultados de finales de esta clase.</p>
        )}
        <p className="source-note">
          {series.id === "rally-argentino"
            ? "Fuente de los resultados: tiempos oficiales del Rally Argentino (la carrera en curso se publica como provisoria hasta el último día de la fecha). Figuran los pilotos clasificados."
            : "Fuente de los resultados: cronometraje de la FRAD en MyLaps Speedhive (provisorios: no incluyen las penalizaciones de tiempo de los comisarios)."}
        </p>
      </section>

      <section className="section-block">
        <SectionTitle title="Las demás clases" />
        <div className="clase-grid">
          {(series.classes ?? [])
            .filter((c) => c.id !== cls.id)
            .map((c) => (
              <Link key={c.id} href={`/categorias/${series.id}/${c.id}`} className="clase-card list-link" style={{ "--cat": c.color } as CSSProperties}>
                <span className="clase-card-head">
                  <ClassSeal clase={c} />
                  <strong>{c.name}</strong>
                </span>
              </Link>
            ))}
        </div>
        {fechas.length > 0 && (
          <p className="source-note">
            {cls.name} corrió en {fechas.length} {fechas.length === 1 ? "fecha" : "fechas"} de {series.name} hasta ahora (desde el {shortDate(fechas.at(-1)!.event.sessions[0].start).toLowerCase()}).
          </p>
        )}
      </section>
    </>
  );
}
