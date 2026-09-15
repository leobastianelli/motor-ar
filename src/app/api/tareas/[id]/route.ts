import { deleteTask, setTaskStatus } from "@/lib/tasks";
import { hasTaskSession } from "@/lib/task-auth";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/tareas/[id]">) {
  if (!(await hasTaskSession())) return Response.json({ error: "No autorizado" }, { status: 401 });
  const id = parseId((await ctx.params).id);
  if (!id) return Response.json({ error: "Id inválido" }, { status: 400 });
  const body = await request.json().catch(() => null);
  const status = body?.status === "done" ? "done" : body?.status === "pending" ? "pending" : null;
  if (!status) return Response.json({ error: "status inválido" }, { status: 400 });
  const task = await setTaskStatus(id, status);
  if (!task) return Response.json({ error: "No existe" }, { status: 404 });
  return Response.json({ task });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/tareas/[id]">) {
  if (!(await hasTaskSession())) return Response.json({ error: "No autorizado" }, { status: 401 });
  const id = parseId((await ctx.params).id);
  if (!id) return Response.json({ error: "Id inválido" }, { status: 400 });
  await deleteTask(id);
  return Response.json({ ok: true });
}
