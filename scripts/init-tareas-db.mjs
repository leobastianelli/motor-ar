// Crea (o actualiza) la tabla de tareas del panel interno (/sistema/tareas). Se corre a mano, una vez, contra la
// base de Neon provista por Vercel: `node scripts/init-tareas-db.mjs` (con DATABASE_URL en el entorno, o vía
// `npx dotenv -e .env.local -- node scripts/init-tareas-db.mjs`).
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL (vercel env pull .env.local)");
const sql = neon(url);

// INTEGER (no BIGINT): el driver de Neon devuelve BIGINT como string en JS (para no perder precisión más allá de
// Number.MAX_SAFE_INTEGER), lo que rompería el tipo `Task.id: number`. Esta tabla nunca va a acercarse a 2^31 filas.
await sql`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
    origin TEXT NOT NULL CHECK (origin IN ('auto', 'manual')),
    check_key TEXT UNIQUE,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    done_at TIMESTAMPTZ
  )
`;
await sql`CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks (status)`;
await sql`CREATE INDEX IF NOT EXISTS tasks_category_idx ON tasks (category)`;

console.log("Tabla `tasks` lista.");
