import { ImageResponse } from "next/og";
import { drivers } from "@/data/drivers";
import manual from "@/data/manual-overrides.json";
import { seriesById } from "@/data/series";
import { getNow } from "@/lib/data";
import { visibleEvents } from "@/lib/monitor/checks.mjs";
import { ogFonts } from "@/lib/og-fonts";
import { FORMATOS, medidas, placaFinde as placaFindeRaw } from "@/lib/placa-finde.mjs";
import { loadRawSeason } from "@/lib/season-data";

// Placa «Horarios del finde» (variante «cartel de fichas», elegida por Leonel el 20/10/2026): tablero oscuro como el juego, bandera a cuadros
// arriba y el título en fichas. Feed 1080 × 1350 e historia 1080 × 1920. Los datos y el reparto en placas salen de src/lib/placa-finde.mjs, con las
// mismas fechas visibles que usa el borrador del viernes (/api/pulso): lo que se ve acá es lo que el borrador adjunta.
// Contraste sobre el fondo #0b0d0f (medido): texto 17,9:1, gris suave 8,4:1, amarillo 12,1:1, celeste 9,6:1; el día, tinta sobre amarillo 11,8:1. Los
// chips llevan blanco sobre el color de cada categoría (3,6:1 el más bajo, F4 Italia; letra de 26 px en negrita) y un borde claro para que el del
// TC2000, casi negro, no se pierda contra el fondo.

export type Formato = keyof typeof FORMATOS;
type Fila = { time: string; label: string; tbc: boolean };
type Bloque = { day: string; series: { id: string; code: string; short: string; color: string }; who: string; lugar: string; filas: Fila[] };
type Dia = { key: string; nombre: string; num: number; sigue: boolean; bloques: Bloque[] };
type Placa = { rango: string; escala: number; placas: Dia[][] };
// .mjs sin tipos: se anota a mano (como /placa/resumen).
const placaFinde = placaFindeRaw as unknown as (events: unknown[], now: string, catalog: unknown, formato: Formato) => Placa;
type Medidas = ReturnType<typeof medidas> & Record<string, number>;

const D = { bg: "#0b0d0f", panel: "#15181b", panel2: "#1c2024", borde: "#2b3136", texto: "#f4f6f5", suave: "#a3abb0", celeste: "#75bee9", amarillo: "#f5c640" };
const flex = (extra: Record<string, string | number> = {}) => ({ display: "flex", ...extra });
const oneLine = { overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" } as const;

export const esFormato = (f: string): f is Formato => f in FORMATOS;

/** La placa del finde de un formato, con lo que está publicado ahora. */
export async function datosPlaca(formato: Formato) {
  const season = await loadRawSeason();
  return placaFinde(visibleEvents(season.events as never, manual), getNow(), { seriesById, drivers }, formato);
}

// Logotipo de Fierros (src/components/logo.tsx), en sus coordenadas originales.
function Logo({ height }: { height: number }) {
  return (
    <svg width={(428 / 80) * height} height={height} viewBox="0 8 428 80">
      <path d="M0 8h80v80H0z" fill={D.texto} />
      <path d="M18 21h17v15H18zm17 0h29v15H35zM18 41h17v15H18zm17 0h23v15H35zM18 61h17v15H18z" fill={D.celeste} />
      <g transform="translate(104 28)">
        <path d="M0 0h44v10H14v13h24v10H14v23H0z" fill={D.celeste} />
        <path
          fill={D.texto}
          fillRule="evenodd"
          d="M50 0h14v56H50zM70 0h44v10H84v13h24v10H84v13h30v10H70zM120 0h32l10 10v18l-9 8 12 20h-16l-10-17h-5v17h-14V0zm14 10v19h14V10h-14zM171 0h32l10 10v18l-9 8 12 20h-16l-10-17h-5v17h-14V0zm14 10v19h14V10h-14zM230 0h30l10 10v36l-10 10h-30l-10-10V10l10-10zm4 10v36h22V10h-22zM284 0h38v10h-28v12h20l10 10v14l-10 10h-40V46h30V34h-20l-10-10V10z"
        />
      </g>
    </svg>
  );
}

/** Bandera a cuadros a lo ancho. */
function Cuadros({ width, side }: { width: number; side: number }) {
  return (
    <div style={flex({ flexDirection: "column", flexShrink: 0 })}>
      {[0, 1].map((r) => (
        <div key={r} style={flex()}>
          {Array.from({ length: Math.ceil(width / side) }, (_, c) => (
            <div key={c} style={{ width: side, height: side, flexShrink: 0, background: (r + c) % 2 ? D.bg : D.texto }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Título en fichas de cartel (como el del juego), con la línea del medio. */
function Fichas({ text, size }: { text: string; size: number }) {
  return (
    <div style={flex({ gap: size * 0.16 })}>
      {text.split(" ").map((word) => (
        <div key={word} style={flex({ gap: size * 0.07 })}>
          {[...word].map((ch, i) => (
            <div key={i} style={flex({ position: "relative", width: size * 0.7, height: size, background: D.panel2, borderRadius: size * 0.08, justifyContent: "center", alignItems: "center", fontSize: size * 0.84, fontWeight: 900, color: D.amarillo, lineHeight: 1 })}>
              {ch}
              <div style={{ position: "absolute", left: 0, right: 0, top: size / 2 - 2, height: 4, background: D.bg }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Bloque({ b, m }: { b: Bloque; m: Medidas }) {
  return (
    // Alto: 8 + 6 de relleno y 2 de borde (bloquePad en placa-finde.mjs), más el nombre y una línea fija por renglón de horarios.
    <div style={flex({ gap: 20, flexShrink: 0, padding: "8px 0 6px", borderBottom: `2px solid ${D.panel2}` })}>
      <div style={flex({ width: m.chip, height: m.nombre * 1.05, marginTop: 4, flexShrink: 0, justifyContent: "center", alignItems: "center", background: b.series.color, border: "2px solid rgba(255,255,255,.22)", color: "#fff", fontSize: Math.round(26 * m.k), fontWeight: 800, letterSpacing: 1, borderRadius: 6 })}>{b.series.code}</div>
      <div style={flex({ flexDirection: "column", flex: 1, minWidth: 0 })}>
        <div style={flex({ alignItems: "baseline", gap: 14, height: m.nombreAlto })}>
          <div style={flex({ fontSize: m.nombre, fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0 })}>{b.who}</div>
          <div style={flex({ fontSize: m.texto, fontWeight: 500, color: D.suave, ...oneLine })}>{b.lugar}</div>
        </div>
        <div style={flex({ flexWrap: "wrap", columnGap: m.gap })}>
          {b.filas.map((t, i) => (
            <div key={i} style={flex({ alignItems: "baseline", gap: 10, height: m.linea, whiteSpace: "nowrap" })}>
              <div style={flex({ fontSize: m.hora, fontWeight: 900, color: t.tbc ? D.suave : D.amarillo })}>{t.time}</div>
              <div style={flex({ fontSize: m.texto, fontWeight: 500, color: D.texto })}>{t.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** La imagen de la placa `n` (1, 2, …) del formato; null si no existe esa placa. */
export async function imagenPlaca(formato: Formato, n: number, headers?: Record<string, string>) {
  const { rango, escala, placas } = await datosPlaca(formato);
  const dias = placas[n - 1];
  if (!dias) return null;
  const m = medidas(formato, escala) as Medidas;
  const historia = formato === "historia";
  const total = placas.length;
  return new ImageResponse(
    (
      <div style={flex({ width: "100%", height: "100%", flexDirection: "column", background: D.bg, color: D.texto, fontFamily: "Archivo" })}>
        <Cuadros width={m.W} side={m.cuadros / 2} />
        <div style={flex({ flexDirection: "column", height: m.cabeza, flexShrink: 0, padding: `${historia ? 70 : 34}px ${m.M}px 0` })}>
          <div style={flex({ justifyContent: "space-between", alignItems: "center" })}>
            <Logo height={46} />
            <div style={flex({ fontSize: 30, fontWeight: 800, color: D.suave, letterSpacing: 3 })}>HORA ARGENTINA</div>
          </div>
          <div style={flex({ marginTop: historia ? 56 : 28 })}>
            <Fichas text="ESTE FINDE" size={historia ? 122 : 100} />
          </div>
          <div style={flex({ marginTop: 16, fontSize: historia ? 46 : 42, fontWeight: 800, color: D.celeste })}>{rango}</div>
        </div>
        <div style={flex({ flexDirection: "column", flex: 1, padding: `0 ${m.M}px`, overflow: "hidden" })}>
          {dias.length === 0 && <div style={flex({ marginTop: 40, fontSize: 40, fontWeight: 800, color: D.suave })}>No hay sesiones cargadas para este finde.</div>}
          {dias.map((d) => (
            <div key={d.key} style={flex({ flexDirection: "column", flexShrink: 0 })}>
              <div style={flex({ alignItems: "flex-end", height: m.diaAlto, paddingBottom: 10, gap: 16, flexShrink: 0 })}>
                <div style={flex({ background: D.amarillo, color: "#141005", fontSize: Math.round((historia ? 36 : 32) * m.k), fontWeight: 900, padding: "2px 14px", borderRadius: 5, letterSpacing: 1 })}>{`${d.nombre.toUpperCase()} ${d.num}${d.sigue ? " · SIGUE" : ""}`}</div>
                <div style={{ flex: 1, height: 3, marginBottom: 14, background: D.borde }} />
              </div>
              {d.bloques.map((b, i) => (
                <Bloque key={i} b={b} m={m} />
              ))}
            </div>
          ))}
        </div>
        <div style={flex({ justifyContent: "space-between", alignItems: "center", padding: `0 ${m.M}px`, height: m.pie, background: D.panel, flexShrink: 0 })}>
          <div style={flex({ fontSize: 38, fontWeight: 800 })}>somosfierros.ar/horarios</div>
          {total > 1 && <div style={flex({ fontSize: 40, fontWeight: 900, color: D.suave })}>{`${n}/${total}`}</div>}
        </div>
      </div>
    ),
    { width: m.W, height: m.H, fonts: await ogFonts(), headers },
  );
}
