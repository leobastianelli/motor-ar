import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { HoyAgenda } from "@/components/hoy-agenda";
import { breadcrumb, itemListJsonLd, JsonLd, sportsEventFromSession } from "@/components/json-ld";
import { CategoryLabel, SectionTitle } from "@/components/pista";
import { getNow, getSeason, isSimulatedNow } from "@/lib/data";
import { fmtDayNum, fmtMonthLong, fmtWeekday } from "@/lib/format";
import { descripcionHoy, fechaLarga, nombreDia, tituloHoy } from "@/lib/hoy.mjs";
import { OG_DEFAULTS } from "@/lib/site";

export const revalidate = 60;

async function load() {
  const now = getNow();
  const season = await getSeason();
  const dia = season.getToday(now);
  return { now, dia, simulated: isSimulatedNow() };
}

export async function generateMetadata(): Promise<Metadata> {
  const { dia } = await load();
  const title = tituloHoy(dia);
  const description = descripcionHoy(dia);
  return { title, description, openGraph: { title, description, ...OG_DEFAULTS }, alternates: { canonical: "/hoy" } };
}

export default async function HoyPage() {
  const { now, dia, simulated } = await load();
  const { items, isToday } = dia;
  const live = items.find((i) => i.status === "live");

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            itemListJsonLd(items.map((i) => sportsEventFromSession(i.session, i.event, i.series))),
            breadcrumb([
              ["Inicio", "/"],
              ["Hoy", "/hoy"],
            ]),
          ],
        }}
      />
      <section className="weekend-head">
        <h1>{isToday ? "Hoy" : "Hoy no hay carreras"}</h1>
        <p className="lede">
          {isToday && (
            <span>
              {fmtWeekday(now)} {fmtDayNum(now)} de {fmtMonthLong(now)}
            </span>
          )}
          {!isToday && dia.key && (
            <span>
              Próximo: {nombreDia(dia.key).toLowerCase()} {fechaLarga(dia.key)}
            </span>
          )}
          {!dia.key && <span>No hay carreras próximas cargadas.</span>}
          {!isToday && (
            <span>
              <Link href="/calendario">Ver el calendario</Link>
            </span>
          )}
        </p>
      </section>

      {live && (
        <div className="live-callout" style={{ "--cat": live.series.color } as CSSProperties}>
          <span className="pulse" aria-hidden="true" />
          <div>
            <CategoryLabel series={live.series} detail={live.event.circuit.city} href={`/categorias/${live.series.id}`} />
            <strong>{live.session.name}</strong>
          </div>
          <Link href={`/eventos/${live.event.id}`}>
            Ver en vivo <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <section className="section-block">
          <SectionTitle as="h2" title={isToday ? "Todo lo de hoy, por hora" : "Lo de esa fecha, por hora"} />
          <HoyAgenda items={items} serverNow={now} simulated={simulated} />
        </section>
      )}
    </>
  );
}
