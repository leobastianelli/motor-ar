import { puestoEnClase } from "@/lib/clase.mjs";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { MomentoDelPiloto, ProximaDelPiloto, type Transmisiones } from "@/components/en-vivo";
import { CategoryLabel, PhotoCredit, SectionTitle } from "@/components/pista";
import { colapintoData, finishLabel, quotes, raceCode, raceName, recentMilestones, statusLabel, type ColapintoData } from "@/lib/colapinto";
import { getAllDrivers, getDriver, getIndexedDriver, getNow, getSeason, getSeries, isSimulatedNow, type Season } from "@/lib/data";
import { fmtDayNum, fmtDayShort, fmtMonthShort } from "@/lib/format";
import { NotesBlock } from "@/components/notas";
import { notesForDriver } from "@/lib/notas";
import { getPhoto } from "@/lib/photos";
import { isProvisional } from "@/lib/provisorio.mjs";
import { driverKey } from "@/lib/sources/driver-index.mjs";
import { breadcrumb, isoDate, JsonLd } from "@/components/json-ld";
import { descripcionPiloto, tituloPiloto } from "@/lib/seo-titulos.mjs";
import { OG_DEFAULTS } from "@/lib/site";
import { fechasDeCategoria } from "@/lib/snapshot.mjs";
import type { IndexedDriver } from "@/lib/data";
import type { Driver } from "@/lib/types";

// Lo que depende de la hora (el momento del piloto con su fila en cada sesión, "próxima sesión") se dibuja en el navegador con la hora real
// (src/components/en-vivo.tsx): la regeneración por tiempo puede ser lenta. Los datos nuevos invalidan la página por evento (/api/refresh).
// El título y la descripción para buscadores salen del momento a la hora de la última regeneración: pueden tener hasta 15 minutos de atraso.
export const revalidate = 900;

// Sólo se prerenderizan las fichas curadas: las ~630 del índice se generan en la primera visita y quedan en la caché de ISR (dynamicParams sigue en true;
// un slug que no está en el índice da 404 igual). Prerenderizarlas todas multiplicaba el tamaño de cada deploy, y son muchos por mes.
export function generateStaticParams() {
  return getAllDrivers().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata(props: PageProps<"/pilotos/[slug]">): Promise<Metadata> {
  const slug = (await props.params).slug;
  const curated = getDriver(slug);
  const indexed = curated ? undefined : getIndexedDriver(slug);
  const name = curated?.name ?? indexed?.name;
  if (!name) return { title: "Piloto" };
  const seriesNames = (curated ? [curated.seriesId] : (indexed?.series ?? [])).map((id) => getSeries(id)?.name).filter(Boolean).join(", ");
  const season = await getSeason();
  const fallback = indexed
    ? indexedSummary(indexed, season)
    : `${name}${seriesNames ? ` (${seriesNames})` : ""}: ${curated?.tagline ?? ""} Temporada 2026, campeonato y resultados fecha por fecha.`;
  // Título y descripción salen del momento del piloto (src/lib/seo-titulos.mjs) y se regeneran con la página. Sólo dicen "hoy" o
  // "horarios en <ciudad>" si esa fecha es suya: ficha con equipo, o figura en los resultados.
  const now = getNow();
  const seriesIds = curated ? [curated.seriesId] : [...(indexed?.series ?? [])];
  const keys = curated ? driverKeys(curated) : (indexed?.keys ?? [indexed!.key]);
  const momento = season.getMomentoPiloto(seriesIds, keys, now);
  const corre = curated ? Boolean(curated.team) || momento.participa : momento.participa;
  const fecha = momento.fecha ? season.getEvent(momento.fecha.id) : undefined;
  const title = tituloPiloto(name, now.slice(0, 4), momento, now, corre);
  const description = descripcionPiloto(name, momento, { broadcasts: fecha?.broadcasts, fallback, corre });
  return { title, description, openGraph: { title, description, ...OG_DEFAULTS }, alternates: { canonical: `/pilotos/${slug}` } };
}

const RACES = new Set(["final", "carrera", "sprint"]);

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Resumen escrito con los datos de la temporada, para la ficha automática y su descripción en buscadores. */
function indexedSummary(entry: IndexedDriver, season: Season) {
  const stats = season.getDriverSeason(entry);
  const keys = entry.keys ?? [entry.key];
  const ids = [...entry.series].sort((a, b) => (stats.bySeries[b]?.races ?? 0) - (stats.bySeries[a]?.races ?? 0));
  const main = getSeries(ids[0]);
  if (!main) return `${entry.name}: resultados de la temporada 2026.`;
  const s = stats.bySeries[main.id];
  const number = entry.numbers[main.id];
  const team = entry.teams[main.id];
  const standing = season.getDriverStanding(main.id, keys);
  const others = ids.slice(1).map((id) => getSeries(id)?.name).filter(Boolean);
  return [
    `${entry.name} corre en ${main.name}${number ? ` con el número ${number}` : ""}${team ? `, con ${team}` : ""}.`,
    s && !main.partialResults ? `En 2026 lleva ${count(s.races, "carrera", "carreras")}, ${count(s.wins, "victoria", "victorias")} y ${count(s.podiums, "podio", "podios")}${s.best ? `; su mejor resultado es un ${s.best}.º puesto` : ""}.` : "",
    standing
      ? standing.classLabel
        ? `En el campeonato de su clase va ${standing.pos}.º con ${standing.points} puntos (${standing.classLabel}).`
        : `Está ${standing.pos}.º en el campeonato${standing.classId ? ` de ${main.classes?.find((c) => c.id === standing.classId)?.name ?? "su clase"}` : ""} con ${standing.points} puntos.`
      : "",
    others.length ? `También corrió en ${others.join(" y ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * "Este fin de semana en <ciudad>": cada sesión con la posición del piloto. Los resultados vienen del servidor; el navegador sólo
 * recalcula estados y horas. Un piloto sin ficha sólo lo muestra si figura en los resultados de la fecha (si no, no sabemos que corre).
 */
function MomentoPiloto({ seriesIds, keys, season, now, confirmado, slug }: { seriesIds: string[]; keys: string[]; season: Season; now: string; confirmado: boolean; slug: string }) {
  const events = recorteDelPiloto(season, seriesIds, keys, now);
  const transmisiones: Transmisiones = Object.fromEntries(events.map((e) => [e.id, { names: e.broadcasts.map((b) => b.name), timingUrl: e.broadcasts.find((b) => b.kind === "timing")?.url }]));
  return <MomentoDelPiloto events={events} keys={keys} failures={season.failures} confirmado={confirmado} slug={slug} transmisiones={transmisiones} serverNow={now} simulated={isSimulatedNow()} />;
}

/** Las fechas de sus categorías que el navegador necesita para calcular el momento del piloto (src/lib/snapshot.mjs), con su fila en cada sesión. */
function recorteDelPiloto(season: Season, seriesIds: string[], keys: string[], now: string) {
  return seriesIds.flatMap((id) => fechasDeCategoria(season.getEventsForSeries(id), now, { keys: new Set(keys) }));
}

/** Ficha armada sólo con resultados: categoría, estadísticas de la temporada y cada sesión. Sin datos biográficos. */
async function IndexedDriverPage({ slug }: { slug: string }) {
  const entry = getIndexedDriver(slug);
  if (!entry) notFound();
  const season = await getSeason();
  const stats = season.getDriverSeason(entry);
  const seriesIds = [...entry.series].sort((a, b) => (stats.bySeries[b]?.races ?? 0) - (stats.bySeries[a]?.races ?? 0));
  const main = getSeries(seriesIds[0])!;

  return (
    <>
      <section className="weekend-head driver-auto-head" style={{ "--cat": main.color } as CSSProperties}>
        <div>
          <CategoryLabel series={main} detail={entry.teams[main.id]} href={`/categorias/${main.id}`} />
          <h1>
            {entry.name}
            {entry.numbers[main.id] && <span className="hero-date">#{entry.numbers[main.id]}</span>}
          </h1>
          <p className="driver-auto-summary">{indexedSummary(entry, season)}</p>
        </div>
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Person",
              name: entry.name,
              jobTitle: "Piloto de automovilismo",
              nationality: { "@type": "Country", name: "Argentina" },
              ...(entry.teams[main.id] ? { memberOf: { "@type": "SportsTeam", name: entry.teams[main.id] } } : {}),
              description: indexedSummary(entry, season),
            },
            breadcrumb([
              ["Inicio", "/"],
              ["Pilotos", "/pilotos"],
              [entry.name, `/pilotos/${entry.slug}`],
            ]),
          ],
        }}
      />

      <MomentoPiloto seriesIds={entry.series} keys={entry.keys ?? [entry.key]} season={season} now={getNow()} confirmado={false} slug={entry.slug} />
      <SeasonBlocks keys={entry.keys ?? [entry.key]} season={season} />
      <NotesBlock notas={await notesForDriver(entry.slug)} title={`Notas sobre ${entry.name}`} />
    </>
  );
}

/** Temporada de un piloto desde los resultados: un bloque por categoría con estadísticas y cada sesión, fecha por fecha. */
function SeasonBlocks({ keys, season }: { keys: string[]; season: Season }) {
  const stats = season.getDriverSeason({ key: keys[0], keys });
  const seriesIds = Object.keys(stats.bySeries).sort((a, b) => stats.bySeries[b].races - stats.bySeries[a].races);
  return (
    <>
      {seriesIds.map((id) => {
        const series = getSeries(id);
        const s = stats.bySeries[id];
        if (!series || !s) return null;
        const standing = season.getDriverStanding(id, keys);
        // En una categoría con clases, el campeonato es el de su clase; si la clase no tiene tabla publicada, lo dice.
        const claseName = standing?.classId ? series.classes?.find((c) => c.id === standing.classId)?.name : undefined;
        const campeonato = [
          "Campeonato",
          standing ? `${standing.pos}.º` : "—",
          standing ? `${standing.points} pts${standing.classLabel ? ` · ${standing.classLabel}` : claseName ? ` · ${claseName}` : ""}` : series.classes?.length ? "Sin campeonato publicado" : "",
        ];
        const byEvent = Map.groupBy(
          stats.results.filter((r) => r.event.seriesId === id),
          (r) => r.event.id,
        );
        return (
          <section key={id} className="section-block driver-auto-series" style={{ "--cat": series.color } as CSSProperties}>
            <SectionTitle title={<Link href={`/categorias/${series.id}`}>{series.name} 2026</Link>} />
            <div className="driver-auto-stats">
              {(series.partialResults
                ? [
                    campeonato,
                    ["Carreras", "—", ""],
                    ["Victorias", "—", ""],
                    ["Podios", "—", ""],
                    ["Poles", "—", ""],
                    ["Mejor resultado", "—", ""],
                  ]
                : [
                    campeonato,
                    ["Carreras", String(s.races), ""],
                    ["Victorias", String(s.wins), ""],
                    ["Podios", String(s.podiums), ""],
                    ["Poles", String(s.poles), ""],
                    ["Mejor resultado", s.best ? `${s.best}.º` : "—", ""],
                  ]
              ).map(([label, value, note]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  {note && <small>{note}</small>}
                </div>
              ))}
            </div>
            {series.partialResults && <p className="source-note">{series.partialResults}</p>}
            <div className="driver-auto-results">
              {[...byEvent.values()].reverse().map((rows) => {
                const { event } = rows[0];
                return (
                  <article key={event.id}>
                    <Link href={`/eventos/${event.id}`} className="list-link">
                      <strong>{event.name}</strong>
                      <span>{fmtDayShort(event.sessions.at(-1)!.start)}</span>
                    </Link>
                    <ul>
                      {rows.map(({ session, row }) => (
                        <li key={session.id} className={RACES.has(session.kind) ? "race" : undefined}>
                          <span>{session.name}</span>
                          <b>{row.positionText && !/^\d+$/.test(row.positionText) ? row.positionText : `${puestoEnClase(session.results, row)?.pos ?? row.pos}.º`}</b>
                          <small>
                            {[
                              // Multiclase (GT3, la general del Rally): el puesto grande es el de su clase; la general va acá.
                              puestoEnClase(session.results, row) ? `en ${row.class} · ${row.pos}.º en la general` : "",
                              row.status ?? row.gap,
                              isProvisional(session) ? "provisorio" : "",
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </small>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}

function age(born: string, now: string) {
  const m = born.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const today = new Date(now);
  let years = today.getFullYear() - Number(m[3]);
  if (today.getMonth() + 1 < Number(m[2]) || (today.getMonth() + 1 === Number(m[2]) && today.getDate() < Number(m[1]))) years--;
  return years;
}

function NextRace({ driver, now, season }: { driver: Driver; now: string; season: Season }) {
  // Sin equipo confirmado (driver.team vacío, p. ej. entre butacas) no hay manera de saber si va a estar en la
  // próxima fecha del calendario de la categoría: mejor no decir nada que dar por hecho que corre.
  if (!driver.team) return null;
  const keys = driverKeys(driver);
  return <ProximaDelPiloto events={recorteDelPiloto(season, [driver.seriesId], keys, now)} keys={keys} failures={season.failures} serverNow={now} simulated={isSimulatedNow()} />;
}

const driverKeys = (d: Driver) => [d.name, ...(d.aliases ?? [])].map((n) => driverKey(n));

function ChampionshipChart({ points }: { points: { round: number; position: number }[] }) {
  const [x0, x1, y0, y1] = [60, 630, 35, 215];
  const positions = points.map((p) => p.position);
  const lo = Math.min(...positions) - 2;
  const hi = Math.max(...positions) + 2;
  const y = (pos: number) => y0 + ((pos - lo) / (hi - lo)) * (y1 - y0);
  const x = (i: number) => (points.length === 1 ? x0 : x0 + (i * (x1 - x0)) / (points.length - 1));
  const ticks = [0, 1, 2, 3].map((k) => Math.round(lo + (k * (hi - lo)) / 3));
  const first = points[0];
  const last = points.at(-1)!;

  return (
    <figure className="champ-chart">
      <figcaption>
        <strong>Posición en el campeonato</strong>
        <span>
          De {first.position}.º a {last.position}.º en {points.length} fechas
        </span>
      </figcaption>
      <svg viewBox="0 0 680 270" role="img" aria-label={`Evolución en el campeonato: de ${first.position}.º en la fecha 1 a ${last.position}.º en la fecha ${last.round}`}>
        <g className="grid-lines">
          {ticks.map((t) => (
            <g key={t}>
              <path d={`M55 ${y(t)}H650`} />
              <text x="12" y={y(t) + 5}>{`${t}.º`}</text>
            </g>
          ))}
        </g>
        <path className="chart-line" d={points.map((p, i) => `${i ? "L" : "M"}${x(i)} ${y(p.position)}`).join(" ")} />
        <g className="chart-points">
          {points.map((p, i) => (
            <circle key={p.round} cx={x(i)} cy={y(p.position)} r={i === points.length - 1 ? 9 : 7}>
              <title>{`Fecha ${p.round}: ${p.position}.º`}</title>
            </circle>
          ))}
        </g>
      </svg>
    </figure>
  );
}

function DuelBar({ label, mine, theirs }: { label: string; mine: number; theirs: number }) {
  const pct = mine + theirs === 0 ? 50 : Math.round((mine / (mine + theirs)) * 100);
  return (
    <div>
      <span>{label}</span>
      <b>{mine}</b>
      <i style={{ background: `linear-gradient(90deg,var(--blue-deep) ${pct}%,#aaa ${pct}%)` }} />
      <b>{theirs}</b>
    </div>
  );
}

const milestoneDate = (date: string) => (date.length === 4 ? date : `${fmtDayNum(`${date}T12:00:00-03:00`).padStart(2, "0")} ${fmtMonthShort(`${date}T12:00:00-03:00`)}`);

function ColapintoSections({ data }: { data: ColapintoData }) {
  const stats = data.seasonStats(2026);
  const races = data.seasonRaces(2026);
  const maxGain = stats.topGains[0]?.gain ?? 1;
  const quote = quotes.at(-1);

  return (
    <>
      <section className="section-block season-story">
        <SectionTitle title="Carrera a carrera">
          <div className="legend">
            <i className="gain" /> Mejor resultado <i className="loss" /> No terminó
          </div>
        </SectionTitle>
        <div className="race-strip">
          {races.map((r) => {
            const classified = r.finishPos !== null;
            const gain = classified && r.grid > 0 ? r.grid - r.finishPos! : null;
            const isBest = stats.best?.round === r.round;
            return (
              <article key={r.round} className={isBest ? "best" : !classified ? "loss" : undefined} title={`${raceName(r.race)} · largó ${r.grid || "desde boxes"}, terminó ${finishLabel(r)}`}>
                <span>{raceCode(r.race)}</span>
                <b>{r.grid || "PL"}</b>
                <em>→</em>
                <strong>{finishLabel(r)}</strong>
                <small>
                  {classified
                    ? `${gain === null ? "" : gain > 0 ? `+${gain} · ` : gain < 0 ? `−${-gain} · ` : "= · "}${r.points} ${r.points === 1 ? "pt" : "pts"}`
                    : statusLabel(r.status)}
                </small>
              </article>
            );
          })}
        </div>
      </section>

      <section className="performance">
        <div className="section-block">
          <SectionTitle title="Progreso" inverse />
          <div className="chart-grid">
            <ChampionshipChart points={data.standings2026} />
            <div className="duel">
              <h3>Contra {stats.teammate}</h3>
              <DuelBar label="Clasificación" mine={stats.qualiDuel.ahead} theirs={stats.qualiDuel.behind} />
              <DuelBar label="Carrera" mine={stats.raceDuel.ahead} theirs={stats.raceDuel.behind} />
              <p>
                Terminó adelante de {stats.teammate} en <strong>{stats.raceDuel.ahead}</strong> de {stats.raceDuel.ahead + stats.raceDuel.behind} carreras.
              </p>
            </div>
            <div className="gains">
              <h3>Puestos en carrera</h3>
              <b>
                {stats.netGain > 0 ? "+" : ""}
                {stats.netGain}
              </b>
              <span>balance neto de largada a llegada</span>
              <ol>
                {stats.topGains.map((g) => (
                  <li key={g.code}>
                    <span>{g.name}</span>
                    <i style={{ "--w": `${Math.round((g.gain / maxGain) * 88)}%` } as CSSProperties} />
                    <b>+{g.gain}</b>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="section-block driver-editorial">
        <div>
          <SectionTitle title="Declaraciones" />
          {quote?.quote && (
            <blockquote>
              “{quote.quote.text}”
              <cite>
                {quote.quote.context} · {quote.title}.{" "}
                <a href={quote.source} target="_blank" rel="noreferrer">
                  Fuente
                </a>
                <span className="pill-quote-note">Cita original en inglés.</span>
              </cite>
            </blockquote>
          )}
        </div>
        <aside>
          <h3>Últimos hitos</h3>
          {recentMilestones.map((m) => (
            <a key={m.date} href={m.source} target="_blank" rel="noreferrer">
              <time>{milestoneDate(m.date)}</time>
              <strong>{m.title}</strong>
            </a>
          ))}
        </aside>
      </section>
    </>
  );
}

export default async function DriverPage(props: PageProps<"/pilotos/[slug]">) {
  const slug = (await props.params).slug;
  const driver = getDriver(slug);
  if (!driver) return <IndexedDriverPage slug={slug} />;
  const now = getNow();
  const season = await getSeason();
  const series = getSeries(driver.seriesId)!;
  const photo = getPhoto(driver.slug);
  const isColapinto = driver.slug === "franco-colapinto";
  const data = isColapinto ? colapintoData(season) : null;
  const years = age(driver.born, now);

  const stages = data
    ? data.careerStages()
    : driver.career.map((c) => ({ years: c.year, title: c.series, text: c.highlight, stat: c.team, major: false })).reverse();

  let ribbon: { label: string; value: string; note?: string }[];
  const classChamps = season.getClassChampionships(driver);
  if (data) {
    const trend = data.championshipTrend();
    const stats = data.seasonStats(2026);
    ribbon = [
      // "Temporada 2026" no dice nada que no diga ya el resto de la página: se saca.
      { label: "Campeonato", value: `${trend.position}.º`, note: trend.label },
      { label: "Puntos", value: String(stats.points) },
      { label: "Mejor resultado", value: stats.best ? `${stats.best.finishPos}.º` : "—", note: stats.best ? raceName(stats.best.race) : undefined },
      { label: `Vs. ${stats.teammate}`, value: `${stats.raceDuel.ahead}–${stats.raceDuel.behind}`, note: "en carrera" },
    ];
  } else {
    const standing = season.getStandingPosition(driver);
    const enClase = season.getClassChampionships(driver)[0];
    ribbon = [
      { label: "Campeonato", value: standing ? `${standing.position}.º` : "—", note: standing?.label },
      { label: "Puntos", value: standing ? String(standing.points) : "—" },
      // Victorias contadas desde los resultados de la temporada, igual que en los bloques de abajo.
      { label: "Victorias", value: series.partialResults ? "—" : String(season.getDriverSeason({ key: "", keys: [driver.name, ...(driver.aliases ?? [])].map((n) => driverKey(n)) }).bySeries[driver.seriesId]?.wins ?? 0), note: series.partialResults ? "sin la temporada completa" : enClase ? `en la ${enClase.class}` : undefined },
      { label: "Categoría", value: series.short, note: driver.team },
    ];
  }

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Person",
              name: driver.name,
              ...(isoDate(driver.born) ? { birthDate: isoDate(driver.born) } : {}),
              birthPlace: { "@type": "Place", name: driver.hometown },
              nationality: { "@type": "Country", name: "Argentina" },
              jobTitle: "Piloto de automovilismo",
              ...(driver.team ? { memberOf: { "@type": "SportsTeam", name: driver.team } } : {}),
              description: driver.tagline,
            },
            breadcrumb([
              ["Inicio", "/"],
              ["Pilotos", "/pilotos"],
              [driver.name, `/pilotos/${driver.slug}`],
            ]),
          ],
        }}
      />
      <section className={`driver-hero${photo ? "" : " no-photo"}`}>
        {photo && (
          <div className="driver-photo">
            <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} sizes="(max-width: 800px) 100vw, 56vw" priority />
            <PhotoCredit photo={photo} />
          </div>
        )}
        <div className="driver-title">
          <CategoryLabel series={series} detail={driver.team} href={`/categorias/${series.id}`} />
          <p className="kicker">
            {driver.hometown}
            {years !== null && ` · ${years} años`}
          </p>
          <h1>
            {driver.name.split(" ")[0]}
            <br />
            {driver.name.split(" ").slice(1).join(" ")}
          </h1>
          {driver.number !== undefined && <b className="mega-number">{driver.number}</b>}
        </div>
        <NextRace driver={driver} now={now} season={season} />
      </section>

      {driver.team && <MomentoPiloto seriesIds={[driver.seriesId]} keys={driverKeys(driver)} season={season} now={now} confirmado slug={driver.slug} />}

      <section className="season-ribbon">
        {ribbon.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            {item.note && <small>{item.note}</small>}
          </div>
        ))}
      </section>

      {classChamps.length > 0 && (
        // GT World Challenge: el campeonato de su clase en cada uno de los tres campeonatos (temporada completa, Endurance y Sprint).
        <section className="season-ribbon" aria-label={`Campeonatos de la ${classChamps[0].class}`}>
          {classChamps.map((c) => (
            <div key={c.cup}>
              <span>
                {c.class} · {c.cupLabel}
              </span>
              <strong>{c.final && c.pos === 1 ? "Campeón" : `${c.pos}.º`}</strong>
              <small>
                {c.points} pts{c.atrasada ? " · la tabla oficial todavía no suma la última carrera" : c.final ? " · temporada terminada" : ""}
              </small>
            </div>
          ))}
        </section>
      )}

      {data && <ColapintoSections data={data} />}
      {!data && <SeasonBlocks keys={[driver.name, ...(driver.aliases ?? [])].map((n) => driverKey(n))} season={season} />}

      {stages.length > 0 && (
        <section className="career">
          <div className="section-block">
            <SectionTitle title="Trayectoria" inverse />
            <div className="timeline" style={{ "--n": stages.length } as CSSProperties}>
              {stages.map((s) => (
                <article key={`${s.years}-${s.title}`} className={s.major ? "major" : undefined}>
                  <time>{s.years}</time>
                  <b>{s.title}</b>
                  <p>{s.text}</p>
                  <span>{s.stat}</span>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <NotesBlock notas={await notesForDriver(driver.slug)} title={`Notas sobre ${driver.name}`} />

      {!data && (
        <section className="section-block">
          <p className="empty-state">
            Todavía no cargamos el carrera a carrera de {driver.name}. Los resultados de {series.name} aparecen en cada evento.
          </p>
        </section>
      )}
    </>
  );
}
