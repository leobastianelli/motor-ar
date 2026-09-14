import type { Metadata } from "next";

export const metadata: Metadata = { title: "Placa del finde", robots: { index: false, follow: false } };
export const revalidate = 1800;

/** Página interna para bajar la placa del finde y compartirla en redes. */
export default function PlacaPage() {
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
    </>
  );
}
