"use client";

import Link from "next/link";
import type { Season } from "@/lib/data";
import { capitalize, fmtDayLong, fmtDayShort, fmtTime, relative, surname, type StateKind } from "@/lib/format";
import { estadoDeSesion, nombreVisibleSesion } from "@/lib/momento.mjs";
import type { Broadcast } from "@/lib/types";
import { useNow } from "./live-clock";
import { SectionTitle, StateTag } from "./pista";

type MomentoData = ReturnType<Season["getMomentoCategoria"]>;
/** La fila del piloto en una sesión (sólo en la ficha de un piloto). */
type Fila = { pos: number; noTermino?: string; gap?: string };
type Sesion = MomentoData["sesiones"][number] & { fila?: Fila };
type Fecha = NonNullable<MomentoData["fecha"]>;
type Argentino = Sesion["argentinos"][number];

/** "GP de Azerbaiyán · Baku"; si el nombre ya trae el lugar ("Fecha 11 · San Luis"), no se repite. */
const placeName = (f: Pick<Fecha, "name" | "city">) => (f.city && !f.name.includes(f.city) ? `${f.name} · ${f.city}` : f.name);
const shortName = (name: string) => name.split(" / ").map(surname).join(" / ");

export function Piloto({ name, slug }: { name: string; slug?: string }) {
  return slug ? <Link href={`/pilotos/${slug}`}>{shortName(name)}</Link> : <>{shortName(name)}</>;
}

/** "Colapinto 11.º" — o "Colapinto abandonó" si no terminó. */
export function Argentinos({ rows }: { rows: Argentino[] }) {
  return (
    <>
      {rows.map((a, i) => (
        <span key={a.slug} className="momento-arg">
          {i > 0 && ", "}
          <Piloto name={a.name} slug={a.slug} /> {a.noTermino ?? `${a.pos}.º`}
        </span>
      ))}
    </>
  );
}

/** Lo que se ve de un piloto en una sesión: su posición en grande, la diferencia y, en chico, quién ganó. */
function FilaPiloto({ s }: { s: Sesion }) {
  const f = s.fila;
  return (
    <>
      {f ? (
        <>
          <b className="momento-pos">{f.noTermino ?? `${f.pos}.º`}</b>
          {f.gap && !f.noTermino && <> · {f.gap}</>}
        </>
      ) : (
        <>No figura en los resultados</>
      )}
      {s.ganador && f?.pos !== 1 && (
        <small className="momento-ganador">
          {s.kind === "practica" || s.kind === "clasificacion" ? "Mejor tiempo" : "Ganó"}: <Piloto name={s.ganador.name} slug={s.ganador.slug} />
          {s.provisorio && " (provisorio)"}
        </small>
      )}
    </>
  );
}

/** Enlace al resumen de la sesión: lleva a la fecha, al ancla de esa sesión (ahí está el video). No embebe nada acá. */
function ResumenLink({ fechaId, sessionId }: { fechaId: string; sessionId: string }) {
  return (
    <Link href={`/eventos/${fechaId}#${sessionId}`} className="momento-resumen">
      <span aria-hidden="true">▶</span> Resumen
    </Link>
  );
}

/** Qué decir de una sesión terminada, sin dejar nunca un hueco: ganador y argentinos, o por qué no hay resultados. */
function Terminada({ s, piloto, fechaId }: { s: Sesion; piloto?: boolean; fechaId: string }) {
  if (!s.hasResults) return <>{s.motivo ?? "Resultados todavía no publicados"}</>;
  return (
    <>
      {piloto ? (
        <FilaPiloto s={s} />
      ) : (
        <>
          {s.ganador ? (
            <>
              {s.kind === "practica" || s.kind === "clasificacion" ? "Mejor tiempo" : "Ganó"}: <Piloto name={s.ganador.name} slug={s.ganador.slug} />
              {s.provisorio && " (provisorio)"}
            </>
          ) : (
            "Resultados parciales"
          )}
          {s.argentinos.length > 0 && (
            <>
              {" · "}
              <Argentinos rows={s.argentinos} />
            </>
          )}
        </>
      )}
      {s.hasResumen && (
        <>
          {" · "}
          <ResumenLink fechaId={fechaId} sessionId={s.id} />
        </>
      )}
    </>
  );
}

function estadoVisual(s: Sesion, now: string): { kind: StateKind; label: string; estado: Sesion["estado"] } {
  const estado = estadoDeSesion(s, now) as Sesion["estado"];
  if (estado === "en-vivo") return { kind: "live", label: "En vivo", estado };
  if (estado === "terminada") return s.hasResults ? { kind: "finished", label: "Terminó", estado } : { kind: "no-data", label: "Sin datos", estado };
  if (!s.timeKnown) return { kind: "upcoming", label: "A confirmar", estado };
  const minutes = (new Date(s.start).getTime() - new Date(now).getTime()) / 60000;
  return { kind: "upcoming", label: minutes <= 180 ? capitalize(relative(s.start, now)) : "Próxima", estado };
}

function Transmision({ broadcasts }: { broadcasts: Pick<Broadcast, "name">[] }) {
  return (
    <p className="momento-where">
      <b>Dónde verlo</b>
      {broadcasts.length > 0 ? broadcasts.slice(0, 4).map((b) => b.name).join(" · ") : "No tenemos una transmisión confirmada en Argentina"}
    </p>
  );
}

function Finde({ data, fecha, now, broadcasts, tiemposUrl, piloto }: { data: MomentoData; fecha: Fecha; now: string; broadcasts: Pick<Broadcast, "name">[]; tiemposUrl?: string; piloto?: boolean }) {
  // El estado de cada fila se recalcula acá, con la hora del navegador; el resto (ganadores, posiciones) llegó con la página.
  // Lo que pasa ahora y lo que viene va primero (en la primera pantalla del celular); lo ya corrido, después, lo más reciente arriba.
  const all = (data.sesiones as Sesion[]).map((s) => ({ s, v: estadoVisual(s, now) }));
  const pending = all.filter((r) => r.v.estado !== "terminada");
  const done = all.filter((r) => r.v.estado === "terminada").reverse();
  // En la ficha de un piloto, cómo le fue es lo primero (lo próximo ya está en la portada): en pista, lo ya corrido y después lo que viene.
  const rows = piloto ? [...pending.filter((r) => r.v.estado === "en-vivo"), ...done, ...pending.filter((r) => r.v.estado !== "en-vivo")] : [...pending, ...done];
  const next = pending[0];
  return (
    <>
      <ol className="momento-list">
        {rows.map(({ s, v }) => (
          <li key={s.id} className={`momento-row${v.estado === "en-vivo" ? " is-live" : ""}${next?.s.id === s.id && v.estado !== "en-vivo" ? " is-next" : ""}`}>
            <span className="momento-when">
              <small>{fmtDayShort(s.start)}</small>
              <time dateTime={s.start} title={s.timeKnown ? undefined : "Horario a confirmar"}>
                {s.timeKnown ? fmtTime(s.start) : "—"}
              </time>
            </span>
            <span className="momento-what">
              <strong>{nombreVisibleSesion(s, data.sesiones)}</strong>
              <span>
                {v.estado === "terminada" && <Terminada s={s} piloto={piloto} fechaId={fecha.id} />}
                {v.estado === "en-vivo" && (
                  <>
                    En pista ahora ·{" "}
                    <Link href={`/eventos/${fecha.id}${tiemposUrl ? "#tiempos-en-vivo" : ""}`}>{tiemposUrl ? "Tiempos en vivo" : "Ver la fecha"}</Link>
                  </>
                )}
                {v.estado === "proxima" && (s.timeKnown ? `${capitalize(relative(s.start, now))} · hora argentina` : "Horario todavía sin publicar")}
              </span>
            </span>
            <StateTag kind={v.kind}>{v.kind === "live" ? "EN VIVO" : v.label}</StateTag>
          </li>
        ))}
      </ol>
      <div className="momento-foot">
        <Transmision broadcasts={broadcasts} />
        <Link href={`/eventos/${fecha.id}`} className="momento-cta">
          Ver la fecha completa <span aria-hidden="true">→</span>
        </Link>
      </div>
    </>
  );
}

/** Podio y argentinos de la carrera principal de una fecha. */
function Carrera({ fecha }: { fecha: Fecha }) {
  const c = fecha.carrera;
  if (!c) return <p className="empty-state">Sin sesiones cargadas para esta fecha.</p>;
  if (!c.hasResults || c.podio.length === 0) {
    return (
      <p className="empty-state">
        Resultados de la carrera: {c.hasResults ? "parciales, sin el podio completo" : (c.motivo ?? "todavía no publicados").replace(/^./, (m) => m.toLowerCase())}.
      </p>
    );
  }
  return (
    <>
      <ol className="momento-podio">
        {c.podio.map((p) => (
          <li key={p.pos}>
            <b>{p.pos}</b>
            <strong>
              <Piloto name={p.name} slug={p.slug} />
            </strong>
          </li>
        ))}
      </ol>
      {c.argentinos.length > 0 && (
        <p className="momento-args">
          <b>Los nuestros</b>
          <Argentinos rows={c.argentinos} />
        </p>
      )}
    </>
  );
}

function ProximaLinea({ fecha, now }: { fecha: Fecha; now: string }) {
  const p = fecha.primeraSesion;
  return (
    <>
      <Link href={`/eventos/${fecha.id}`}>{placeName(fecha)}</Link>
      , {fmtDayLong(p.start)}
      {p.timeKnown ? `, ${fmtTime(p.start)} (${p.name})` : ", horario a confirmar"} · {relative(p.start, now)}
    </>
  );
}

/** Para la portada de un evento ya corrido: "Ganó X · Colapinto 9.º", para que la respuesta esté antes que cualquier tabla. */
export function ResultadoCarrera({ carrera }: { carrera?: Fecha["carrera"] }) {
  if (!carrera || carrera.estado !== "terminada" || !carrera.hasResults || !carrera.ganador) return null;
  return (
    <p className="event-result">
      Ganó <Piloto name={carrera.ganador.name} slug={carrera.ganador.slug} />
      {carrera.provisorio && " (provisorio)"}
      {carrera.argentinos.length > 0 && (
        <>
          {" · "}
          <Argentinos rows={carrera.argentinos} />
        </>
      )}
    </p>
  );
}

/**
 * La franja "Ahora" de la página de un evento: qué está en pista, qué viene y el último resultado con los argentinos.
 * Los estados se recalculan con la hora del navegador; lo que llegó con la página (ganadores, posiciones) no cambia.
 */
function Ahora({ data, now, tiemposUrl }: { data: MomentoData; now: string; tiemposUrl?: string }) {
  const sesiones = (data.sesiones as Sesion[]).map((s) => ({ s, estado: estadoDeSesion(s, now) as Sesion["estado"] }));
  const live = sesiones.find((r) => r.estado === "en-vivo");
  const next = sesiones.find((r) => r.estado === "proxima");
  const terminadas = sesiones.filter((r) => r.estado === "terminada");
  // El último resultado es el de la última sesión que lo tiene; si otra más reciente todavía no lo publicó, se dice aparte.
  const last = terminadas.filter((r) => r.s.hasResults).at(-1) ?? terminadas.at(-1);
  const sinResultados = terminadas.at(-1) && terminadas.at(-1) !== last ? terminadas.at(-1) : undefined;
  const title = live ? "En pista ahora" : next ? (last ? "Ahora" : "Próxima sesión") : "Resultado";
  return (
    <section className={`section-block momento momento-evento momento-${data.modo}`} aria-labelledby="momento-title">
      <SectionTitle id="momento-title" title={title}>
        {live && <StateTag kind="live">EN VIVO</StateTag>}
      </SectionTitle>
      <div className="momento-lineas">
        {live && (
          <p className="momento-linea is-live">
            <b>En vivo</b>
            <strong>{nombreVisibleSesion(live.s, data.sesiones)}</strong>
            {" · "}
            {tiemposUrl ? <a href="#tiempos-en-vivo">Tiempos en vivo</a> : "En pista ahora"}
          </p>
        )}
        {next && (
          <p className="momento-linea">
            <b>Próxima</b>
            <strong>{nombreVisibleSesion(next.s, data.sesiones)}</strong>
            {" · "}
            {next.s.timeKnown ? (
              <>
                <time dateTime={next.s.start}>
                  {fmtDayShort(next.s.start)} {fmtTime(next.s.start)}
                </time>{" "}
                · {relative(next.s.start, now)}
              </>
            ) : (
              "horario a confirmar"
            )}
          </p>
        )}
        {last && (
          <div className="momento-linea momento-ultimo">
            <b>Último resultado · {nombreVisibleSesion(last.s, data.sesiones)}</b>
            {last.s.hasResults ? (
              <>
                <span>
                  {last.s.ganador ? (
                    <>
                      {last.s.kind === "practica" || last.s.kind === "clasificacion" ? "Mejor tiempo" : "Ganó"}: <Piloto name={last.s.ganador.name} slug={last.s.ganador.slug} />
                      {last.s.provisorio && " (provisorio)"}
                    </>
                  ) : (
                    "Resultados parciales"
                  )}
                </span>
                {last.s.argentinos.length > 0 && (
                  <span className="momento-args-line">
                    Argentinos: <Argentinos rows={last.s.argentinos} />
                  </span>
                )}
              </>
            ) : (
              <span>{last.s.motivo ?? "Resultados todavía no publicados"}</span>
            )}
            {sinResultados && (
              <small className="momento-faltan">
                {nombreVisibleSesion(sinResultados.s, data.sesiones)}: {(sinResultados.s.motivo ?? "resultados todavía no publicados").replace(/^./, (m) => m.toLowerCase())}
              </small>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export function Momento({ data, now: serverNow, simulated, broadcasts, tiemposUrl, piloto, evento }: { data: MomentoData; now: string; simulated?: boolean; broadcasts: Pick<Broadcast, "name">[]; tiemposUrl?: string; piloto?: boolean; evento?: boolean }) {
  // "Próxima" pasa a "En vivo" y a "Terminó" solo, aunque el HTML sea de hace un minuto.
  const now = useNow(serverNow, simulated);
  const { modo, fecha, ultimaFecha, proximaFecha } = data;
  const title = (prefix: string, f: Fecha) => `${prefix}: ${placeName(f)}`;

  // En la página de un evento es una franja corta: la fecha ya es el tema de la página.
  if (evento) return <Ahora data={data} now={now} tiemposUrl={tiemposUrl} />;

  // En la ficha de un piloto, entre semana no hay bloque (la portada ya dice cuál es su próxima sesión); si la fecha
  // terminó hace poco, se ve la misma lista de sesiones, con su posición en cada una.
  if (piloto) {
    if ((modo !== "en-pista" && modo !== "finde" && modo !== "resultados") || !fecha) return null;
    return (
      <section className={`section-block momento momento-${modo} momento-piloto`} aria-labelledby="momento-title">
        <SectionTitle id="momento-title" title={`${modo === "resultados" ? "Último fin de semana" : "Este fin de semana"} en ${fecha.city ?? fecha.name}`}>
          {modo === "en-pista" && <StateTag kind="live">EN VIVO</StateTag>}
        </SectionTitle>
        {/* "Próxima fecha" ya está en la tarjeta de la portada (ProximaSesion): no se repite acá. */}
        <Finde data={data} fecha={fecha} now={now} broadcasts={broadcasts} tiemposUrl={tiemposUrl} piloto />
      </section>
    );
  }

  return (
    <section className={`section-block momento momento-${modo}`} aria-labelledby="momento-title">
      {(modo === "en-pista" || modo === "finde") && fecha && (
        <>
          <SectionTitle id="momento-title" title={title("Este fin de semana", fecha)}>
            {modo === "en-pista" && <StateTag kind="live">EN VIVO</StateTag>}
          </SectionTitle>
          <Finde data={data} fecha={fecha} now={now} broadcasts={broadcasts} tiemposUrl={tiemposUrl} />
        </>
      )}

      {modo === "resultados" && fecha && (
        <>
          <SectionTitle id="momento-title" title={title("Última fecha", fecha)} />
          <Carrera fecha={fecha} />
          <div className="momento-foot">
            <p className="momento-where">
              <b>Próxima fecha</b>
              {proximaFecha ? <ProximaLinea fecha={proximaFecha} now={now} /> : "todavía no hay una cargada"}
            </p>
            <Link href={`/eventos/${fecha.id}`} className="momento-cta">
              Ver la fecha completa <span aria-hidden="true">→</span>
            </Link>
          </div>
        </>
      )}

      {modo === "entre-semana" && (
        <>
          <SectionTitle id="momento-title" title={proximaFecha ? title("Próxima fecha", proximaFecha) : "Sin próxima fecha cargada"} />
          {proximaFecha ? (
            <p className="momento-next">
              {fmtDayLong(proximaFecha.primeraSesion.start)}
              {proximaFecha.primeraSesion.timeKnown ? `, ${fmtTime(proximaFecha.primeraSesion.start)} (${proximaFecha.primeraSesion.name}, hora argentina)` : " · horario a confirmar"} ·{" "}
              {relative(proximaFecha.primeraSesion.start, now)}
            </p>
          ) : (
            <p className="empty-state">Todavía no hay fechas próximas de esta categoría en el calendario.</p>
          )}
          {ultimaFecha && (
            <p className="momento-last">
              <b>Última fecha</b>
              <Link href={`/eventos/${ultimaFecha.id}`}>{ultimaFecha.name}</Link>
              {": "}
              {ultimaFecha.carrera?.ganador ? (
                <>
                  ganó <Piloto name={ultimaFecha.carrera.ganador.name} slug={ultimaFecha.carrera.ganador.slug} />
                  {ultimaFecha.carrera.provisorio && " (provisorio)"}
                  {ultimaFecha.carrera.argentinos.length > 0 && (
                    <>
                      {" · "}
                      <Argentinos rows={ultimaFecha.carrera.argentinos.slice(0, 1)} />
                    </>
                  )}
                </>
              ) : (
                (ultimaFecha.carrera?.motivo ?? "resultados todavía no publicados")
              )}
            </p>
          )}
        </>
      )}
    </section>
  );
}

/**
 * "Próxima sesión" de la portada de un piloto: la que está en pista ahora o la que sigue, con día y hora. Se recalcula en el
 * navegador (la página puede ser de hace un minuto). Si no hay nada en los próximos 10 días, dice cuál es la próxima fecha.
 */
export function ProximaSesion({ data, now: serverNow, simulated }: { data: MomentoData; now: string; simulated?: boolean }) {
  const now = useNow(serverNow, simulated);
  const sesiones = data.sesiones as Sesion[];
  const enVivo = sesiones.find((s) => estadoDeSesion(s, now) === "en-vivo");
  const next = sesiones.find((s) => estadoDeSesion(s, now) === "proxima");
  const fecha = data.fecha;
  const lejos = next && new Date(next.start).getTime() - new Date(now).getTime() > 10 * 86_400_000;

  if (enVivo && fecha) {
    return (
      <div className="next-race is-live">
        <span>EN VIVO ahora</span>
        <strong>{nombreVisibleSesion(enVivo, sesiones)}</strong>
        <time dateTime={enVivo.start}>{placeName(fecha)}</time>
        <Link href={`/eventos/${fecha.id}`}>Ver evento</Link>
      </div>
    );
  }
  if (next && fecha && !lejos) {
    return (
      <div className="next-race">
        <span>Próxima sesión</span>
        <strong>{nombreVisibleSesion(next, sesiones)}</strong>
        <time dateTime={next.start}>
          {fmtDayShort(next.start)} · {next.timeKnown ? fmtTime(next.start) : "horario a confirmar"}
        </time>
        <Link href={`/eventos/${fecha.id}`}>{placeName(fecha)}</Link>
      </div>
    );
  }
  const f = data.proximaFecha ?? (next ? fecha : undefined);
  if (!f) return null;
  return (
    <div className="next-race">
      <span>Próxima fecha</span>
      <strong>{f.name}</strong>
      <time dateTime={f.primeraSesion.start}>
        {fmtDayShort(f.primeraSesion.start)}
        {f.primeraSesion.timeKnown ? "" : " · horario a confirmar"}
      </time>
      <Link href={`/eventos/${f.id}`}>Ver evento</Link>
    </div>
  );
}
