import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Archivo, la letra del sitio, para las imágenes de ImageResponse (tarjetas para compartir y la placa del finde). Sin esto salen con la
// letra por defecto, que no tiene negrita. Subconjunto latino de Google Fonts en woff (ImageResponse no lee woff2).
// El 900 es la versión condensada, como los títulos del sitio: así cualquier texto con fontWeight 900 sale condensado.
const DIR = join(process.cwd(), "src/lib/og-fuentes");
let cache: Promise<{ name: string; data: Buffer; weight: 500 | 800 | 900; style: "normal" }[]> | undefined;

export function ogFonts() {
  cache ??= Promise.all([readFile(join(DIR, "archivo-500.woff")), readFile(join(DIR, "archivo-800.woff")), readFile(join(DIR, "archivo-condensed-900.woff"))]).then(
    ([regular, bold, condensed]) => [
      { name: "Archivo", data: regular, weight: 500, style: "normal" },
      { name: "Archivo", data: bold, weight: 800, style: "normal" },
      { name: "Archivo", data: condensed, weight: 900, style: "normal" },
    ],
  );
  return cache;
}
