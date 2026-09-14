import { ImageResponse } from "next/og";
import { getAllDrivers, getNow, getSeason, weekendWindow } from "@/lib/data";
import { dayKey, fmtDayNum, fmtDayShort, fmtMonthShort, fmtTime } from "@/lib/format";

export const revalidate = 1800;

const KEY_KINDS = new Set(["clasificacion", "sprint", "carrera", "final"]);

/**
 * Placa del finde para redes (1080 × 1350): las sesiones clave de lo que viene, en hora argentina, con la categoría a la vista
 * y los argentinos que corren afuera marcados. Se genera sola desde los datos de la temporada.
 */
export async function GET() {
  const now = getNow();
  const season = await getSeason();
  const { items, days } = season.getAgenda(now);
  const argentineBySeries = new Map(getAllDrivers().filter((d) => ["f1", "f2", "gt3"].includes(d.seriesId)).map((d) => [d.seriesId, d.name.split(" ").at(-1)]));

  const rows = items
    .filter((i) => KEY_KINDS.has(i.session.kind))
    .slice(0, 11)
    .map((i) => ({
      code: i.series.code,
      color: i.series.color,
      title: `${i.series.name}${argentineBySeries.has(i.series.id) ? ` · ${argentineBySeries.get(i.series.id)}` : ""}`,
      detail: `${i.session.name} · ${i.event.circuit.city}`,
      day: fmtDayShort(i.session.start),
      time: i.session.timeKnown === false ? "a conf." : fmtTime(i.session.start),
    }));

  const weekend = weekendWindow(now).days;
  const inWeekend = days.length > 0 && days.every((d) => weekend.some((w) => w.key === d.key));
  const heading = inWeekend ? "ESTE FINDE" : "LO QUE SIGUE";
  const range = days.length ? `${fmtDayNum(days[0].iso)}${days.length > 1 ? `–${fmtDayNum(days.at(-1)!.iso)}` : ""} ${fmtMonthShort(days.at(-1)!.iso)}` : "";
  const today = dayKey(now);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#f1f2f0", color: "#101213", fontFamily: "sans-serif", padding: "64px 64px 48px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderBottom: "6px solid #101213", paddingBottom: 20 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 30, color: "#16658f", letterSpacing: 3 }}>HORARIOS · HORA ARGENTINA</div>
            <div style={{ display: "flex", fontSize: 96, fontWeight: 900, lineHeight: 1, letterSpacing: -3 }}>{heading}</div>
          </div>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 700, color: "#555a5c" }}>{range}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, marginTop: 12 }}>
          {rows.length === 0 && <div style={{ display: "flex", fontSize: 44, marginTop: 60 }}>No hay sesiones cargadas para estos días.</div>}
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 24, padding: "18px 0", borderBottom: "2px solid #d9dbda" }}>
              <div style={{ display: "flex", width: 12, alignSelf: "stretch", background: r.color }} />
              <div style={{ display: "flex", justifyContent: "center", width: 128, background: r.color, color: "#fff", fontSize: 30, fontWeight: 800, padding: "6px 0" }}>{r.code}</div>
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>{r.title}</div>
                <div style={{ display: "flex", fontSize: 26, color: "#555a5c" }}>{r.detail}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div style={{ display: "flex", fontSize: 44, fontWeight: 900 }}>{r.time}</div>
                <div style={{ display: "flex", fontSize: 24, color: "#555a5c" }}>{r.day}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 900, letterSpacing: 2 }}>FIERROS</div>
          <div style={{ display: "flex", fontSize: 30, color: "#16658f", fontWeight: 700 }}>somosfierros.ar/horarios</div>
        </div>
        <div style={{ display: "none" }}>{today}</div>
      </div>
    ),
    { width: 1080, height: 1350 },
  );
}
