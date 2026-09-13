import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Code, StateTag } from "@/components/pista";
import { getAllSeries } from "@/lib/data";

export const metadata: Metadata = { title: "Sistema visual" };

const SWATCHES = [
  { name: "Tinta", hex: "#101213", dark: true },
  { name: "Papel frío", hex: "#F1F2F0" },
  { name: "Celeste técnico", hex: "#75BEE9" },
  { name: "Bandera roja", hex: "#DC3E25", dark: true },
  { name: "Próxima", hex: "#F5C640" },
  { name: "Zonal", hex: "#287E58", dark: true },
];

export default function SystemPage() {
  const codes = getAllSeries().filter((s, i, all) => all.findIndex((x) => x.color === s.color) === i);
  return (
    <div className="system">
      <header className="system-head">
        <p className="kicker">Pista · Manual de boxes</p>
        <h1>
          Sistema
          <br />
          visual
        </h1>
        <p>Archivo variable para titulares, datos y texto. Los horarios usan números tabulares; el celeste marca a los argentinos y el rojo queda reservado para lo que está en vivo.</p>
      </header>

      <section className="system-section">
        <header>
          <b>01</b>
          <h2>Tipografía</h2>
        </header>
        <div className="type-spec">
          <div>
            <span>Archivo variable</span>
            <strong>
              HORARIOS
              <br />
              QUE NO MIENTEN
            </strong>
            <p>Diseñada por Omnibus-Type, estudio argentino. Su ancho variable permite comprimir una torre de tiempos o abrir un titular sin cambiar de voz. Los títulos usan peso, no mayúsculas por sistema.</p>
          </div>
        </div>
      </section>

      <section className="system-section">
        <header>
          <b>02</b>
          <h2>Color</h2>
        </header>
        <div className="swatches">
          {SWATCHES.map((s) => (
            <div key={s.hex} style={{ "--c": s.hex, color: s.dark ? "white" : undefined } as CSSProperties}>
              <b>{s.name}</b>
              <span>{s.hex}</span>
            </div>
          ))}
        </div>
        <p className="system-note">El celeste no decora: marca argentinos y acciones propias. El rojo aparece sólo cuando algo sucede ahora.</p>
      </section>

      <section className="system-section">
        <header>
          <b>03</b>
          <h2>Números y ritmo</h2>
        </header>
        <div className="number-spec">
          <b>09:42:18</b>
          <span>Tabulares siempre: horarios, vueltas, diferencias y puntos no saltan al actualizarse.</span>
          <div className="spacing-scale">
            {[4, 8, 16, 24, 32, 48, 72].map((w) => (
              <i key={w} style={{ width: w }}>
                {w}
              </i>
            ))}
          </div>
        </div>
      </section>

      <section className="system-section">
        <header>
          <b>04</b>
          <h2>Componentes</h2>
        </header>
        <div className="component-lab">
          <div>
            <h3>Estados</h3>
            <p>
              <StateTag kind="live">En vivo</StateTag>
              <StateTag kind="upcoming">Próxima</StateTag>
              <StateTag kind="finished">Finalizada</StateTag>
              <StateTag kind="no-data">Sin datos</StateTag>
            </p>
          </div>
          <div>
            <h3>Identidad de categoría</h3>
            <p className="codes">
              {codes.map((s) => (
                <Code key={s.id} series={s} />
              ))}
            </p>
            <small>Código corto + color. Nunca depende de un logo oficial.</small>
          </div>
          <div>
            <h3>Fila de clasificación</h3>
            <div className="ranking light">
              <div className="rank-row argentine">
                <b>9</b>
                <span className="driver-code">COL</span>
                <strong>Franco Colapinto</strong>
                <time>+41.090</time>
              </div>
            </div>
          </div>
          <div>
            <h3>Sesión</h3>
            <div className="session live-session">
              <time>11:00</time>
              <div>
                <strong>Clasificación</strong>
                <span>Q1 · Q2 · Q3</span>
              </div>
              <StateTag as="b" kind="live">
                En vivo
              </StateTag>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
