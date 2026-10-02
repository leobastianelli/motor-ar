import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getDriversAbroad, getNow, getSeason, weekendWindow } from "@/lib/data";
import { dayKey, fmtDayNum, fmtDayShort, fmtMonthShort, fmtTime } from "@/lib/format";

export const revalidate = 1800;

// Todo menos las series: los entrenamientos también se planifican. Las series del TC (tres en una hora) llenarían la placa.
const KINDS = new Set(["practica", "clasificacion", "sprint", "carrera", "final"]);
/** Alto útil para las filas (1350 menos márgenes, encabezado y pie). */
const ROWS_HEIGHT = 1010;
const DAY_HEAD = 46;
/** Alto de fila: el máximo si sobra lugar; se achica hasta el mínimo para que entre el finde entero; si ni así entra, se corta y se avisa. */
const ROW_MAX = 64;
const ROW_MIN = 46;
const MORE = 44;

// Archivo, la letra del sitio (subconjunto latino de Google Fonts, en woff: ImageResponse no lee woff2). Sin esto la placa sale con la
// letra por defecto, sin negrita.
const FONT_DIR = join(process.cwd(), "src/app/placa/imagen/fuentes");
const fonts = Promise.all([
  readFile(join(FONT_DIR, "archivo-500.woff")),
  readFile(join(FONT_DIR, "archivo-800.woff")),
  readFile(join(FONT_DIR, "archivo-condensed-900.woff")),
]);

const C = { ink: "#101213", paper: "#f1f2f0", blueDeep: "#16658f", muted: "#555a5c", line: "#d9dbda" };

/**
 * Placa del finde para redes (1080 × 1350): entrenamientos, clasificaciones y carreras de lo que viene, en hora argentina, agrupadas por día. En las
 * categorías internacionales se nombra al argentino que corre; en las nacionales, la categoría.
 */
export async function GET() {
  const now = getNow();
  const season = await getSeason();
  const { items, days } = season.getAgenda(now);
  const abroad = new Map<string, string[]>();
  for (const d of getDriversAbroad()) abroad.set(d.seriesId, [...(abroad.get(d.seriesId) ?? []), d.name.split(" ").at(-1)!]);

  const rows = items
    .filter((i) => KINDS.has(i.session.kind))
    .map((i) => ({
      day: dayKey(i.session.start),
      dayLabel: `${fmtDayShort(i.session.start)}`,
      code: i.series.code,
      color: i.series.color,
      who: abroad.get(i.series.id)?.join(" y ") ?? i.series.short,
      detail: `${i.session.name} · ${i.event.circuit.city}`,
      time: i.session.timeKnown === false ? "a conf." : fmtTime(i.session.start),
    }));

  const heads = new Set(rows.map((r) => r.day)).size;
  const ROW = Math.max(ROW_MIN, Math.min(ROW_MAX, Math.floor((ROWS_HEIGHT - heads * DAY_HEAD) / Math.max(1, rows.length))));
  const k = ROW / ROW_MAX;
  // Cortar por alto si ni con la fila mínima entra todo: cada día nuevo suma su encabezado, y el aviso de lo que falta, su renglón.
  const shown: typeof rows = [];
  let used = 0;
  for (const [n, r] of rows.entries()) {
    const cost = ROW + (shown.at(-1)?.day === r.day ? 0 : DAY_HEAD);
    if (used + cost > ROWS_HEIGHT - (n < rows.length - 1 ? MORE : 0)) break;
    shown.push(r);
    used += cost;
  }
  const hidden = rows.length - shown.length;

  const weekend = weekendWindow(now).days;
  const inWeekend = days.length > 0 && days.every((d) => weekend.some((w) => w.key === d.key));
  const heading = inWeekend ? "Este finde" : "Lo que sigue";
  const range = days.length ? [`${fmtDayNum(days[0].iso)}${days.length > 1 ? `–${fmtDayNum(days.at(-1)!.iso)}` : ""}`, fmtMonthShort(days.at(-1)!.iso)] : [];
  const [regular, bold, condensed] = await fonts;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.paper, color: C.ink, fontFamily: "Archivo", padding: "56px 64px 44px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderBottom: `8px solid ${C.ink}`, paddingBottom: 18 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: C.blueDeep }}>Horarios · hora argentina</div>
            <div style={{ display: "flex", fontFamily: "Archivo Condensed", fontSize: 108, lineHeight: 0.9, letterSpacing: -4 }}>{heading}</div>
          </div>
          <div style={{ display: "flex", gap: 14, fontFamily: "Archivo Condensed", fontSize: 56, color: C.muted, letterSpacing: -1 }}>
            {range.map((part) => (
              <div key={part} style={{ display: "flex" }}>{part}</div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {shown.length === 0 && <div style={{ display: "flex", fontSize: 44, marginTop: 60 }}>No hay sesiones cargadas para estos días.</div>}
          {shown.map((r, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column" }}>
              {shown[i - 1]?.day !== r.day && (
                <div style={{ display: "flex", height: DAY_HEAD, alignItems: "flex-end", paddingBottom: 5, borderBottom: `3px solid ${C.ink}`, fontSize: 26, fontWeight: 800 }}>{r.dayLabel}</div>
              )}
              <div style={{ display: "flex", alignItems: "center", height: ROW, gap: 22 * k, borderBottom: `2px solid ${C.line}` }}>
                <div style={{ display: "flex", width: 132 * k, fontFamily: "Archivo Condensed", fontSize: 46 * k, letterSpacing: -1 }}>{r.time}</div>
                <div style={{ display: "flex", justifyContent: "center", width: 96 * k, background: r.color, color: "#fff", fontSize: 24 * k, fontWeight: 800, padding: `${5 * k}px 0` }}>{r.code}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 14 * k, flex: 1, overflow: "hidden" }}>
                  <div style={{ display: "flex", fontSize: 32 * k, fontWeight: 800, whiteSpace: "nowrap" }}>{r.who}</div>
                  <div style={{ display: "flex", fontSize: 24 * Math.max(k, 0.85), color: C.muted, whiteSpace: "nowrap" }}>{r.detail}</div>
                </div>
              </div>
            </div>
          ))}
          {hidden > 0 && <div style={{ display: "flex", marginTop: 14, fontSize: 26, color: C.muted }}>{`Y ${hidden} más en el sitio`}</div>}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `3px solid ${C.ink}`, paddingTop: 18 }}>
          <div style={{ display: "flex", fontFamily: "Archivo Condensed", fontSize: 48, letterSpacing: 1 }}>FIERROS</div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: C.blueDeep }}>somosfierros.ar/horarios</div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: "Archivo", data: regular, weight: 500, style: "normal" },
        { name: "Archivo", data: bold, weight: 800, style: "normal" },
        { name: "Archivo Condensed", data: condensed, weight: 900, style: "normal" },
      ],
    },
  );
}
