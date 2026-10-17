import type { Metadata } from "next";
import Link from "next/link";
import "./home.css";
import { HomeView, type PortadaDriver } from "@/components/home-view";
import { noteDate } from "@/components/notas";
import { HCode, HTitle } from "@/components/home-parts";
import { getAllSeries, getDriversAbroad, getNow, getSeason, getSeries, isSimulatedNow, seriesParaElNavegador, seriesTier } from "@/lib/data";
import { getAllNotes } from "@/lib/notas";
import { fechasDeLaPortada } from "@/lib/snapshot.mjs";

export const metadata: Metadata = { alternates: { canonical: "/" } };
// La home es lo que la gente mira mientras pasa la carrera, pero lo que depende de la hora (qué está en vivo, el orden de las secciones, "Recién
// terminó", la agenda, el estado de cada piloto) ya NO se dibuja acá: el servidor manda el recorte de la temporada que hace falta
// (src/lib/snapshot.mjs) y <HomeView> lo decide en el navegador con la hora real (useNow) y se actualiza solo. Por eso la regeneración por tiempo
// puede ser lenta: 900 s. Los datos nuevos (resultados, horarios) la invalidan por evento (revalidateTag("season") desde /api/refresh).
export const revalidate = 900;

// Acceso directo a cada categoría: mucha gente entra buscando una en particular. Primero las más buscadas.
const JUMP = ["f1", "tc", "tc2000", "tn", "tc-pista", "f2", "gt3", "tc-mouras", "tc-pick-up"];

export default async function Home() {
  const now = getNow();
  const season = await getSeason();
  const abroad = getDriversAbroad();
  const driversAbroad: PortadaDriver[] = abroad.map((d) => ({ slug: d.slug, name: d.name, number: d.number, seriesId: d.seriesId, team: d.team }));
  const allSeries = Object.fromEntries(getAllSeries().map((s) => [s.id, s]));
  const events = fechasDeLaPortada(season.getAllEvents(), now, { seriesById: allSeries, tierOf: seriesTier, driversAbroad });

  // Sólo las categorías que el recorte usa, y sólo los campos que la portada muestra.
  const { seriesById, tiers } = seriesParaElNavegador([...events.map((e) => e.seriesId), ...driversAbroad.map((d) => d.seriesId)]);
  const standings = Object.fromEntries(
    abroad.map((d) => {
      const st = season.getStandingPosition(d);
      return [d.slug, st ? { position: st.position, points: st.points, ...(st.clase ? { clase: st.clase } : {}) } : null];
    }),
  );
  const latestNotes = (await getAllNotes()).slice(0, 3);

  return (
    <HomeView
      events={events}
      seriesById={seriesById}
      tiers={tiers}
      driversAbroad={driversAbroad}
      standings={standings}
      serverNow={now}
      simulated={isSimulatedNow()}
      jump={
        <nav className="home-wrap home-jump" aria-label="Ir a una categoría">
          {JUMP.map((id) => {
            const s = getSeries(id)!;
            return (
              <Link key={id} href={`/categorias/${id}`}>
                <HCode series={s} />
                {/* Si el nombre corto repite el código (F1, TC, TN), va el nombre completo. */}
                <span>{s.short === s.code ? s.name : s.short}</span>
              </Link>
            );
          })}
          <Link href="/categorias" className="home-jump-all">
            Todas
          </Link>
        </nav>
      }
      notas={
        latestNotes.length > 0 && (
          <section id="notas" className="home-section home-notes" aria-labelledby="notas-title">
            <HTitle id="notas-title" title="Lo que se dice">
              <Link href="/notas" className="home-more">
                Ver todas
              </Link>
            </HTitle>
            <div className="home-note-list">
              {latestNotes.map((n) => (
                <article key={n.slug} className="home-note">
                  <p className="home-note-meta">
                    <b>{n.source.medio}</b>
                    <time dateTime={n.publishedAt}>{noteDate(n)}</time>
                  </p>
                  <h3>
                    <Link href={`/notas/${n.slug}`}>{n.title}</Link>
                  </h3>
                  <p className="home-note-summary">{n.summary}</p>
                </article>
              ))}
            </div>
          </section>
        )
      }
    />
  );
}
