import { broadcastsBySeries } from "@/data/broadcasts";
import { drivers } from "@/data/drivers";
import manual from "@/data/manual-overrides.json";
import { series } from "@/data/series";
import { getNow } from "@/lib/data";
import { sql } from "@/lib/db";
import { hotPending, runHotRefresh } from "@/lib/hot-refresh";
import { visibleEvents } from "@/lib/monitor/checks.mjs";
import { claimDispatch } from "@/lib/pulso-dispatch.mjs";
import { DISPATCH_LOCK_MINUTES, pendingForDispatch } from "@/lib/pulso-core.mjs";
import { enviarBorradores as enviarBorradoresRaw } from "@/lib/redes-envio.mjs";
import { loadRawSeason } from "@/lib/season-data";

// .mjs sin tipos: TS infiere "never" en los parámetros. Se anota a mano, como hot-refresh.ts con las fuentes.
type EnviarBorradoresArgs = {
  raw: unknown;
  now: string;
  catalog: unknown;
  manual?: unknown;
  events: unknown[];
  sql: ReturnType<typeof sql> | null;
  dry?: boolean;
  creds?: { token?: string; chatId?: string };
};
type EnviarBorradoresResult = { candidatos: unknown[]; enviados: unknown[]; simulado: boolean; motivo?: string; errores: string[] };
const enviarBorradores = enviarBorradoresRaw as unknown as (args: EnviarBorradoresArgs) => Promise<EnviarBorradoresResult>;

// Pulso: lo llama un cron externo (cron-job.org) cada 5 min, jueves a lunes, porque GitHub Actions descarta la mayoría de sus corridas
// programadas (ver docs/plan-lanzamiento/01-borradores-para-redes.md, "Disparo con cron-job.org"). Hace, en orden y cada uno con su propio
// try/catch (si uno falla, los otros igual corren): 1) el refresco caliente, si hace falta; 2) los borradores para redes; 3) disparar la
// sincronización completa por la API de GitHub, si hay sesiones sin resultados y no se disparó hace poco. No toca páginas ni su `revalidate`
// (eso lo hace runHotRefresh cuando corresponde); no consulta Neon en un paso sin nada que hacer.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function pasoRefresco(events: unknown[]) {
  try {
    if (!hotPending(events)) return { status: "skipped", reason: "nada pendiente (según la temporada en memoria)" };
    return await runHotRefresh();
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : String(error) };
  }
}

async function pasoBorradores(args: EnviarBorradoresArgs) {
  try {
    const { candidatos, enviados, simulado, motivo, errores } = await enviarBorradores(args);
    return { status: "ok", candidatos: candidatos.length, enviados: enviados.length, simulado, motivo, errores };
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : String(error) };
  }
}

async function pasoSincronizacion(events: unknown[], now: string) {
  try {
    const pendientes = pendingForDispatch(events, now);
    if (!pendientes.length) return { status: "skipped", reason: "nada pendiente" };
    if (!process.env.GITHUB_DISPATCH_TOKEN) return { status: "skipped", reason: "sin GITHUB_DISPATCH_TOKEN", pendientes: pendientes.length };
    if (!process.env.DATABASE_URL) return { status: "skipped", reason: "sin DATABASE_URL", pendientes: pendientes.length };

    const claimed = await claimDispatch(sql(), now);
    if (!claimed) return { status: "skipped", reason: `ya se disparó hace menos de ${DISPATCH_LOCK_MINUTES} min`, pendientes: pendientes.length };

    const res = await fetch("https://api.github.com/repos/leobastianelli/motor-ar/actions/workflows/sync-season.yml/dispatches", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.GITHUB_DISPATCH_TOKEN}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "content-type": "application/json",
      },
      body: JSON.stringify({ ref: "main", inputs: { timing_days: "21" } }),
    });
    if (!res.ok) return { status: "error", error: `GitHub respondió ${res.status}`, pendientes: pendientes.length };
    return { status: "disparada", pendientes: pendientes.length };
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : String(error) };
  }
}

export async function GET(request: Request) {
  const secret = process.env.PULSO_SECRET;
  if (!secret) return new Response("Sin PULSO_SECRET: /api/pulso está apagado.", { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("No autorizado", { status: 401 });

  const now = getNow();
  const raw = await loadRawSeason();
  const events = visibleEvents(raw.events as never, manual);

  const refresco = await pasoRefresco(events);
  const borradores = await pasoBorradores({
    raw,
    now,
    events,
    manual,
    catalog: { drivers, series, broadcasts: broadcastsBySeries },
    sql: process.env.DATABASE_URL ? sql() : null,
    creds: { token: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID },
  });
  const sincronizacion = await pasoSincronizacion(events, now);

  return Response.json({ at: now, refresco, borradores, sincronizacion });
}
