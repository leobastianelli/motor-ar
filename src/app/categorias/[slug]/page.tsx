import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { breadcrumb, JsonLd } from "@/components/json-ld";
import { NotesBlock } from "@/components/notas";
import { PhotoCredit, SectionTitle } from "@/components/pista";
import { notesForSeries } from "@/lib/notas";
import { getAllSeries, getHistory, getNow, getSeason, getSeries } from "@/lib/data";
import { getPhoto } from "@/lib/photos";
import { fmtDayNum, fmtMonthShort, surname } from "@/lib/format";
import { OG_DEFAULTS } from "@/lib/site";
import type { CategoryHistory, StandingRow } from "@/lib/types";

export const revalidate = 60;

export function generateStaticParams() {
  return getAllSeries().map((s) => ({ slug: s.id }));
}

export async function generateMetadata(props: PageProps<"/categorias/[slug]">): Promise<Metadata> {
  const series = getSeries((await props.params).slug);
  if (!series) return { title: "Categoría" };
  const history = getHistory(series.id);
  const description = `${series.name}: calendario 2026 en hora argentina, campeonato, resultados de cada fecha${history ? ` e historia con ${history.champions.length} campeones desde ${history.firstYear}` : ""}.`;
  return { title: series.name, description, openGraph: { title: series.name, description, ...OG_DEFAULTS }, alternates: { canonical: `/categorias/${series.id}` } };
}

const SCOPE_LABEL = { nacional: "Automovilismo nacional", internacional: "Categoría internacional", zonal: "Automovilismo zonal" };
const shortDate = (iso: string) => `${fmtDayNum(iso).padStart(2, "0")} ${fmtMonthShort(iso)}`;

function curiosity(history: CategoryHistory) {
  const first = history.champions[0];
  const argentines = [...new Set(history.champions.filter((c) => c.argentine).map((c) => c.driver))];
  if (history.argentineTitles) {
    return `Argentina suma ${history.argentineTitles} títulos, de ${argentines.join(" y ")}. El primer campeón fue ${first.driver}, en ${first.label ?? first.year}.`;
  }
  return `El primer campeón fue ${first.driver}, en ${first.label ?? first.year}. Desde entonces hubo ${history.distinctChampions} campeones distintos en ${history.seasons} temporadas.`;
}

function StandingRows({ rows, leaderRow }: { rows: StandingRow[]; leaderRow?: boolean }) {
  return (
    <>
      {rows.map((row, i) => (
        <div key={row.driver} className={`champ-row${leaderRow && i === 0 ? " leader" : ""}`}>
          <b>{row.pos}</b>
          <div>
            <strong>{row.driverSlug ? <Link href={`/pilotos/${row.driverSlug}`}>{row.driver}</Link> : row.driver}</strong>
            <span>{row.team}</span>
          </div>
          <em>{row.wins === undefined ? "" : `${row.wins} ${row.wins === 1 ? "victoria" : "victorias"}`}</em>
          <time>{row.points}</time>
        </div>
      ))}
    </>
  );
}

function History({ history }: { history: CategoryHistory }) {
  const top = history.topChampions[0];
  const make = history.topMakes[0];
  const wins = history.winsLeaders?.[0];
  const recent = [...history.champions].sort((a, b) => b.year - a.year).slice(0, 9);
  const makeWord = history.makeLabel.startsWith("Marca") ? "Marca" : "Equipo";

  return (
    <>
      <section className="history-stats">
        <div className="section-block">
          <SectionTitle title="La historia en números" inverse>
            <a href={history.source.url} target="_blank" rel="noreferrer">
              Fuente
            </a>
          </SectionTitle>
          <div className="record-grid">
            {top.titles > 1 ? (
              <article className="record-big">
                <b>{top.titles}</b>
                <h3>Títulos</h3>
                <p>
                  {top.driver}, el máximo campeón ({top.years.join(", ")}).
                </p>
              </article>
            ) : (
              <article className="record-big">
                <b>{history.distinctChampions}</b>
                <h3>Campeones</h3>
                <p>
                  {history.seasons} temporadas, {history.distinctChampions} campeones distintos.
                </p>
              </article>
            )}
            {wins ? (
              <article>
                <b>{wins.wins}</b>
                <h3>Victorias</h3>
                <p>{wins.driver}, récord de triunfos.</p>
              </article>
            ) : (
              <article>
                <b>{history.seasons}</b>
                <h3>Temporadas</h3>
                <p>
                  Desde {history.firstYear} hasta {history.lastYear}.
                </p>
              </article>
            )}
            {make && (
              <article>
                <b>{make.titles}</b>
                <h3>{makeWord}</h3>
                <p>{make.name}, la que más campeonatos ganó.</p>
              </article>
            )}
            <article className="curiosity">
              <span>Dato de boxes</span>
              <p>{curiosity(history)}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section-block champions">
        <SectionTitle title="Campeones" />
        <div className="champion-years">
          {recent.map((c) => (
            <article key={`${c.year}-${c.driver}-${c.group ?? ""}`}>
              <time>{c.label ?? c.year}</time>
              <strong>{c.driver}</strong>
              <span>{c.detail}</span>
            </article>
          ))}
        </div>
        <p className="source-note">
          Fuente:{" "}
          <a href={history.source.url} target="_blank" rel="noreferrer">
            {history.source.label}
          </a>{" "}
          · {history.source.license}
          {history.note ? ` · ${history.note}` : ""}
        </p>
      </section>
    </>
  );
}

export default async function SeriesPage(props: PageProps<"/categorias/[slug]">) {
  const series = getSeries((await props.params).slug);
  if (!series) notFound();
  const now = getNow();
  const season = await getSeason();

  const events = season.getEventsForSeries(series.id);
  const done = events.filter((e) => !season.getNextSession(e, now));
  const next = events.find((e) => season.getNextSession(e, now));
  const fullTable = season.getStandings(series.id);
  const table = fullTable.slice(0, 10);
  const rest = fullTable.slice(10);
  const [leader, second] = table;
  const meta = season.getSeasonMeta(series.id);
  const history = getHistory(series.id);
  const photo = getPhoto(`series-${series.id}`);
  const nameParts = series.name.split(" ");

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "SportsOrganization", name: series.name, sport: "Automovilismo", ...(series.founded ? { foundingDate: String(series.founded) } : {}), parentOrganization: { "@type": "Organization", name: series.org } },
            breadcrumb([
              ["Inicio", "/"],
              ["Categorías", "/categorias"],
              [series.name, `/categorias/${series.id}`],
            ]),
          ],
        }}
      />
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
                {" "}
                <br />
                {nameParts.slice(1).join(" ")}
              </>
            )}
          </h1>
          <p className="lede">
            {series.org}. Calendario, campeonato
            {history ? ` y ${history.seasons} temporadas de archivo` : ""}, siempre en hora argentina.
          </p>
        </div>
        {photo && (
          <>
            <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} sizes="(max-width: 800px) 100vw, 46vw" priority />
            <PhotoCredit photo={photo} />
          </>
        )}
      </section>

      <section className="season-ribbon category-stats">
        <div>
          <span>Temporada</span>
          <strong>2026</strong>
        </div>
        <div>
          <span>Disputadas</span>
          <strong>
            {done.length}/{events.length || "—"}
          </strong>
          {meta.incomplete && <small>calendario incompleto</small>}
        </div>
        <div>
          <span>Líder</span>
          <strong>{leader ? surname(leader.driver) : "—"}</strong>
          {meta.standingsLabel && <small>{meta.standingsLabel}</small>}
        </div>
        <div>
          <span>Diferencia</span>
          <strong>{leader && second ? Math.round((leader.points - second.points) * 10) / 10 : "—"}</strong>
          <small>puntos</small>
        </div>
        <div>
          <span>Próxima</span>
          <strong>{next ? shortDate(next.sessions.at(-1)!.start) : "—"}</strong>
          {next && <small>{next.circuit.city}</small>}
        </div>
      </section>

      <section className="section-block category-current">
        <div>
          <SectionTitle title={meta.standingsLabel ? `Campeonato · ${meta.standingsLabel}` : "Campeonato"} />
          {table.length > 0 ? (
            <div className="champ-table">
              <StandingRows rows={table} leaderRow />
              {rest.length > 0 && (
                <details className="full-results">
                  <summary>
                    Campeonato completo <span>{fullTable.length} pilotos</span>
                  </summary>
                  <div className="champ-table">
                    <StandingRows rows={rest} />
                  </div>
                </details>
              )}
              {meta.standingsSource && <p className="source-note">Fuente: {meta.standingsSource}.</p>}
            </div>
          ) : (
            <p className="empty-state">
              {meta.standingsHidden
                ? `La tabla publicada llega sólo hasta la fecha ${meta.standingsAsOfRound ?? 1} y ya se corrieron más, así que no la mostramos para no confundir. Abajo están los resultados de cada fecha.`
                : "Sin datos del campeonato todavía."}
            </p>
          )}
        </div>
        <aside className="calendar-tape" style={{ borderTopColor: series.color }}>
          <h2>Calendario</h2>
          {events.length > 0 ? (
            <ol>
              {events.map((e) => (
                <li key={e.id} className={season.getNextSession(e, now) ? undefined : "done"}>
                  <b>{String(e.round).padStart(2, "0")}</b>
                  <span>
                    <Link href={`/eventos/${e.id}`} className="list-link">
                      {e.circuit.city}
                    </Link>
                  </span>
                  <time>{shortDate(e.sessions.at(-1)!.start)}</time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty-state">Sin fechas cargadas.</p>
          )}
        </aside>
      </section>

      {meta.secondaryStandings && meta.secondaryStandings.rows.length > 0 && (
        <section className="section-block category-current single">
          <div>
            <SectionTitle title={`Campeonato · ${meta.secondaryStandings.label}`} />
            <div className="champ-table">
              <StandingRows rows={meta.secondaryStandings.rows.slice(0, 10)} leaderRow />
              {meta.secondaryStandings.rows.length > 10 && (
                <details className="full-results">
                  <summary>
                    Campeonato completo <span>{meta.secondaryStandings.rows.length} pilotos</span>
                  </summary>
                  <div className="champ-table">
                    <StandingRows rows={meta.secondaryStandings.rows.slice(10)} />
                  </div>
                </details>
              )}
            </div>
          </div>
        </section>
      )}

      <NotesBlock notas={notesForSeries(series.id)} title={`Notas de ${series.short}`} />

      {history ? (
        <History history={history} />
      ) : (
        <section className="history-stats">
          <div className="section-block">
            <SectionTitle title="La historia en números" inverse />
            <p className="empty-state">Sin datos verificados todavía para el archivo de esta categoría.</p>
          </div>
        </section>
      )}
    </>
  );
}
