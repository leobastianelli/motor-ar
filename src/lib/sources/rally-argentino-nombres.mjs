// Nombres del Rally Argentino. La API de resultados escribe "Federico VILLAGRA" (apellido en mayúsculas) y "Augusto D'AGOSTINI"; la tabla del
// campeonato, "Federico  Villagra" (dos espacios) y "Augusto D´Agostini" (con un acento agudo en vez del apóstrofo). Todo se lleva a "Nombre
// Apellido", con el apóstrofo común, para que el piloto sea el mismo en los resultados, en el campeonato y en el índice de pilotos.
import { repairMojibake } from "./common.mjs";

const cap = (token) => token.toLowerCase().replace(/(^|['-])(\p{L})/gu, (_, sep, letter) => sep + letter.toUpperCase());

/**
 * Sólo se pasan a "Nombre Propio" las palabras escritas íntegramente en mayúsculas (el apellido de la API): una palabra con minúsculas se
 * deja como viene ("McKenzie", "De la Torre"). Una sigla de una letra ("J") queda igual.
 */
export function nombrePropio(text) {
  const limpio = repairMojibake(String(text ?? ""))
    .replace(/[´`’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return limpio
    .split(" ")
    .map((w) => (/\p{Ll}/u.test(w) ? w : cap(w)))
    .join(" ");
}

/** Equipo de un auto: "Piloto / Navegante", los dos con el nombre normalizado (la fuente siempre trae las dos personas). */
export function tripulacion(piloto, navegante) {
  return [piloto, navegante].map(nombrePropio).filter(Boolean).join(" / ");
}
