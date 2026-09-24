import type { Metadata } from "next";
import { NoteCard } from "@/components/notas";
import { SectionTitle } from "@/components/pista";
import { getAllNotes } from "@/lib/notas";

export const metadata: Metadata = {
  title: "Notas",
  description: "Lo que dicen los medios del automovilismo argentino: reseñas breves con la fuente citada y enlazadas a los pilotos, categorías y fechas de las que hablan.",
  alternates: { canonical: "/notas" },
};

export const revalidate = 60;

export default async function NotasPage() {
  const notas = await getAllNotes();
  return (
    <>
      <section className="section-block notas-page">
        <SectionTitle title="Notas" />
        <p className="notas-intro">
          Lo que dicen los medios, reseñado en pocas líneas y con la fuente siempre a la vista, y la crónica de cada fecha, que se arma sola con los resultados apenas entran. Cada nota está
          enlazada con los pilotos, las categorías y las fechas de las que habla.
        </p>
        {notas.length > 0 ? (
          <div className="nota-list">
            {notas.map((n) => (
              <NoteCard key={n.slug} nota={n} />
            ))}
          </div>
        ) : (
          <p className="empty-state">Todavía no hay notas cargadas.</p>
        )}
      </section>
    </>
  );
}
