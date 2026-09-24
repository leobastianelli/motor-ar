"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

/** Nota lista para mostrar: el servidor resuelve fechas, categorías y texto de búsqueda para que el cliente no cargue los datos del sitio. */
export interface NotaItem {
  slug: string;
  title: string;
  summary: string;
  medio: string;
  date: string;
  publishedAt: string;
  auto: boolean;
  seriesIds: string[];
  search: string;
}
export interface SeriesOption {
  id: string;
  label: string;
}

type Kind = "todas" | "medios" | "cronicas";
const KINDS: { id: Kind; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "medios", label: "De medios" },
  { id: "cronicas", label: "Crónicas de Fierros" },
];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Buscador y filtros de /notas: por texto (titular, resumen, medio), por tipo y por categoría. Todos los términos tienen que aparecer. */
export function NotasBrowser({ notas, series }: { notas: NotaItem[]; series: SeriesOption[] }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind>("todas");
  const [seriesId, setSeriesId] = useState("");

  const shown = useMemo(() => {
    const terms = norm(query).split(/\s+/).filter(Boolean);
    return notas.filter(
      (n) =>
        (kind === "todas" || (kind === "cronicas") === n.auto) &&
        (!seriesId || n.seriesIds.includes(seriesId)) &&
        terms.every((t) => n.search.includes(t)),
    );
  }, [notas, query, kind, seriesId]);

  const filtered = query.trim() !== "" || kind !== "todas" || seriesId !== "";

  return (
    <>
      <form className="notas-filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="notas-search">
          <span>Buscar en las notas</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Piloto, categoría, circuito o medio" autoComplete="off" />
        </label>
        <div className="notas-chips" role="group" aria-label="Tipo de nota">
          {KINDS.map((k) => (
            <button key={k.id} type="button" className={kind === k.id ? "is-selected" : ""} aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
              {k.label}
            </button>
          ))}
        </div>
        <div className="notas-chips" role="group" aria-label="Categoría">
          <button type="button" className={seriesId === "" ? "is-selected" : ""} aria-pressed={seriesId === ""} onClick={() => setSeriesId("")}>
            Todas las categorías
          </button>
          {series.map((s) => (
            <button key={s.id} type="button" className={seriesId === s.id ? "is-selected" : ""} aria-pressed={seriesId === s.id} onClick={() => setSeriesId(seriesId === s.id ? "" : s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </form>

      <p className="notas-count" role="status" aria-live="polite">
        {filtered ? `${shown.length} de ${notas.length} ${notas.length === 1 ? "nota" : "notas"}` : `${notas.length} ${notas.length === 1 ? "nota" : "notas"}`}
      </p>

      {shown.length > 0 ? (
        <div className="nota-list">
          {shown.map((n) => (
            <article key={n.slug} className="nota-card">
              <p className="nota-meta">
                <b>{n.medio}</b>
                <time dateTime={n.publishedAt}>{n.date}</time>
              </p>
              <h3>
                <Link href={`/notas/${n.slug}`} className="list-link">
                  {n.title}
                </Link>
              </h3>
              <p className="nota-summary">{n.summary}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-state">
          Ninguna nota coincide con la búsqueda.{" "}
          <button
            type="button"
            className="notas-clear"
            onClick={() => {
              setQuery("");
              setKind("todas");
              setSeriesId("");
            }}
          >
            Borrar filtros
          </button>
        </p>
      )}
    </>
  );
}
