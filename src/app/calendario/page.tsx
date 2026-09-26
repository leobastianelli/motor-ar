import type { Metadata } from "next";
import { CalendarView, type CalendarCard } from "@/components/calendar-view";
import { SectionTitle } from "@/components/pista";
import { getNow, getSeason, getSeries } from "@/lib/data";
import { capitalize, fmtDayShort, fmtMonth, fmtMonthShort } from "@/lib/format";

export const metadata: Metadata = {
  title: "Calendario 2026",
  description: "Todas las fechas que vienen de F1, F2, Turismo Carretera, TC Pista, TN, TC Mouras, Pick Up y GT, en hora argentina.",
  alternates: { canonical: "/calendario" },
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

      <section className="section-block calendar-subscribe">
        <SectionTitle title="Suscribite al calendario" />
        <p>
          Además de mirar las fechas acá, podés sumarlas a tu calendario (Google Calendar, el del iPhone o Mac, Outlook u otro): se actualizan
          solas cuando cambia un horario, sin tener que volver a esta página. En cada categoría y en la ficha de cada piloto hay un botón
          «Agregar a mi calendario» con las fechas de esa categoría o de la categoría del piloto. Para todas las categorías con argentinos
          juntas, usá estos enlaces:
        </p>
        <ul className="calendar-subscribe-links">
          <li>
            <a href="https://calendar.google.com/calendar/r?cid=webcal://www.somosfierros.ar/calendario/todo.ics">Google Calendar</a>
          </li>
          <li>
            <a href="webcal://www.somosfierros.ar/calendario/todo.ics">iPhone / Mac</a>
          </li>
          <li>
            Outlook u otros: pegá esta dirección donde diga &ldquo;suscribirse a un calendario&rdquo; o &ldquo;desde internet&rdquo;:{" "}
            <code>https://www.somosfierros.ar/calendario/todo.ics</code>
          </li>
        </ul>
      </section>
    </>
  );
}
