import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og-fonts";
import { getHistory, getSeries } from "@/lib/data";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Categoría en Fierros";

/** Imagen para compartir cada categoría: sello con su color, nombre, organizador e historia. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const series = getSeries((await params).slug);
  const history = series ? getHistory(series.id) : undefined;
  const color = series?.color ?? "#101213";
  const detail = [series?.org, series?.founded ? `desde ${series.founded}` : "", history ? `${history.champions.length} campeones` : ""].filter(Boolean).join(" · ");

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f1f2f0", color: "#101213", fontFamily: "Archivo" }}>
        <div style={{ width: 28, height: "100%", background: color }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px" }}>
          <div style={{ display: "flex", background: color, color: "#fff", fontSize: 72, fontWeight: 800, padding: "8px 28px", alignSelf: "flex-start" }}>{series?.code ?? "F"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", fontSize: 96, fontWeight: 900, lineHeight: 1, letterSpacing: -3 }}>{series?.name ?? "Categoría"}</div>
            {detail && <div style={{ display: "flex", fontSize: 38, color: "#555a5c" }}>{detail}</div>}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30 }}>
            <div style={{ display: "flex", fontWeight: 900, letterSpacing: 2 }}>FIERROS</div>
            <div style={{ display: "flex", color: "#555a5c" }}>Calendario, campeonato e historia</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
