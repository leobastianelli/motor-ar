import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { breadcrumb, JsonLd } from "@/components/json-ld";
import { LinkedText, noteDate } from "@/components/notas";
import { CategoryLabel, StateTag } from "@/components/pista";
import { notas } from "@/data/notas";
import { getDriver, getIndexedDriver, getNow, getSeason, getSeries } from "@/lib/data";
import { getNote, related } from "@/lib/notas";
import type { StateKind } from "@/lib/format";
import { OG_DEFAULTS } from "@/lib/site";
import type { Series } from "@/lib/types";

type DriverRow = { slug: string; name: string; series?: Series; headline: string; state?: StateKind };

export const revalidate = 60;

export function generateStaticParams() {
  return notas.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata(props: PageProps<"/notas/[slug]">): Promise<Metadata> {
  const nota = await getNote((await props.params).slug);
  if (!nota) return { title: "Nota" };
  const title = nota.seoTitle ?? nota.title;
  return {
    title,
    description: nota.summary,
    openGraph: { title, description: nota.summary, type: "article", ...OG_DEFAULTS },
    alternates: { canonical: `/notas/${nota.slug}` },
  };
}

export default async function NotaPage(props: PageProps<"/notas/[slug]">) {
  const nota = await getNote((await props.params).slug);
  if (!nota) notFound();
  const now = getNow();
  const season = await getSeason();
  const links = related(nota);

  const drivers = links.drivers.flatMap((slug): DriverRow[] => {
    const curated = getDriver(slug);
    if (curated) {
      const series = getSeries(curated.seriesId);
      const status = season.getRunnerStatus(curated, now);
      return series ? [{ slug, name: curated.name, series, headline: `${status.stateLabel}: ${status.headline}`, state: status.state }] : [];
    }
    const indexed = getIndexedDriver(slug);
    return indexed ? [{ slug, name: indexed.name, headline: "" }] : [];
  });
  const seriesList = links.series.flatMap((id) => {
    const series = getSeries(id);
    if (!series) return [];
    const next = season.getEventsForSeries(id).find((e) => season.getNextSession(e, now));
    return [{ series, next }];
  });
  const events = links.events.flatMap((id) => {
    const event = season.getEvent(id);
    return event ? [event] : [];
  });

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              headline: nota.title,
              datePublished: nota.publishedAt,
              inLanguage: "es-AR",
              description: nota.summary,
              publisher: { "@type": "Organization", name: "Fierros" },
              ...(nota.auto ? {} : { isBasedOn: { "@type": "NewsArticle", headline: nota.source.headline, url: nota.source.url, publisher: { "@type": "Organization", name: nota.source.medio } } }),
            },
            breadcrumb([
              ["Inicio", "/"],
              ["Notas", "/notas"],
              [nota.title, `/notas/${nota.slug}`],
            ]),
          ],
        }}
      />
      <article className="section-block nota-page">
        <header className="nota-head">
          <p className="nota-meta">
            <Link href="/notas">Notas</Link>
            <b>{nota.source.medio}</b>
            <time dateTime={nota.publishedAt}>{noteDate(nota)}</time>
          </p>
          <h1>{nota.title}</h1>
        </header>

        <div className="nota-body">
          <div className="nota-main">
            <p className="nota-lead">
              <LinkedText text={nota.summary} />
            </p>
            {nota.details?.map((p, i) => (
              <p key={i} className="nota-detail">
                <LinkedText text={p} />
              </p>
            ))}
            {nota.quote && (
              <blockquote className="nota-quote">
                <p>“{nota.quote}”</p>
                <footer>{nota.source.medio}</footer>
              </blockquote>
            )}
            {nota.auto ? (
              <div className="nota-source">
                <span>Fuente</span>
                <strong>Resultados oficiales de la fecha</strong>
                <small>{nota.auto.sources.length ? nota.auto.sources.join(" · ") : "Fuentes oficiales de la categoría"}</small>
                <Link href={nota.source.url} className="nota-cta">
                  Ver todos los resultados de {nota.source.headline} <span aria-hidden="true">→</span>
                </Link>
                <p>Crónica automática de Fierros: se arma sola con los resultados apenas se publican y se actualiza con cada sesión.</p>
              </div>
            ) : (
            <div className="nota-source">
              <span>Fuente</span>
              <strong>{nota.source.headline}</strong>
              <small>
                {nota.source.medio}
                {nota.source.author ? ` · ${nota.source.author}` : ""} · {noteDate(nota)}
              </small>
              <a href={nota.source.url} target="_blank" rel="noopener noreferrer" className="nota-cta">
                Leer la nota completa en {nota.source.medio} <span aria-hidden="true">↗</span>
              </a>
              <p>Este es un resumen propio de Fierros. El texto completo y sus derechos son del medio.</p>
            </div>
            )}
          </div>

          <aside className="nota-related" aria-label="En Fierros">
            <h2>En Fierros</h2>
            {drivers.length > 0 && (
              <section>
                <h3>Pilotos</h3>
                {drivers.map((d) => (
                  <Link key={d.slug} href={`/pilotos/${d.slug}`} className="nota-rel list-link" style={d.series ? ({ "--cat": d.series.color } as CSSProperties) : undefined}>
                    <strong>{d.name}</strong>
                    {d.series && <CategoryLabel series={d.series} />}
                    {d.state && (
                      <span className="nota-rel-status">
                        <StateTag kind={d.state}>{d.headline.split(":")[0]}</StateTag> {d.headline.split(": ").slice(1).join(": ")}
                      </span>
                    )}
                  </Link>
                ))}
              </section>
            )}
            {seriesList.length > 0 && (
              <section>
                <h3>Categorías</h3>
                {seriesList.map(({ series, next }) => (
                  <Link key={series.id} href={`/categorias/${series.id}`} className="nota-rel list-link">
                    <CategoryLabel series={series} />
                    <span className="nota-rel-status">{next ? `Próxima: ${next.name}` : "Sin fechas próximas cargadas"}</span>
                  </Link>
                ))}
              </section>
            )}
            {events.length > 0 && (
              <section>
                <h3>Fechas</h3>
                {events.map((e) => (
                  <Link key={e.id} href={`/eventos/${e.id}`} className="nota-rel list-link">
                    <strong>{e.name}</strong>
                    <span className="nota-rel-status">{getSeries(e.seriesId)?.name}</span>
                  </Link>
                ))}
              </section>
            )}
          </aside>
        </div>
      </article>
    </>
  );
}
