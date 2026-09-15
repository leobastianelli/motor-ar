import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Términos de uso", description: "Condiciones de uso de Fierros.", alternates: { canonical: "/terminos" } };

export default function TermsPage() {
  return (
    <>
      <section className="weekend-head">
        <h1>Términos de uso</h1>
        <p className="lede">
          <span>Última actualización: septiembre de 2026</span>
        </p>
      </section>
      <section className="section-block legal">
        <h2>Qué es Fierros</h2>
        <p>
          Fierros es un sitio informativo sobre automovilismo: calendarios, horarios en hora argentina, dónde ver cada carrera, resultados y datos de pilotos.
          Es un proyecto independiente, sin relación con ninguna categoría, federación, organizador, equipo ni piloto.
        </p>

        <h2>La información</h2>
        <p>
          Los datos salen de fuentes públicas (ver <Link href="/fuentes">Fuentes y créditos</Link>) y se actualizan de forma automática. Pueden tener demoras,
          errores o cambios de último momento: los horarios y resultados oficiales son siempre los que publica cada categoría. Fierros no se hace responsable
          por decisiones tomadas a partir de esta información.
        </p>

        <h2>Marcas, fotos y contenidos</h2>
        <p>
          Los nombres de categorías, equipos y marcas pertenecen a sus dueños y se usan sólo para identificarlos; Fierros no usa sus logos. Las fotos tienen
          licencias libres y se muestran con su crédito. Los textos basados en Wikipedia se publican bajo su licencia (CC BY-SA 4.0). El diseño, la marca
          Fierros y los textos propios pertenecen a sus autores.
        </p>

        <h2>Uso del sitio</h2>
        <p>
          Podés usar y compartir el contenido citando a Fierros con un enlace. No está permitido copiar el sitio de forma automatizada ni presentarlo como
          propio.
        </p>

        <h2>Publicidad y enlaces</h2>
        <p>
          El sitio puede mostrar publicidad o contenido patrocinado, siempre identificado. Los enlaces a sitios de terceros (transmisiones, entradas, fuentes)
          se rigen por las condiciones de esos sitios.
        </p>

        <h2>Cambios y contacto</h2>
        <p>
          Estos términos pueden cambiar; la versión vigente es la publicada en esta página. Para consultas o correcciones, escribí a{" "}
          <a href="mailto:contacto@somosfierros.ar">contacto@somosfierros.ar</a>. Ver también la <Link href="/privacidad">Política de privacidad</Link>.
        </p>
      </section>
    </>
  );
}
