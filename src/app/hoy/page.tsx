import type { Metadata } from "next";
import { HoyView } from "@/components/hoy-agenda";
import { breadcrumb, itemListJsonLd, JsonLd, sportsEventFromSession } from "@/components/json-ld";
import { getAllSeries, getNow, getSeason, isSimulatedNow, seriesTier } from "@/lib/data";
import { descripcionHoy, tituloHoy } from "@/lib/hoy.mjs";
import { OG_DEFAULTS } from "@/lib/site";
import { fechasDeHoy } from "@/lib/snapshot.mjs";
import type { Series } from "@/lib/types";

// El día, lo que está en vivo y el estado de cada sesión se dibujan en el navegador con la hora real (<HoyView>): a medianoche la página cambia
// de día sola. La regeneración por tiempo puede ser lenta; los datos nuevos invalidan la página por evento (/api/refresh). El título, la descripción
// y los datos estructurados para buscadores salen del día a la hora de la última regeneración: pueden tener hasta 15 minutos de atraso.
export const revalidate = 900;

async function load() {
  const now = getNow();
  const season = await getSeason();
  const dia = season.getToday(now);
  return { now, season, dia, simulated: isSimulatedNow() };
}

export async function generateMetadata(): Promise<Metadata> {
  const { dia } = await load();
  const title = tituloHoy(dia);
  const description = descripcionHoy(dia);
  return { title, description, openGraph: { title, description, ...OG_DEFAULTS }, alternates: { canonical: "/hoy" } };
}

export default async function HoyPage() {
  const { now, season, dia, simulated } = await load();
  const { fechas, cubreHasta } = fechasDeHoy(season.getAllEvents(), now);
  const seriesById: Record<string, Series> = Object.fromEntries(getAllSeries().filter((s) => fechas.some((e) => e.seriesId === s.id)).map((s) => [s.id, s]));
  const tiers = Object.fromEntries(Object.values(seriesById).map((s) => [s.id, seriesTier(s)]));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            itemListJsonLd(dia.items.map((i) => sportsEventFromSession(i.session, i.event, i.series))),
            breadcrumb([
              ["Inicio", "/"],
              ["Hoy", "/hoy"],
            ]),
          ],
        }}
      />
      <HoyView events={fechas} seriesById={seriesById} tiers={tiers} cubreHasta={cubreHasta} serverNow={now} simulated={simulated} />
    </>
  );
}
