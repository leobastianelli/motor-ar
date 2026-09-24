import { runHotRefresh } from "@/lib/hot-refresh";

// Refresco caliente: resultados de F1 y videos a los minutos, sin esperar a la sincronización completa. Lo dispara el propio sitio (layout) y,
// de respaldo, el reintento horario de GitHub Actions. Protegido igual que /api/refresh.
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("No autorizado", { status: 401 });
  }
  const outcome = await runHotRefresh();
  return Response.json({ ...outcome, at: new Date().toISOString() }, { status: outcome.status === "error" ? 500 : 200 });
}
