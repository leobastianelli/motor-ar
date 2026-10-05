import type { Metadata } from "next";
import { NotasBrowser, type NotaItem } from "@/components/notas-browser";
import { noteDate } from "@/components/notas";
import { series as allSeries } from "@/data/series";
import { SectionTitle } from "@/components/pista";
import { getAllNotes, related } from "@/lib/notas";

export const metadata: Metadata = {
  title: "Notas",
  description: "Lo que dicen los medios del automovilismo argentino: reseñas breves con la fuente citada y enlazadas a los pilotos, categorías y fechas de las que hablan.",
  alternates: { canonical: "/notas" },
};

// Los datos nuevos la invalidan por evento; por tiempo sólo vencen las crónicas automáticas (ventana de días), así que 15 min sobra.
export const revalidate = 900;

export default async function NotasPage() {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const seriesName = new Map(allSeries.map((s) => [s.id, s]));
  const notas: NotaItem[] = (await getAllNotes()).map((n) => {
    const seriesIds = related(n).series;
    return {
      slug: n.slug,
      title: n.title,
      summary: n.summary,
      medio: n.source.medio,
      date: noteDate(n),
      publishedAt: n.publishedAt,
      auto: !!n.auto,
      seriesIds,
      search: norm([n.title, n.summary, n.source.medio, ...(n.details ?? []), ...seriesIds.map((id) => seriesName.get(id)?.name ?? "")].join(" ")),
    };
  });
  // Sólo las categorías de las que hay notas, en el orden en que salen (lo más reciente primero).
  const options = [...new Set(notas.flatMap((n) => n.seriesIds))].flatMap((id) => (seriesName.get(id) ? [{ id, label: seriesName.get(id)!.short }] : []));
  return (
    <>
      <section className="section-block notas-page">
        <SectionTitle title="Notas" as="h1" />
        <p className="notas-intro">
          Lo que dicen los medios, reseñado en pocas líneas y con la fuente siempre a la vista, y la crónica de cada fecha, que se arma sola con los resultados apenas entran. Cada nota está
          enlazada con los pilotos, las categorías y las fechas de las que habla.
        </p>
        {notas.length > 0 ? <NotasBrowser notas={notas} series={options} /> : <p className="empty-state">Todavía no hay notas cargadas.</p>}
      </section>
    </>
  );
}
