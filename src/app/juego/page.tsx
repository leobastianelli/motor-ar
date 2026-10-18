import type { Metadata } from "next";
import { Juego } from "@/components/juego";
import { breadcrumb, JsonLd } from "@/components/json-ld";
import { FALLOS_PARA_PISTA, JUEGO_NOMBRE, MARGEN_NACIO, MAX_INTENTOS } from "@/lib/juego/config.mjs";
import { INICIO, MODO_PRUEBA, pilotosJuego } from "@/lib/juego/servidor";
import { OG_DEFAULTS } from "@/lib/site";
import "./juego.css";

// La página es estática: lleva sólo los nombres para el buscador (nada de la respuesta). El día, el progreso y la comprobación de cada
// intento se resuelven en el navegador y en /api/juego/*, que guarda la respuesta del día en el servidor.
const title = `${JUEGO_NOMBRE}: el piloto argentino del día`;
const description = `Un piloto argentino por día y ${MAX_INTENTOS} intentos. Comparás año de nacimiento, provincia, categorías, títulos y si corre en 2026.`;

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, ...OG_DEFAULTS },
  alternates: { canonical: "/juego" },
};

export default function JuegoPage() {
  const pilotos = pilotosJuego()
    .map((p) => ({ slug: p.slug, nombre: p.nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "WebPage", name: title, description },
            breadcrumb([
              ["Inicio", "/"],
              [JUEGO_NOMBRE, "/juego"],
            ]),
          ],
        }}
      />
      <section className="weekend-head">
        <h1>{JUEGO_NOMBRE}</h1>
        <p className="lede">
          <span>Un piloto argentino por día, el mismo para todos</span>
        </p>
      </section>

      {MODO_PRUEBA && (
        <p className="jg-prueba" role="note">
          Vista previa en modo prueba: el juego ya arrancó y el piloto del día no es el de producción.
        </p>
      )}
      <Juego pilotos={pilotos} inicio={INICIO} hayBase={pilotos.length > 0} />

      <div className="jg-info">
        <h2>Cómo se juega</h2>
        <p>
          Cada día hay un piloto argentino misterioso, el mismo para todos. Tenés {MAX_INTENTOS} intentos: escribí el nombre de un piloto y mirá
          cuánto se parece al del día en cinco datos.
        </p>
        <ul>
          <li>
            <strong>Verde (✓)</strong>: el dato es igual. <strong>Amarillo (~)</strong>: está cerca. <strong>Gris (✗)</strong>: no coincide.
          </li>
          <li>
            <strong>Nació</strong>: amarillo si es de hasta {MARGEN_NACIO} años de diferencia. La flecha ↑ dice que el del día nació después; ↓, que nació
            antes.
          </li>
          <li>
            <strong>Provincia</strong>: la de nacimiento. Amarillo si es de la misma región (Bonaerense, Centro, Cuyo, NOA, NEA o Patagonia).
          </li>
          <li>
            <strong>Categorías</strong>: verde si corrió en las mismas; amarillo si comparten al menos una.
          </li>
          <li>
            <strong>Títulos</strong>: cantidad de campeonatos. La flecha dice si el del día tiene más (↑) o menos (↓).
          </li>
          <li>
            <strong>Corre 2026</strong>: si compite este año.
          </li>
        </ul>
        <p>
          Después del {FALLOS_PARA_PISTA[0]}.º y del {FALLOS_PARA_PISTA[1]}.º intento fallido se destapa una pista escrita. El juego cambia a las 00:00 hora
          argentina. Tu progreso y tu racha se guardan sólo en este navegador.
        </p>

        <h2>De dónde salen los datos</h2>
        <p>
          Los datos de cada piloto salen de <a href="https://www.wikidata.org" target="_blank" rel="noreferrer">Wikidata</a> y de{" "}
          <a href="https://es.wikipedia.org" target="_blank" rel="noreferrer">Wikipedia en español</a> (texto bajo licencia{" "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>), de las listas de campeones de
          cada categoría y de los datos de temporada de Fierros. Sólo entra un piloto cuando esas fuentes coinciden. Al terminar cada partida se
          muestran los enlaces del piloto del día. Más detalle en <a href="/fuentes">Fuentes</a>.
        </p>
      </div>
    </>
  );
}
