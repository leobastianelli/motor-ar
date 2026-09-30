// Crea la tabla `season_versions` (almacén único de la temporada) y la siembra con la instantánea del repo si está vacía.
// Se corre a mano contra la base de Neon: `npm run db:season:init` (o con DATABASE_URL en el entorno). Se puede repetir sin duplicar la siembra.
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { encodeBody } from "../src/lib/season-body.mjs";
import { summarize } from "../src/lib/season-store-core.mjs";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL (vercel env pull .env.local)");
const sql = neon(url);

// INTEGER (no BIGINT): el driver de Neon devuelve BIGINT como string en JS, ver init-tareas-db.mjs.
await sql`
  CREATE TABLE IF NOT EXISTS season_versions (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_id INTEGER REFERENCES season_versions(id) ON DELETE SET NULL,
    origin TEXT NOT NULL CHECK (origin IN ('seed', 'sync', 'hot')),
    generated_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    summary JSONB NOT NULL,
    body TEXT NOT NULL
  )
`;

// Tablas creadas antes de 02b tienen la clave sin ON DELETE: sin esto la poda de versiones viejas (writeVersion) no puede borrar el eslabón más antiguo.
await sql`ALTER TABLE season_versions DROP CONSTRAINT IF EXISTS season_versions_parent_id_fkey`;
await sql`ALTER TABLE season_versions ADD CONSTRAINT season_versions_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES season_versions(id) ON DELETE SET NULL`;

// Cuerpo comprimido (ver src/lib/season-body.mjs): las versiones nuevas guardan sólo `body_br`; `body` queda para las viejas.
await sql`ALTER TABLE season_versions ADD COLUMN IF NOT EXISTS body_br TEXT`;
await sql`ALTER TABLE season_versions ALTER COLUMN body DROP NOT NULL`;

// Candado del refresco caliente (una fila): impide que varias instancias del sitio lo corran a la vez. Ver src/lib/hot-refresh.ts.
await sql`CREATE TABLE IF NOT EXISTS hot_lock (id INTEGER PRIMARY KEY, at TIMESTAMPTZ NOT NULL)`;
await sql`INSERT INTO hot_lock (id, at) VALUES (1, 'epoch') ON CONFLICT (id) DO NOTHING`;

// Borradores para redes ya mandados por Telegram (ver src/lib/redes-envio.mjs): reemplaza la caché de GitHub Actions (.redes-state.json), ahora
// que /api/pulso los manda cada 5 min y no sólo la sincronización. La clave es la misma que usaba el archivo (p. ej. "sesion:<id>").
await sql`CREATE TABLE IF NOT EXISTS redes_enviados (clave TEXT PRIMARY KEY, enviado_at TIMESTAMPTZ NOT NULL)`;

// Estado de /api/pulso (una fila): cuándo se disparó por última vez la sincronización completa por la API de GitHub. Ver src/lib/pulso-dispatch.mjs.
await sql`CREATE TABLE IF NOT EXISTS pulso_estado (id INTEGER PRIMARY KEY, last_dispatch_at TIMESTAMPTZ)`;
await sql`INSERT INTO pulso_estado (id, last_dispatch_at) VALUES (1, NULL) ON CONFLICT (id) DO NOTHING`;
// Disparo por evidencia (src/lib/pulso-sync.mjs): qué documento de la ACTC motivó el último disparo, cuándo y cuántas veces seguidas.
await sql`ALTER TABLE pulso_estado ADD COLUMN IF NOT EXISTS evidence_doc TEXT`;
await sql`ALTER TABLE pulso_estado ADD COLUMN IF NOT EXISTS evidence_at TIMESTAMPTZ`;
await sql`ALTER TABLE pulso_estado ADD COLUMN IF NOT EXISTS evidence_tries INTEGER`;

// Estado de avisos de GET /api/vigilante (una fila): qué ya se avisó, para no repetirlo. Reemplaza la caché de GitHub Actions
// (.watchdog-state.json) ahora que cron-job.org llama al endpoint cada 30 min. Ver src/lib/monitor/vigilante-estado.mjs.
await sql`CREATE TABLE IF NOT EXISTS vigilante_estado (id INTEGER PRIMARY KEY, estado JSONB, actualizado TIMESTAMPTZ)`;
await sql`INSERT INTO vigilante_estado (id, estado, actualizado) VALUES (1, '{"alerts":{},"fails":{},"lastSummary":null}'::jsonb, now()) ON CONFLICT (id) DO NOTHING`;

const [{ n }] = await sql`SELECT count(*)::int AS n FROM season_versions`;
if (n === 0) {
  const body = readFileSync(new URL("../src/data/season-2026.json", import.meta.url), "utf8");
  const raw = JSON.parse(body);
  // El WHERE NOT EXISTS evita duplicar la siembra si dos corridas se pisan.
  const inserted = await sql`
    INSERT INTO season_versions (origin, generated_at, summary, body_br, body)
    SELECT 'seed', ${raw.generatedAt}::timestamptz, ${JSON.stringify(summarize(raw))}::jsonb, ${encodeBody(body)}, ${body}
    WHERE NOT EXISTS (SELECT 1 FROM season_versions)
    RETURNING id
  `;
  console.log(inserted.length ? `Sembrada la versión ${inserted[0].id} desde src/data/season-2026.json.` : "Otra corrida ya sembró la tabla.");
} else {
  console.log(`La tabla ya tiene ${n} versión(es); no se siembra.`);
}
console.log("Tablas `season_versions`, `hot_lock`, `redes_enviados`, `pulso_estado` y `vigilante_estado` listas.");
