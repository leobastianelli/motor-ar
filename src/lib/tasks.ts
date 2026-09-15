import { broadcastsBySeries } from "@/data/broadcasts";
import { getAllSeries, getSeason, ms, type Season } from "@/lib/data";
import { getPhoto } from "@/lib/photos";
import { sql } from "@/lib/db";

export interface Task {
  id: number;
  title: string;
  category: string | null;
  status: "pending" | "done";
  origin: "auto" | "manual";
  checkKey: string | null;
  note: string | null;
  createdAt: string;
  doneAt: string | null;
}

type Row = { id: number; title: string; category: string | null; status: string; origin: string; check_key: string | null; note: string | null; created_at: string; done_at: string | null };

const fromRow = (r: Row): Task => ({
  id: r.id,
  title: r.title,
  category: r.category,
  status: r.status as Task["status"],
  origin: r.origin as Task["origin"],
  checkKey: r.check_key,
  note: r.note,
  createdAt: r.created_at,
  doneAt: r.done_at,
});

export async function listTasks(): Promise<Task[]> {
  const rows = (await sql()`SELECT * FROM tasks ORDER BY status ASC, created_at DESC`) as Row[];
  return rows.map(fromRow);
}

export async function addManualTask(title: string, category: string | null, note: string | null): Promise<Task> {
  const rows = (await sql()`
    INSERT INTO tasks (title, category, origin, note) VALUES (${title}, ${category}, 'manual', ${note})
    RETURNING *
  `) as Row[];
  return fromRow(rows[0]);
}

export async function setTaskStatus(id: number, status: "pending" | "done"): Promise<Task | null> {
  const rows = (await sql()`
    UPDATE tasks SET status = ${status}, done_at = ${status === "done" ? new Date().toISOString() : null}
    WHERE id = ${id}
    RETURNING *
  `) as Row[];
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function deleteTask(id: number): Promise<void> {
  await sql()`DELETE FROM tasks WHERE id = ${id}`;
}

interface Gap {
  checkKey: string;
  title: string;
  category: string;
}

/**
 * Huecos que se pueden detectar solos a partir de los datos actuales de la temporada: campeonato oculto por
 * atraso, categoría sin foto de portada, sin transmisión confirmada, o una fecha ya corrida sin resultados de
 * carrera cargados. No incluye nada que dependa de una fuente que todavía no existe en el código (por ejemplo,
 * video de resumen: hasta que no se implemente ese campo, no hay nada real que chequear).
 */
export function computeAutoGaps(season: Season): Gap[] {
  const gaps: Gap[] = [];
  const now = ms(new Date().toISOString());

  for (const series of getAllSeries()) {
    const meta = season.getSeasonMeta(series.id);
    if (meta.standingsHidden) {
      gaps.push({ checkKey: `standings-oculto:${series.id}`, category: series.id, title: `Campeonato de ${series.name} oculto por atraso: conseguir la tabla al día (manual-overrides.json)` });
    }
    if (!getPhoto(`series-${series.id}`)) {
      gaps.push({ checkKey: `sin-foto:${series.id}`, category: series.id, title: `Falta foto de portada para ${series.name}` });
    }
    if (!broadcastsBySeries[series.id]?.items.length) {
      gaps.push({ checkKey: `sin-transmision:${series.id}`, category: series.id, title: `Confirmar dónde ver ${series.name} (sin transmisión cargada)` });
    }
  }

  const RACE_KINDS = new Set(["final", "carrera"]);
  for (const event of season.getAllEvents()) {
    const lastDay = ms(event.sessions.at(-1)!.start);
    if (now - lastDay < 3 * 86400_000) continue; // recién corrida: dale tiempo a la fuente antes de marcarla.
    const hasRaceResults = event.sessions.some((s) => RACE_KINDS.has(s.kind) && s.results?.length);
    if (!hasRaceResults) {
      gaps.push({ checkKey: `sin-resultados:${event.id}`, category: event.seriesId, title: `Cargar resultados de ${event.name} (${event.seriesId})` });
    }
  }

  return gaps;
}

/**
 * Abre las tareas automáticas nuevas y cierra solas las que ya no aplican (el hueco se resolvió). Una tarea
 * automática que alguien ya marcó "done" a mano no se vuelve a abrir aunque el hueco siga: se asume que fue una
 * decisión (por ejemplo, "esta categoría no va a tener foto por ahora").
 */
export async function syncAutoTasks(): Promise<{ opened: number; closed: number }> {
  const season = await getSeason();
  const gaps = computeAutoGaps(season);
  const existing = (await sql()`SELECT check_key, status FROM tasks WHERE origin = 'auto'`) as { check_key: string; status: string }[];
  const existingKeys = new Set(existing.map((r) => r.check_key));
  const currentKeys = new Set(gaps.map((g) => g.checkKey));

  let opened = 0;
  for (const gap of gaps) {
    if (existingKeys.has(gap.checkKey)) continue;
    await sql()`INSERT INTO tasks (title, category, origin, check_key) VALUES (${gap.title}, ${gap.category}, 'auto', ${gap.checkKey})`;
    opened++;
  }

  let closed = 0;
  for (const row of existing) {
    if (row.status === "pending" && !currentKeys.has(row.check_key)) {
      await sql()`UPDATE tasks SET status = 'done', done_at = now() WHERE check_key = ${row.check_key}`;
      closed++;
    }
  }

  return { opened, closed };
}
