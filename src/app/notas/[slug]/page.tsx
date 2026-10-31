import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { breadcrumb, JsonLd } from "@/components/json-ld";
import { LinkedText, noteDate } from "@/components/notas";
import { NotaRelacionados } from "@/components/en-vivo";
import { SectionTitle } from "@/components/pista";
import { notas } from "@/data/notas";
import { getDriver, getIndexedDriver, getNow, getSeason, getSeries, isSimulatedNow, seriesParaElNavegador } from "@/lib/data";
import { getNote, related } from "@/lib/notas";
import { OG_DEFAULTS } from "@/lib/site";
import { fechasDeCategoria, fechasDeLosPilotos } from "@/lib/snapshot.mjs";

// El estado de los pilotos y la próxima fecha de cada categoría (el costado "En Fierros") se calculan en el navegador con la hora real: la
// regeneración por tiempo puede ser lenta. Los datos nuevos invalidan la página por evento (/api/refresh).
export const revalidate = 21600;

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

  const curados = links.drivers.flatMap((slug) => {
    const d = getDriver(slug);
    return d && getSeries(d.seriesId) ? [d] : [];
  });
  const drivers = links.drivers.flatMap((slug) => {
    const curated = getDriver(slug);
    if (curated) return getSeries(curated.seriesId) ? [{ slug, name: curated.name, ficha: { seriesId: curated.seriesId, team: curated.team } }] : [];
    const indexed = getIndexedDriver(slug);
    return indexed ? [{ slug, name: indexed.name }] : [];
  });
  const seriesList = links.series.flatMap((id) => (getSeries(id) ? [{ id, events: fechasDeCategoria(season.getEventsForSeries(id), now, { pasadas: 0 }) }] : []));
  // Todas las categorías: las fechas de un piloto pueden ser de otra (Canapino corre el TC y el TN).
  const { seriesById, tiers } = seriesParaElNavegador();
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
            <SectionTitle title="En Fierros" />
            <NotaRelacionados
              pilotos={drivers}
              categorias={seriesList}
              eventosPilotos={fechasDeLosPilotos(season.getAllEvents(), now, curados)}
              seriesById={seriesById}
              tiers={tiers}
              serverNow={now}
              simulated={isSimulatedNow()}
            >
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
            </NotaRelacionados>
          </aside>
        </div>
      </article>
    </>
  );
}
