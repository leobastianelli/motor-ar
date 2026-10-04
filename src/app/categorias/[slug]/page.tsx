import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { breadcrumb, itemListJsonLd, JsonLd, seasonEventSummary } from "@/components/json-ld";
import { AgregarCalendario } from "@/components/agregar-calendario";
import { CalendarioPlegable } from "@/components/calendario-plegable";
import { AutoRefresh } from "@/components/live-clock";
import { Momento } from "@/components/momento";
import { NotesBlock } from "@/components/notas";
import { ClassSeal, PhotoCredit, SectionTitle } from "@/components/pista";
import { notesForSeries } from "@/lib/notas";
import { getAllSeries, getHistory, getNow, getSeason, getSeries, isSimulatedNow } from "@/lib/data";
import { drivers } from "@/data/drivers";
import { getPhoto } from "@/lib/photos";
import { fmtDayNum, fmtMonthShort, fmtRange, surname } from "@/lib/format";
import { descripcionMomento, tituloCategoria } from "@/lib/seo-titulos.mjs";
import { OG_DEFAULTS } from "@/lib/site";
import type { CategoryHistory, RaceEvent, StandingRow } from "@/lib/types";
import type { CSSProperties } from "react";

export const revalidate = 60;

export function generateStaticParams() {
  return getAllSeries().map((s) => ({ slug: s.id }));
}

export async function generateMetadata(props: PageProps<"/categorias/[slug]">): Promise<Metadata> {
  const series = getSeries((await props.params).slug);
  if (!series) return { title: "Categoría" };
  const history = getHistory(series.id);
  const fallback = `${series.name}: calendario 2026 en hora argentina, campeonato, resultados de cada fecha${history ? ` e historia con ${history.champions.length} campeones desde ${history.firstYear}` : ""}.`;
  // Título y descripción salen del momento de la categoría (src/lib/seo-titulos.mjs) y se regeneran con la página.
  const season = await getSeason();
  const now = getNow();
  const momento = season.getMomentoCategoria(series.id, now);
  const fecha = momento.fecha ? season.getEvent(momento.fecha.id) : undefined;
  const title = tituloCategoria(series, now.slice(0, 4), momento, now);
  const description = descripcionMomento(series, momento, { broadcasts: fecha?.broadcasts, fallback });
  return { title, description, openGraph: { title, description, ...OG_DEFAULTS }, alternates: { canonical: `/categorias/${series.id}` } };
}

const SCOPE_LABEL = { nacional: "Automovilismo nacional", internacional: "Categoría internacional", zonal: "Automovilismo zonal" };
const shortDate = (iso: string) => `${fmtDayNum(iso).padStart(2, "0")} ${fmtMonthShort(iso)}`;

/** Día de la carrera principal de una fecha; si no la hay cargada, el rango de días de la fecha. */
function raceDay(e: RaceEvent) {
  const race = e.sessions.filter((s) => s.kind === "carrera" || s.kind === "final").at(-1);
  if (race) return { value: shortDate(race.start), note: `${e.circuit.city} · carrera` };
  const first = e.sessions[0].start;
  const last = e.sessions.at(-1)!.start;
  return { value: shortDate(last), note: `${e.circuit.city} · ${fmtRange(first, last).replace(/ de w+$/, "")}` };
}

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
  const momento = season.getMomentoCategoria(series.id, now);
  const momentoEvent = momento.fecha ? season.getEvent(momento.fecha.id) : undefined;
  const nuestros = drivers.filter((d) => d.seriesId === series.id);
  // Categoría con clases (Córdoba Pista): el campeonato es uno por clase y vive en la página de cada clase.
  const clases = series.classes ?? [];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "SportsOrganization", name: series.name, sport: "Automovilismo", ...(series.founded ? { foundingDate: String(series.founded) } : {}), parentOrganization: { "@type": "Organization", name: series.org } },
            ...(events.length > 0 ? [itemListJsonLd(events.map(seasonEventSummary))] : []),
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
          <h1>{series.name}</h1>
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

      <Momento
        data={momento}
        now={now}
        simulated={isSimulatedNow()}
        broadcasts={(momentoEvent?.broadcasts ?? []).map((b) => ({ name: b.name }))}
        tiemposUrl={momentoEvent?.broadcasts.find((b) => b.kind === "timing")?.url}
      />
      {(momento.modo === "en-pista" || momento.modo === "finde") && <AutoRefresh everyMs={60_000} />}
      <AgregarCalendario kind="categoria" id={series.id} />

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
        {clases.length > 0 ? (
          <div>
            <span>Clases</span>
            <strong>{clases.length}</strong>
            <small>en cada fecha</small>
          </div>
        ) : (
          <>
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
          </>
        )}
        <div>
          <span>Próxima</span>
          <strong>{next ? raceDay(next).value : "—"}</strong>
          {next && <small>{raceDay(next).note}</small>}
        </div>
      </section>

      <section className="section-block category-current">
        {clases.length > 0 ? (
          <div>
            <SectionTitle title="Clases y campeonatos" />
            <div className="clase-grid">
              {clases.map((c) => {
                const standing = season.getClassStanding(series.id, c.id);
                const top = standing?.status === "calculado" ? standing.rows[0] : undefined;
                const lastFinal = events
                  .flatMap((e) => e.sessions.filter((x) => x.classId === c.id && x.kind === "final" && x.results?.length).map((x) => ({ e, x })))
                  .at(-1);
                return (
                  <Link key={c.id} href={`/categorias/${series.id}/${c.id}`} className="clase-card list-link" style={{ "--cat": c.color } as CSSProperties}>
                    <span className="clase-card-head">
                      <ClassSeal clase={c} />
                      <strong>{c.name}</strong>
                    </span>
                    {top ? (
                      <b>
                        Lidera {top.driver} · {top.points} pts
                      </b>
                    ) : (
                      <b>Sin campeonato publicado</b>
                    )}
                    <small>
                      {top ? `Calculado por Fierros, tras la fecha ${standing!.asOfRound}` : "Ver resultados de cada fecha"}
                      {lastFinal ? ` · última final: ${lastFinal.x.results![0].driver} (fecha ${lastFinal.e.round})` : ""}
                    </small>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
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
        )}
        <aside>
          {events.length > 0 ? (
            <CalendarioPlegable total={events.length} color={series.color}>
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
            </CalendarioPlegable>
          ) : (
            <div className="calendar-tape" style={{ borderTopColor: series.color }}>
              <h2>Calendario</h2>
              <p className="empty-state">Sin fechas cargadas.</p>
            </div>
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

      {nuestros.length > 0 && (
        <section className="section-block nuestros" aria-labelledby="nuestros-title">
          <SectionTitle id="nuestros-title" title={series.scope === "internacional" ? `Argentinos en ${series.short}` : `Pilotos de ${series.short} con ficha`} />
          <ul className="nuestros-list">
            {nuestros.map((d) => {
              const pos = season.getStandingPosition(d);
              const last = season.getDriverResults(d.slug, now)[0];
              return (
                <li key={d.slug}>
                  <Link href={`/pilotos/${d.slug}`} className="list-link">
                    <strong>{d.name}</strong>
                    <span>{d.team}</span>
                    <em>{pos ? `${pos.position}.º en el campeonato · ${pos.points} pts` : "Sin posición en el campeonato todavía"}</em>
                    <em>{last ? `Último resultado: ${last.row.pos}.º · ${last.session.name}, ${last.event.circuit.city}` : "Sin resultados cargados todavía"}</em>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <NotesBlock notas={await notesForSeries(series.id)} title={`Notas de ${series.short}`} />

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
