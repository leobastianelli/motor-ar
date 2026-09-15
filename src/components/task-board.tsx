"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Task } from "@/lib/tasks";

interface SeriesOption {
  id: string;
  name: string;
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Falló el pedido");
  return res.json();
}

export function TaskBoard({ initialTasks, seriesOptions }: { initialTasks: Task[]; seriesOptions: SeriesOption[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const pending = useMemo(() => tasks.filter((t) => t.status === "pending"), [tasks]);
  const done = useMemo(() => tasks.filter((t) => t.status === "done"), [tasks]);
  const nameOf = (id: string | null) => seriesOptions.find((s) => s.id === id)?.name ?? id ?? "General";

  const grouped = useMemo(() => {
    const groups = new Map<string, Task[]>();
    for (const t of pending) groups.set(nameOf(t.category), [...(groups.get(nameOf(t.category)) ?? []), t]);
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nameOf depende de seriesOptions, que no cambia en esta página
  }, [pending]);

  const toggle = async (t: Task) => {
    setBusy(true);
    try {
      const next = t.status === "pending" ? "done" : "pending";
      const { task } = await api(`/api/tareas/${t.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      setTasks((prev) => prev.map((x) => (x.id === t.id ? task : x)));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (t: Task) => {
    setBusy(true);
    try {
      await api(`/api/tareas/${t.id}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((x) => x.id !== t.id));
    } finally {
      setBusy(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const { task } = await api("/api/tareas", { method: "POST", body: JSON.stringify({ title: title.trim(), category: category || null, note: note.trim() || null }) });
      setTasks((prev) => [task, ...prev]);
      setTitle("");
      setNote("");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await api("/api/tareas/logout", { method: "POST" });
    router.refresh();
  };

  return (
    <div className="task-board">
      <form onSubmit={add} className="task-add">
        <input placeholder="Nueva tarea (ej. buscar resumen de TC Mouras fecha 9)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Sin categoría</option>
          {seriesOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="submit" disabled={busy || !title.trim()}>
          Agregar
        </button>
      </form>

      <div className="task-groups">
        {grouped.length === 0 && <p className="empty-state">No hay tareas pendientes. 🎉</p>}
        {grouped.map(([groupName, items]) => (
          <section key={groupName} className="task-group">
            <h3>
              {groupName} <span>{items.length}</span>
            </h3>
            <ul>
              {items.map((t) => (
                <li key={t.id} className={t.origin}>
                  <label>
                    <input type="checkbox" checked={false} disabled={busy} onChange={() => toggle(t)} />
                    <span>{t.title}</span>
                  </label>
                  {t.note && <small>{t.note}</small>}
                  <div className="task-meta">
                    <em>{t.origin === "auto" ? "automática" : "manual"}</em>
                    {t.origin === "manual" && (
                      <button type="button" disabled={busy} onClick={() => remove(t)}>
                        Borrar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="task-done-toggle">
        <button type="button" onClick={() => setShowDone((v) => !v)}>
          {showDone ? "Ocultar" : "Ver"} resueltas ({done.length})
        </button>
        <button type="button" onClick={logout}>
          Salir
        </button>
      </div>

      {showDone && (
        <ul className="task-done-list">
          {done.map((t) => (
            <li key={t.id}>
              <label>
                <input type="checkbox" checked disabled={busy} onChange={() => toggle(t)} />
                <span>{t.title}</span>
              </label>
              <em>{nameOf(t.category)}</em>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
