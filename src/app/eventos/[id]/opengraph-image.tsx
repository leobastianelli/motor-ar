import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og-fonts";
import { getSeason, getSeries } from "@/lib/data";
import { fmtRange, raceWinner } from "@/lib/format";
import { provisionalSuffix } from "@/lib/provisorio.mjs";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Fecha en Fierros";

/** Imagen para compartir cada fecha: categoría con su color, nombre de la fecha, días y lugar. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const event = (await getSeason()).getEvent((await params).id);
  const series = event ? getSeries(event.seriesId) : undefined;
  const color = series?.color ?? "#101213";
  const lastRace = event?.sessions.filter((s) => ["final", "carrera"].includes(s.kind) && s.results?.length).at(-1);
  const winner = raceWinner(lastRace?.results);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f1f2f0", color: "#101213", fontFamily: "Archivo" }}>
        <div style={{ width: 28, height: "100%", background: color }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", background: color, color: "#fff", fontSize: 38, fontWeight: 800, padding: "6px 18px" }}>{series?.code ?? "F"}</div>
            <div style={{ display: "flex", fontSize: 38, fontWeight: 700 }}>{series?.name ?? "Fierros"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", fontSize: 88, fontWeight: 900, lineHeight: 1, letterSpacing: -3 }}>{event?.name ?? "Fecha"}</div>
            {event && (
              <div style={{ display: "flex", fontSize: 38, color: "#555a5c" }}>
                {`${fmtRange(event.sessions[0].start, event.sessions.at(-1)!.start)} · ${event.circuit.city}`}
              </div>
            )}
            {winner && <div style={{ display: "flex", fontSize: 38, fontWeight: 700 }}>{`Ganó ${winner.driver}${provisionalSuffix(lastRace)}`}</div>}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30 }}>
            <div style={{ display: "flex", fontWeight: 900, letterSpacing: 2 }}>FIERROS</div>
            <div style={{ display: "flex", color: "#555a5c" }}>Horarios y resultados en hora argentina</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
