import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/event-card";
import { getSeries, getUpcomingEvents } from "@/lib/data";
import { fmtMonth } from "@/lib/format";
import type { Scope } from "@/lib/types";

export const metadata: Metadata = { title: "Calendario" };

const SCOPES: { id?: Scope; label: string }[] = [
  { label: "Todo" },
  { id: "nacional", label: "Nacional" },
  { id: "internacional", label: "Internacional" },
  { id: "zonal", label: "Zonales" },
];

export default async function CalendarPage(props: PageProps<"/calendario">) {
  const { ambito } = await props.searchParams;
  const events = getUpcomingEvents().filter((e) => !ambito || getSeries(e.seriesId)?.scope === ambito);
  const byMonth = Map.groupBy(events, (e) => fmtMonth(e.sessions.at(-1)!.start));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl font-bold tracking-wide uppercase">Calendario</h1>

      <nav aria-label="Filtrar por ámbito" className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {SCOPES.map((s) => {
          const active = (ambito ?? undefined) === s.id;
          return (
            <Link
              key={s.label}
              href={s.id ? `/calendario?ambito=${s.id}` : "/calendario"}
              aria-current={active ? "page" : undefined}
              className="shrink-0 rounded-full border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-line-strong hover:text-ink aria-[current=page]:border-celeste/60 aria-[current=page]:text-celeste"
            >
              {s.label}
            </Link>
          );
        })}
      </nav>

      {[...byMonth.entries()].map(([month, list]) => (
        <section key={month}>
          <h2 className="mb-3 font-display text-xl font-semibold tracking-wide text-muted uppercase">{month}</h2>
          <div className="flex flex-col gap-2">
            {list.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
