import type { ReactNode } from "react";
import type { StateKind } from "@/lib/format";
import type { Series } from "@/lib/types";

/** Sello de categoría: código corto + color propio. */
export function Code({ series }: { series: Pick<Series, "code" | "color" | "name"> }) {
  return (
    <span className="code" style={{ background: series.color }} title={series.name}>
      {series.code}
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
  children,
}: {
  id?: string;
  title: string;
  inverse?: boolean;
  children?: ReactNode;
}) {
  return (
    <header className={`section-title${inverse ? " inverse" : ""}`}>
      <h2 id={id}>{title}</h2>
      {children}
    </header>
  );
}
