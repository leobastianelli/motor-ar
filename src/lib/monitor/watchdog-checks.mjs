// Chequeos del vigilante: lo que puede fallar sin que nadie lo vea. Puros, como los del guardián.
const HOUR = 3600_000;
const MIN = 60_000;
// La home tiene que salir del caché: si tarda más que esto, algo la está reconstruyendo en cada pedido.
const HOME_SLOW_MS = 3_000;

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
    } else if (r.ms > (r.path === "/" ? HOME_SLOW_MS : 10_000)) {
      out.push({ key: `sitio-lento:${r.path}`, severity: "medium", level: 1, tier: 3, consecutive: 2, title: `El sitio está lento: ${r.path}`, body: `Tardó ${Math.round(r.ms / 100) / 10} s en responder.` });
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

/**
 * Salud de los datos a partir de /api/salud (ver src/app/api/salud/route.ts): `salud` es el JSON, o null si no respondió.
 * - no responde → el sitio no puede decir qué versión sirve
 * - servedFrom distinto de "store" → el sitio está usando el respaldo (instantánea del repo o última versión vista)
 * - la última versión del almacén lleva más de 10 min y el sitio sirve otra → la invalidación de las páginas no funcionó
 * - sesiones sin resultados hace más de 60 min → la fuente no las publicó o el sitio no las tomó
 */
export function saludFindings(salud, now, { staleMin = 10, pendingMin = 60, homeVersion } = {}) {
  if (!salud) {
    return [{ key: "salud:no-responde", severity: "high", level: 1, tier: 1, title: "/api/salud no responde", body: "No se puede saber qué versión de los datos sirve el sitio." }];
  }
  const out = [];
  const { sirviendo, almacen } = salud;
  if (sirviendo?.servedFrom !== "store") {
    out.push({
      key: "salud:respaldo",
      severity: "high",
      level: 1,
      tier: 1,
      title: "El sitio está usando el respaldo",
      body: `Sirve "${sirviendo?.servedFrom ?? "?"}" en vez de la última versión del almacén${sirviendo?.error ? ` (${String(sirviendo.error).slice(0, 200)})` : ""}. Los datos pueden estar viejos.`,
    });
  }
  const storedAge = almacen?.createdAt ? (Date.parse(now) - Date.parse(almacen.createdAt)) / MIN : 0;
  if (almacen?.ultimaVersion != null && almacen.ultimaVersion !== sirviendo?.versionId && storedAge > staleMin) {
    out.push({
      key: "salud:version-vieja",
      severity: "high",
      level: 1,
      tier: 1,
      title: "El sitio no toma la versión nueva",
      body: `El almacén tiene la versión ${almacen.ultimaVersion} (${almacen.origin}, hace ${Math.round(storedAge)} min) y el sitio sirve la ${sirviendo?.versionId ?? "instantánea"}. Falló la invalidación de las páginas.`,
    });
  }
  // Lo que importa es lo que ve la gente: la versión del <meta name="fierros-datos"> de la home (ISR), que puede quedar vieja aunque /api/salud
  // (dinámico) ya vea la nueva. Dos corridas seguidas: la primera visita después de invalidar puede recibir la copia anterior mientras regenera.
  if (homeVersion != null && almacen?.ultimaVersion != null && String(almacen.ultimaVersion) !== String(homeVersion) && storedAge > staleMin) {
    out.push({
      key: "salud:home-vieja",
      severity: "high",
      level: 1,
      tier: 1,
      consecutive: 2,
      title: "La home muestra una versión vieja",
      body: `El almacén tiene la versión ${almacen.ultimaVersion} (hace ${Math.round(storedAge)} min) y la home muestra la ${homeVersion}. Las páginas no se regeneraron.`,
    });
  }
  // Rally Argentino y Fórmula Nacional: sólo se actualizan desde una PC (Cloudflare bloquea a la nube). Sin resultados: aviso diario; provisoria: cada 72 h.
  for (const r of salud.rallyPendiente ?? []) {
    out.push({
      key: `rally-sync:${r.evento}:${r.motivo}`,
      severity: r.motivo === "sin-resultados" ? "medium" : "info",
      level: 1,
      tier: 1,
      title: r.motivo === "sin-resultados" ? `Rally Argentino: falta cargar la fecha ${r.fecha} (${r.nombre})` : `Rally Argentino: la fecha ${r.fecha} sigue provisoria`,
      body: `Correr en la PC, desde la carpeta del repo: npm run sync:rally (rallyargentino.com bloquea a GitHub y a Vercel). Después, para que el sitio lo muestre: gh workflow run "Sincronizar temporada".${r.motivo === "provisoria" ? " Si sigue provisoria, la organización todavía no la pasó a su histórico." : ""}`,
    });
  }
  for (const r of salud.fnaPendiente ?? []) {
    out.push({
      key: `fna-sync:${r.evento}:${r.motivo}`,
      severity: r.motivo === "sin-resultados" ? "medium" : "info",
      level: 1,
      tier: 1,
      title: r.motivo === "sin-resultados" ? `Fórmula Nacional: falta cargar la fecha ${r.fecha} (${r.nombre})` : `Fórmula Nacional: la fecha ${r.fecha} sigue provisoria`,
      body: `Fórmula Nacional: falta cargar desde la PC: npm run sync:fna (desde la carpeta del repo; formulanacional.com.ar bloquea a GitHub y a Vercel). Publica solo y avisa al sitio si hay CRON_SECRET.`,
    });
  }
  for (const p of salud.pendientes ?? []) {
    if (p.terminoHaceMin <= pendingMin) continue;
    if (p.tablaIncompleta) {
      // La fuente está rota, no nosotros: se recuerda cada 72 h, sin alarma.
      const { url, filas } = p.tablaIncompleta;
      out.push({
        key: `salud:pendiente:${p.categoria}:${p.sesion}`,
        severity: "info",
        level: 1,
        tier: 3,
        title: `Tabla incompleta: ${p.sesion}`,
        body: `La ACTC publicó la tabla incompleta${filas ? ` (${filas} filas)` : ""}: se muestra cuando la corrijan. ${url}`,
      });
      continue;
    }
    out.push({
      key: `salud:pendiente:${p.categoria}:${p.sesion}`,
      severity: "medium",
      level: 1,
      tier: 3,
      title: `Sin resultados: ${p.sesion}`,
      body: `Terminó hace ${Math.round(p.terminoHaceMin / 60 * 10) / 10} h (${p.categoria}) y todavía no tiene resultados.`,
    });
  }
  return out;
}
