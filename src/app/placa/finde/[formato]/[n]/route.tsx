import { esFormato, imagenPlaca } from "../../placa";

// Placa «Horarios del finde», una imagen por placa del carrusel:
//   /placa/finde/feed/1..n        1080 × 1350 (feed de Instagram, X, WhatsApp)
//   /placa/finde/historia/1..n    1080 × 1920 (historias, estados de WhatsApp)
// Cuántas placas hay depende de cuánto corre el finde (src/lib/placa-finde.mjs); las que no existen dan 404.
export async function GET(_request: Request, { params }: { params: Promise<{ formato: string; n: string }> }) {
  const { formato, n: raw } = await params;
  const n = /^[1-9]$/.test(raw) ? Number(raw) : 0;
  if (!esFormato(formato) || !n) return new Response("No existe esa placa (feed o historia, 1 a 9).", { status: 404 });
  const imagen = await imagenPlaca(formato, n, { "cache-control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=600" });
  return imagen ?? new Response("No hay tantas placas este finde.", { status: 404 });
}
