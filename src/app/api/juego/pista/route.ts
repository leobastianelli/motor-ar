import { FALLOS_PARA_PISTA } from "@/lib/juego/config.mjs";
import { cacheHastaFinDelDia, contexto, json, pistasDelJuego, slugsValidos } from "@/lib/juego/servidor";

// Entrega una pista del piloto del día sólo si ya hubo suficientes fallos: la 1.ª con 3 pilotos distintos que no son la respuesta, la 2.ª con 6.
//   GET /api/juego/pista?fecha=2026-10-20&n=1&fallados=a,b,c
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ctx = contexto(params.get("fecha"));
  if (!ctx.ok) return json({ error: ctx.error }, { status: ctx.status });
  const n = Number(params.get("n"));
  if (n !== 1 && n !== 2) return json({ error: "n tiene que ser 1 o 2" }, { status: 400 });
  const fallados = slugsValidos(params.get("fallados"));
  if (!fallados) return json({ error: "lista de pilotos inválida" }, { status: 400 });
  if (fallados.some((p) => p.slug === ctx.respuesta.slug)) return json({ error: "esa lista incluye al piloto del día" }, { status: 403 });
  if (fallados.length < FALLOS_PARA_PISTA[n - 1]) return json({ error: "todavía faltan intentos para esta pista" }, { status: 403 });

  const pista = pistasDelJuego()[ctx.respuesta.slug]?.pistas[n - 1];
  if (!pista) return json({ error: "sin pista" }, { status: 404 });
  return json({ n, texto: pista.texto, fuente: pista.fuente }, { cache: cacheHastaFinDelDia(ctx.fecha, ctx.hoy) });
}
