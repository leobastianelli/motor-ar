import type { Metadata } from "next";
import { getAllSeries } from "@/lib/data";
import { hasTaskSession } from "@/lib/task-auth";
import { listTasks, type Task } from "@/lib/tasks";
import { TaskBoard } from "@/components/task-board";
import { TaskLoginForm } from "@/components/task-login-form";

// Panel interno de tareas: qué falta cargar a mano por categoría. Fuera de la navegación y de los buscadores
// (bloqueado en robots.txt junto con el resto de /sistema) y protegido por contraseña (TASKS_PASSWORD).
export const metadata: Metadata = { title: "Tareas", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TareasPage() {
  const authed = await hasTaskSession();
  return (
    <div className="system tareas-page">
      <header className="system-head">
        <p className="kicker">Fierros · Panel interno</p>
        <h1>Tareas</h1>
        {authed && <p>Lo que ninguna fuente automática cubre todavía, por categoría. Las automáticas se abren y se cierran solas en cada sincronización.</p>}
      </header>
      {authed ? <Board /> : <TaskLoginForm />}
    </div>
  );
}

async function loadTasks(): Promise<{ tasks: Task[] } | { error: string }> {
  try {
    return { tasks: await listTasks() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "error desconocido" };
  }
}

async function Board() {
  const series = getAllSeries();
  const result = await loadTasks();
  if ("error" in result) {
    return <p className="empty-state">No se pudo leer la base de tareas: {result.error}.</p>;
  }
  return <TaskBoard initialTasks={result.tasks} seriesOptions={series.map((s) => ({ id: s.id, name: s.name }))} />;
}
