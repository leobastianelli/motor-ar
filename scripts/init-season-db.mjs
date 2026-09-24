// Crea la tabla `season_versions` (almacén único de la temporada) y la siembra con la instantánea del repo si está vacía.
// Se corre a mano contra la base de Neon: `npm run db:season:init` (o con DATABASE_URL en el entorno). Se puede repetir sin duplicar la siembra.
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { summarize } from "../src/lib/season-store-core.mjs";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL (vercel env pull .env.local)");
const sql = neon(url);

// INTEGER (no BIGINT): el driver de Neon devuelve BIGINT como string en JS, ver init-tareas-db.mjs.
await sql`
  CREATE TABLE IF NOT EXISTS season_versions (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_id INTEGER REFERENCES season_versions(id),
    origin TEXT NOT NULL CHECK (origin IN ('seed', 'sync', 'hot')),
    generated_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    summary JSONB NOT NULL,
    body TEXT NOT NULL
  )
`;

const [{ n }] = await sql`SELECT count(*)::int AS n FROM season_versions`;
if (n === 0) {
  const body = readFileSync(new URL("../src/data/season-2026.json", import.meta.url), "utf8");
  const raw = JSON.parse(body);
  // El WHERE NOT EXISTS evita duplicar la siembra si dos corridas se pisan.
  const inserted = await sql`
    INSERT INTO season_versions (origin, generated_at, summary, body)
    SELECT 'seed', ${raw.generatedAt}::timestamptz, ${JSON.stringify(summarize(raw))}::jsonb, ${body}
    WHERE NOT EXISTS (SELECT 1 FROM season_versions)
    RETURNING id
  `;
  console.log(inserted.length ? `Sembrada la versión ${inserted[0].id} desde src/data/season-2026.json.` : "Otra corrida ya sembró la tabla.");
} else {
  console.log(`La tabla ya tiene ${n} versión(es); no se siembra.`);
}
console.log("Tabla `season_versions` lista.");
