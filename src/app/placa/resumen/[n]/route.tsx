import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { drivers } from "@/data/drivers";
import manual from "@/data/manual-overrides.json";
import { series } from "@/data/series";
import { getNow } from "@/lib/data";
import { visibleEvents } from "@/lib/monitor/checks.mjs";
import { ogFonts } from "@/lib/og-fonts";
import { resumenFinde as resumenFindeRaw, resumenReciente as resumenRecienteRaw, shortName as shortNameRaw } from "@/lib/resumen-core.mjs";
import { loadRawSeason } from "@/lib/season-data";

// Carrusel «Lo que dejó el finde» (hasta 4 placas de 1080 × 1350, hora argentina). Los datos salen de resumen-core.mjs con las mismas fechas visibles,
// catálogo y cargas manuales que usa el borrador de Telegram (/api/pulso), así que lo que se ve acá es lo que el borrador adjunta.
//   /placa/resumen/1..4            el último domingo (≤ ahora) con resultados
//   /placa/resumen/1?domingo=YYYY-MM-DD    ese fin de semana puntual (el borrador lo usa para fijar las placas a su domingo)
// Las placas que existen dependen de los datos (`slides`): sin argentinos o sin resto, hay menos de 4 y las demás dan 404.

type Row = { pos: number; name: string; team: string; gap: string };
type Ref = { series: { id: string; code: string; color: string; name: string }; evento: string; ciudad: string; winner: { name: string; team: string }; provisional: boolean };
type Resumen = {
  sunday: string;
  fecha: string;
  slides: ("portada" | "hero" | "argentinos" | "resto")[];
  hero: Ref & { pole: string | null; poleYVictoria: boolean; podium: Row[]; lider: { driver: string; points?: number } | null };
  argentinos: (Ref & { driver: string; team: string; pos: number; grid: number | null; terminó: boolean; texto: string; podium: Row[] }) | null;
  resto: (Ref & { second: string | null })[];
};
type Opts = { catalog: unknown; manual: unknown; events: unknown[] };
// .mjs sin tipos: se anota a mano (como /api/pulso).
const resumenFinde = resumenFindeRaw as unknown as (season: unknown, when: { sunday: string }, opts: Opts) => Resumen | null;
const resumenReciente = resumenRecienteRaw as unknown as (season: unknown, now: string, opts: Opts) => Resumen | null;
const shortName = shortNameRaw as unknown as (name: string) => string;

const C = { ink: "#101213", paper: "#f1f2f0", blue: "#75bee9", blueDeep: "#16658f", muted: "#555a5c", line: "#d9dbda", yellow: "#f5c640" };
const W = 1080;
const H = 1350;
const PAD = 64;
const FOOTER = 112;

/** Tamaño de letra que entra en `maxChars` caracteres por línea (aproximado): se achica, nunca pasa de `base` ni baja de `min`. */
const fit = (text: string, base: number, maxChars: number, min = 26) => Math.max(min, Math.min(base, Math.floor((base * maxChars) / Math.max(1, text.length))));
const ord = (n: number) => `${n}°`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pts = (p: number) => String(p).replace(".", ",");
const lugar = (r: { evento: string; ciudad: string }) => (r.ciudad && !r.evento.includes(r.ciudad) ? `${r.evento} · ${r.ciudad}` : r.evento);
const fmtGap = (gap: string) => gap.trim();

const flex = (extra: Record<string, string | number> = {}) => ({ display: "flex", ...extra });
const oneLine = { overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" } as const;

function Chip({ code, color, size = 30, width }: { code: string; color: string; size?: number; width?: number }) {
  return <div style={flex({ justifyContent: "center", alignItems: "center", minWidth: width ?? size * 3.4, background: color, color: "#fff", fontSize: size, fontWeight: 800, padding: `${size * 0.22}px ${size * 0.5}px`, letterSpacing: 1 })}>{code}</div>;
}

function Tag({ children }: { children: ReactNode }) {
  return <div style={flex({ background: C.yellow, color: C.ink, fontSize: 28, fontWeight: 800, padding: "6px 16px", letterSpacing: 1 })}>{children}</div>;
}

function Frame({ dark, n, total, fecha, children }: { dark?: boolean; n: number; total: number; fecha: string; children: ReactNode }) {
  const fg = dark ? C.paper : C.ink;
  return (
    <div style={flex({ width: "100%", height: "100%", flexDirection: "column", background: dark ? C.ink : C.paper, color: fg, fontFamily: "Archivo" })}>
      <div style={flex({ justifyContent: "space-between", alignItems: "center", padding: `52px ${PAD}px 0`, fontSize: 30, fontWeight: 800, color: dark ? C.blue : C.blueDeep })}>
        <div style={flex({ ...oneLine, maxWidth: 820 })}>{`Lo que dejó el finde · ${fecha}`}</div>
        <div style={flex({ fontWeight: 900, fontSize: 36, color: dark ? C.paper : C.ink, letterSpacing: 1 })}>{`${n}/${total}`}</div>
      </div>
      <div style={flex({ flex: 1, flexDirection: "column", padding: `28px ${PAD}px 36px`, minHeight: 0 })}>{children}</div>
      <div style={flex({ height: FOOTER, background: C.ink, borderTop: dark ? `4px solid ${C.blue}` : "none", justifyContent: "space-between", alignItems: "center", padding: `0 ${PAD}px` })}>
        <div style={flex({ fontWeight: 900, fontSize: 52, letterSpacing: 1, color: C.paper })}>FIERROS</div>
        <div style={flex({ fontSize: 32, fontWeight: 800, color: C.blue })}>somosfierros.ar</div>
      </div>
    </div>
  );
}

// ——— 1. Portada ———

function Portada({ r }: { r: Resumen }) {
  const h = r.hero;
  const who = shortName(h.winner.name);
  const where = h.ciudad || h.evento;
  const line1 = `${who} ganó en`;
  const size = Math.max(150, Math.min(200, Math.floor(940 / (0.44 * Math.max(line1.length, where.length)))));
  const second = h.podium.find((p) => p.pos === 2);
  const third = h.podium.find((p) => p.pos === 3);
  const facts = [
    h.poleYVictoria ? "Pole y victoria" : h.pole ? `Pole: ${shortName(h.pole)}` : "",
    second ? `2.º ${shortName(second.name)}` : "",
    third ? `3.º ${shortName(third.name)}` : "",
  ].filter(Boolean);
  const lider = h.lider ? `Campeonato: ${shortName(h.lider.driver)} lidera${h.lider.points != null ? ` con ${pts(h.lider.points)} pts` : ""}` : "";
  const index: { code: string; color: string; line: string }[] = [];
  for (const s of r.slides.slice(1)) {
    if (s === "hero") index.push({ code: h.series.code, color: h.series.color, line: `El podio de ${where}` });
    if (s === "argentinos" && r.argentinos) {
      const a = r.argentinos;
      index.push({ code: a.series.code, color: a.series.color, line: a.terminó ? `${shortName(a.driver)}, ${ord(a.pos)}` : `${shortName(a.driver)} ${a.texto}` });
    }
    if (s === "resto") index.push({ code: `+${r.resto.length}`, color: C.blueDeep, line: r.resto.map((x) => shortName(x.winner.name)).join(", ") });
  }
  return (
    <Frame dark n={1} total={r.slides.length} fecha={r.fecha}>
      <div style={flex({ flexDirection: "column", flex: 1, justifyContent: "center" })}>
        {h.provisional && (
          <div style={flex({ marginBottom: 20 })}>
            <Tag>PROVISORIO</Tag>
          </div>
        )}
        <div style={flex({ flexDirection: "column", fontWeight: 900, fontSize: size, lineHeight: 0.92, letterSpacing: -3 })}>
          <div style={flex({ color: C.paper })}>{line1}</div>
          <div style={flex({ color: C.blue, lineClamp: 2 })}>{where}</div>
        </div>
        <div style={flex({ flexDirection: "column", marginTop: 36, gap: 10, fontSize: 38, fontWeight: 800 })}>
          <div style={flex({ gap: 14, flexWrap: "wrap", color: C.paper })}>{facts.join(" · ")}</div>
          {lider && <div style={flex({ fontSize: 32, color: C.blue })}>{lider}</div>}
          {h.provisional && <div style={flex({ fontSize: 28, fontWeight: 500, color: C.paper })}>Resultado provisorio, sujeto a revisión de los comisarios.</div>}
        </div>
      </div>
      <div style={flex({ flexDirection: "column", borderTop: `3px solid ${C.paper}`, paddingTop: 14 })}>
        {index.map((it, i) => (
          <div key={i} style={flex({ alignItems: "center", gap: 22, height: 74, borderBottom: i < index.length - 1 ? "2px solid #3a3f41" : "none" })}>
            <div style={flex({ width: 40, fontSize: 40, fontWeight: 900, color: C.blue })}>{i + 2}</div>
            <Chip code={it.code} color={it.color} size={26} width={104} />
            <div style={flex({ flex: 1, fontSize: 36, fontWeight: 800, color: C.paper, ...oneLine })}>{it.line}</div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

// ——— 2. Detalle del evento principal ———

function Hero({ r, n }: { r: Resumen; n: number }) {
  const h = r.hero;
  const who = shortName(h.winner.name);
  const title = h.poleYVictoria ? `Pole y victoria de ${who}` : `Ganó ${who}`;
  const rows = h.podium;
  return (
    <Frame n={n} total={r.slides.length} fecha={r.fecha}>
      <div style={flex({ alignItems: "center", gap: 18 })}>
        <Chip code={h.series.code} color={h.series.color} size={32} />
        <div style={flex({ flex: 1, fontSize: 34, fontWeight: 800, ...oneLine })}>{lugar(h)}</div>
      </div>
      <div style={flex({ flexDirection: "column", marginTop: 26, paddingBottom: 22, borderBottom: `8px solid ${C.ink}`, fontWeight: 900, fontSize: title.length <= 20 ? 138 : title.length <= 28 ? 112 : 92, lineHeight: 0.95, letterSpacing: -1 })}>
        <div style={flex({ lineClamp: 2 })}>{title}</div>
      </div>
      {h.provisional && (
        <div style={flex({ marginTop: 18, alignItems: "center", gap: 16 })}>
          <Tag>PROVISORIO</Tag>
          <div style={flex({ fontSize: 26, fontWeight: 500, color: C.muted })}>Sujeto a revisión de los comisarios</div>
        </div>
      )}
      <div style={flex({ flexDirection: "column", flex: 1, marginTop: 8, marginBottom: h.lider ? 24 : 0 })}>
        {rows.map((p) => (
          <div key={p.pos} style={flex({ alignItems: "center", flex: 1, maxHeight: 240, minHeight: 0, gap: 28, borderBottom: `3px solid ${C.line}` })}>
            <div style={flex({ width: 90, fontWeight: 900, fontSize: 130, letterSpacing: -2, color: p.pos === 1 ? C.blueDeep : C.ink })}>{p.pos}</div>
            <div style={flex({ flexDirection: "column", flex: 1, minWidth: 0 })}>
              <div style={flex({ fontSize: fit(p.name, 52, 22, 30), fontWeight: 800, ...oneLine })}>{p.name}</div>
              {p.team && <div style={flex({ fontSize: 30, fontWeight: 500, color: C.muted, ...oneLine })}>{p.team}</div>}
            </div>
            <div style={flex({ fontSize: 38, fontWeight: 800, color: C.muted, fontVariantNumeric: "tabular-nums" })}>{fmtGap(p.gap)}</div>
          </div>
        ))}
      </div>
      {h.lider && (
        <div style={flex({ flexDirection: "column", background: C.ink, color: C.paper, padding: "20px 28px", gap: 4 })}>
          <div style={flex({ fontSize: 26, fontWeight: 800, color: C.blue, letterSpacing: 1 })}>CAMPEONATO</div>
          <div style={flex({ fontSize: 42, fontWeight: 800, ...oneLine })}>{`${h.lider.driver} puntero${h.lider.points != null ? `, ${pts(h.lider.points)} pts` : ""}`}</div>
        </div>
      )}
    </Frame>
  );
}

// ——— 3. Argentinos afuera ———

function Argentinos({ r, n }: { r: Resumen; n: number }) {
  const a = r.argentinos!;
  const apellido = shortName(a.driver);
  const headline = a.terminó ? `${apellido}, ${ord(a.pos)}` : `${apellido} ${a.texto}`;
  const big = a.terminó ? (a.grid ? `${ord(a.grid)} → ${ord(a.pos)}` : ord(a.pos)) : "";
  const podio = a.podium.map((p) => `${p.pos}.º ${shortName(p.name)}`).join(" · ");
  return (
    <Frame n={n} total={r.slides.length} fecha={r.fecha}>
      <div style={flex({ alignItems: "center", gap: 18 })}>
        <Chip code={a.series.code} color={a.series.color} size={32} />
        <div style={flex({ flex: 1, fontSize: 34, fontWeight: 800, ...oneLine })}>{lugar(a)}</div>
      </div>
      <div style={flex({ marginTop: 20, fontSize: 30, fontWeight: 800, color: C.blueDeep, letterSpacing: 1 })}>ARGENTINO EN {a.series.name.toUpperCase()}</div>
      <div style={flex({ flexDirection: "column", flex: 1, justifyContent: "center" })}>
        {a.terminó ? (
          <div style={flex({ fontWeight: 900, fontSize: a.grid ? 215 : 340, lineHeight: 0.9, letterSpacing: -4, whiteSpace: "nowrap", color: C.blueDeep })}>{big}</div>
        ) : (
          <div style={flex({ fontWeight: 900, fontSize: 150, lineHeight: 0.92, letterSpacing: -3, color: C.blueDeep })}>{cap(a.texto)}</div>
        )}
        {a.grid && !a.terminó ? <div style={flex({ marginTop: 10, fontSize: 32, fontWeight: 800, color: C.muted })}>{`Largó ${ord(a.grid)}`}</div> : null}
        <div style={flex({ marginTop: 36, paddingTop: 22, borderTop: `8px solid ${C.ink}`, fontWeight: 900, fontSize: headline.length <= 22 ? 110 : 84, lineHeight: 0.95, letterSpacing: -2, lineClamp: 2 })}>{headline}</div>
        {a.team && <div style={flex({ marginTop: 10, fontSize: 32, fontWeight: 500, color: C.muted })}>{a.team}</div>}
      </div>
      <div style={flex({ flexDirection: "column", gap: 8, paddingTop: 20, borderTop: `3px solid ${C.ink}` })}>
        <div style={flex({ fontSize: 44, fontWeight: 800, ...oneLine })}>{`Ganó ${shortName(a.winner.name)}${a.winner.team ? ` · ${a.winner.team}` : ""}`}</div>
        {podio && <div style={flex({ fontSize: 32, fontWeight: 500, color: C.muted, lineClamp: 2 })}>{podio}</div>}
        {a.provisional && (
          <div style={flex({ marginTop: 6 })}>
            <Tag>PROVISORIO</Tag>
          </div>
        )}
      </div>
    </Frame>
  );
}

// ——— 4. Y además ———

function Resto({ r, n }: { r: Resumen; n: number }) {
  return (
    <Frame n={n} total={r.slides.length} fecha={r.fecha}>
      <div style={flex({ fontWeight: 900, fontSize: 130, lineHeight: 0.95, letterSpacing: -3, paddingBottom: 18, borderBottom: `8px solid ${C.ink}` })}>Y además</div>
      <div style={flex({ flexDirection: "column" })}>
        {r.resto.map((x, i) => (
          <div key={i} style={flex({ alignItems: "center", height: 206, gap: 26, borderBottom: `3px solid ${C.line}` })}>
            <div style={flex({ width: 150, justifyContent: "center" })}>
              <Chip code={x.series.code} color={x.series.color} size={32} width={150} />
            </div>
            <div style={flex({ flexDirection: "column", flex: 1, minWidth: 0, gap: 2 })}>
              <div style={flex({ fontSize: 28, fontWeight: 800, color: C.muted, ...oneLine })}>{lugar(x)}</div>
              <div style={flex({ fontSize: fit(x.winner.name, 72, 22, 34), fontWeight: 900, letterSpacing: -1, ...oneLine })}>{x.winner.name}</div>
              <div style={flex({ alignItems: "center", gap: 14 })}>
                {x.second && <div style={flex({ fontSize: 30, fontWeight: 500, color: C.muted, ...oneLine })}>{`2.º ${x.second}`}</div>}
                {x.provisional && <Tag>PROVISORIO</Tag>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={flex({ flex: 1 })} />
      <div style={flex({ fontSize: 34, fontWeight: 800, color: C.blueDeep })}>Todos los resultados, en somosfierros.ar</div>
    </Frame>
  );
}

export async function GET(request: Request, { params }: { params: Promise<{ n: string }> }) {
  const { n: raw } = await params;
  const n = /^[1-4]$/.test(raw) ? Number(raw) : 0;
  if (!n) return new Response("No existe esa placa (1 a 4).", { status: 404 });

  const domingo = new URL(request.url).searchParams.get("domingo");
  if (domingo && !/^\d{4}-\d{2}-\d{2}$/.test(domingo)) return new Response("domingo tiene que ser YYYY-MM-DD.", { status: 400 });

  const season = await loadRawSeason();
  const opts: Opts = { catalog: { drivers, series }, manual, events: visibleEvents(season.events as never, manual) };
  const resumen = domingo ? resumenFinde(season, { sunday: domingo }, opts) : resumenReciente(season, getNow(), opts);
  const kind = resumen?.slides[n - 1];
  if (!resumen || !kind) return new Response("No hay resumen para esa placa.", { status: 404 });

  const body = kind === "portada" ? <Portada r={resumen} /> : kind === "hero" ? <Hero r={resumen} n={n} /> : kind === "argentinos" ? <Argentinos r={resumen} n={n} /> : <Resto r={resumen} n={n} />;
  return new ImageResponse(body, {
    width: W,
    height: H,
    fonts: await ogFonts(),
    headers: { "cache-control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=600" },
  });
}
