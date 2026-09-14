import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle } from "@/components/pista";
import { legends } from "@/data/legends";

export const metadata: Metadata = {
  title: "Historias",
  description: "Fangio, Reutemann, Traverso y las leyendas del automovilismo argentino.",
};

export default function LegendsPage() {
  return (
    <>
      <section className="weekend-head">
        <h1>Historias</h1>
        <p className="lede">
          <span>Las leyendas del automovilismo argentino, contadas en capítulos</span>
        </p>
      </section>
      <section className="section-block">
        <SectionTitle title="Leyendas" />
        <div className="champ-table">
          {legends.map((l, i) => (
            <Link key={l.slug} href={`/historicos/${l.slug}`} className={`champ-row list-link${i === 0 ? " leader" : ""}`}>
              <b>{String(i + 1).padStart(2, "0")}</b>
              <div>
                <strong>{l.name}</strong>
                <span>{l.tagline}</span>
              </div>
              <em>{l.years}</em>
              {/* El número siempre con lo que mide: títulos de F1, victorias, campeonatos. */}
              <span className="legend-stat">
                <b>{l.keyStats[0].value}</b>
                <small>{l.keyStats[0].label}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
