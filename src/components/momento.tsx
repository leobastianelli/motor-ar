"use client";

import Link from "next/link";
import type { Season } from "@/lib/data";
import { capitalize, fmtDayLong, fmtDayShort, fmtTime, relative, surname, type StateKind } from "@/lib/format";
import { estadoDeSesion } from "@/lib/momento.mjs";
import type { Broadcast } from "@/lib/types";
import { useNow } from "./live-clock";
import { SectionTitle, StateTag } from "./pista";

type MomentoData = ReturnType<Season["getMomentoCategoria"]>;
type Sesion = MomentoData["sesiones"][number];
type Fecha = NonNullable<MomentoData["fecha"]>;
type Argentino = Sesion["argentinos"][number];

/** "GP de Azerbaiyán · Baku"; si el nombre ya trae el lugar ("Fecha 11 · San Luis"), no se repite. */
const placeName = (f: Pick<Fecha, "name" | "city">) => (f.city && !f.name.includes(f.city) ? `${f.name} · ${f.city}` : f.name);
const shortName = (name: string) => name.split(" / ").map(surname).join(" / ");

function Piloto({ name, slug }: { name: string; slug?: string }) {
  return slug ? <Link href={`/pilotos/${slug}`}>{shortName(name)}</Link> : <>{shortName(name)}</>;
}

/** "Colapinto 11.º" — o "Colapinto abandonó" si no terminó. */
function Argentinos({ rows }: { rows: Argentino[] }) {
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

/** Qué decir de una sesión terminada, sin dejar nunca un hueco: ganador y argentinos, o por qué no hay resultados. */
function Terminada({ s }: { s: Sesion }) {
  if (!s.hasResults) return <>{s.motivo ?? "Resultados todavía no publicados"}</>;
  return (
    <>
      {s.ganador ? (
        <>
          {s.kind === "practica" || s.kind === "clasificacion" ? "Mejor tiempo" : "Ganó"}: <Piloto name={s.ganador.name} slug={s.ganador.slug} />
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

function Finde({ data, fecha, now, broadcasts, tiemposUrl }: { data: MomentoData; fecha: Fecha; now: string; broadcasts: Pick<Broadcast, "name">[]; tiemposUrl?: string }) {
  // El estado de cada fila se recalcula acá, con la hora del navegador; el resto (ganadores, posiciones) llegó con la página.
  // Lo que pasa ahora y lo que viene va primero (en la primera pantalla del celular); lo ya corrido, después, lo más reciente arriba.
  const all = data.sesiones.map((s) => ({ s, v: estadoVisual(s, now) }));
  const pending = all.filter((r) => r.v.estado !== "terminada");
  const rows = [...pending, ...all.filter((r) => r.v.estado === "terminada").reverse()];
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
              <strong>{s.name}</strong>
              <span>
                {v.estado === "terminada" && <Terminada s={s} />}
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

export function Momento({ data, now: serverNow, simulated, broadcasts, tiemposUrl }: { data: MomentoData; now: string; simulated?: boolean; broadcasts: Pick<Broadcast, "name">[]; tiemposUrl?: string }) {
  // "Próxima" pasa a "En vivo" y a "Terminó" solo, aunque el HTML sea de hace un minuto.
  const now = useNow(serverNow, simulated);
  const { modo, fecha, ultimaFecha, proximaFecha } = data;
  const title = (prefix: string, f: Fecha) => `${prefix}: ${placeName(f)}`;

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
