import type { Metadata } from "next";
import Link from "next/link";
import { legends } from "@/data/legends";

export const metadata: Metadata = { title: "Históricos" };

export default function LegendsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-4xl font-bold tracking-wide uppercase">Históricos</h1>
        <p className="text-muted">Las leyendas que hicieron grande al automovilismo argentino.</p>
      </header>
      <ul className="flex flex-col gap-3">
        {legends.map((l) => (
          <li key={l.slug}>
            <Link
              href={`/historicos/${l.slug}`}
              className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm text-faint">
                  “{l.nickname}” · {l.years}
                </p>
                <div className="font-display text-3xl font-bold uppercase">{l.name}</div>
                <p className="mt-1 max-w-xl text-sm text-muted">{l.tagline}</p>
              </div>
              <div className="flex shrink-0 gap-5">
                {l.keyStats.slice(0, 2).map((s) => (
                  <div key={s.label}>
                    <div className="font-display text-4xl leading-none font-bold text-gold">{s.value}</div>
                    <div className="text-xs text-muted">{s.label}</div>
                  </div>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
