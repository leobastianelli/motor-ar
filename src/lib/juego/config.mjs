// Constantes del juego diario. Lo que el dueño puede querer cambiar está acá arriba, en un solo lugar.

/** Nombre del juego en el menú, el título y lo compartido. Provisorio: lo decide el dueño. */
export const JUEGO_NOMBRE = "Juego";

/** Día del lanzamiento (fecha argentina, YYYY-MM-DD): es el juego #1. Antes de ese día la página dice "Muy pronto". */
export const JUEGO_INICIO = "2026-10-20";

export const MAX_INTENTOS = 8;
/** Después de cuántos fallos se destapa cada pista (la 1.ª tras el 3.º, la 2.ª tras el 6.º). */
export const FALLOS_PARA_PISTA = [3, 6];
/** Margen de años del amarillo en "Nació". */
export const MARGEN_NACIO = 5;

/** Texto fijo del enlace al final de lo compartido. */
export const JUEGO_URL_CORTA = "somosfierros.ar/juego";

export const REGIONES = {
  Bonaerense: ["Ciudad de Buenos Aires", "Buenos Aires"],
  Centro: ["Córdoba", "Santa Fe", "Entre Ríos", "La Pampa"],
  Cuyo: ["Mendoza", "San Juan", "San Luis"],
  NOA: ["Jujuy", "Salta", "Tucumán", "Catamarca", "Santiago del Estero", "La Rioja"],
  NEA: ["Misiones", "Corrientes", "Chaco", "Formosa"],
  Patagonia: ["Neuquén", "Río Negro", "Chubut", "Santa Cruz", "Tierra del Fuego"],
  Exterior: ["Exterior"],
};

const REGION_POR_PROVINCIA = new Map(Object.entries(REGIONES).flatMap(([region, provincias]) => provincias.map((p) => [p, region])));

/** Región de un piloto: la que trae la base o, si falta, la que corresponde a su provincia. */
export function regionDe(piloto) {
  return piloto.region ?? REGION_POR_PROVINCIA.get(piloto.provincia) ?? null;
}
