import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

const mailto = (subject: string, body: string) => `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

/** Aviso discreto al pie de /categorias y de cada ficha: pedir una categoría que falta o corregir un dato, por mail. */
export function Avisar({ categoria }: { categoria?: { name: string; id: string } }) {
  const url = categoria ? `${SITE_URL}/categorias/${categoria.id}` : undefined;
  const falta = mailto("Falta una categoría en Fierros", "Hola, les aviso que falta esta categoría:\n\nNombre:\nDónde se corre:\nDe dónde sacar el calendario y los resultados (web, Facebook, etc.):\n");
  const error = mailto(
    categoria ? `Dato incorrecto en ${categoria.name}` : "Dato incorrecto en Fierros",
    categoria
      ? `Hola, vi un dato mal en ${categoria.name}.\nPágina: ${url}\n\nQué está mal:\nCómo debería ser (y de dónde lo sacás):\n`
      : "Hola, vi un dato mal.\nPágina:\n\nQué está mal:\nCómo debería ser (y de dónde lo sacás):\n",
  );
  return (
    <section className="section-block" aria-label="Avisanos">
      <p className="source-note">
        ¿Falta una categoría o viste un dato mal? Avisanos por mail: <a href={falta}>falta una categoría</a> · <a href={error}>dato incorrecto</a>. Si es una categoría chica, contanos de dónde sacar los datos.
      </p>
    </section>
  );
}
