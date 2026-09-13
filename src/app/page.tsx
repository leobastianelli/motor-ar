import Link from "next/link";
import { Agenda } from "@/components/agenda";
import { CatMark, Code, SectionTitle, StateTag } from "@/components/pista";
import { eventStart, getDriversAbroad, getNow, getSeason, getSeries, ms, weekendWindow } from "@/lib/data";
import { dayKey, driverCode, fmtDayNum, fmtDayShort, fmtMonthShort, fmtTime, minutesLeft, surname } from "@/lib/format";

export const revalidate = 60;

export default async function Home() {
  const now = getNow();
  const season = await getSeason();
  const { items, days, to } = season.getAgenda(now);
  const live = season.getLiveItems(now)[0];
  const todayKey = dayKey(now);
  const nextArg = season.getNextArgentineSession(now);

  const runners = getDriversAbroad().map((driver) => ({
    driver,
    series: getSeries(driver.seriesId)!,
    status: season.getRunnerStatus(driver, now),
    standing: season.getStandingPosition(driver),
  }));
  const [feature, ...lines] = runners;

  const podium = season.getRecentResults(now, "nacional")[0];
  const [highlight, ...notes] = season.getArgentineHighlights(now);
  const nextEvents = season.getUpcomingEvents(now).filter((e) => ms(eventStart(e)) >= ms(to)).slice(0, 3);
  const liveUrl = live?.event.broadcasts.find((b) => b.url)?.url;

  // Cabecera en una línea de datos: estado del día y próxima sesión con argentinos. Sin prosa.
  const when = (s: { start: string; timeKnown?: boolean }) => {
    const day = dayKey(s.start) === todayKey ? "hoy" : fmtDayShort(s.start).toLowerCase();
    return s.timeKnown === false ? day : `${day} ${fmtTime(s.start)}`;
  };
  const first = items[0];
  const status = live
    ? `En vivo: ${live.series.short} · ${live.session.name}`
    : first
      ? `Arranca ${when(first.session)}: ${first.series.short} · ${first.session.name}`
      : "Sin carreras cargadas";
  const nextLabel = nextArg && nextArg !== first ? when(nextArg.session) : undefined;

  // "Este finde" si lo que sigue cae en el fin de semana en curso (o el inminente), "Próximo finde" si cae en el siguiente.
  const inWindow = (win: { key: string }[]) => days.length > 0 && days.every((d) => win.some((w) => w.key === d.key));
  const thisWeekend = weekendWindow(now).days;
  const nextWeekend = weekendWindow(new Date(ms(thisWeekend[2].iso) + 2 * 86400000).toISOString()).days;
  const title = inWindow(thisWeekend) ? "Este finde" : inWindow(nextWeekend) ? "Próximo finde" : "Lo que sigue";
  const range =
    days.length === 0
      ? ""
      : days.length === 1
        ? `${fmtDayNum(days[0].iso)} ${fmtMonthShort(days[0].iso)}`
        : `${fmtDayNum(days[0].iso)}–${fmtDayNum(days.at(-1)!.iso)} ${fmtMonthShort(days.at(-1)!.iso)}`;

  return (
    <>
      <section className="weekend-head">
        <h1>
          {title} <span className="hero-date">{range}</span>
        </h1>
        <p className="lede">
          <span>{status}</span>
          {nextLabel && (
            <span>
              Próximo argentino: <b>{nextLabel}</b>
            </span>
          )}
          <span className="lede-tz">Hora ARG</span>
        </p>
      </section>

      {live && (
        <section className="live-board" aria-labelledby="live-title">
          <div className="live-flag">
            <span className="pulse" />
            <span id="live-title">En vivo</span>
            <b>{minutesLeft(live.session, now)}′</b>
          </div>
          <div className="live-main">
            <CatMark series={live.series} />
            <div>
              <p className="series">
                {live.series.name} · {live.event.circuit.city}
              </p>
              <h2>{live.session.name}</h2>
              <p className="lap">
                Faltan {minutesLeft(live.session, now)} min <span>largó {fmtTime(live.session.start)}</span>
              </p>
            </div>
          </div>
          <ol className="timing-mini">
            {live.session.results?.length ? (
              live.session.results.slice(0, 3).map((r) => (
                <li key={r.pos} className={r.driverSlug ? "argentine" : undefined}>
                  <b>{r.pos}</b>
                  <span className="driver-code">{driverCode(r)}</span>
                  <span>{r.gap}</span>
                </li>
              ))
            ) : (
              <li>
                <StateTag kind="no-data">Sin tiempos en vivo</StateTag>
              </li>
            )}
          </ol>
          <div className="watch">
            <span>Se ve por</span>
            <strong>{live.event.broadcasts.map((b) => b.name).join(" · ") || "Sin datos de transmisión"}</strong>
            {liveUrl && (
              <a href={liveUrl} target="_blank" rel="noreferrer">
                Abrir transmisión <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        </section>
      )}

      {feature && (
        <section className="section-block nuestros" aria-labelledby="nuestros-title">
          <SectionTitle id="nuestros-title" title="Los nuestros">
            <Link href="/pilotos">Ver todos</Link>
          </SectionTitle>
          <div className="arg-runners">
            <article className="runner-feature">
              <Link href={`/pilotos/${feature.driver.slug}`} className="runner-number" aria-label={feature.driver.name}>
                {feature.driver.number ?? "—"}
              </Link>
              <div>
                <p className="series">
                  {feature.driver.name} · {feature.series.name}
                </p>
                <h3>
                  <Link href={feature.status.href} className="list-link">
                    {feature.status.headline}
                  </Link>
                </h3>
                {feature.standing && (
                  <p>
                    Va {feature.standing.position}.º en el campeonato con {feature.standing.points} puntos.
                  </p>
                )}
              </div>
              <StateTag kind={feature.status.state}>{feature.status.stateLabel}</StateTag>
            </article>
            {lines.map((r) => (
              <Link key={r.driver.slug} href={`/pilotos/${r.driver.slug}`} className="runner-line list-link">
                <b>{r.driver.number ?? "—"}</b>
                <div>
                  <strong>{r.driver.name}</strong>
                  <span>
                    {r.series.name} · {r.status.detail || r.driver.team}
                  </span>
                </div>
                <p>
                  <StateTag kind={r.status.state}>{r.status.stateLabel}</StateTag> {r.status.headline}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Agenda items={items} days={days} today={todayKey} now={now} />

      <section className="results-band">
        <div className="section-block">
          <SectionTitle title="Resultados" inverse>
            <Link href="/calendario">Calendario</Link>
          </SectionTitle>
          <div className="result-layout">
            {podium ? (
              <article className="podium">
                <div className="podium-head">
                  <Code series={podium.series} />
                  <div>
                    <strong>
                      <Link href={`/eventos/${podium.event.id}`} className="list-link">
                        {podium.session.name} · {podium.event.circuit.city}
                      </Link>
                    </strong>
                    <span>
                      {podium.series.name} · {fmtDayNum(podium.session.start)} {fmtMonthShort(podium.session.start)}
                    </span>
                  </div>
                </div>
                <ol>
                  {podium.session.results!.slice(0, 3).map((r) => (
                    <li key={r.pos}>
                      <b>{r.pos}</b>
                      <div>
                        <strong>{r.driver}</strong>
                        <span>{r.team}</span>
                      </div>
                      <time>{r.gap}</time>
                    </li>
                  ))}
                </ol>
              </article>
            ) : (
              <p className="empty-state">Sin resultados nacionales recientes.</p>
            )}

            {highlight ? (
              <Link href={`/eventos/${highlight.event.id}`} className="arg-highlight list-link">
                <span>Argentino destacado afuera</span>
                <b className="big-pos">{highlight.row.pos}.º</b>
                <h3>{highlight.row.driver}</h3>
                <p>
                  {highlight.session.name} de {highlight.series.name} en {highlight.event.circuit.city}.
                </p>
                {highlight.row.points !== undefined && highlight.row.points > 0 && (
                  <div className="delta positive">
                    +{highlight.row.points} <small>puntos</small>
                  </div>
                )}
              </Link>
            ) : (
              <div className="arg-highlight">
                <span>Argentino destacado afuera</span>
                <p>Sin resultados de argentinos afuera en la última semana.</p>
              </div>
            )}

            <div className="result-notes">
              {notes.slice(0, 2).map((n) => (
                <Link key={`${n.session.id}-${n.row.driver}`} href={`/eventos/${n.event.id}`}>
                  <span>
                    {n.series.name} · {n.event.circuit.city}
                  </span>
                  <strong>
                    {surname(n.row.driver)} terminó {n.row.pos}.º
                  </strong>
                  <small>{n.row.points ? `Sumó ${n.row.points} ${n.row.points === 1 ? "punto" : "puntos"}` : n.session.name}</small>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-block next-weeks">
        <SectionTitle title="Lo que viene">
          <Link href="/calendario">Ver calendario</Link>
        </SectionTitle>
        <div className="date-strip">
          {nextEvents.map((e) => {
            const s = getSeries(e.seriesId)!;
            const date = e.sessions.at(-1)!.start;
            return (
              <article key={e.id}>
                <time dateTime={date}>
                  <b>{fmtDayNum(date).padStart(2, "0")}</b> {fmtMonthShort(date)}
                </time>
                <Code series={s} />
                <div>
                  <strong>
                    <Link href={`/eventos/${e.id}`} className="list-link">
                      {e.circuit.city}
                    </Link>
                  </strong>
                  <span>
                    {s.name} · Fecha {e.round}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
