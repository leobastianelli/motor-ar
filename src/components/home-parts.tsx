import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { StateKind } from "@/lib/format";
import type { Series } from "@/lib/types";

/**
 * Piezas propias de la home (clases `home-*`, estilos en `src/app/home.css`). Existen para que el rediseño no toque la salida de los
 * componentes compartidos (`pista.tsx`), que usan las demás páginas.
 */

type SeriesLike = Pick<Series, "code" | "color" | "name">;

// Tinta del sello de categoría: el color de la serie oscurecido lo justo para que el texto blanco llegue a 4.5:1. `series.color` no se toca
// (lo usan franjas, calendarios e imágenes en todo el sitio); esto es sólo el fondo del sello en la home.
const CAT_INK: Record<string, string> = {
  "#dc3e25": "#c9361d", // F1: blanco sobre #dc3e25 = 4.41
  "#b47805": "#9a6504", // TN: 3.73
  "#7a8f3c": "#66792f", // F4I: 3.61
};
export const catInk = (color: string) => CAT_INK[color.toLowerCase()] ?? color;

/** Sello de categoría (código corto). Tamaños: "s" en línea con texto, "m" en filas y listas. Con `href`, lleva a la categoría. */
export function HCode({ series, href, size = "m" }: { series: SeriesLike; href?: string; size?: "s" | "m" }) {
  const badge = (
    <span className={`home-code home-code-${size}`} style={{ "--cat-ink": catInk(series.color) } as CSSProperties} title={series.name}>
      {series.code}
    </span>
  );
  return href ? (
    <Link href={href} className="home-code-link" aria-label={series.name}>
      {badge}
    </Link>
  ) : (
    badge
  );
}

/** Sello + nombre de la categoría (+ dato secundario). Con `href` el nombre también es enlace; no lo pases dentro de otro `<Link>`. */
export function HLabel({ series, detail, href }: { series: SeriesLike; detail?: ReactNode; href?: string }) {
  const body = (
    <>
      <HCode series={series} />
      <b>{series.name}</b>
    </>
  );
  return (
    <span className="home-label">
      {href ? (
        <Link href={href} className="home-label-link">
          {body}
        </Link>
      ) : (
        body
      )}
      {detail && <span className="home-label-detail">{detail}</span>}
    </span>
  );
}

/** Título de sección: un solo estilo para toda la home (filete superior + h2). `inverse` para la banda oscura. */
export function HTitle({ id, title, inverse = false, children }: { id?: string; title: ReactNode; inverse?: boolean; children?: ReactNode }) {
  return (
    <header className={`home-title${inverse ? " is-inverse" : ""}`}>
      <h2 id={id}>{title}</h2>
      {children}
    </header>
  );
}

/** Estado de una sesión o de un piloto. "Sin datos" es texto liviano, no una etiqueta. */
export function HState({ kind, children }: { kind: StateKind; children: ReactNode }) {
  return <span className={`home-state is-${kind}`}>{children}</span>;
}
