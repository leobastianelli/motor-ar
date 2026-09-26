import { getNow } from "@/lib/data";
import { sql } from "@/lib/db";
import { deliverWatchdog as deliverWatchdogRaw, runWatchdog as runWatchdogRaw } from "@/lib/monitor/watchdog-run.mjs";
import { guardarVigilanteEstado as guardarVigilanteEstadoRaw, leerVigilanteEstado as leerVigilanteEstadoRaw } from "@/lib/monitor/vigilante-estado.mjs";

// .mjs sin tipos: TS infiere mal los parámetros y el retorno. Se anota a mano, como pulso/route.ts con enviarBorradores.
type Probe = { path: string; ok: boolean; status: number | null; ms: number; body: string };
type Finding = { key: string; severity: "critical" | "high" | "medium" | "info"; level: number; title: string; body: string; tier?: number; consecutive?: number };
type Sent = Finding & { kind: "nuevo" | "sube" | "recordatorio" };
type Resolved = { key: string; title: string };
type VigilanteEstado = { alerts: Record<string, unknown>; fails: Record<string, number>; lastSummary: string | null };
type RunWatchdogArgs = { site: string; now: string; state: VigilanteEstado | undefined; githubToken?: string; githubRepo?: string; dry?: boolean };
type RunWatchdogResult = { probed: Probe[]; findings: Finding[]; send: Sent[]; resolved: Resolved[]; state: VigilanteEstado; notes: string[] };
type DeliverResult = { sent: number; text: string | null; simulated?: boolean };
const runWatchdog = runWatchdogRaw as unknown as (args: RunWatchdogArgs) => Promise<RunWatchdogResult>;
const deliverWatchdog = deliverWatchdogRaw as unknown as (alerts: { send: Sent[]; resolved: Resolved[] }, creds: { token?: string; chatId?: string }) => Promise<DeliverResult>;
type SqlClient = ReturnType<typeof sql>;
const leerVigilanteEstado = leerVigilanteEstadoRaw as unknown as (client: SqlClient) => Promise<VigilanteEstado>;
const guardarVigilanteEstado = guardarVigilanteEstadoRaw as unknown as (client: SqlClient, estado: VigilanteEstado) => Promise<void>;

// Vigilante: lo llama un cron externo (cron-job.org) cada 30 min, como /api/pulso (ver docs/plan-lanzamiento/01-borradores-para-redes.md,
// "Disparo con cron-job.org"), porque GitHub Actions descarta la mayoría de sus corridas programadas (ver docs/avisos-telegram.md). Hace lo
// mismo que scripts/watchdog.mjs (misma orquestación en src/lib/monitor/watchdog-run.mjs), pero prueba las páginas públicas por HTTP (no se
// llama a sí mismo por dentro) y guarda qué ya se avisó en la tabla `vigilante_estado` de Neon en vez de un archivo.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.PULSO_SECRET;
  if (!secret) return new Response("Sin PULSO_SECRET: /api/vigilante está apagado.", { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("No autorizado", { status: 401 });

  const now = getNow();
  const site = (process.env.SITE_URL ?? "https://www.somosfierros.ar").replace(/\/$/, "");

  let previousState: VigilanteEstado | undefined;
  try {
    previousState = process.env.DATABASE_URL ? await leerVigilanteEstado(sql()) : undefined;
  } catch (error) {
    return Response.json({ at: now, error: `No se pudo leer vigilante_estado: ${error instanceof Error ? error.message : String(error)}` }, { status: 500 });
  }

  // GITHUB_DISPATCH_TOKEN ya existe (lo usa /api/pulso para disparar la sincronización) y tiene permiso de lectura de Actions.
  const githubToken = process.env.GITHUB_DISPATCH_TOKEN;
  const githubRepo = "leobastianelli/motor-ar";

  const { probed, findings, send, resolved, state: nextState, notes } = await runWatchdog({ site, now, state: previousState, githubToken, githubRepo });

  let telegram: DeliverResult;
  try {
    telegram = await deliverWatchdog({ send, resolved }, { token: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID });
  } catch (error) {
    return Response.json(
      {
        at: now,
        paginas: probed.map(({ path, ok, status, ms }) => ({ path, ok, status, ms })),
        hallazgos: findings,
        avisados: send.map((f) => f.key),
        resueltos: resolved.map((r) => r.key),
        notas: notes,
        error: `No se pudo enviar el aviso: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 502 },
    );
  }

  if (process.env.DATABASE_URL) {
    try {
      await guardarVigilanteEstado(sql(), nextState);
    } catch (error) {
      notes.push(`No se pudo guardar vigilante_estado: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    notes.push("sin DATABASE_URL: no se guardó el estado (se va a repetir el próximo aviso)");
  }

  return Response.json({
    at: now,
    site,
    paginas: probed.map(({ path, ok, status, ms }) => ({ path, ok, status, ms })),
    hallazgos: findings,
    avisados: send.map((f) => f.key),
    resueltos: resolved.map((r) => r.key),
    telegram: { enviados: telegram.sent, simulado: telegram.simulated ?? false },
    notas: notes,
  });
}
