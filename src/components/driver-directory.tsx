"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { Code } from "./pista";

export interface DirectoryEntry {
  slug: string;
  name: string;
  number?: string;
  team?: string;
  standing?: string;
  wins: number;
  races: number;
  series: { id: string; name: string; code: string; color: string };
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Todos los pilotos, agrupados por categoría, con buscador por nombre, número o marca. */
export function DriverDirectory({ entries, groups }: { entries: DirectoryEntry[]; groups: { id: string; name: string; code: string; color: string }[] }) {
  const [query, setQuery] = useState("");
  const [only, setOnly] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const q = fold(query.trim());
    return entries.filter((e) => (!only || e.series.id === only) && (!q || fold(`${e.name} ${e.number ?? ""} ${e.team ?? ""}`).includes(q)));
  }, [entries, query, only]);

  return (
    <div className="driver-directory">
      <div className="directory-tools">
        <input type="search" placeholder="Buscar por nombre, número o marca" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar piloto" />
        <div className="filters" role="group" aria-label="Filtrar por categoría">
          <button type="button" className={only === null ? "is-selected" : undefined} aria-pressed={only === null} onClick={() => setOnly(null)}>
            Todas
          </button>
          {groups.map((g) => (
            <button key={g.id} type="button" className={only === g.id ? "is-selected" : undefined} aria-pressed={only === g.id} onClick={() => setOnly(g.id)}>
              {g.code}
            </button>
          ))}
        </div>
      </div>

      {groups.map((g) => {
        const list = filtered.filter((e) => e.series.id === g.id);
        if (!list.length) return null;
        return (
          <section key={g.id} className="directory-group" style={{ "--cat": g.color } as CSSProperties}>
            <h3>
              <Code series={g} /> {g.name} <span>{list.length}</span>
            </h3>
            <ul>
              {list.map((e) => (
                <li key={e.slug}>
                  <Link href={`/pilotos/${e.slug}`} className="list-link">
                    <b>{e.number ? `#${e.number}` : ""}</b>
                    <strong>{e.name}</strong>
                    <span>{e.team}</span>
                    <small>{[e.standing, e.wins ? `${e.wins} ${e.wins === 1 ? "victoria" : "victorias"}` : null].filter(Boolean).join(" · ")}</small>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {filtered.length === 0 && <p className="empty-state">No encontramos pilotos con esa búsqueda.</p>}
    </div>
  );
}
