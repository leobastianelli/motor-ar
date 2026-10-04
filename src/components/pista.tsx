import Link from "next/link";
import type { ReactNode } from "react";
import type { StateKind } from "@/lib/format";
import type { Photo } from "@/lib/photos";
import type { Series, SeriesClass } from "@/lib/types";

/** Crédito obligatorio de las fotos con licencia Creative Commons. */
export function PhotoCredit({ photo }: { photo: Photo }) {
  return (
    <p className="photo-credit">
      Foto:{" "}
      <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
        {photo.author}
      </a>{" "}
      ·{" "}
      {photo.licenseUrl ? (
        <a href={photo.licenseUrl} target="_blank" rel="noreferrer license">
          {photo.license}
        </a>
      ) : (
        photo.license
      )}
    </p>
  );
}

/** Sello de categoría: código corto + color propio. Con `href`, lleva a la página de la categoría. */
export function Code({ series, href }: { series: Pick<Series, "code" | "color" | "name">; href?: string }) {
  const badge = (
    <span className="code" style={{ background: series.color }} title={series.name}>
      {series.code}
    </span>
  );
  return href ? (
    <Link href={href} className="code-link">
      {badge}
    </Link>
  ) : (
    badge
  );
}

/**
 * Categoría legible de un vistazo: sello de color + nombre. Va siempre primero en cualquier bloque.
 * Con `href`, el sello y el nombre llevan a la página de la categoría — nunca lo pases si `CategoryLabel` ya
 * está dentro de otro `<Link>` (un evento, un piloto): un enlace no puede anidar otro.
 */
export function CategoryLabel({ series, detail, href }: { series: Pick<Series, "code" | "color" | "name">; detail?: ReactNode; href?: string }) {
  return (
    <span className="cat-label">
      {href ? (
        <Link href={href} className="cat-label-link">
          <Code series={series} />
          <b>{series.name}</b>
        </Link>
      ) : (
        <>
          <Code series={series} />
          <b>{series.name}</b>
        </>
      )}
      {detail && <span>{detail}</span>}
    </span>
  );
}

/** Sello de una clase de una categoría con clases (Córdoba Pista): código corto + color propio, más chico que el de la categoría. */
export function ClassSeal({ clase }: { clase: Pick<SeriesClass, "code" | "color" | "name"> }) {
  return (
    <span className="clase-seal" style={{ background: clase.color }} title={clase.name}>
      {clase.code}
    </span>
  );
}

export function CatMark({ series }: { series: Pick<Series, "code" | "color" | "name"> }) {
  return (
    <span className="cat-mark" style={{ background: series.color }} title={series.name}>
      {series.code}
    </span>
  );
}

export function StateTag({ kind, children, as: Tag = "span" }: { kind: StateKind; children: ReactNode; as?: "span" | "b" }) {
  return <Tag className={`state ${kind}`}>{children}</Tag>;
}

export function SectionTitle({
  id,
  title,
  inverse = false,
  as: Tag = "h2",
  children,
}: {
  id?: string;
  title: ReactNode;
  inverse?: boolean;
  /** "h1" cuando este título es el encabezado principal de la página (p. ej. /notas); visualmente es igual al h2 de siempre. */
  as?: "h1" | "h2";
  children?: ReactNode;
}) {
  return (
    <header className={`section-title${inverse ? " inverse" : ""}`}>
      <Tag id={id}>{title}</Tag>
      {children}
    </header>
  );
}
