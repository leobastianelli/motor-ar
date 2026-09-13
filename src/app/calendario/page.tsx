import type { Metadata } from "next";
import Link from "next/link";
import { Code, SectionTitle } from "@/components/pista";
import { getNow, getSeries, getUpcomingEvents } from "@/lib/data";
import { capitalize, fmtDayNum, fmtMonth, fmtMonthShort } from "@/lib/format";
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
  const events = getUpcomingEvents(getNow()).filter((e) => !ambito || getSeries(e.seriesId)?.scope === ambito);
  const byMonth = Map.groupBy(events, (e) => capitalize(fmtMonth(e.sessions.at(-1)!.start)));

  return (
    <>
      <section className="weekend-head">
        <div>
          <h1>Calendario</h1>
        </div>
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
                <article key={e.id}>
                  <time dateTime={date}>
                    <b>{fmtDayNum(date).padStart(2, "0")}</b> {fmtMonthShort(date)}
                  </time>
                  <Code series={s} />
                  <div>
                    <strong>
                      <Link href={`/eventos/${e.id}`} className="list-link">
                        {e.name}
                      </Link>
                    </strong>
                    <span>
                      {s.name} · {e.circuit.city}
                    </span>
                  </div>
                </article>
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
