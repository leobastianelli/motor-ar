import { revalidatePath } from "next/cache";

// Llamado por Vercel Cron: marca todas las páginas para regenerarse con datos frescos aunque no haya visitas.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("No autorizado", { status: 401 });
  }
  revalidatePath("/", "layout");
  return Response.json({ revalidated: true, at: new Date().toISOString() });
}
