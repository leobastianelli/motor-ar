import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionTitle } from "@/components/pista";
import { getAllSeries, getEventsForSeries, getHistory, getNextSession, getNow, getSeasonMeta, getSeries, getStandings } from "@/lib/data";
import { fmtDayNum, fmtMonthShort, surname } from "@/lib/format";
import type { CategoryHistory } from "@/lib/types";

export const revalidate = 60;

export function generateStaticParams() {
  return getAllSeries().map((s) => ({ slug: s.id }));
}

export async function generateMetadata(props: PageProps<"/categorias/[slug]">): Promise<Metadata> {
  return { title: getSeries((await props.params).slug)?.name ?? "Categoría" };
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

  const events = getEventsForSeries(series.id);
  const done = events.filter((e) => !getNextSession(e, now));
  const next = events.find((e) => getNextSession(e, now));
  const table = getStandings(series.id).slice(0, 10);
  const [leader, second] = table;
  const meta = getSeasonMeta(series.id);
  const history = getHistory(series.id);
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
            {series.org}. Calendario, campeonato
            {history ? ` y ${history.seasons} temporadas de archivo` : ""}, siempre en hora argentina.
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
              {table.map((row, i) => (
                <div key={row.driver} className={`champ-row${i === 0 ? " leader" : ""}`}>
                  <b>{row.pos}</b>
                  <div>
                    <strong>{row.driverSlug ? <Link href={`/pilotos/${row.driverSlug}`}>{row.driver}</Link> : row.driver}</strong>
                    <span>{row.team}</span>
                  </div>
                  <em>{row.wins === undefined ? "" : `${row.wins} ${row.wins === 1 ? "victoria" : "victorias"}`}</em>
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
                <li key={e.id} className={getNextSession(e, now) ? undefined : "done"}>
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
