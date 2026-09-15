import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Fragment, type CSSProperties } from "react";
import { breadcrumb, isoDate, JsonLd } from "@/components/json-ld";
import { PhotoCredit } from "@/components/pista";
import { legendBySlug, legends } from "@/data/legends";
import { getPhoto } from "@/lib/photos";
import { surname } from "@/lib/format";
import { OG_DEFAULTS } from "@/lib/site";

export function generateStaticParams() {
  return legends.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata(props: PageProps<"/historicos/[slug]">): Promise<Metadata> {
  const legend = legendBySlug[(await props.params).slug];
  if (!legend) return { title: "Historia" };
  const description = `${legend.name} (${legend.years}): ${legend.tagline}`;
  return { title: legend.name, description, openGraph: { title: legend.name, description, ...OG_DEFAULTS }, alternates: { canonical: `/historicos/${legend.slug}` } };
}

const yearOf = (period: string) => period.match(/\d{4}/)?.[0] ?? period.replace(/^Años\s+/, "");

export default async function LegendPage(props: PageProps<"/historicos/[slug]">) {
  const legend = legendBySlug[(await props.params).slug];
  if (!legend) notFound();
  const photo = getPhoto(legend.slug);

  const [born, died] = legend.years.split(/\s*[–-]\s*/).map((y) => y.trim());

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Person",
              name: legend.name,
              ...(legend.nickname ? { alternateName: legend.nickname } : {}),
              ...(isoDate(born) ? { birthDate: isoDate(born) } : {}),
              ...(isoDate(died) ? { deathDate: isoDate(died) } : {}),
              birthPlace: { "@type": "Place", name: legend.hometown },
              nationality: { "@type": "Country", name: "Argentina" },
              jobTitle: "Piloto de automovilismo",
              description: legend.tagline,
            },
            breadcrumb([
              ["Inicio", "/"],
              ["Historias", "/historicos"],
              [legend.name, `/historicos/${legend.slug}`],
            ]),
          ],
        }}
      />
      <header className={`story-hero${photo ? "" : " no-photo"}`}>
        {photo && <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} sizes="100vw" priority />}
        <div className="story-shade" />
        {photo && <PhotoCredit photo={photo} />}
        <div className="story-title">
          <p>Historias</p>
          <h1>{surname(legend.name)}</h1>
          <h2>{legend.tagline}</h2>
          <span>
            {legend.name} · {legend.hometown} · {legend.years}
          </span>
        </div>
      </header>

      <nav className="chapter-nav" aria-label="Capítulos">
        {legend.chapters.map((c, i) => (
          <a key={c.title} href={`#capitulo-${i + 1}`} className={i === 0 ? "active" : undefined}>
            <b>{String(i + 1).padStart(2, "0")}</b>
            {c.title}
          </a>
        ))}
      </nav>

      {legend.chapters.map((c, i) => (
        <Fragment key={c.title}>
          <section className="story-chapter" id={`capitulo-${i + 1}`}>
            <aside>
              <b>{yearOf(c.period)}</b>
              <span>{c.period}</span>
            </aside>
            <div className="story-copy">
              <h2>{c.title}</h2>
              <p className={i === 0 ? "dropcap" : undefined}>{c.body}</p>
            </div>
          </section>
          {i === 0 && (
            <section className="story-stats" style={{ "--n": legend.keyStats.length } as CSSProperties}>
              {legend.keyStats.map((s) => (
                <div key={s.label}>
                  <b>{s.value}</b>
                  <span>{s.label}</span>
                </div>
              ))}
            </section>
          )}
        </Fragment>
      ))}
    </article>
  );
}
