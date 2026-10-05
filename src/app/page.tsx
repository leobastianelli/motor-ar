import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import "./home.css";
import { Agenda } from "@/components/agenda";
import { AutoRefresh, MinutesLeft } from "@/components/live-clock";
import { noteDate } from "@/components/notas";
import { HCode, HLabel, HState, HTitle } from "@/components/home-parts";
import { ResultsStatus } from "@/components/results-status";
import { provisionalSuffix } from "@/lib/provisorio.mjs";
import { VideoLinkThumb } from "@/components/video-sesion";
import { eventStart, getDriversAbroad, getNow, getSeason, getSeries, isSimulatedNow, ms, seriesTier, weekendWindow, type HomeMode } from "@/lib/data";
import { getAllNotes } from "@/lib/notas";
import { dayKey, driverCode, fmtDayNum, fmtDayShort, fmtMonthShort, fmtTime, raceWinner, surname } from "@/lib/format";

export const metadata: Metadata = { alternates: { canonical: "/" } };
// La home es lo que la gente mira mientras pasa la carrera: el navegador la vuelve a pedir solo (AutoRefresh) y los estados se recalculan en el cliente (useNow). Los datos nuevos la invalidan por evento (revalidateTag("season")); el tiempo por sí solo, cada minuto.
export const revalidate = 60;

type MomentRow = { key: string; label: string; body: ReactNode; live?: boolean };
type SectionId = "live" | "recien" | "nuestros" | "agenda" | "resultados" | "viene" | "notas";

// El orden de la home depende del momento de la semana: primero lo que más probablemente se busca, pero siempre está todo.
const ORDER: Record<HomeMode, SectionId[]> = {
  live: ["live", "recien", "agenda", "nuestros", "resultados", "viene", "notas"],
  weekend: ["recien", "agenda", "nuestros", "resultados", "viene", "notas"],
  results: ["resultados", "nuestros", "agenda", "viene", "notas"],
  midweek: ["recien", "nuestros", "resultados", "agenda", "viene", "notas"],
};

// Acceso directo a cada categoría: mucha gente entra buscando una en particular. Primero las más buscadas.
const JUMP = ["f1", "tc", "tc2000", "tn", "tc-pista", "f2", "gt3", "tc-mouras", "tc-pick-up"];

// Carreras y finales pesan como tarjeta completa (podio); clasificaciones, sprints y entrenamientos, una línea compacta.
const RACE_KINDS = new Set(["final", "carrera", "sprint"]);

const liveEnd = (s: { start: string; durationMin: number }) => new Date(ms(s.start) + s.durationMin * 60000).toISOString();

export default async function Home() {
  const now = getNow();
  const season = await getSeason();
  const mode = season.getHomeMode(now);
  const { items, days, to } = season.getAgenda(now);
  const liveNow = season.getLiveItems(now);
  const live = liveNow[0];
  const simulated = isSimulatedNow();
  const todayKey = dayKey(now);
  const nextArg = season.getNextArgentineSession(now);

  // Por orden de aparición: primero el que está en pista, después el próximo que corre y así hasta el último; los que no tienen nada cargado, al final.
  const byAppearance = (a: { status: { at: number; state: string }; series: Parameters<typeof seriesTier>[0] }, b: typeof a) =>
    Number(a.status.state === "no-data") - Number(b.status.state === "no-data") ||
    (a.status.at < b.status.at ? -1 : a.status.at > b.status.at ? 1 : 0) ||
    seriesTier(a.series) - seriesTier(b.series);
  const runners = getDriversAbroad()
    .map((driver) => ({
      driver,
      series: getSeries(driver.seriesId)!,
      status: season.getRunnerStatus(driver, now),
      standing: season.getStandingPosition(driver),
    }))
    .sort(byAppearance);

  // Como máximo 4: "Recién terminó" tiene que caber en la primera pantalla, no listar todo lo del día.
  const justFinished = season.getJustFinished(now).slice(0, 4);
  const argentineSlugs = new Set(getDriversAbroad().map((d) => d.slug));
  const latest = season.getRecentResults(now)[0];
  const podium = season.getRecentResults(now, "nacional")[0];
  const [highlight, ...notes] = season.getArgentineHighlights(now);
  const nextEvents = season.getUpcomingEvents(now).filter((e) => ms(eventStart(e)) >= ms(to)).slice(0, 3);
  const latestNotes = (await getAllNotes()).slice(0, 3);
  const liveUrl = live?.event.broadcasts.find((b) => b.url && b.kind !== "timing")?.url;
  const timingUrl = live?.event.broadcasts.find((b) => b.kind === "timing")?.url;

  // ——— Cabecera: una portada con el momento primero ———
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
  const upcomingRow: MomentRow = live
    ? {
        key: "live",
        label: "En vivo",
        live: true,
        body: (
          <>
            <HCode series={live.series} href={`/categorias/${live.series.id}`} /> <span className="home-moment-name">{live.session.name}</span>
          </>
        ),
      }
    : first
      ? {
          key: "next",
          label: mode === "results" ? "Próximo" : "Arranca",
          body: (
            <>
              <b className="home-when">{when(first.session)}</b> <HCode series={first.series} href={`/categorias/${first.series.id}`} />{" "}
              <span className="home-moment-name">{first.session.name}</span>
            </>
          ),
        }
      : { key: "none", label: "Próximo", body: <span className="home-moment-name">Sin carreras próximas cargadas</span> };
  const latestWinner = latest && raceWinner(latest.session.results);
  const latestRow: MomentRow | undefined = latest?.session.results?.[0]
    ? {
        key: "last",
        label: "Último",
        body: (
          <>
            <HCode series={latest.series} href={`/categorias/${latest.series.id}`} /> <span className="home-moment-name">{latest.session.name}</span>
            {latestWinner && (
              <>
                <span className="home-moment-win">
                  · ganó <b>{latestWinner.driver}</b>
                  {provisionalSuffix(latest.session)}
                </span>
              </>
            )}
          </>
        ),
      }
    : undefined;
  // Quién es: los nuestros que corren en esa categoría internacional (por apellido); en una categoría argentina corren muchos, así que va el nombre de la categoría.
  const nextArgDrivers = nextArg ? getDriversAbroad().filter((d) => d.seriesId === nextArg.series.id) : [];
  const nextArgWho: ReactNode =
    nextArgDrivers.length > 0
      ? nextArgDrivers.map((d, i) => (
          <span key={d.slug}>
            {i > 0 && " y "}
            <Link href={`/pilotos/${d.slug}`}>
              {d.name[0]}. {surname(d.name)}
            </Link>
          </span>
        ))
      : nextArg?.series.name;
  const nextArgRow: MomentRow | undefined =
    nextArg && nextArg !== first
      ? {
          key: "arg",
          label: "Próximo argentino",
          body: (
            <>
              <b className="home-when">{when(nextArg.session)}</b> <HCode series={nextArg.series} href={`/categorias/${nextArg.series.id}`} />{" "}
              <span className="home-moment-name">{nextArgWho}</span>
            </>
          ),
        }
      : undefined;

  let title: string;
  let range: string;
  let moment: (MomentRow | undefined)[];
  if (mode === "results" && latest) {
    title = "Resultados del finde";
    range = rangeOf(weekendWindow(latest.session.start).days);
    moment = [latestRow, upcomingRow];
  } else {
    // "Este finde" si lo que sigue cae en el fin de semana en curso (o el inminente), "Próximo finde" si cae en el siguiente.
    const inWindow = (win: { key: string }[]) => days.length > 0 && days.every((d) => win.some((w) => w.key === d.key));
    const thisWeekend = weekendWindow(now).days;
    const nextWeekend = weekendWindow(new Date(ms(thisWeekend[2].iso) + 2 * 86400000).toISOString()).days;
    title = inWindow(thisWeekend) ? "Este finde" : inWindow(nextWeekend) ? "Próximo finde" : "Lo que sigue";
    range = rangeOf(days);
    moment = [upcomingRow, mode === "midweek" ? latestRow : undefined, nextArgRow];
  }

  // Un piloto con algo para mostrar pesa como tarjeta; uno sin actividad, como una fila de una línea (mismo orden que antes).
  const active = runners.filter((r) => r.status.state !== "no-data");
  const idle = runners.filter((r) => r.status.state === "no-data");
  const idleNote = idle.length > 0 && idle.every((r) => r.status.headline === idle[0].status.headline) ? `${idle[0].status.stateLabel} · ${idle[0].status.headline}` : undefined;
  const standingOf = (r: (typeof runners)[number]) => r.standing && `${r.standing.position}.º en el campeonato · ${r.standing.points} pts`;

  // ——— Secciones ———
  const sections: Record<Exclude<SectionId, "notas">, ReactNode> = {
    live: live && (
      <section key="live" className="home-section home-live-wrap" aria-labelledby="live-title">
        <div className="home-live">
          <div className="home-live-flag">
            <h2 id="live-title">En vivo</h2>
            <span className="home-live-min">
              <MinutesLeft endsAt={liveEnd(live.session)} serverNow={now} simulated={simulated} />′
            </span>
          </div>
          <div className="home-live-body">
          <div className="home-live-main">
            <HLabel series={live.series} detail={live.event.circuit.city} href={`/categorias/${live.series.id}`} />
            <p className="home-live-name">{live.session.name}</p>
            <p className="home-live-lap">
              Faltan <MinutesLeft endsAt={liveEnd(live.session)} serverNow={now} simulated={simulated} /> min <span>largó {fmtTime(live.session.start)}</span>
            </p>
          </div>
          <div className="home-live-timing">
            {live.session.results?.length ? (
              <ol>
                {live.session.results.slice(0, 3).map((r) => (
                  <li key={r.pos} className={r.driverSlug ? "is-arg" : undefined}>
                    <b>{r.pos}</b>
                    <span className="home-code-3">{driverCode(r)}</span>
                    <span className="home-gap">{r.gap}</span>
                  </li>
                ))}
              </ol>
            ) : timingUrl ? (
              <Link href={`/eventos/${live.event.id}#tiempos-en-vivo`} className="home-link">
                Ver los tiempos en vivo <span aria-hidden="true">→</span>
              </Link>
            ) : null}
          </div>
          <div className="home-live-watch">
            <span className="home-eyebrow">Se ve por</span>
            <strong>{live.event.broadcasts.filter((b) => b.kind !== "timing").map((b) => b.name).join(" · ") || "Sin datos de transmisión"}</strong>
            {liveUrl && (
              <a href={liveUrl} target="_blank" rel="noreferrer" className="home-btn">
                Abrir transmisión <span aria-hidden="true">↗</span>
              </a>
            )}
            {timingUrl && (
              <Link href={`/eventos/${live.event.id}#tiempos-en-vivo`} className="home-link">
                Tiempos en vivo <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
          </div>
        </div>
        {liveNow.length > 1 && (
          <p className="home-also-live">
            <b>También en vivo</b>
            {liveNow.slice(1).map((l) => (
              <Link key={l.session.id} href={`/eventos/${l.event.id}`}>
                <HCode series={l.series} size="s" /> {l.session.name} <span>{l.event.circuit.city}</span>
              </Link>
            ))}
          </p>
        )}
      </section>
    ),

    nuestros:
      runners.length > 0 && (
        <section key="nuestros" id="nuestros" className="home-section home-runners" aria-labelledby="nuestros-title">
          <HTitle id="nuestros-title" title="Los nuestros">
            <Link href="/pilotos" className="home-more">
              Ver todos
            </Link>
          </HTitle>
          {active.length > 0 && (
            <div className="home-runner-grid">
              {active.map((r) => (
                <Link key={r.driver.slug} href={`/pilotos/${r.driver.slug}`} className="home-runner" style={{ "--cat": r.series.color } as CSSProperties}>
                  <HLabel series={r.series} />
                  <h3>
                    {r.driver.name}
                    {r.driver.number && <span>#{r.driver.number}</span>}
                  </h3>
                  <p className="home-runner-status">
                    <HState kind={r.status.state}>{r.status.stateLabel}</HState>
                    <b>{r.status.headline}</b>
                  </p>
                  <p className="home-runner-meta">{[r.status.detail, standingOf(r)].filter(Boolean).join(" · ")}</p>
                </Link>
              ))}
            </div>
          )}
          {idle.length > 0 && (
            <>
              {idleNote && <p className="home-idle-note">{idleNote}</p>}
              <ul className="home-idle">
                {idle.map((r) => (
                  <li key={r.driver.slug}>
                    <Link href={`/pilotos/${r.driver.slug}`}>
                      <HCode series={r.series} />
                      <span className="home-idle-name">
                        {r.driver.name}
                        {r.driver.number && <span>#{r.driver.number}</span>}
                      </span>
                      <span className="home-idle-meta">
                        {[idleNote ? "" : r.status.headline, r.standing && `${r.standing.position}.º · ${r.standing.points} pts`].filter(Boolean).join(" · ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ),

    recien: justFinished.length > 0 && (
      <section key="recien" id="recien" className="home-band" aria-labelledby="recien-title">
        <div className="home-wrap">
          <HTitle id="recien-title" title="Recién terminó" inverse>
            <Link href="/calendario" className="home-more">
              Calendario
            </Link>
          </HTitle>
          <div className="home-recent">
            {justFinished.map((i) => {
              const resumen = i.session.videos?.find((v) => v.kind === "highlights");
              const eventoHref = `/eventos/${i.event.id}`;
              const isRace = RACE_KINDS.has(i.session.kind);
              const head = (
                <div className="home-recent-head">
                  <div>
                    <HLabel series={i.series} detail={`${fmtDayNum(i.session.start)} ${fmtMonthShort(i.session.start)}`} href={`/categorias/${i.series.id}`} />
                    <strong>
                      <Link href={resumen ? `${eventoHref}#${i.session.id}` : eventoHref}>
                        {i.session.name} · {i.event.circuit.city}
                      </Link>
                    </strong>
                  </div>
                  {resumen && <VideoLinkThumb videoId={resumen.id} href={`${eventoHref}#${i.session.id}`} ariaLabel={`Ver el resumen de ${i.session.name} en YouTube`} />}
                </div>
              );

              // Mismo orden (el tiempo manda); cambia el peso de cada fila. Entrenamientos y clasificaciones: una línea con el mejor tiempo y los argentinos.
              if (!isRace) {
                const top = raceWinner(i.session.results) ?? i.session.results![0];
                const argRows = (i.session.results ?? []).filter((r) => r.driverSlug && argentineSlugs.has(r.driverSlug));
                return (
                  <article key={i.session.id} className="home-recent-item is-compact">
                    {head}
                    <p className="home-recent-line">
                      {i.session.kind === "practica" || i.session.kind === "clasificacion" ? "Mejor tiempo" : "Ganó"}: <b>{top.driver}</b>
                      {provisionalSuffix(i.session)}
                      {argRows.length > 0 && (
                        <>
                          {" · "}
                          {argRows.map((r) => `${r.driver} ${r.pos}.º`).join(", ")}
                        </>
                      )}
                    </p>
                  </article>
                );
              }

              const ours = (i.session.results ?? []).filter((r) => r.driverSlug && argentineSlugs.has(r.driverSlug) && r.pos > 3);
              const podiumRow = (r: { pos: number; driver: string; team?: string; gap?: string }, cls?: string) => (
                <li key={`${cls ?? "p"}-${r.pos}`} className={cls}>
                  <b>{r.pos}</b>
                  <div>
                    <strong>{r.driver}</strong>
                    <span>{r.team}</span>
                  </div>
                  <time>{r.gap}</time>
                </li>
              );
              return (
                <article key={i.session.id} className="home-recent-item">
                  {head}
                  <ol className="home-podium">
                    {i.session.results!.slice(0, 3).map((r) => podiumRow(r))}
                    {ours.map((r) => podiumRow(r, "is-arg"))}
                  </ol>
                  <ResultsStatus session={i.session} now={now} tone="dark" />
                </article>
              );
            })}
          </div>
          <p className="home-band-cta">
            <Link href="/calendario">
              Ver todos los resultados <span aria-hidden="true">→</span>
            </Link>
          </p>
        </div>
      </section>
    ),

    agenda: <Agenda key="agenda" items={items} days={days} today={todayKey} now={now} simulated={simulated} />,

    resultados: (
      <section key="resultados" id="resultados" className="home-section home-results">
        {/* Con resultados primero, la cabecera ya dice "Resultados del finde": no se repite el título. */}
        {mode !== "results" && (
          <HTitle title="Resultados">
            <Link href="/calendario" className="home-more">
              Calendario
            </Link>
          </HTitle>
        )}
        <div className="home-results-grid">
          {podium ? (
            <article className="home-result-card">
              <div className="home-result-head">
                <HLabel series={podium.series} detail={`${fmtDayNum(podium.session.start)} ${fmtMonthShort(podium.session.start)}`} href={`/categorias/${podium.series.id}`} />
                <strong>
                  <Link href={`/eventos/${podium.event.id}`}>
                    {podium.session.name} · {podium.event.circuit.city}
                  </Link>
                </strong>
              </div>
              <ol className="home-podium is-light">
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
              <ResultsStatus session={podium.session} now={now} />
            </article>
          ) : (
            <p className="home-empty">Sin resultados nacionales recientes.</p>
          )}

          <div className="home-results-side">
            {highlight ? (
              <Link href={`/eventos/${highlight.event.id}`} className="home-highlight">
                <span className="home-eyebrow">Argentino destacado afuera</span>
                <HLabel series={highlight.series} detail={highlight.event.circuit.city} />
                <div className="home-highlight-body">
                  <b className="home-big-pos">{highlight.row.pos}.º</b>
                  <div>
                    <h3>{highlight.row.driver}</h3>
                    <p>
                      {highlight.session.name} de {highlight.series.name} en {highlight.event.circuit.city}.
                    </p>
                    {highlight.row.points !== undefined && highlight.row.points > 0 && (
                      <p className="home-highlight-pts">
                        +{highlight.row.points} <small>puntos</small>
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ) : (
              <div className="home-highlight">
                <span className="home-eyebrow">Argentino destacado afuera</span>
                <p>Sin resultados de argentinos afuera en la última semana.</p>
              </div>
            )}
            {notes.length > 0 && (
              <div className="home-result-notes">
                {notes.slice(0, 2).map((n) => (
                  <Link key={`${n.session.id}-${n.row.driver}`} href={`/eventos/${n.event.id}`}>
                    <HLabel series={n.series} detail={n.event.circuit.city} />
                    <strong>
                      {surname(n.row.driver)} terminó {n.row.pos}.º
                    </strong>
                    <small>{n.row.points ? `Sumó ${n.row.points} ${n.row.points === 1 ? "punto" : "puntos"}` : n.session.name}</small>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    ),

    viene: (
      <section key="viene" id="viene" className="home-section home-next" aria-labelledby="viene-title">
        <HTitle id="viene-title" title="Lo que viene">
          <Link href="/calendario" className="home-more">
            Ver calendario
          </Link>
        </HTitle>
        <ul className="home-next-list">
          {nextEvents.map((e) => {
            const s = getSeries(e.seriesId)!;
            const date = e.sessions.at(-1)!.start;
            return (
              <li key={e.id}>
                <Link href={`/eventos/${e.id}`} className="home-next-row">
                  <time dateTime={date}>{fmtDayShort(date)}</time>
                  <div>
                    <h3>{e.circuit.city}</h3>
                    <HLabel series={s} detail={`Fecha ${e.round}`} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    ),
  };

  const notas: ReactNode = latestNotes.length > 0 && (
    <section key="notas" id="notas" className="home-section home-notes" aria-labelledby="notas-title">
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
  );
  const all: Record<SectionId, ReactNode> = { ...sections, notas };

  return (
    <div className="home">
      <AutoRefresh />
      <section className={`home-head mode-${mode}`}>
        <div className="home-wrap home-head-grid">
          <h1>
            {title}
            <span className="home-range">{range}</span>
          </h1>
          <ul className="home-moment">
            {moment
              .filter((r): r is MomentRow => Boolean(r))
              .map((r) => (
                <li key={r.key} className={r.live ? "is-live" : undefined}>
                  <span className="home-eyebrow">{r.label}</span>
                  <span className="home-moment-body">{r.body}</span>
                </li>
              ))}
          </ul>
        </div>
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
      </section>
      {ORDER[mode].map((id) => all[id])}
    </div>
  );
}
