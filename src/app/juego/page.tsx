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
      <div className="jg-escena">
        <header className="jg-cabeza">
          <h1>{JUEGO_NOMBRE}</h1>
          <p>Un piloto argentino por día. El mismo para todos.</p>
          {MODO_PRUEBA && (
            <p className="jg-prueba" role="note">
              Vista previa en modo prueba: el juego ya arrancó y el piloto del día no es el de producción.
            </p>
          )}
        </header>
        <Juego pilotos={pilotos} inicio={INICIO} hayBase={pilotos.length > 0} />

        <section className="jg-reglas" aria-labelledby="jg-reglas-t">
          <h2 id="jg-reglas-t">Cómo se juega</h2>
          <p className="jg-reglas-intro">
            Un piloto argentino misterioso por día, el mismo para todos. Tenés {MAX_INTENTOS} intentos: escribí un piloto y mirá cuánto se parece al del
            día en cinco datos.
          </p>
          <ul className="jg-leyenda" aria-label="Qué significa cada color">
            <li className="verde">
              <b aria-hidden="true">✓</b> Igual
            </li>
            <li className="amarillo">
              <b aria-hidden="true">~</b> Cerca
            </li>
            <li className="gris">
              <b aria-hidden="true">✗</b> No coincide
            </li>
            <li className="flecha">
              <b aria-hidden="true">▲▼</b> El del día tiene más o menos
            </li>
          </ul>
          <dl className="jg-datos">
            <div>
              <dt>Nació</dt>
              <dd>Amarillo si es de hasta {MARGEN_NACIO} años de diferencia. ▲: el del día nació después.</dd>
            </div>
            <div>
              <dt>Provincia</dt>
              <dd>La de nacimiento. Amarillo si es de la misma región: Bonaerense, Centro, Cuyo, NOA, NEA o Patagonia.</dd>
            </div>
            <div>
              <dt>Categorías</dt>
              <dd>Verde si corrió en las mismas; amarillo si comparten al menos una.</dd>
            </div>
            <div>
              <dt>Títulos</dt>
              <dd>Cantidad de campeonatos. ▲: el del día tiene más.</dd>
            </div>
            <div>
              <dt>Corre 2026</dt>
              <dd>Si compite este año.</dd>
            </div>
          </dl>
          <ul className="jg-extras">
            <li>
              <b>Radio de boxes</b>
              Después del {FALLOS_PARA_PISTA[0]}.º y del {FALLOS_PARA_PISTA[1]}.º error te llega una pista.
            </li>
            <li>
              <b>00:00</b>
              Cambia el piloto, hora argentina.
            </li>
            <li>
              <b>Racha</b>
              Se guarda en este navegador.
            </li>
          </ul>
          <h2>De dónde salen los datos</h2>
          <p className="jg-reglas-fuentes">
            De <a href="https://www.wikidata.org" target="_blank" rel="noreferrer">Wikidata</a> y{" "}
            <a href="https://es.wikipedia.org" target="_blank" rel="noreferrer">Wikipedia en español</a> (texto bajo licencia{" "}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>), de las listas de campeones de
            cada categoría y de los datos de temporada de Fierros. Un piloto entra sólo cuando esas fuentes coinciden. Al terminar cada partida se ven los
            enlaces del piloto del día. Más detalle en <a href="/fuentes">Fuentes</a>.
          </p>
        </section>
      </div>
    </>
  );
}
