import Link from "next/link";
import { SectionTitle } from "./pista";
import type { Nota } from "@/data/notas";
import { fmtDayNum, fmtMonthShort } from "@/lib/format";
import { linkMentions } from "@/lib/notas";

const atNoon = (day: string) => `${day}T12:00:00-03:00`;

/** "16 SEP" de la fecha de publicación (día calendario, sin hora). */
export const noteDate = (nota: Pick<Nota, "publishedAt">) => `${fmtDayNum(atNoon(nota.publishedAt))} ${fmtMonthShort(atNoon(nota.publishedAt))}`;

/** Texto con la primera mención de cada piloto y categoría convertida en enlace a su página en Fierros. */
export function LinkedText({ text }: { text: string }) {
  return (
    <>
      {linkMentions(text).map((piece, i) =>
        piece.href ? (
          <Link key={i} href={piece.href} className="nota-link">
            {piece.text}
          </Link>
        ) : (
          piece.text
        ),
      )}
    </>
  );
}

/** Tarjeta de una nota: de qué medio es, de cuándo, el titular de Fierros y el resumen. Lleva a la página de la nota. */
export function NoteCard({ nota }: { nota: Nota }) {
  return (
    <article className="nota-card">
      <p className="nota-meta">
        <b>{nota.source.medio}</b>
        <time dateTime={nota.publishedAt}>{noteDate(nota)}</time>
      </p>
      <h3>
        <Link href={`/notas/${nota.slug}`} className="list-link">
          {nota.title}
        </Link>
      </h3>
      <p className="nota-summary">{nota.summary}</p>
    </article>
  );
}

/** Bloque de notas para una página (piloto, categoría, fecha): nada si no hay ninguna. */
export function NotesBlock({ notas, title = "Notas", limit = 3 }: { notas: Nota[]; title?: string; limit?: number }) {
  if (notas.length === 0) return null;
  return (
    <section className="section-block notas-block">
      <SectionTitle title={title}>
        <Link href="/notas">Todas las notas</Link>
      </SectionTitle>
      <div className="nota-list">
        {notas.slice(0, limit).map((n) => (
          <NoteCard key={n.slug} nota={n} />
        ))}
      </div>
    </section>
  );
}
