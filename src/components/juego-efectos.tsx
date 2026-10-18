"use client";

import { useEffect, useState } from "react";

// Efectos del juego: el cartel de fichas que giran y el texto de radio que se escribe solo.
// Con "reducir movimiento" activado en el sistema, todo aparece directo, sin animación.

const LETRAS = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";

export function usaMovimientoReducido(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Cartel de fichas tipo tablero de aeropuerto. Oculto, muestra fichas con "?"; al revelarse, cada ficha baraja letras
 * un instante y se clava en la letra del nombre, de izquierda a derecha.
 */
export function Cartel({ texto, revelado, animar }: { texto: string; revelado: boolean; animar: boolean }) {
  const destino = revelado ? texto.toUpperCase() : "?????";
  const [mostrado, setMostrado] = useState(destino);

  useEffect(() => {
    if (!animar || !revelado || usaMovimientoReducido()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin animación (o sin nombre todavía), el cartel salta al texto final
      setMostrado(destino);
      return;
    }
    const inicio = performance.now();
    const POR_FICHA = 55;
    const BARAJA = 420;
    let raf = 0;
    const paso = (t: number) => {
      const pasado = t - inicio;
      let listo = true;
      const s = [...destino]
        .map((c, i) => {
          if (c === " ") return " ";
          if (pasado >= i * POR_FICHA + BARAJA) return c;
          listo = false;
          return LETRAS[Math.floor(Math.random() * LETRAS.length)];
        })
        .join("");
      setMostrado(s);
      if (!listo) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [destino, animar, revelado]);

  const palabras = mostrado.split(" ");
  return (
    <p className={`jg-cartel ${revelado ? "revelado" : ""}`} aria-label={revelado ? texto : "Piloto misterioso"}>
      {palabras.map((p, k) => (
        <span key={k} className="jg-palabra" aria-hidden="true">
          {[...p].map((c, i) => (
            <span key={i} className="jg-ficha">
              {c}
            </span>
          ))}
        </span>
      ))}
    </p>
  );
}

/** Texto que se escribe solo, como un mensaje de radio entrando. */
export function Radio({ texto, animar }: { texto: string; animar: boolean }) {
  const [n, setN] = useState(animar ? 0 : texto.length);
  useEffect(() => {
    if (!animar || usaMovimientoReducido()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin animación, el mensaje aparece entero
      setN(texto.length);
      return;
    }
    const id = window.setInterval(() => {
      setN((x) => {
        if (x >= texto.length) {
          window.clearInterval(id);
          return x;
        }
        return x + 2;
      });
    }, 22);
    return () => window.clearInterval(id);
  }, [texto, animar]);
  return (
    <>
      <span className="jg-sr">{texto}</span>
      <span aria-hidden="true">
        {texto.slice(0, n)}
        {n < texto.length && <span className="jg-cursor">▍</span>}
      </span>
    </>
  );
}
