import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatGrid } from "@/components/ui";
import { legendBySlug, legends } from "@/data/legends";

export function generateStaticParams() {
  return legends.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata(props: PageProps<"/historicos/[slug]">): Promise<Metadata> {
  return { title: legendBySlug[(await props.params).slug]?.name ?? "Histórico" };
}

export default async function LegendPage(props: PageProps<"/historicos/[slug]">) {
  const legend = legendBySlug[(await props.params).slug];
  if (!legend) notFound();
  const others = legends.filter((l) => l.slug !== legend.slug);

  return (
    <article className="flex flex-col gap-12">
      <header className="flex flex-col gap-4 pt-4">
        <p className="font-display text-lg font-semibold tracking-widest text-gold uppercase">“{legend.nickname}”</p>
        <h1 className="font-display text-6xl leading-[0.9] font-bold uppercase sm:text-8xl">{legend.name}</h1>
        <p className="max-w-2xl text-xl text-muted">{legend.tagline}</p>
        <p className="text-sm text-faint">
          {legend.hometown} · {legend.years}
        </p>
      </header>

      <StatGrid stats={legend.keyStats} />

      <ol className="flex flex-col gap-10">
        {legend.chapters.map((c, i) => (
          <li key={c.title} className="grid gap-2 sm:grid-cols-[10rem_1fr] sm:gap-8">
            <div>
              <span className="font-display text-sm font-semibold text-faint">Capítulo {i + 1}</span>
              <p className="font-display text-xl font-bold text-muted">{c.period}</p>
            </div>
            <div className="border-t border-line pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8">
              <h2 className="font-display text-3xl font-bold uppercase">{c.title}</h2>
              <p className="mt-2 max-w-2xl text-lg leading-relaxed text-muted">{c.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <nav aria-label="Otros históricos" className="border-t border-line pt-6">
        <p className="mb-3 text-sm text-muted">Seguí leyendo</p>
        <ul className="flex flex-wrap gap-2">
          {others.map((o) => (
            <li key={o.slug}>
              <Link
                href={`/historicos/${o.slug}`}
                className="inline-block rounded-full border border-line px-4 py-2 transition-colors hover:border-line-strong hover:bg-surface"
              >
                {o.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
