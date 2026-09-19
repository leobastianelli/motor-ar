import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Agenda } from "@/components/agenda";
import { CatMark, CategoryLabel, Code, SectionTitle, StateTag } from "@/components/pista";
import { eventStart, getDriversAbroad, getNow, getSeason, getSeries, ms, weekendWindow, type HomeMode } from "@/lib/data";
import { dayKey, driverCode, fmtDayNum, fmtDayShort, fmtMonthShort, fmtTime, minutesLeft, raceWinner, surname } from "@/lib/format";

export const metadata: Metadata = { alternates: { canonical: "/" } };
export const revalidate = 60;

type SectionId = "live" | "nuestros" | "agenda" | "resultados" | "viene";

// El orden de la home depende del momento de la semana: primero lo que más probablemente se busca, pero siempre está todo.
const ORDER: Record<HomeMode, SectionId[]> = {
  live: ["live", "agenda", "nuestros", "resultados", "viene"],
  weekend: ["agenda", "nuestros", "resultados", "viene"],
  results: ["resultados", "nuestros", "agenda", "viene"],
  midweek: ["nuestros", "resultados", "agenda", "viene"],
};

// Acceso directo a cada categoría: mucha gente entra buscando una en particular. Primero las más buscadas.
const JUMP = ["f1", "tc", "tc2000", "tn", "tc-pista", "f2", "gt3", "tc-mouras", "tc-pick-up"];

export default async function Home() {
  const now = getNow();
  const season = await getSeason();
  const mode = season.getHomeMode(now);
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

  const latest = season.getRecentResults(now)[0];
  const podium = season.getRecentResults(now, "nacional")[0];
  const [highlight, ...notes] = season.getArgentineHighlights(now);
  const nextEvents = season.getUpcomingEvents(now).filter((e) => ms(eventStart(e)) >= ms(to)).slice(0, 3);
  const liveUrl = live?.event.broadcasts.find((b) => b.url && b.kind !== "timing")?.url;
  const timingUrl = live?.event.broadcasts.find((b) => b.kind === "timing")?.url;

  // ——— Cabecera: una franja de datos que cambia con el momento ———
  const when = (s: { start: string; timeKnown?: boolean }) => {
    const day = dayKey(s.start) === todayKey ? "hoy" : fmtDayShort(s.start).toLowerCase();
    return s.timeKnown === false ? day : `${day} ${fmtTime(s.start)}`;
  };
  const rangeOf = (list: { iso: string }[]) =>
    list.length === 0
      ? ""
      : list.length === 1
        ? `${fmtDayNum(list[0].iso)} ${fmtMonthShort(list[0].iso)}`
        : `${fmtDayNum(list[0].iso)}–${fmtDayNum(list.at(-1)!.iso)} ${fmtMonthShort(list.at(-1)!.iso)}`;

  const first = items[0];
  const upcomingLine = live ? (
    <>
      En vivo <Code series={live.series} href={`/categorias/${live.series.id}`} /> {live.session.name}
    </>
  ) : first ? (
    <>
      {mode === "results" ? "Próximo" : "Arranca"} {when(first.session)} <Code series={first.series} href={`/categorias/${first.series.id}`} /> {first.session.name}
    </>
  ) : (
    "Sin carreras próximas cargadas"
  );
  const latestWinner = latest && raceWinner(latest.session.results);
  const latestLine = latest?.session.results?.[0] && (
    <>
      Último <Code series={latest.series} href={`/categorias/${latest.series.id}`} /> {latest.session.name}
      {latestWinner && (
        <>
          {" "}· ganó <b>{latestWinner.driver}</b>
        </>
      )}
    </>
  );
  const nextArgLabel = nextArg && nextArg !== first ? when(nextArg.session) : undefined;

  let title: string;
  let range: string;
  let lede: ReactNode[];
  if (mode === "results" && latest) {
    title = "Resultados del finde";
    range = rangeOf(weekendWindow(latest.session.start).days);
    lede = [latestLine, upcomingLine];
  } else {
    // "Este finde" si lo que sigue cae en el fin de semana en curso (o el inminente), "Próximo finde" si cae en el siguiente.
    const inWindow = (win: { key: string }[]) => days.length > 0 && days.every((d) => win.some((w) => w.key === d.key));
    const thisWeekend = weekendWindow(now).days;
    const nextWeekend = weekendWindow(new Date(ms(thisWeekend[2].iso) + 2 * 86400000).toISOString()).days;
    title = inWindow(thisWeekend) ? "Este finde" : inWindow(nextWeekend) ? "Próximo finde" : "Lo que sigue";
    range = rangeOf(days);
    lede = [
      upcomingLine,
      mode === "midweek" ? latestLine : undefined,
      nextArgLabel && (
        <>
          Próximo argentino: <b>{nextArgLabel}</b>
        </>
      ),
    ];
  }

  // ——— Secciones ———
  const sections: Record<SectionId, ReactNode> = {
    live: live && (
      <section key="live" className="live-board" aria-labelledby="live-title">
        <div className="live-flag">
          <span className="pulse" />
          <span id="live-title">En vivo</span>
          <b>{minutesLeft(live.session, now)}′</b>
        </div>
        <div className="live-main">
          <CatMark series={live.series} />
          <div>
            <CategoryLabel series={live.series} detail={live.event.circuit.city} href={`/categorias/${live.series.id}`} />
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
              {timingUrl ? (
                <a href={timingUrl} target="_blank" rel="noreferrer">
                  <StateTag kind="live">Tiempos en vivo en Speedhive ↗</StateTag>
                </a>
              ) : (
                <StateTag kind="no-data">Sin tiempos en vivo</StateTag>
              )}
            </li>
          )}
        </ol>
        <div className="watch">
          <span>Se ve por</span>
          <strong>{live.event.broadcasts.filter((b) => b.kind !== "timing").map((b) => b.name).join(" · ") || "Sin datos de transmisión"}</strong>
          {liveUrl && (
            <a href={liveUrl} target="_blank" rel="noreferrer">
              Abrir transmisión <span aria-hidden="true">↗</span>
            </a>
          )}
          {timingUrl && (
            <a href={timingUrl} target="_blank" rel="noreferrer">
              Tiempos en vivo <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </section>
    ),

    nuestros: runners.length > 0 && (
      <section key="nuestros" className="section-block nuestros" aria-labelledby="nuestros-title">
        <SectionTitle id="nuestros-title" title="Los nuestros">
          <Link href="/pilotos">Ver todos</Link>
        </SectionTitle>
        <div className="runner-cards">
          {runners.map((r) => (
            <Link key={r.driver.slug} href={`/pilotos/${r.driver.slug}`} className="runner-card list-link" style={{ "--cat": r.series.color } as CSSProperties}>
              <CategoryLabel series={r.series} />
              <strong className="runner-name">
                {r.driver.name}
                {r.driver.number && <span>#{r.driver.number}</span>}
              </strong>
              <p className="runner-status">
                <StateTag kind={r.status.state}>{r.status.stateLabel}</StateTag>
                <b>{r.status.headline}</b>
              </p>
              <p className="runner-meta">
                {[r.status.detail, r.standing && `${r.standing.position}.º en el campeonato · ${r.standing.points} pts`].filter(Boolean).join(" · ")}
              </p>
            </Link>
          ))}
        </div>
      </section>
    ),

    agenda: <Agenda key="agenda" items={items} days={days} today={todayKey} now={now} />,

    resultados: (
      <section key="resultados" className="results-band">
        <div className="section-block">
          {/* Con resultados primero, la cabecera ya dice "Resultados del finde": no se repite el título. */}
          {mode !== "results" && (
            <SectionTitle title="Resultados" inverse>
              <Link href="/calendario">Calendario</Link>
            </SectionTitle>
          )}
          <div className="result-layout">
            {podium ? (
              <article className="podium">
                <div className="podium-head">
                  <div>
                    <CategoryLabel series={podium.series} detail={`${fmtDayNum(podium.session.start)} ${fmtMonthShort(podium.session.start)}`} href={`/categorias/${podium.series.id}`} />
                    <strong>
                      <Link href={`/eventos/${podium.event.id}`} className="list-link">
                        {podium.session.name} · {podium.event.circuit.city}
                      </Link>
                    </strong>
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
                <CategoryLabel series={highlight.series} detail={highlight.event.circuit.city} />
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
                  <CategoryLabel series={n.series} detail={n.event.circuit.city} />
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
    ),

    viene: (
      <section key="viene" className="section-block next-weeks">
        <SectionTitle title="Lo que viene">
          <Link href="/calendario">Ver calendario</Link>
        </SectionTitle>
        <div className="date-strip">
          {nextEvents.map((e) => {
            const s = getSeries(e.seriesId)!;
            const date = e.sessions.at(-1)!.start;
            return (
              <Link key={e.id} href={`/eventos/${e.id}`} className="next-card list-link" style={{ "--cat": s.color } as CSSProperties}>
                <CategoryLabel series={s} />
                <strong>{e.circuit.city}</strong>
                <time dateTime={date}>
                  {fmtDayShort(date)} · Fecha {e.round}
                </time>
              </Link>
            );
          })}
        </div>
      </section>
    ),
  };

  return (
    <>
      <section className={`weekend-head mode-${mode}`}>
        <h1>
          {title} <span className="hero-date">{range}</span>
        </h1>
        <p className="lede">
          {lede.filter(Boolean).map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </p>
      </section>
      <nav className="cat-jump" aria-label="Ir a una categoría">
        {JUMP.map((id) => {
          const s = getSeries(id)!;
          return (
            <Link key={id} href={`/categorias/${id}`} className="cat-jump-item">
              <Code series={s} />
              {/* Si el nombre corto repite el código (F1, TC, TN), va el nombre completo. */}
              <span>{s.short === s.code ? s.name : s.short}</span>
            </Link>
          );
        })}
        <Link href="/categorias" className="cat-jump-all">
          Todas
        </Link>
      </nav>
      {ORDER[mode].map((id) => sections[id])}
    </>
  );
}
