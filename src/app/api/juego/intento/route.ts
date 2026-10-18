import { acerto, comparar } from "@/lib/juego/comparar.mjs";
import { buscarPiloto, cacheHastaFinDelDia, contexto, json } from "@/lib/juego/servidor";

// Compara un intento con el piloto del día. GET para que la CDN de Vercel lo guarde hasta las 00:00 argentinas: la misma pregunta
// (fecha + piloto) tiene siempre la misma respuesta, así que casi nunca llega a una función. Nunca devuelve el piloto del día.
//   GET /api/juego/intento?fecha=2026-10-20&slug=pepe-pruebas
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ctx = contexto(params.get("fecha"));
  if (!ctx.ok) return json({ error: ctx.error }, { status: ctx.status });
  const slug = params.get("slug") ?? "";
  const intento = /^[a-z0-9-]{1,80}$/.test(slug) ? buscarPiloto(slug) : undefined;
  if (!intento) return json({ error: "piloto desconocido" }, { status: 400 });

  return json(
    {
      acerto: acerto(intento, ctx.respuesta),
      intento: { slug: intento.slug, nombre: intento.nombre, nacio: intento.nacio, provincia: intento.provincia, categorias: intento.categorias, titulos: intento.titulos, corre2026: intento.corre2026 },
      comparacion: comparar(intento, ctx.respuesta),
    },
    { cache: cacheHastaFinDelDia(ctx.fecha, ctx.hoy) },
  );
}
