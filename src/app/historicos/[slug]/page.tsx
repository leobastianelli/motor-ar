import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Fragment, type CSSProperties } from "react";
import { legendBySlug, legends } from "@/data/legends";
import { surname } from "@/lib/format";

export function generateStaticParams() {
  return legends.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata(props: PageProps<"/historicos/[slug]">): Promise<Metadata> {
  return { title: legendBySlug[(await props.params).slug]?.name ?? "Historia" };
}

const yearOf = (period: string) => period.match(/\d{4}/)?.[0] ?? period.replace(/^Años\s+/, "");

export default async function LegendPage(props: PageProps<"/historicos/[slug]">) {
  const legend = legendBySlug[(await props.params).slug];
  if (!legend) notFound();
  const hasPhoto = legend.slug === "juan-manuel-fangio";

  return (
    <article>
      <header className={`story-hero${hasPhoto ? "" : " no-photo"}`}>
        {hasPhoto && (
          <>
            <Image src="/img/fangio-archive.png" alt="Ilustración provisoria de un piloto en los boxes de un Gran Premio de los años cincuenta" width={1536} height={1024} sizes="100vw" priority />
            <span className="placeholder-tag">Ilustración provisoria · no es una foto de archivo</span>
          </>
        )}
        <div className="story-shade" />
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
