import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle } from "@/components/pista";
import { legends } from "@/data/legends";

export const metadata: Metadata = { title: "Historias" };

export default function LegendsPage() {
  return (
    <>
      <section className="weekend-head">
        <div>
          <h1>Historias</h1>
        </div>
        <p className="lede">Las leyendas que hicieron grande al automovilismo argentino, contadas en capítulos.</p>
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
              <time>{l.keyStats[0].value}</time>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
