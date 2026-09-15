import type { Metadata } from "next";
import photos from "@/data/photos.json";
import { SectionTitle } from "@/components/pista";

export const metadata: Metadata = {
  title: "Fuentes y créditos",
  description: "De dónde salen los horarios, resultados y fotos de Fierros, con sus licencias.",
};

const SOURCES: { name: string; url: string; what: string; license?: string }[] = [
  { name: "ACTC · portal de tiempos", url: "https://tiempos.actc.org.ar/resultados", what: "Resultados de entrenamientos, clasificación, series y final de TC, TC Pista, TC Mouras, TC Pista Mouras, TC Pick Up y TC Pista Pick Up." },
  { name: "ACTC · actc.org.ar", url: "https://actc.org.ar", what: "Calendarios oficiales y cronogramas de horarios." },
  { name: "APAT · apat.org.ar", url: "https://apat.org.ar", what: "Calendario, resultados por sesión y campeonatos del TN." },
  { name: "FIA · fia.com", url: "https://www.fia.com/events/formula-2-championship/season-2026/fia-formula-2", what: "Clasificaciones oficiales de la Fórmula 2." },
  { name: "FIA Formula 2 · fiaformula2.com", url: "https://www.fiaformula2.com", what: "Horarios de cada fecha de la Fórmula 2." },
  { name: "Jolpica-F1", url: "https://api.jolpi.ca/ergast/f1/", what: "Calendario, horarios, resultados y campeonato de la Fórmula 1." },
  { name: "OpenF1", url: "https://openf1.org", what: "Resultados de prácticas y clasificación sprint de la Fórmula 1." },
  { name: "Campeones · campeones.com.ar", url: "https://campeones.com.ar/category/tc2000/", what: "Notas de TC2000 de las que salen sede, hora de la carrera, pole y ganador de cada fecha." },
  { name: "SoloTC", url: "https://www.solotc.com.ar", what: "Notas de cronograma usadas para verificar horarios de las categorías de la ACTC." },
  { name: "Wikipedia", url: "https://www.wikipedia.org", what: "Historia y campeones de cada categoría, temporada de TC2000 y GT World Challenge Europe, y datos de pilotos.", license: "CC BY-SA 4.0" },
];

type Photo = { alt: string; author: string; license: string; licenseUrl: string | null; sourceUrl: string };

export default function SourcesPage() {
  const credits = Object.values(photos as Record<string, Photo>);
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
          <a href="mailto:contacto@somosfierros.ar">contacto@somosfierros.ar</a>.
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
