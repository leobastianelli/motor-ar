import Link from "next/link";
import { SectionTitle } from "@/components/pista";
import type { ClassStanding } from "@/lib/data";
import { REGLAMENTO, TABLAS_OFICIALES } from "@/lib/sources/cordoba-pista-campeonato.mjs";
import type { StandingRow } from "@/lib/types";

function Filas({ rows, leader }: { rows: StandingRow[]; leader?: boolean }) {
  return (
    <>
      {rows.map((row, i) => (
        <div key={row.driver} className={`champ-row${leader && i === 0 ? " leader" : ""}`}>
          <b>{row.pos}</b>
          <div>
            <strong>{row.driverSlug ? <Link href={`/pilotos/${row.driverSlug}`}>{row.driver}</Link> : row.driver}</strong>
            {row.team && <span>{row.team}</span>}
          </div>
          <em>{row.wins === undefined ? "" : `${row.wins} ${row.wins === 1 ? "victoria" : "victorias"}`}</em>
          <time>{row.points}</time>
        </div>
      ))}
    </>
  );
}

/**
 * Campeonato de una clase de Córdoba Pista. Calculado por Fierros, y rotulado así; o "Sin campeonato publicado" con el motivo. La nota de cómo
 * se calcula es corta a propósito (el detalle está en src/lib/sources/cordoba-pista-campeonato.mjs y en /fuentes).
 */
export function CampeonatoClase({ standing, className, playOff }: { standing: ClassStanding; className: string; playOff?: boolean }) {
  if (standing.status !== "calculado") {
    return (
      <div>
        <SectionTitle title={`Campeonato · ${className}`} />
        <div className="clase-sin">
          <h3>Sin campeonato publicado</h3>
          <p className="clase-note">
            {standing.reason} La FRAD publica sus propias <a href={TABLAS_OFICIALES.url} target="_blank" rel="noreferrer">tablas oficiales</a> después de cada fecha.
          </p>
        </div>
      </div>
    );
  }
  const table = standing.rows.slice(0, 10);
  const rest = standing.rows.slice(10);
  return (
    <div>
      <SectionTitle title={`Campeonato · ${className}`}>
        <span>Calculado por Fierros según el reglamento, tras la fecha {standing.asOfRound}</span>
      </SectionTitle>
      <div className="champ-table">
        <Filas rows={table} leader />
        {rest.length > 0 && (
          <details className="full-results">
            <summary>
              Campeonato completo <span>{standing.rows.length} pilotos</span>
            </summary>
            <div className="champ-table">
              <Filas rows={rest} />
            </div>
          </details>
        )}
      </div>
      <p className="clase-note">
        Calculado por Fierros con los resultados oficiales del cronometraje (MyLaps Speedhive) y el puntaje del{" "}
        <a href={REGLAMENTO.url} target="_blank" rel="noreferrer">
          reglamento de la FRAD
        </a>
        : suman la presentación, la pole, las series y la final. Coincide con la tabla oficial de la FRAD hasta la fecha {standing.validatedThrough}; después la
        seguimos nosotros.{playOff ? " No incluye el Play Off, que es una tabla aparte." : ""}
      </p>
    </div>
  );
}
