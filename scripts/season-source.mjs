// Lectura de la temporada para los scripts (sincronización, compuerta horaria, guardián): la última versión del almacén de Neon si hay
// DATABASE_URL, y el archivo del repo si no hay o si el almacén falla. Siempre dice de dónde salió.
import fs from "node:fs";
import { readLatest } from "../src/lib/season-store-write.mjs";

/** Función `sql` de Neon, o null si no hay DATABASE_URL (uso local). El paquete se importa acá para que la compuerta lo pida sólo si lo necesita. */
export async function connect() {
  if (!process.env.DATABASE_URL) return null;
  const { neon } = await import("@neondatabase/serverless");
  return neon(process.env.DATABASE_URL);
}

/**
 * → { raw, label, versionId, createdAt, sql }. `label` es una frase para consola y para el mensaje de Telegram.
 * Con `requireStore` no cae al archivo: si hay DATABASE_URL y el almacén falla, tira el error (la sincronización no debe partir de un respaldo viejo).
 */
export async function loadSeason(file, { requireStore = false } = {}) {
  const fromFile = () => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : undefined);
  const sql = await connect();
  if (!sql) return { raw: fromFile(), label: `archivo ${file} (sin DATABASE_URL)`, versionId: null, createdAt: null, sql: null };
  try {
    const latest = await readLatest(sql);
    if (!latest) throw new Error("el almacén no tiene versiones (falta `npm run db:season:init`)");
    return { raw: latest.raw, label: `almacén, versión ${latest.id} (${latest.origin})`, versionId: latest.id, createdAt: latest.createdAt, sql };
  } catch (error) {
    if (requireStore) throw error;
    console.warn(`No se pudo leer el almacén (${error.message}): se usa el archivo ${file}.`);
    return { raw: fromFile(), label: `archivo ${file} (el almacén falló)`, versionId: null, createdAt: null, sql };
  }
}
