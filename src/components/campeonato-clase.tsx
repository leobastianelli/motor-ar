import Link from "next/link";
import { SectionTitle } from "@/components/pista";
import type { ClassStanding } from "@/lib/data";
import { REGLAMENTO, TABLAS_OFICIALES } from "@/lib/sources/cordoba-pista-campeonato.mjs";
import { TABLA_OFICIAL as TABLA_RALLY } from "@/lib/sources/rally-argentino-campeonato.mjs";
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

/** Dónde publica su tabla oficial el organizador de cada categoría con clases (para decirlo cuando no mostramos ninguna). */
const ORGANIZADOR: Record<string, { quien: string; url: string; texto: string }> = {
  "cordoba-pista": { quien: "La FRAD", url: TABLAS_OFICIALES.url, texto: "tablas oficiales" },
  "rally-argentino": { quien: "El Rally Argentino", url: TABLA_RALLY.url, texto: "tabla oficial" },
};

/**
 * Campeonato de una clase de una categoría con clases. Dice de dónde sale: "calculado" por Fierros con el reglamento (Córdoba Pista), "oficial"
 * tal cual lo publica el organizador (Rally Argentino), o "Sin campeonato publicado" con el motivo. La nota de cómo se calcula es corta a
 * propósito (el detalle está en src/lib/sources/ y en /fuentes).
 */
export function CampeonatoClase({ standing, className, seriesId, playOff }: { standing: ClassStanding; className: string; seriesId: string; playOff?: boolean }) {
  if (standing.status === "sin-campeonato") {
    const org = ORGANIZADOR[seriesId];
    return (
      <div>
        <SectionTitle title={`Campeonato · ${className}`} />
        <div className="clase-sin">
          <h3>Sin campeonato publicado</h3>
          <p className="clase-note">
            {standing.reason}
            {org && (
              <>
                {" "}
                {org.quien} publica su{" "}
                <a href={org.url} target="_blank" rel="noreferrer">
                  {org.texto}
                </a>{" "}
                después de cada fecha.
              </>
            )}
          </p>
        </div>
      </div>
    );
  }
  const oficial = standing.status === "oficial";
  const fuente = standing.source ?? TABLA_RALLY;
  const table = standing.rows.slice(0, 10);
  const rest = standing.rows.slice(10);
  return (
    <div>
      <SectionTitle title={`Campeonato · ${className}`}>
        <span>{oficial ? `Tabla oficial de ${fuente.name}, tras la fecha ${standing.asOfRound}` : `Calculado por Fierros según el reglamento, tras la fecha ${standing.asOfRound}`}</span>
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
      {oficial ? (
        <p className="clase-note">
          Tabla oficial del campeonato de pilotos, tal como la publica{" "}
          <a href={fuente.url} target="_blank" rel="noreferrer">
            {fuente.name}
          </a>
          : no la calculamos nosotros. Llega hasta la fecha {standing.asOfRound}; cuando el organizador la actualiza, la actualizamos acá.
        </p>
      ) : (
        <p className="clase-note">
          Calculado por Fierros con los resultados oficiales del cronometraje (MyLaps Speedhive) y el puntaje del{" "}
          <a href={REGLAMENTO.url} target="_blank" rel="noreferrer">
            reglamento de la FRAD
          </a>
          : suman la presentación, la pole, las series y la final. Coincide con la tabla oficial de la FRAD hasta la fecha {standing.validatedThrough}; después la
          seguimos nosotros.{playOff ? " No incluye el Play Off, que es una tabla aparte." : ""}
        </p>
      )}
    </div>
  );
}
