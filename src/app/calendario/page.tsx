import type { Metadata } from "next";
import { CalendarView, type CalendarCard } from "@/components/calendar-view";
import { getNow, getSeason, getSeries } from "@/lib/data";
import { capitalize, fmtDayShort, fmtMonth, fmtMonthShort } from "@/lib/format";

export const metadata: Metadata = {
  title: "Calendario 2026",
  description: "Todas las fechas que vienen de F1, F2, Turismo Carretera, TC Pista, TN, TC Mouras, Pick Up y GT, en hora argentina.",
};
export const revalidate = 60;

export default async function CalendarPage() {
  const events = (await getSeason()).getUpcomingEvents(getNow());
  const cards: CalendarCard[] = events.flatMap((e) => {
    const s = getSeries(e.seriesId);
    if (!s) return [];
    const date = e.sessions.at(-1)!.start;
    return [
      {
        id: e.id,
        month: capitalize(fmtMonth(date)),
        scope: s.scope,
        city: e.circuit.city,
        when: `${fmtDayShort(date)} ${fmtMonthShort(date)} · Fecha ${e.round}`,
        series: { code: s.code, color: s.color, name: s.name },
      },
    ];
  });

  return (
    <>
      <section className="weekend-head">
        <h1>Calendario</h1>
        <p className="lede">Todas las fechas que vienen, en hora argentina.</p>
      </section>
      <CalendarView cards={cards} />
    </>
  );
}
