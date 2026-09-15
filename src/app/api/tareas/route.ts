import { addManualTask, listTasks } from "@/lib/tasks";
import { hasTaskSession } from "@/lib/task-auth";

export async function GET() {
  if (!(await hasTaskSession())) return Response.json({ error: "No autorizado" }, { status: 401 });
  return Response.json({ tasks: await listTasks() });
}

export async function POST(request: Request) {
  if (!(await hasTaskSession())) return Response.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return Response.json({ error: "Falta el título" }, { status: 400 });
  const category = typeof body?.category === "string" && body.category ? body.category : null;
  const note = typeof body?.note === "string" && body.note ? body.note : null;
  const task = await addManualTask(title, category, note);
  return Response.json({ task }, { status: 201 });
}
