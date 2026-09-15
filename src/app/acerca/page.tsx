import type { Metadata } from "next";
import { breadcrumb, JsonLd } from "@/components/json-ld";
import { OG_DEFAULTS } from "@/lib/site";

const description = "Por qué existe Fierros, contado por quien lo hace: Leonel Bastianelli, fanático del automovilismo y desarrollador full-stack.";

export const metadata: Metadata = {
  title: "Acerca de",
  description,
  openGraph: { title: "Acerca de Fierros", description, ...OG_DEFAULTS },
  alternates: { canonical: "/acerca" },
};

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "AboutPage",
              name: "Acerca de Fierros",
              description,
              author: { "@type": "Person", name: "Leonel Bastianelli", url: "https://leobastianelli.dev" },
            },
            breadcrumb([
              ["Inicio", "/"],
              ["Acerca de", "/acerca"],
            ]),
          ],
        }}
      />
      <section className="weekend-head">
        <h1>Acerca de Fierros</h1>
        <p className="lede">
          <span>Por qué existe este sitio, contado por quien lo hace</span>
        </p>
      </section>
      <section className="section-block legal">
        <p>
          <strong>Soy Leonel Bastianelli.</strong> Desarrollador full-stack, fanático del automovilismo y simracer amateur.
        </p>
        <p>
          Llegué a este mundo por mi viejo. Laburó muchísimos años en equipos del TC2000 y también dentro de la categoría. Lo acompañábamos a las
          carreras hasta que dejó de trabajar ahí. Con los años, la pasión me empezó a picar fuerte a mí también, y volvimos a ir juntos.
        </p>
        <p>
          También me gusta el fútbol, y siempre tuve dónde consultar sus resultados, tablas y calendarios en un mismo lugar. Quería tener algo así
          para el automovilismo. Un sitio para los que seguimos este deporte y queremos estar al tanto, y también para quienes recién se acercan y
          necesitan la información a mano.
        </p>
        <p>
          De ahí nace Fierros. De las ganas de hacer más fácil seguir el automovilismo y darle visibilidad a nuestras categorías y a nuestros
          pilotos, tanto a los que corren acá como a los que corren afuera.
        </p>
        <p>
          Porque atrás de cada categoría hay un esfuerzo. Hay mucha gente bancando los trapos, tratando de mostrarse. Por eso quiero que el TC
          Pista, el TC Mouras o el TN tengan en Fierros el mismo nivel de detalle que la Fórmula 1. Y quiero seguir sumando categorías, también
          zonales, hasta donde se pueda. Quiero que los pilotos vengan a ver su propio perfil acá. Quiero un montón de cosas. Pero arrancamos con
          esto.
        </p>
        <p>
          La mayoría de los datos se obtiene automáticamente de fuentes oficiales. La información que todavía no está disponible de esa manera,
          como algunos campeonatos que sólo se publican en redes, la cargo yo a mano. También reviso y corrijo lo que encuentro que no cierra. Hoy
          el proyecto lo llevo adelante yo, y ojalá crezca lo suficiente como para sumar más gente.
        </p>
        <p>
          Si encontrás un error o algo que falta, <a href="mailto:contacto@somosfierros.ar">contámelo</a>. Eso también ayuda a que Fierros sea cada
          vez más útil para quienes lo usamos.
        </p>
        <p>
          Quiero que Fierros sea tu página de cabecera para seguir el automovilismo argentino e internacional. Somos muchísimos los que vivimos
          este deporte en el país, y quiero construir una página a la altura de esa pasión.
        </p>
      </section>
    </>
  );
}
