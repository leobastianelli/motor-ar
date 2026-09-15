// CLI para el panel de tareas (/sistema/tareas) sin pasar por el login del panel: agregar tareas manuales,
// listarlas y marcarlas hechas/pendientes directo contra la base. Necesita DATABASE_URL en el entorno:
//   npx dotenv -e .env.local -- node scripts/task-cli.mjs <comando> ...
//   npm run db:task -- <comando> ...   (ya trae dotenv)
//
// Comandos:
//   add "título" [--category=tc] [--note="texto"]   Crea una tarea manual (origin: manual).
//   list [--status=pending|done|all]                Lista (default: pending).
//   done <id>                                        Marca hecha.
//   reopen <id>                                       Vuelve a pendiente.
//   delete <id>                                       Borra (irreversible; para tareas cargadas por error).
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL (npx vercel env pull .env.local)");
const sql = neon(url);

const [, , command, ...rest] = process.argv;

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (const arg of args) {
    const m = arg.match(/^--([a-z]+)=([\s\S]*)$/);
    if (m) flags[m[1]] = m[2];
    else positional.push(arg);
  }
  return { flags, positional };
}

const fmt = (t) => `#${t.id} [${t.status === "done" ? "✓" : " "}] (${t.origin}${t.category ? `, ${t.category}` : ""}) ${t.title}${t.note ? `\n     ${t.note}` : ""}`;

async function add(args) {
  const { flags, positional } = parseFlags(args);
  const title = positional.join(" ").trim();
  if (!title) throw new Error('Falta el título: task-cli.mjs add "título" [--category=tc] [--note="..."]');
  const rows = await sql`
    INSERT INTO tasks (title, category, origin, note) VALUES (${title}, ${flags.category ?? null}, 'manual', ${flags.note ?? null})
    RETURNING *
  `;
  console.log("Creada:", fmt(rows[0]));
}

async function list(args) {
  const { flags } = parseFlags(args);
  const status = flags.status ?? "pending";
  const rows =
    status === "all"
      ? await sql`SELECT * FROM tasks ORDER BY status ASC, created_at DESC`
      : await sql`SELECT * FROM tasks WHERE status = ${status} ORDER BY created_at DESC`;
  if (!rows.length) return console.log(`Sin tareas (${status}).`);
  for (const t of rows) console.log(fmt(t));
}

async function setStatus(id, status) {
  if (!id) throw new Error(`Falta el id: task-cli.mjs ${status === "done" ? "done" : "reopen"} <id>`);
  const rows = await sql`
    UPDATE tasks SET status = ${status}, done_at = ${status === "done" ? new Date().toISOString() : null}
    WHERE id = ${Number(id)} RETURNING *
  `;
  if (!rows.length) return console.log(`No existe la tarea #${id}.`);
  console.log((status === "done" ? "Hecha:" : "Reabierta:"), fmt(rows[0]));
}

async function del(args) {
  const id = args[0];
  if (!id) throw new Error("Falta el id: task-cli.mjs delete <id>");
  const rows = await sql`DELETE FROM tasks WHERE id = ${Number(id)} RETURNING *`;
  console.log(rows.length ? `Borrada: ${fmt(rows[0])}` : `No existe la tarea #${id}.`);
}

const commands = {
  add,
  list,
  done: (args) => setStatus(args[0], "done"),
  reopen: (args) => setStatus(args[0], "pending"),
  delete: del,
};

const run = commands[command];
if (!run) {
  console.error(`Comando desconocido: "${command ?? ""}". Usar: add | list | done | reopen.`);
  process.exit(1);
}
await run(rest);
