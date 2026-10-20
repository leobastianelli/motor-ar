import type { Metadata } from "next";
import { drivers } from "@/data/drivers";
import manual from "@/data/manual-overrides.json";
import { series } from "@/data/series";
import { getNow } from "@/lib/data";
import { visibleEvents } from "@/lib/monitor/checks.mjs";
import { resumenReciente } from "@/lib/resumen-core.mjs";
import { loadRawSeason } from "@/lib/season-data";
import { CompartirPlaca } from "@/components/compartir-placa";
import { datosPlaca } from "./finde/placa";

export const metadata: Metadata = { title: "Placas del finde", robots: { index: false, follow: false } };
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

const FORMATOS = [
  { id: "feed", titulo: "Para el feed", texto: "1080 × 1350: Instagram, X y el canal de WhatsApp.", w: 1080, h: 1350 },
  { id: "historia", titulo: "Para historias", texto: "1080 × 1920: historias de Instagram y estados de WhatsApp.", w: 1080, h: 1920 },
] as const;

/** Página interna para bajar las placas del finde y compartirlas en redes. */
export default async function PlacaPage() {
  const [resumen, feed, historia] = await Promise.all([resumenPlacas(), datosPlaca("feed"), datosPlaca("historia")]);
  const finde = [feed, historia];
  return (
    <>
      <section className="weekend-head placa-head">
        <h1>Horarios del finde</h1>
        <p className="lede">
          <span>{`${finde[0].rango}, en hora argentina. Se actualiza sola cuando cambia un horario. Si el finde no entra en una placa, se parte en varias: no se saca ninguna sesión.`}</span>
        </p>
      </section>
      {FORMATOS.map((f, k) => {
        const urls = finde[k].placas.map((_, i) => `/placa/finde/${f.id}/${i + 1}`);
        return (
          <section key={f.id} className="section-block placa">
            <h2>{f.titulo}</h2>
            <p>{`${f.texto} ${urls.length > 1 ? `${urls.length} placas, en orden.` : "Una placa."}`}</p>
            <CompartirPlaca urls={urls} nombre={`fierros-finde-${f.id}`} formato={f.id} />
            <div className="placa-carrusel">
              {urls.map((url, i) => (
                <p key={url}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- imagen generada; se muestra tal cual para guardarla */}
                  <img src={url} alt={`Horarios del finde, ${f.titulo.toLowerCase()}, placa ${i + 1} de ${urls.length}`} width={f.w} height={f.h} loading={i ? "lazy" : undefined} />
                  <a href={url} target="_blank" rel="noreferrer">
                    {urls.length > 1 ? `Abrir la placa ${i + 1} en tamaño completo` : "Abrir en tamaño completo"}
                  </a>
                </p>
              ))}
            </div>
          </section>
        );
      })}
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
