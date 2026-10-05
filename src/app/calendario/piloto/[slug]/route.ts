import { calendarSessionsForSeries } from "@/lib/calendar-feed";
import { getAllDrivers, getDriver, getIndexedDriver, getNow, getSeason, getSeries } from "@/lib/data";
import { buildCalendar } from "@/lib/ics.mjs";

export const dynamic = "force-static";
export const revalidate = 3600;

// El segmento dinámico incluye la extensión (p. ej. "franco-colapinto.ics"), igual que en /calendario/categoria.
// Sólo los curados se prerenderizan; los del índice se generan en la primera descarga y quedan en caché (ver /pilotos/[slug]).
export function generateStaticParams() {
  return getAllDrivers().map((d) => ({ slug: `${d.slug}.ics` }));
}

function notFound() {
  return new Response("No encontrado", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export async function GET(_request: Request, ctx: RouteContext<"/calendario/piloto/[slug]">) {
  const { slug: raw } = await ctx.params;
  if (!raw.endsWith(".ics")) return notFound();
  const slug = raw.slice(0, -4);

  const curated = getDriver(slug);
  const indexed = curated ? undefined : getIndexedDriver(slug);
  if (!curated && !indexed) return notFound();

  const season = await getSeason();
  const now = getNow();

  // El piloto indexado (sin ficha) puede figurar en más de una categoría: se usa la de más carreras corridas,
  // el mismo criterio que la ficha del piloto para elegir "la" categoría (ver src/app/pilotos/[slug]/page.tsx).
  let seriesId: string;
  let name: string;
  if (curated) {
    seriesId = curated.seriesId;
    name = curated.name;
  } else {
    const stats = season.getDriverSeason(indexed!);
    const ordenadas = [...indexed!.series].sort((a, b) => (stats.bySeries[b]?.races ?? 0) - (stats.bySeries[a]?.races ?? 0));
    seriesId = ordenadas[0];
    name = indexed!.name;
  }
  const series = getSeries(seriesId);
  if (!series) return notFound();

  const sessions = calendarSessionsForSeries(season, seriesId, series, now);
  const ics = buildCalendar({ name: `Fierros · ${name}`, sessions, dtstamp: now });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${slug}.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
