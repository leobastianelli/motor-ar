import { MAX_INTENTOS } from "@/lib/juego/config.mjs";
import { cacheHastaFinDelDia, contexto, json, slugsValidos } from "@/lib/juego/servidor";

// Revela el piloto del día sólo si la partida terminó: la lista de intentos incluye la respuesta, o son 8 pilotos distintos.
//   GET /api/juego/respuesta?fecha=2026-10-20&intentos=a,b,c
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ctx = contexto(params.get("fecha"));
  if (!ctx.ok) return json({ error: ctx.error }, { status: ctx.status });
  const intentos = slugsValidos(params.get("intentos"));
  if (!intentos) return json({ error: "lista de pilotos inválida" }, { status: 400 });
  const acerto = intentos.some((p) => p.slug === ctx.respuesta.slug);
  if (!acerto && intentos.length < MAX_INTENTOS) return json({ error: "la partida no terminó" }, { status: 403 });

  const { slug, nombre, nacio, provincia, categorias, titulos, corre2026, fuentes } = ctx.respuesta;
  return json({ acerto, piloto: { slug, nombre, nacio, provincia, categorias, titulos, corre2026, fuentes } }, { cache: cacheHastaFinDelDia(ctx.fecha, ctx.hoy) });
}
