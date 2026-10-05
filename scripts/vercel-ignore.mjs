// ignoreCommand de Vercel (vercel.json): sale con 0 para saltear el deploy y con 1 para construir. Compara el commit con el anterior.
// No despliega si sólo cambió la instantánea de la temporada o las fechas del índice de pilotos (generatedAt, firstSeen, lastSeen), que
// el sincronizador reescribe en casi cada corrida y no cambian nada del sitio. Cualquier otro cambio construye, y también cualquier error.
import { execFileSync } from "node:child_process";
import { needsBuild } from "../src/lib/deploy-ignore.mjs";

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

try {
  const files = git("diff", "--name-only", "HEAD^", "HEAD").split("\n").filter(Boolean);
  const build = needsBuild(files, (side, file) => git("show", `${side === "before" ? "HEAD^" : "HEAD"}:${file}`));
  console.log(build ? "Hay cambios que requieren construir." : `Nada que construir (${files.join(", ") || "sin archivos"}).`);
  process.exit(build ? 1 : 0);
} catch (error) {
  console.log(`No se pudo comparar con el commit anterior (${error instanceof Error ? error.message : error}): se construye.`);
  process.exit(1);
}
