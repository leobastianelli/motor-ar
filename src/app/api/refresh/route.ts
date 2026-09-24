import { revalidatePath, revalidateTag } from "next/cache";
import { syncAutoTasks } from "@/lib/tasks";

// Llamado por Vercel Cron: marca todas las páginas para regenerarse con datos frescos aunque no haya visitas,
// y de paso abre o cierra solas las tareas automáticas de /sistema/tareas según los huecos de datos del momento.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("No autorizado", { status: 401 });
  }
  // Primero la etiqueta (la consulta de la versión vigente), después las páginas que dependen de ella.
  revalidateTag("season", { expire: 0 });
  revalidatePath("/", "layout");
  // Si la base de tareas no está configurada (todavía) o falla, no tiene que tumbar el refresh de las páginas.
  const tasks = await syncAutoTasks().catch((error) => ({ error: error.message }));
  return Response.json({ revalidated: true, at: new Date().toISOString(), tasks });
}
