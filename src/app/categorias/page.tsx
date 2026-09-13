import type { Metadata } from "next";
import Link from "next/link";
import { getAllSeries } from "@/lib/data";
import type { Scope } from "@/lib/types";

export const metadata: Metadata = { title: "Categorías" };

const GROUPS: { scope: Scope; title: string }[] = [
  { scope: "nacional", title: "Nacionales" },
  { scope: "internacional", title: "Internacionales" },
  { scope: "zonal", title: "Zonales" },
];

export default function CategoriesPage() {
  const all = getAllSeries();
  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-4xl font-bold tracking-wide uppercase">Categorías</h1>
      {GROUPS.map((g) => (
        <section key={g.scope}>
          <h2 className="mb-3 font-display text-xl font-semibold tracking-wide text-muted uppercase">{g.title}</h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {all
              .filter((s) => s.scope === g.scope)
              .map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/categorias/${s.id}`}
                    className="flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-2"
                  >
                    <span aria-hidden className="h-1 w-8 rounded-full" style={{ background: s.color }} />
                    <span className="font-display text-2xl leading-none font-bold uppercase">{s.short}</span>
                    <span className="text-sm text-muted">
                      {s.name} · {s.org}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
