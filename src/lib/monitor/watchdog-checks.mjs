// Chequeos del vigilante: lo que puede fallar sin que nadie lo vea. Puros, como los del guardián.
const HOUR = 3600_000;

/**
 * Estado del sitio a partir de las respuestas de sus páginas clave: [{ path, ok, status, ms, body }].
 * Una página que no responde 200, o que responde pero sin su contenido, es una caída.
 */
export function siteFindings(results) {
  const out = [];
  for (const r of results) {
    const empty = r.path === "/" && r.ok && !/Fierros/.test(r.body ?? "");
    const broken = r.ok && /Application error|Internal Server Error/i.test(r.body ?? "");
    if (!r.ok || empty || broken) {
      out.push({
        key: `sitio:${r.path}`,
        severity: "critical",
        level: 1,
        tier: 1,
        title: `El sitio no responde bien: ${r.path}`,
        body: r.ok ? "Respondió pero sin el contenido esperado." : `Respuesta ${r.status ?? "sin conexión"} después de varios intentos.`,
      });
    } else if (r.ms > 10_000) {
      out.push({ key: `sitio-lento:${r.path}`, severity: "medium", level: 1, tier: 3, consecutive: 2, title: `El sitio está lento: ${r.path}`, body: `Tardó ${Math.round(r.ms / 1000)} s en responder.` });
    }
  }
  return out;
}

/**
 * Estado del sincronizador a partir de sus últimas corridas terminadas (más nueva primero): [{ conclusion, created_at, html_url }].
 * El sincronizador corre al menos una vez por día: si la última exitosa tiene más de `maxHours`, dejó de correr.
 */
export function syncFindings(runs, now, { maxHours = 30 } = {}) {
  const nowMs = Date.parse(now);
  const out = [];
  const last = runs[0];
  const lastOk = runs.find((r) => r.conclusion === "success");
  if (last && last.conclusion !== "success") {
    out.push({ key: "sync:falló", severity: "high", level: 1, tier: 3, title: "La última sincronización de datos falló", body: `Resultado: ${last.conclusion}. Log: ${last.html_url}` });
  }
  if (!lastOk) {
    out.push({ key: "sync:atrasado", severity: "critical", level: 1, tier: 3, title: "No hay ninguna sincronización exitosa reciente", body: "Revisar la pestaña Actions del repositorio." });
  } else if (nowMs - Date.parse(lastOk.created_at) > maxHours * HOUR) {
    const hours = Math.round((nowMs - Date.parse(lastOk.created_at)) / HOUR);
    out.push({ key: "sync:atrasado", severity: "critical", level: 1, tier: 3, title: "Los datos dejaron de sincronizarse", body: `La última sincronización exitosa fue hace ${hours} h (debería ser al menos una por día). ${lastOk.html_url}` });
  }
  return out;
}
