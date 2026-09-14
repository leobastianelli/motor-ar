import { ImageResponse } from "next/og";
import { legendBySlug } from "@/data/legends";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Leyenda del automovilismo argentino en Fierros";

/** Imagen para compartir cada leyenda: nombre, años, frase y su dato principal. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const legend = legendBySlug[(await params).slug];
  const stat = legend?.keyStats[0];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#101213", color: "#f1f2f0", fontFamily: "sans-serif" }}>
        <div style={{ width: 28, height: "100%", background: "#75bee9" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px" }}>
          <div style={{ display: "flex", fontSize: 32, color: "#75bee9", letterSpacing: 2 }}>HISTORIAS DEL AUTOMOVILISMO ARGENTINO</div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
              <div style={{ display: "flex", fontSize: 88, fontWeight: 900, lineHeight: 1, letterSpacing: -3 }}>{legend?.name ?? "Leyenda"}</div>
              <div style={{ display: "flex", fontSize: 38, color: "#aeb3b4" }}>{legend?.years ?? ""}</div>
              <div style={{ display: "flex", fontSize: 32, color: "#f1f2f0" }}>{legend?.tagline ?? ""}</div>
            </div>
            {stat && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div style={{ display: "flex", fontSize: 120, fontWeight: 900, lineHeight: 1, color: "#75bee9" }}>{stat.value}</div>
                <div style={{ display: "flex", fontSize: 28, color: "#aeb3b4" }}>{stat.label}</div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 900, letterSpacing: 2 }}>FIERROS</div>
        </div>
      </div>
    ),
    size,
  );
}
