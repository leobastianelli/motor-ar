"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TaskLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tareas/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "No se pudo entrar");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="task-login">
      <label htmlFor="tareas-password">Contraseña</label>
      <input id="tareas-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus autoComplete="current-password" />
      <button type="submit" disabled={loading || !password}>
        {loading ? "Entrando…" : "Entrar"}
      </button>
      {error && <p className="task-error">{error}</p>}
    </form>
  );
}
