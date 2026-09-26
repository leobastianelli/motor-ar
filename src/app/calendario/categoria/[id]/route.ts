import { calendarSessionsForSeries } from "@/lib/calendar-feed";
import { getAllSeries, getNow, getSeason, getSeries } from "@/lib/data";
import { buildCalendar } from "@/lib/ics.mjs";

// Route Handler estático: sin esto, un GET no se cachea nunca en esta versión de Next (ver
// node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md, "Caching"). `revalidate` fija el
// intervalo, igual que en las páginas de la categoría.
export const dynamic = "force-static";
export const revalidate = 3600;

// El segmento dinámico incluye la extensión (p. ej. "tc.ics"): así la URL puede terminar en .ics sin una carpeta
// con un punto en el nombre. Categorías conocidas de antemano; una que no exista da 404 (dynamicParams no se apaga,
// para no romper si se agrega una categoría nueva sin volver a compilar).
export function generateStaticParams() {
  return getAllSeries().map((s) => ({ id: `${s.id}.ics` }));
}

function notFound() {
  return new Response("No encontrado", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export async function GET(_request: Request, ctx: RouteContext<"/calendario/categoria/[id]">) {
  const { id: raw } = await ctx.params;
  if (!raw.endsWith(".ics")) return notFound();
  const series = getSeries(raw.slice(0, -4));
  if (!series) return notFound();

  const season = await getSeason();
  const now = getNow();
  const sessions = calendarSessionsForSeries(season, series.id, series, now);
  const ics = buildCalendar({ name: `Fierros · ${series.name}`, sessions, dtstamp: now });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${series.id}.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
