import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og-fonts";
import { getDriver, getNow, getSeason, getSeries } from "@/lib/data";
import { fmtDayShort, fmtTime } from "@/lib/format";
import { resolveHorario } from "@/lib/horarios";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Horario en Fierros";

/** Imagen para compartir cada horario: categoría con su color, a qué hora es la próxima fecha y dónde. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const target = resolveHorario(slug);
  const series = target ? getSeries(target.seriesId) : undefined;
  const color = series?.color ?? "#101213";
  const driver = target?.kind === "driver" ? getDriver(target.driverSlug) : undefined;
  const title = driver ? `A qué hora corre ${driver.name}` : `Horario de ${series?.name ?? "Fierros"}`;

  let when = "";
  if (series) {
    const season = await getSeason();
    const now = getNow();
    const event = season.getEventsForSeries(series.id).find((e) => season.getNextSession(e, now));
    const session = event && season.getNextSession(event, now);
    if (event && session) {
      when = `${event.circuit.city} · ${fmtDayShort(session.start)}${session.timeKnown === false ? "" : ` ${fmtTime(session.start)}`}`;
    }
  }

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f1f2f0", color: "#101213", fontFamily: "Archivo" }}>
        <div style={{ width: 28, height: "100%", background: color }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", background: color, color: "#fff", fontSize: 38, fontWeight: 800, padding: "6px 18px" }}>{series?.code ?? "F"}</div>
            <div style={{ display: "flex", fontSize: 32, color: "#16658f", letterSpacing: 2 }}>HORA ARGENTINA</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", fontSize: 76, fontWeight: 900, lineHeight: 1.05, letterSpacing: -3 }}>{title}</div>
            {when && <div style={{ display: "flex", fontSize: 38, color: "#555a5c" }}>Próxima fecha: {when}</div>}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30 }}>
            <div style={{ display: "flex", fontWeight: 900, letterSpacing: 2 }}>FIERROS</div>
            <div style={{ display: "flex", color: "#555a5c" }}>Horarios y dónde verlo, siempre en Argentina</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
