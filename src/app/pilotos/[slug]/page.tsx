import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionTitle, SeriesTag, StatGrid } from "@/components/ui";
import { getAllDrivers, getArgentinosPulse, getDriver, getDriverResults, getSeries } from "@/lib/data";
import { fmtDate } from "@/lib/format";

export function generateStaticParams() {
  return getAllDrivers().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata(props: PageProps<"/pilotos/[slug]">): Promise<Metadata> {
  return { title: getDriver((await props.params).slug)?.name ?? "Piloto" };
}

export default async function DriverPage(props: PageProps<"/pilotos/[slug]">) {
  const driver = getDriver((await props.params).slug);
  if (!driver) notFound();
  const series = getSeries(driver.seriesId)!;
  const pulse = getArgentinosPulse().find((p) => p.driver.slug === driver.slug);
  const recent = getDriverResults(driver.slug).slice(0, 6);

  return (
    <article className="flex flex-col gap-10">
      <header className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-8">
        {driver.number !== undefined && (
          <span aria-hidden className="absolute -right-2 -bottom-10 font-display text-[12rem] leading-none font-bold text-surface-2 sm:text-[16rem]">
            {driver.number}
          </span>
        )}
        <div className="relative flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <SeriesTag series={series} size="md" />
            <span className="text-muted">{driver.team}</span>
          </div>
          <h1 className="font-display text-5xl leading-none font-bold uppercase sm:text-7xl">{driver.name}</h1>
          <p className="max-w-lg text-lg text-muted">{driver.tagline}</p>
          <p className="text-sm text-faint">
            {driver.hometown} · Nació el {driver.born}
          </p>
        </div>
      </header>

      {pulse && (
        <Link
          href={pulse.href}
          className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-4 transition-colors hover:border-line-strong hover:bg-surface-2"
        >
          <span className="text-sm text-muted">Este finde</span>
          <span className="flex items-baseline gap-3">
            <span className="text-sm text-muted">{pulse.detail}</span>
            <span className={`font-display text-3xl font-bold ${pulse.tone === "result" ? "text-celeste" : ""}`}>{pulse.headline}</span>
          </span>
        </Link>
      )}

      <section>
        <SectionTitle title="Temporada 2026" />
        <StatGrid stats={driver.seasonStats} />
      </section>

      {recent.length > 0 && (
        <section>
          <SectionTitle title="Últimos resultados" />
          <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {recent.map((r) => (
              <li key={r.session.id} className="shrink-0">
                <Link
                  href={`/eventos/${r.event.id}`}
                  className="flex w-32 flex-col gap-1 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-line-strong hover:bg-surface-2"
                >
                  <span className={`font-display text-3xl font-bold ${r.row.pos <= 3 ? "text-gold" : r.row.points ? "text-celeste" : "text-ink"}`}>
                    P{r.row.pos}
                  </span>
                  <span className="truncate text-sm">
                    {r.event.circuit.city}
                  </span>
                  <span className="text-xs text-faint">
                    {r.session.name} · {fmtDate(r.session.start)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionTitle title="Trayectoria" />
        <ol className="relative flex flex-col">
          {driver.career.map((stint, i) => (
            <li key={`${stint.year}-${stint.series}`} className="relative grid grid-cols-[4.5rem_1fr] gap-4 pb-6 last:pb-0 sm:grid-cols-[6rem_1fr]">
              <span className="pt-0.5 text-right font-display text-lg font-bold text-muted">{stint.year}</span>
              <div className="relative border-l border-line pb-1 pl-5">
                <span
                  aria-hidden
                  className={`absolute top-2 -left-[5px] size-[9px] rounded-full border-2 border-bg ${i === 0 ? "bg-celeste" : "bg-line-strong"}`}
                />
                <div className="font-medium">{stint.series}</div>
                <div className="text-sm text-faint">{stint.team}</div>
                <p className="mt-1.5 text-sm text-muted">{stint.highlight}</p>
                {stint.stats && (
                  <div className="mt-2 flex gap-4">
                    {stint.stats.map((s) => (
                      <span key={s.label} className="text-sm">
                        <span className="font-display text-xl font-bold">{s.value}</span> <span className="text-faint">{s.label}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
