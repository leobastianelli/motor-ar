// Después de publicar una versión desde la PC (npm run sync:rally, npm run sync:fna), el sitio tiene que enterarse. Con CRON_SECRET en .env.local
// se invalida directo (/api/refresh). Sin él, se dispara la sincronización de GitHub ("Sincronizar temporada"), que conserva lo publicado desde la
// PC e invalida al terminar (~5 minutos): así alcanza con un solo comando. El token es el de la cuenta dueña del repo (gh puede tener otra activa).
import { execFileSync } from "node:child_process";

const REPO = "leobastianelli/motor-ar";

function ghToken() {
  try {
    return execFileSync("gh", ["auth", "token", "-u", "leobastianelli"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return undefined; // sin esa cuenta en gh: se prueba con la activa
  }
}

export async function avisarSitio() {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const site = (process.env.SITE_URL ?? "https://www.somosfierros.ar").replace(/\/$/, "");
    const res = await fetch(`${site}/api/refresh`, { headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(60_000) });
    console.log(`Sitio invalidado (${site}/api/refresh → ${res.status}).`);
    return;
  }
  try {
    const token = ghToken();
    execFileSync("gh", ["workflow", "run", "sync-season.yml", "--ref", "main", "--repo", REPO], {
      env: token ? { ...process.env, GH_TOKEN: token } : process.env,
      stdio: ["ignore", "ignore", "pipe"],
    });
    console.log("Sincronización de GitHub disparada: el sitio lo muestra en unos 5 minutos.");
  } catch (error) {
    console.error(`No se pudo disparar la sincronización (${String(error.stderr ?? error.message).trim()}).`);
    console.error('Disparala a mano: gh workflow run sync-season.yml --ref main (o esperá la próxima automática).');
    process.exitCode = 1;
  }
}
