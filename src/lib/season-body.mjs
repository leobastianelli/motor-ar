// Cuerpo de una versión de la temporada en `season_versions`: se guarda comprimido (brotli, en base64, columna `body_br`) porque el JSON
// pesa ~1,5 MB y se lee muchas veces (cada compilación, cada instancia del sitio, cada corrida de la sincronización y del guardián): sin comprimir
// se comía la transferencia mensual de Neon (5 GB en el plan gratis). Comprimido pesa ~140 KB. Las versiones viejas sin comprimir (`body`) se
// siguen leyendo.
import { brotliCompressSync, brotliDecompressSync, constants } from "node:zlib";

/** JSON de la temporada → texto para `body_br`. */
export const encodeBody = (json) =>
  brotliCompressSync(Buffer.from(json, "utf8"), { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } }).toString("base64");

/** Fila con `body_br` (comprimido) o `body` (viejo, sin comprimir) → JSON de la temporada. */
export function decodeBody(row) {
  if (row.body_br) return brotliDecompressSync(Buffer.from(row.body_br, "base64")).toString("utf8");
  if (typeof row.body === "string") return row.body;
  throw new Error("La versión no tiene cuerpo");
}
