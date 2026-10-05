// Decide si un commit necesita desplegarse (ver scripts/vercel-ignore.mjs). Puro, sin dependencias: lo importa el script que corre en Vercel y su prueba.

/** Archivos que no cambian nada del sitio por sí solos: la instantánea de la temporada es sólo el respaldo (el sitio lee Neon). */
const IGNORED_FILES = new Set(["src/data/season-2026.json"]);
const INDEX_FILE = "src/data/drivers-2026.json";

/**
 * Campos del índice de pilotos que el código no usa en ningún lado: sólo los guarda el sincronizador. Todo lo demás (key, keys, slug, name, aliases, series,
 * numbers, teams, formerSlugs, o un campo nuevo) sí cuenta. Si alguien empieza a mostrar o filtrar por uno de estos, hay que sacarlo de acá.
 */
const UNUSED_ENTRY_FIELDS = ["firstSeen", "lastSeen"];

/** El índice sin lo que no se usa: si dos versiones dan lo mismo acá, el sitio sale idéntico. */
export function relevantIndex(raw) {
  const { generatedAt, drivers, ...rest } = JSON.parse(raw);
  void generatedAt;
  return JSON.stringify({ ...rest, drivers: drivers.map((d) => Object.fromEntries(Object.entries(d).filter(([k]) => !UNUSED_ENTRY_FIELDS.includes(k)))) });
}

/**
 * ¿Hay que construir? `files` son los archivos que cambió el commit; `read(rev, file)` devuelve el contenido de un archivo en "before" o "after".
 * Ante cualquier duda (archivo ilegible, JSON roto, forma inesperada) responde que sí.
 */
export function needsBuild(files, read) {
  for (const file of files) {
    if (IGNORED_FILES.has(file)) continue;
    if (file !== INDEX_FILE) return true;
    try {
      if (relevantIndex(read("before", file)) !== relevantIndex(read("after", file))) return true;
    } catch {
      return true;
    }
  }
  return false;
}
