import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { CategoryLabel, PhotoCredit, SectionTitle } from "@/components/pista";
import { colapintoData, finishLabel, quotes, raceCode, raceName, recentMilestones, statusLabel, type ColapintoData } from "@/lib/colapinto";
import { getAllDrivers, getDriver, getNow, getSeason, getSeries, type Season } from "@/lib/data";
import { fmtDayNum, fmtDayShort, fmtMonthShort, fmtTime } from "@/lib/format";
import { getPhoto } from "@/lib/photos";
import type { Driver } from "@/lib/types";

export const revalidate = 60;

export function generateStaticParams() {
  return getAllDrivers().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata(props: PageProps<"/pilotos/[slug]">): Promise<Metadata> {
  return { title: getDriver((await props.params).slug)?.name ?? "Piloto" };
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
  const next = season.getNextRace(driver.seriesId, now);
  if (!next) return null;
  return (
    <div className="next-race">
      <span>Próxima carrera</span>
      <strong>{next.event.name}</strong>
      <time dateTime={next.session.start}>
        {fmtDayShort(next.session.start)} · {next.session.timeKnown === false ? "horario a confirmar" : fmtTime(next.session.start)}
      </time>
      <Link href={`/eventos/${next.event.id}`}>Ver evento</Link>
    </div>
  );
}

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
  const driver = getDriver((await props.params).slug);
  if (!driver) notFound();
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
  if (data) {
    const trend = data.championshipTrend();
    const stats = data.seasonStats(2026);
    ribbon = [
      { label: "Temporada", value: "2026" },
      { label: "Campeonato", value: `${trend.position}.º`, note: trend.label },
      { label: "Puntos", value: String(stats.points) },
      { label: "Mejor resultado", value: stats.best ? `${stats.best.finishPos}.º` : "—", note: stats.best ? raceName(stats.best.race) : undefined },
      { label: `Vs. ${stats.teammate}`, value: `${stats.raceDuel.ahead}–${stats.raceDuel.behind}`, note: "en carrera" },
    ];
  } else {
    const standing = season.getStandingPosition(driver);
    const label = season.getSeasonMeta(driver.seriesId).standingsLabel;
    ribbon = [
      { label: "Temporada", value: "2026" },
      { label: "Campeonato", value: standing ? `${standing.position}.º` : "—", note: label },
      { label: "Puntos", value: standing ? String(standing.points) : "—" },
      { label: "Victorias", value: standing?.wins === undefined ? "—" : String(standing.wins) },
      { label: "Categoría", value: series.short, note: driver.team },
    ];
  }

  return (
    <>
      <section className={`driver-hero${photo ? "" : " no-photo"}`}>
        {photo && (
          <div className="driver-photo">
            <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} sizes="(max-width: 800px) 100vw, 56vw" priority />
            <PhotoCredit photo={photo} />
          </div>
        )}
        <div className="driver-title">
          <CategoryLabel series={series} detail={driver.team} />
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

      <section className="season-ribbon">
        {ribbon.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            {item.note && <small>{item.note}</small>}
          </div>
        ))}
      </section>

      {data && <ColapintoSections data={data} />}

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
