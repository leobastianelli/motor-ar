import type { Metadata } from "next";
import { drivers } from "@/data/drivers";
import manual from "@/data/manual-overrides.json";
import { series } from "@/data/series";
import { getNow } from "@/lib/data";
import { visibleEvents } from "@/lib/monitor/checks.mjs";
import { resumenReciente } from "@/lib/resumen-core.mjs";
import { loadRawSeason } from "@/lib/season-data";

export const metadata: Metadata = { title: "Placa del finde", robots: { index: false, follow: false } };
export const revalidate = 1800;

/** Placas del resumen del último finde con resultados (las que existen según los datos: 2 a 4). */
async function resumenPlacas() {
  const season = await loadRawSeason();
  const r = (resumenReciente as unknown as (s: unknown, now: string, o: unknown) => { sunday: string; fecha: string; slides: string[] } | null)(season, getNow(), {
    catalog: { drivers, series },
    manual,
    events: visibleEvents(season.events as never, manual),
  });
  return r && { fecha: r.fecha, urls: r.slides.map((_, i) => `/placa/resumen/${i + 1}?domingo=${r.sunday}`) };
}

/** Página interna para bajar la placa del finde y compartirla en redes. */
export default async function PlacaPage() {
  const resumen = await resumenPlacas();
  return (
    <>
      <section className="weekend-head">
        <h1>Placa del finde</h1>
        <p className="lede">
          <span>Se actualiza sola con lo que viene. En el celular, mantené apretada la imagen para guardarla.</span>
        </p>
      </section>
      <section className="section-block placa">
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen generada; se muestra tal cual para guardarla */}
        <img src="/placa/imagen" alt="Horarios del finde en hora argentina" width={1080} height={1350} />
        <p>
          <a href="/placa/imagen" target="_blank" rel="noreferrer">
            Abrir la imagen en tamaño completo
          </a>
        </p>
      </section>
      {resumen && (
        <>
          <section className="weekend-head">
            <h2>Resumen del finde</h2>
            <p className="lede">
              <span>{`Carrusel de ${resumen.urls.length} placas con lo que pasó el ${resumen.fecha}. Es el mismo que acompaña al borrador del domingo en Telegram.`}</span>
            </p>
          </section>
          <section className="section-block placa placa-carrusel">
            {resumen.urls.map((url, i) => (
              <p key={url}>
                {/* eslint-disable-next-line @next/next/no-img-element -- imagen generada; se muestra tal cual para guardarla */}
                <img src={url} alt={`Resumen del finde, placa ${i + 1} de ${resumen.urls.length}`} width={1080} height={1350} loading="lazy" />
                <a href={url} target="_blank" rel="noreferrer">
                  {`Abrir la placa ${i + 1} en tamaño completo`}
                </a>
              </p>
            ))}
          </section>
        </>
      )}
    </>
  );
}
