"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * El calendario de la categoría. En el escritorio va abierto, al costado del campeonato; en el celular arranca plegado
 * ("Calendario completo · 23 fechas"), porque el bloque del momento ya lleva a la fecha actual. Sin JavaScript queda
 * abierto y todo el contenido sigue en el HTML.
 */
export function CalendarioPlegable({ total, color, children }: { total: number; color: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (window.matchMedia("(max-width: 800px)").matches && ref.current) ref.current.open = false;
  }, []);
  return (
    <details ref={ref} className="calendar-tape" style={{ borderTopColor: color }} open>
      <summary>
        <h2>
          Calendario completo <span>· {total} fechas</span>
        </h2>
      </summary>
      {children}
    </details>
  );
}
