import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionTitle } from "@/components/pista";
import { getAllSeries, getEventsForSeries, getNextSession, getSeries, getStandings } from "@/lib/data";
import { fmtDayNum, fmtMonthShort, surname } from "@/lib/format";

export function generateStaticParams() {
  return getAllSeries().map((s) => ({ slug: s.id }));
}

export async function generateMetadata(props: PageProps<"/categorias/[slug]">): Promise<Metadata> {
  return { title: getSeries((await props.params).slug)?.name ?? "Categoría" };
}

const SCOPE_LABEL = { nacional: "Automovilismo nacional", internacional: "Categoría internacional", zonal: "Automovilismo zonal" };

export default async function SeriesPage(props: PageProps<"/categorias/[slug]">) {
  const series = getSeries((await props.params).slug);
  if (!series) notFound();

  const events = getEventsForSeries(series.id);
  const done = events.filter((e) => !getNextSession(e));
  const next = events.find((e) => getNextSession(e));
  const table = getStandings(series.id).slice(0, 10);
  const [leader, second] = table;
  const hasPhoto = series.id === "tc";
  const nameParts = series.name.split(" ");

  return (
    <>
      <section className="category-hero">
        <div className="cat-poster" style={{ borderColor: series.color }}>
          <span style={{ color: series.color }}>{series.code}</span>
          <b>{series.founded ?? series.org}</b>
          <small>{series.founded ? "desde" : "organiza"}</small>
        </div>
        <div>
          <p className="kicker">{SCOPE_LABEL[series.scope]}</p>
          <h1>
            {nameParts[0]}
            {nameParts.length > 1 && (
              <>
                <br />
                {nameParts.slice(1).join(" ")}
              </>
            )}
          </h1>
          <p className="lede">
            {series.org}. Calendario, campeonato y archivo de la categoría, siempre en hora argentina.
          </p>
        </div>
        {hasPhoto && <Image src="/img/tc-action.png" alt="Auto de turismo doblando a alta velocidad" width={1536} height={1024} sizes="(max-width: 800px) 100vw, 46vw" priority />}
      </section>

      <section className="season-ribbon category-stats">
        <div>
          <span>Temporada</span>
          <strong>2026</strong>
        </div>
        <div>
          <span>Disputadas</span>
          <strong>
            {done.length}/{events.length}
          </strong>
          <small>en agenda</small>
        </div>
        <div>
          <span>Líder</span>
          <strong>{leader ? surname(leader.driver) : "—"}</strong>
        </div>
        <div>
          <span>Diferencia</span>
          <strong>{leader && second ? leader.points - second.points : "—"}</strong>
          <small>puntos</small>
        </div>
        <div>
          <span>Próxima</span>
          <strong>{next ? `${fmtDayNum(next.sessions.at(-1)!.start).padStart(2, "0")} ${fmtMonthShort(next.sessions.at(-1)!.start)}` : "—"}</strong>
          {next && <small>{next.circuit.city}</small>}
        </div>
      </section>

      <section className="section-block category-current">
        <div>
          <SectionTitle title="Campeonato" />
          {table.length > 0 ? (
            <div className="champ-table">
              {table.map((row, i) => (
                <div key={row.driver} className={`champ-row${i === 0 ? " leader" : ""}`}>
                  <b>{i + 1}</b>
                  <div>
                    <strong>{row.driverSlug ? <Link href={`/pilotos/${row.driverSlug}`}>{row.driver}</Link> : row.driver}</strong>
                    <span>{row.team}</span>
                  </div>
                  <em>{row.wins === undefined ? "—" : `${row.wins} ${row.wins === 1 ? "victoria" : "victorias"}`}</em>
                  <time>{row.points}</time>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">Sin datos del campeonato todavía.</p>
          )}
        </div>
        <aside className="calendar-tape" style={{ borderTopColor: series.color }}>
          <h2>Calendario</h2>
          {events.length > 0 ? (
            <ol>
              {events.map((e) => (
                <li key={e.id} className={getNextSession(e) ? undefined : "done"}>
                  <b>{String(e.round).padStart(2, "0")}</b>
                  <span>
                    <Link href={`/eventos/${e.id}`} className="list-link">
                      {e.circuit.city}
                    </Link>
                  </span>
                  <time>
                    {fmtDayNum(e.sessions.at(-1)!.start).padStart(2, "0")} {fmtMonthShort(e.sessions.at(-1)!.start)}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty-state">Sin fechas cargadas.</p>
          )}
        </aside>
      </section>

      <section className="history-stats">
        <div className="section-block">
          <SectionTitle title="La historia en números" inverse />
          <p className="empty-state">
            Sin datos verificados todavía. El archivo de campeones y récords se va a cargar desde fuentes citadas antes de publicarse.
          </p>
        </div>
      </section>
    </>
  );
}
