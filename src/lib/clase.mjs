// Carreras con varias clases en pista a la vez: el GT World Challenge (Pro, Gold, Silver y Bronze, y Pro-Am en el Endurance) y la clasificación
// general del Rally Argentino (RC2, RC3, RC5…). Cada clase tiene su propio podio y sus propios títulos de pilotos y equipos: el puesto que vale
// para un auto es el de su clase, y el de la general va como contexto. Portimão, 17/10/2026: el BMW #30 de Montenegro ganó la Silver Cup
// sin perder la punta en las tres horas, y el borrador decía "Montenegro terminó 5.º".

/** @typedef {{ pos: number, class?: string, classPos?: number, positionText?: string, status?: string }} Fila */

const llego = (r) => !r.status && (!r.positionText || /^\d+$/.test(r.positionText));

/**
 * ¿La tabla tiene más de una clase? Una tabla recortada para el navegador (snapshot.mjs) puede no mostrar dos clases distintas, pero sus filas
 * llevan `classPos`.
 * @param {Fila[] | undefined} results
 */
export const esMulticlase = (results) => (results ?? []).some((r) => r.classPos !== undefined) || new Set((results ?? []).map((r) => r.class).filter(Boolean)).size > 1;

/**
 * Puesto de una fila dentro de su clase, si la sesión tiene más de una clase y el auto está clasificado.
 * @param {Fila[] | undefined} results
 * @param {Fila | undefined} row
 * @returns {{ pos: number, class: string, overall: number } | null}
 */
export function puestoEnClase(results, row) {
  if (!row?.class || !llego(row)) return null;
  if (row.classPos !== undefined) return { pos: row.classPos, class: row.class, overall: row.pos };
  const rows = results ?? [];
  if (new Set(rows.map((r) => r.class).filter(Boolean)).size < 2) return null;
  const pos = 1 + rows.filter((r) => r.class === row.class && llego(r) && r.pos < row.pos).length;
  return { pos, class: row.class, overall: row.pos };
}

/** "la Silver Cup", "la Copa RC2", "la clase RC5". */
export function nombreClase(clase) {
  return /\b(cup|copa)\b/i.test(clase) ? `la ${clase}` : `la clase ${clase}`;
}

/**
 * Qué hizo un auto en su clase, en una frase: "ganó en la Silver Cup (5.º en la general)", "terminó 8.º en la Silver Cup (25.º en la general)".
 * `plural` para las tripulaciones ("A / B / C ganaron…"). Devuelve null si la sesión no es multiclase.
 * @param {Fila[] | undefined} results
 * @param {Fila | undefined} row
 * @param {string} kind
 * `corta` para los borradores que no entran en 280 caracteres: "ganó en Silver Cup (5.º gral.)".
 * @param {{ plural?: boolean, corta?: boolean }} [opts]
 */
export function fraseEnClase(results, row, kind, { plural = false, corta = false } = {}) {
  const c = puestoEnClase(results, row);
  if (!c) return null;
  const en = corta ? c.class : nombreClase(c.class);
  const general = corta ? `(${c.overall}.º gral.)` : `(${c.overall}.º en la general)`;
  if (kind === "clasificacion") return c.pos === 1 ? `${plural ? "hicieron" : "hizo"} la pole de ${en} ${general}` : `${plural ? "largarán" : "largará"} ${c.pos}.º en ${en} ${general}`;
  if (kind === "practica") return `${plural ? "fueron" : "fue"} ${c.pos}.º en ${en} ${general}`;
  return c.pos === 1 ? `${plural ? "ganaron" : "ganó"} en ${en} ${general}` : `${plural ? "terminaron" : "terminó"} ${c.pos}.º en ${en} ${general}`;
}

/** Para las fichas y las listas cortas: "1.º en Silver Cup · 5.º en la general", o "5.º" si la sesión no es multiclase. */
export function puestoCorto(results, row) {
  const c = puestoEnClase(results, row);
  return c ? `${c.pos}.º en ${c.class} · ${c.overall}.º en la general` : `${row.pos}.º`;
}
