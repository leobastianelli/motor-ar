import type { Metadata } from "next";
import Link from "next/link";
import { SeriesTag } from "@/components/ui";
import { getAllDrivers, getSeries } from "@/lib/data";

export const metadata: Metadata = { title: "Pilotos argentinos" };

export default function DriversPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-4xl font-bold tracking-wide uppercase">Pilotos</h1>
        <p className="text-muted">Los argentinos que corren hoy, en el país y en el mundo.</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {getAllDrivers().map((d) => (
          <li key={d.slug}>
            <Link
              href={`/pilotos/${d.slug}`}
              className="relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-surface-2"
            >
              {d.number !== undefined && (
                <span aria-hidden className="absolute -top-3 right-3 font-display text-8xl font-bold text-surface-2">
                  {d.number}
                </span>
              )}
              <div className="relative flex items-center gap-2">
                <SeriesTag series={getSeries(d.seriesId)!} />
                <span className="text-sm text-muted">{d.team}</span>
              </div>
              <div className="relative">
                <div className="font-display text-3xl font-bold uppercase">{d.name}</div>
                <p className="mt-1 text-sm text-muted">{d.tagline}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
