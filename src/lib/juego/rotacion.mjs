import { JUEGO_INICIO } from "./config.mjs";
import { diasEntre, sumarDias } from "./dia.mjs";

/** Hash FNV-1a de 32 bits: determinista, sin dependencias y barato (se llama una vez por candidato y por día). */
export function hash(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Una pista vale si tiene texto y una fuente. */
const pistaCompleta = (p) => Boolean(p && typeof p.texto === "string" && p.texto.trim() && typeof p.fuente === "string" && p.fuente.trim());

/** ¿Puede ser el piloto del día `fecha`? Necesita sus 2 pistas escritas y una fecha `desde` anterior al día. */
export function esCandidato(slug, fecha, pistas) {
  const p = pistas?.[slug];
  return Boolean(p && typeof p.desde === "string" && p.desde < fecha && Array.isArray(p.pistas) && p.pistas.length >= 2 && p.pistas.slice(0, 2).every(pistaCompleta));
}

/**
 * El piloto de una fecha. Recorre desde el día del lanzamiento: cada día elige, entre los candidatos de ese día que todavía no salieron,
 * el de menor hash(semilla + día + slug); al agotarse, vuelve a empezar. Como para el día D sólo cuentan los que tienen `desde` < D,
 * sumar pilotos con `desde` futuro no cambia ni los días pasados ni el de hoy. Devuelve el piloto o null si ese día no hay candidatos.
 */
export function pilotoDelDia(fecha, pilotos, pistas, semilla, inicio = JUEGO_INICIO) {
  if (diasEntre(inicio, fecha) < 0) return null;
  const porSlug = new Map(pilotos.map((p) => [p.slug, p]));
  let usados = new Set();
  let elegido = null;
  for (let d = inicio; d <= fecha; d = sumarDias(d, 1)) {
    const candidatos = [...porSlug.keys()].filter((slug) => esCandidato(slug, d, pistas));
    elegido = null;
    if (candidatos.length === 0) continue;
    let disponibles = candidatos.filter((s) => !usados.has(s));
    if (disponibles.length === 0) {
      usados = new Set();
      disponibles = candidatos;
    }
    let mejor = null;
    for (const slug of disponibles) {
      const h = hash(`${semilla}|${d}|${slug}`);
      if (!mejor || h < mejor.h || (h === mejor.h && slug < mejor.slug)) mejor = { slug, h };
    }
    elegido = mejor.slug;
    usados.add(elegido);
  }
  return elegido ? porSlug.get(elegido) : null;
}
