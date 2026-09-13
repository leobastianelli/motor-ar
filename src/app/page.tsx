import Link from "next/link";
import { Agenda } from "@/components/agenda";
import { CatMark, Code, SectionTitle, StateTag } from "@/components/pista";
import { eventStart, getDriversAbroad, getNow, getSeason, getSeries, ms, weekendWindow } from "@/lib/data";
import { dayKey, driverCode, fmtDayNum, fmtDayShort, fmtMonthLong, fmtMonthShort, fmtTime, minutesLeft, surname } from "@/lib/format";

export const revalidate = 60;

export default async function Home() {
  const now = getNow();
  const season = await getSeason();
  const { days, to } = weekendWindow(now);
  const items = season.getWeekendItems(now);
  const live = season.getLiveItems(now)[0];
  const todayKey = dayKey(now);
  const isWeekend = days.some((d) => d.key === todayKey);
  const remaining = items.filter((i) => i.status !== "done" && (!isWeekend || dayKey(i.session.start) === todayKey)).length;
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

  let lede = items.length === 0 ? "No hay carreras cargadas para este fin de semana." : isWeekend ? `Quedan ${remaining} sesiones hoy.` : `Hay ${items.length} sesiones este fin de semana.`;
  if (nextArg) {
    const sameDay = dayKey(nextArg.session.start) === todayKey;
    lede +=
      nextArg.session.timeKnown === false
        ? ` La próxima con un argentino es ${sameDay ? "hoy" : `el ${fmtDayShort(nextArg.session.start).toLowerCase()}`}.`
        : ` La próxima con un argentino arranca ${sameDay ? "a las" : `el ${fmtDayShort(nextArg.session.start).toLowerCase()} a las`} ${fmtTime(nextArg.session.start)}.`;
  }

  return (
    <>
      <section className="weekend-head">
        <div>
          <h1>
            Este
            <br />
            finde
          </h1>
          <p className="hero-date">
            <b>
              {fmtDayNum(days[0].iso)}–{fmtDayNum(days[2].iso)}
            </b>{" "}
            {fmtMonthLong(days[2].iso)}
          </p>
        </div>
        <p className="lede">{lede} Todos los horarios son de Argentina.</p>
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
