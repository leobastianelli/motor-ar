import { calendarSessionsForSeries } from "@/lib/calendar-feed";
import { getAllSeries, getNow, getSeason, seriesTier } from "@/lib/data";
import { buildCalendar } from "@/lib/ics.mjs";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const season = await getSeason();
  const now = getNow();
  // Misma regla que "Los nuestros": categorías argentinas o internacionales donde corre algún argentino (src/lib/data.ts, seriesTier).
  const categorias = getAllSeries().filter((s) => seriesTier(s) <= 2);
  const sessions = categorias.flatMap((series) => calendarSessionsForSeries(season, series.id, series, now)).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const ics = buildCalendar({ name: "Fierros · Todas las categorías con argentinos", sessions, dtstamp: now });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="fierros-todo.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
