import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og-fonts";
import { getDriver, getIndexedDriver, getSeason, getSeries } from "@/lib/data";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Piloto en Fierros";

/** Imagen para compartir cada piloto: categoría con su color, nombre, número y resumen de la temporada. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const curated = getDriver(slug);
  const indexed = curated ? undefined : getIndexedDriver(slug);
  const season = await getSeason();

  let name = curated?.name ?? indexed?.name ?? "Piloto";
  let seriesId = curated?.seriesId ?? indexed?.series[0] ?? "";
  let number = curated?.number ? String(curated.number) : undefined;
  let summary = curated?.team ?? "";
  if (indexed) {
    const stats = season.getDriverSeason(indexed);
    seriesId = [...indexed.series].sort((a, b) => (stats.bySeries[b]?.races ?? 0) - (stats.bySeries[a]?.races ?? 0))[0];
    const s = stats.bySeries[seriesId];
    number = indexed.numbers[seriesId];
    const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
    summary = [indexed.teams[seriesId], s ? [count(s.races, "carrera", "carreras"), count(s.wins, "victoria", "victorias"), count(s.podiums, "podio", "podios")].join(" · ") : ""]
      .filter(Boolean)
      .join(" · ");
  }
  const series = getSeries(seriesId);
  const color = series?.color ?? "#101213";
  name = name.length > 26 ? name.split(" ").slice(0, 3).join(" ") : name;

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
            <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
              <div style={{ display: "flex", fontSize: 96, fontWeight: 900, lineHeight: 1, letterSpacing: -3 }}>{name}</div>
              {number && <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: "#555a5c" }}>{`#${number}`}</div>}
            </div>
            {summary && <div style={{ display: "flex", fontSize: 38, color: "#555a5c" }}>{summary}</div>}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30 }}>
            <div style={{ display: "flex", fontWeight: 900, letterSpacing: 2 }}>FIERROS</div>
            <div style={{ display: "flex", color: "#555a5c" }}>Pilotos argentinos, fecha por fecha</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
