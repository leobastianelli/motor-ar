import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { CategoryLabel, SectionTitle } from "@/components/pista";
import { getNow, getSeason, getSeries } from "@/lib/data";
import { capitalize, fmtDayShort, fmtMonth, fmtMonthShort } from "@/lib/format";
import type { Scope } from "@/lib/types";

export const metadata: Metadata = { title: "Calendario" };

const FILTERS: { id?: Scope; label: string }[] = [
  { label: "Todo" },
  { id: "nacional", label: "Nacional" },
  { id: "internacional", label: "Internacional" },
  { id: "zonal", label: "Zonales" },
];

export default async function CalendarPage(props: PageProps<"/calendario">) {
  const { ambito } = await props.searchParams;
  const events = (await getSeason()).getUpcomingEvents(getNow()).filter((e) => !ambito || getSeries(e.seriesId)?.scope === ambito);
  const byMonth = Map.groupBy(events, (e) => capitalize(fmtMonth(e.sessions.at(-1)!.start)));

  return (
    <>
      <section className="weekend-head">
        <h1>Calendario</h1>
        <p className="lede">Todas las fechas que vienen, en hora argentina.</p>
      </section>

      {[...byMonth.entries()].map(([month, list], index) => (
        <section key={month} className="section-block">
          <SectionTitle title={month}>
            {index === 0 && (
              <nav className="filters" aria-label="Filtrar por ámbito">
                {FILTERS.map((f) => {
                  const active = (ambito ?? undefined) === f.id;
                  return (
                    <Link key={f.label} href={f.id ? `/calendario?ambito=${f.id}` : "/calendario"} aria-current={active ? "page" : undefined}>
                      <button type="button" tabIndex={-1} className={active ? "is-selected" : undefined}>
                        {f.label}
                      </button>
                    </Link>
                  );
                })}
              </nav>
            )}
          </SectionTitle>
          <div className="date-strip">
            {list.map((e) => {
              const s = getSeries(e.seriesId)!;
              const date = e.sessions.at(-1)!.start;
              return (
                <Link key={e.id} href={`/eventos/${e.id}`} className="next-card list-link" style={{ "--cat": s.color } as CSSProperties}>
                  <CategoryLabel series={s} />
                  <strong>{e.circuit.city}</strong>
                  <time dateTime={date}>
                    {fmtDayShort(date)} {fmtMonthShort(date)} · Fecha {e.round}
                  </time>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
      {events.length === 0 && (
        <section className="section-block">
          <p className="empty-state">No hay fechas próximas para este filtro.</p>
        </section>
      )}
    </>
  );
}
