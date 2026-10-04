import type { Metadata } from "next";
import Link from "next/link";
import photos from "@/data/photos.json";
import { SectionTitle } from "@/components/pista";
import { getSeason } from "@/lib/data";
import { fmtDayLong, fmtTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Fuentes y créditos",
  description: "De dónde salen los horarios, resultados y fotos de Fierros, con sus licencias.",
  alternates: { canonical: "/fuentes" },
};

const SOURCES: { name: string; url: string; what: string; license?: string }[] = [
  { name: "ACTC · portal de tiempos", url: "https://tiempos.actc.org.ar/resultados", what: "Resultados de entrenamientos, clasificación, series y final de TC, TC Pista, TC Mouras, TC Pista Mouras, TC Pick Up y TC Pista Pick Up." },
  { name: "ACTC · actc.org.ar", url: "https://actc.org.ar", what: "Calendarios oficiales y cronogramas de horarios." },
  { name: "APAT · apat.org.ar", url: "https://apat.org.ar", what: "Calendario, resultados por sesión y campeonatos del TN." },
  { name: "FIA · fia.com", url: "https://www.fia.com/events/formula-2-championship/season-2026/fia-formula-2", what: "Clasificaciones oficiales de la Fórmula 2." },
  { name: "FIA Formula 2 · fiaformula2.com", url: "https://www.fiaformula2.com", what: "Horarios de cada fecha de la Fórmula 2." },
  { name: "Jolpica-F1", url: "https://api.jolpi.ca/ergast/f1/", what: "Calendario, horarios, resultados y campeonato de la Fórmula 1." },
  { name: "OpenF1", url: "https://openf1.org", what: "Resultados de prácticas y clasificación sprint de la Fórmula 1." },
  { name: "GT World Challenge Europe", url: "https://www.gt-world-challenge-europe.com", what: "Horarios oficiales (hora local y GMT) y resultados de cada sesión del Sprint Cup y del Endurance Cup, con clase y número de cada auto." },
  { name: "Speedhive · MYLAPS", url: "https://speedhive.mylaps.com", what: "Cronometraje del Turismo Nacional: hora real de inicio de cada sesión y clasificación provisoria, mientras APAT no publica los resultados oficiales." },
  { name: "Speedhive · MYLAPS (FRAD)", url: "https://speedhive.mylaps.com/Events/3727601", what: "Córdoba Pista: calendario, hora real de cada sesión y clasificación (provisoria) de las siete clases, del cronometraje de la Federación Regional de Automovilismo Deportivo de Córdoba." },
  { name: "FRAD · fradcba.com.ar", url: "https://fradcba.com.ar/reglamentos/reg-gral-del-campeonato-cordoba-pista-2026/", what: "Reglamento general del campeonato de Córdoba Pista (el puntaje) y tablas oficiales después de cada fecha, contra las que validamos el campeonato que calculamos; comunicado del 28/8 con las fechas 7 a 9 (tentativas hasta que aparezcan en el cronometraje)." },
  { name: "Córdoba Pista · campeonato calculado por Fierros", url: "https://cordobapista.com", what: "La tabla de cordobapista.com va entre 1 y 3 fechas atrasada, así que el campeonato de TC 4000 y TC Pista 4000 lo calculamos nosotros con los resultados del cronometraje y el puntaje del reglamento de la FRAD; sólo lo mostramos porque coincide, piloto por piloto, con las tablas oficiales hasta la última fecha disponible. Las clases cuyo puntaje no pudimos reproducir figuran como \"Sin campeonato publicado\"." },
  { name: "Rally Argentino · rallyargentino.com", url: "https://www.rallyargentino.com", what: "Calendario de las nueve fechas y campeonato de pilotos de cada clase, tal cual lo publica el organizador (tabla oficial, sin cálculo nuestro; si queda atrás de las fechas corridas no la mostramos)." },
  { name: "Rally Argentino · tiempos oficiales", url: "https://tiemposonline.rallyargentino.com", what: "Clasificación general y por clase de cada fecha, con diferencias. La carrera más reciente se muestra como provisoria hasta que la organización la pasa a su histórico de tiempos; la fecha 1 no se puede leer (la fuente no la publica en su API) y figura como tal. Sólo aparecen los pilotos clasificados." },
  { name: "Nuevo Car Show · nuevocarshow.com.ar", url: "https://nuevocarshow.com.ar", what: "Calendario de las diez fechas y, de las cinco clases (Clase 1, Clase 2, Clase 3, TC 4000 SS y Fiat 600 TS), el PDF de cronometraje de cada sesión con su hora real, y el reglamento de campeonato (ACAPSFE) con el puntaje." },
  { name: "Nuevo Car Show · campeonato calculado por Fierros", url: "https://nuevocarshow.com.ar/campeonato-clase-1/", what: "Las tablas del sitio oficial van atrasadas y llevan ajustes que no figuran en las planillas (invitados que no suman, exclusiones anunciadas aparte), así que calculamos el campeonato de cada clase con las planillas y el puntaje del reglamento, y lo mostramos sólo si coincide, piloto por piloto, con la tabla oficial en todas las fechas que ésta cubre. Si no coincide, la clase figura como \"Sin campeonato publicado\", con el motivo." },
  { name: "YouTube · GT World", url: "https://www.youtube.com/@GTWorld", what: "Transmisión y resumen de cada sesión del GT World Challenge Europe, desde el canal oficial y con la API oficial de YouTube." },
  { name: "Campeones · campeones.com.ar", url: "https://campeones.com.ar/category/tc2000/", what: "Notas de TC2000 de las que salen sede, hora de la carrera, pole y ganador de cada fecha." },
  { name: "SoloTC", url: "https://www.solotc.com.ar", what: "Notas de cronograma usadas para verificar horarios de las categorías de la ACTC." },
  { name: "Wikipedia", url: "https://www.wikipedia.org", what: "Historia y campeones de cada categoría, temporada de TC2000, calendario y campeonato del GT World Challenge Europe, y datos de pilotos.", license: "CC BY-SA 4.0" },
];

// Lo que ninguna fuente pública todavía (algunos campeonatos que sólo se publican como imagen) se carga a mano,
// desde estas cuentas y sitios, hasta que exista una fuente automática (ver src/data/manual-overrides.json y
// docs/fuentes-de-datos.md).
const MANUAL_SOURCES: { name: string; url: string; what: string }[] = [
  { name: "ACTC oficial (Instagram)", url: "https://www.instagram.com/actcargentina/", what: "Campeonato del TC (Copa de Oro) cuando la fuente automática de Wikipedia todavía no lo actualizó." },
  { name: "TC2000 oficial (Instagram)", url: "https://www.instagram.com/supertc2000/", what: "Campeonato de TC2000 cuando la fuente automática todavía no lo actualizó." },
  { name: "0264Noticias", url: "https://www.0264noticias.com", what: "Sede y fecha de carreras de TC2000 anunciadas antes de que las publique una fuente automática." },
  { name: "Passline", url: "https://www.passline.com", what: "Entradas y confirmación de sede de fechas de TC2000 cargadas a mano." },
];

type Photo = { alt: string; author: string; license: string; licenseUrl: string | null; sourceUrl: string };

export const revalidate = 60;

export default async function SourcesPage() {
  const credits = Object.values(photos as Record<string, Photo>);
  const season = await getSeason();
  return (
    <>
      <section className="weekend-head">
        <h1>Fuentes y créditos</h1>
        <p className="lede">
          <span>Datos públicos, siempre con su origen</span>
        </p>
      </section>

      <section className="section-block legal">
        <p>
          Fierros junta información que publican las categorías, las federaciones y otras fuentes abiertas, y la ordena en hora argentina. No tiene relación
          con ninguna categoría, federación, equipo ni piloto. Las marcas y nombres pertenecen a sus dueños. Si encontrás un error, escribinos a{" "}
          <a href="mailto:contacto@somosfierros.ar">contacto@somosfierros.ar</a>. Quién está detrás de todo esto y por qué, en{" "}
          <Link href="/acerca">Acerca de Fierros</Link>.
        </p>

        <SectionTitle title="Datos" />
        <ul className="legal-list">
          {SOURCES.map((s) => (
            <li key={s.name}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.name}
              </a>
              <span>{s.what}</span>
              {s.license && <small>Licencia: {s.license}. El contenido tomado de Wikipedia se reescribe y se cita con enlace a la página de origen.</small>}
            </li>
          ))}
        </ul>

        <SectionTitle title="Carga manual" />
        <p>
          La mayoría de los datos se leen solos de las fuentes de arriba. Lo que ninguna fuente pública todavía —hoy, algunos campeonatos que sólo se
          publican como imagen o anuncio— se carga a mano desde estas cuentas y sitios, y se reemplaza por la fuente automática en cuanto ésta se pone al
          día.
        </p>
        <ul className="legal-list">
          {MANUAL_SOURCES.map((s) => (
            <li key={s.name}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.name}
              </a>
              <span>{s.what}</span>
            </li>
          ))}
        </ul>

        <SectionTitle title="Estado de la sincronización" />
        <p>
          Última actualización automática: {fmtDayLong(season.updatedAt)} a las {fmtTime(season.updatedAt)} (hora argentina).
          {season.failures.length === 0
            ? " Todas las fuentes respondieron bien la última vez."
            : ` ${season.failures.length === 1 ? "Una fuente falló" : `${season.failures.length} fuentes fallaron`} en el último intento; se muestran los últimos datos buenos que se pudieron guardar.`}
        </p>
        {season.failures.length > 0 && (
          <ul className="legal-list">
            {season.failures.map((f) => (
              <li key={f}>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}

        <SectionTitle title="Fotos" />
        <ul className="legal-list">
          {credits.map((p) => (
            <li key={p.sourceUrl}>
              <a href={p.sourceUrl} target="_blank" rel="noreferrer">
                {p.alt}
              </a>
              <span>
                {p.author} ·{" "}
                {p.licenseUrl ? (
                  <a href={p.licenseUrl} target="_blank" rel="noreferrer license">
                    {p.license}
                  </a>
                ) : (
                  p.license
                )}{" "}
                · Wikimedia Commons
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
