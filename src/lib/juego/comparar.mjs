import { MARGEN_NACIO, regionDe } from "./config.mjs";

// Compara el intento con el piloto del día. Estados: "verde" (igual), "amarillo" (cerca), "gris" (no coincide).
// Flechas: "arriba" si el del día tiene un valor MAYOR que el intento (nació después, tiene más títulos), "abajo" si menor, null si no aplica.

const flecha = (intento, respuesta) => (respuesta > intento ? "arriba" : respuesta < intento ? "abajo" : null);

function nacio(intento, respuesta) {
  if (intento.nacio === respuesta.nacio) return { estado: "verde", flecha: null };
  const cerca = Math.abs(intento.nacio - respuesta.nacio) <= MARGEN_NACIO;
  return { estado: cerca ? "amarillo" : "gris", flecha: flecha(intento.nacio, respuesta.nacio) };
}

function provincia(intento, respuesta) {
  if (intento.provincia === respuesta.provincia) return { estado: "verde", flecha: null };
  const r = regionDe(intento);
  return { estado: r && r === regionDe(respuesta) ? "amarillo" : "gris", flecha: null };
}

function categorias(intento, respuesta) {
  const a = new Set(intento.categorias);
  const b = new Set(respuesta.categorias);
  if (a.size === b.size && [...a].every((c) => b.has(c))) return { estado: "verde", flecha: null };
  return { estado: [...a].some((c) => b.has(c)) ? "amarillo" : "gris", flecha: null };
}

function titulos(intento, respuesta) {
  if (intento.titulos === respuesta.titulos) return { estado: "verde", flecha: null };
  return { estado: "gris", flecha: flecha(intento.titulos, respuesta.titulos) };
}

function corre2026(intento, respuesta) {
  return { estado: Boolean(intento.corre2026) === Boolean(respuesta.corre2026) ? "verde" : "gris", flecha: null };
}

export const ATRIBUTOS = ["nacio", "provincia", "categorias", "titulos", "corre2026"];

export function comparar(intento, respuesta) {
  return {
    nacio: nacio(intento, respuesta),
    provincia: provincia(intento, respuesta),
    categorias: categorias(intento, respuesta),
    titulos: titulos(intento, respuesta),
    corre2026: corre2026(intento, respuesta),
  };
}

export const acerto = (intento, respuesta) => intento.slug === respuesta.slug;
