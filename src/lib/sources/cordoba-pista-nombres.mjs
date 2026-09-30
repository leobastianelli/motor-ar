// Nombres de pilotos de Córdoba Pista. El cronometraje (Speedhive) escribe cada nombre como quiere quien carga la sesión:
// "APELLIDO Nombre", "APELLIDO, Nombre", "APELLIDO NOMBRE", "MARTINEZ DIEGO A.", "D SANTINA Bautista" (por "Della Santina"), "STANGUET
// Santino" (por "Estanguet"), "JUAN M MARTINEZ"… y la misma persona cambia de escritura de una fecha a otra. Acá se decide quién es quién
// dentro de una clase y cómo se muestra: "Nombre Apellido".
//
// Dos nombres son la misma persona, dentro de la misma clase, si comparten todas sus palabras significativas (una palabra de una letra no
// cuenta: es una inicial; una errata de una letra en palabras de 5 o más letras tampoco), o si en la misma fecha llevan el mismo número de
// auto y comparten al menos una palabra, o si llevan el mismo número de auto en la clase (aunque sea en otra fecha) y comparten una palabra de
// 5 o más letras ("PAVON PAVON ARIEL" y "PAVON Luis", los dos del 99). Dos escrituras que aparecen en la MISMA sesión nunca son la misma persona.
// Nunca se une a pilotos de clases distintas: los números y hasta los apellidos se repiten entre clases.
import { repairMojibake } from "./common.mjs";

const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "");
const words = (s) => fold(s).toUpperCase().replace(/\([^)]*\)/g, " ").replace(/[^A-Z0-9]+/g, " ").trim().split(" ").filter(Boolean);
const PARTICULAS = new Set(["DE", "DEL", "DI", "DA", "LA", "LAS", "LOS", "VAN", "MC", "SAN"]);

function levenshtein(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const mismaPalabra = (t, u) => t === u || (t.length >= 5 && u.length >= 5 && levenshtein(t, u) <= 1);

/** Las palabras que identifican: sin iniciales de una letra. */
const significativas = (name) => words(name).filter((w) => w.length > 1);

/** ¿Escrituras de la misma persona? Sin mirar números de auto (eso lo hace `resolverNombres`). */
export function mismoNombre(a, b) {
  const A = significativas(a);
  const B = significativas(b);
  if (!A.length || !B.length) return false;
  const hit = A.filter((t) => B.some((u) => mismaPalabra(t, u))).length;
  return hit >= 2 && hit >= Math.min(A.length, B.length);
}

const titulo = (s) => s.toLowerCase().replace(/(^|[\s'-])([a-zà-ÿ])/g, (m, p, c) => p + c.toUpperCase());
const esMayuscula = (w) => /[A-ZÀ-Ý]/.test(w) && w === w.toUpperCase();

/** "APELLIDO Nombre" → { apellido, nombre, conMinusculas }. `conMinusculas`: la fuente distinguió apellido de nombre por mayúsculas. */
export function partirNombre(raw) {
  const limpio = repairMojibake(String(raw)).replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  if (limpio.includes(",")) {
    const [apellido, ...resto] = limpio.split(",");
    return { apellido: apellido.trim(), nombre: resto.join(" ").trim(), conMinusculas: true };
  }
  const tokens = limpio.split(" ").filter(Boolean);
  let i = 0;
  while (i < tokens.length && esMayuscula(tokens[i])) i++;
  if (i > 0 && i < tokens.length) return { apellido: tokens.slice(0, i).join(" "), nombre: tokens.slice(i).join(" "), conMinusculas: true };
  // Todo en mayúsculas (o todo en minúsculas): el primer apellido va primero. Las partículas ("DI NATALE") se quedan con el apellido.
  let k = 1;
  while (k < tokens.length - 1 && PARTICULAS.has(fold(tokens[k - 1]).toUpperCase())) k++;
  if (tokens.length === 1) return { apellido: tokens[0], nombre: "", conMinusculas: false };
  return { apellido: tokens.slice(0, k).join(" "), nombre: tokens.slice(k).join(" "), conMinusculas: false };
}

/** "Nombre Apellido". */
export function nombreVisible(raw) {
  const { apellido, nombre } = partirNombre(raw);
  return titulo([nombre, apellido].filter(Boolean).join(" "));
}

// Cuánto vale una escritura como la "mejor" de su grupo: con apellido distinguido por mayúsculas, más palabras y más letras.
const puntaje = (v) => (v.conMinusculas ? 1000 : 0) + significativas(v.raw).length * 10 + words(v.raw).join("").length + (v.previo ? 10000 : 0);

/**
 * Agrupa las escrituras de una clase y devuelve, para cada una, el nombre con el que se muestra ("Nombre Apellido").
 * @param {{ raw: string, number?: string, event?: string, session?: string, previo?: boolean }[]} items una por cada vez que aparece un piloto; `previo` marca nombres
 *   ya guardados en la versión anterior de la temporada (mandan: el nombre de un piloto no cambia de una sincronización a otra)
 * @returns {Map<string, string>} escritura original → nombre a mostrar
 */
export function resolverNombres(items) {
  const variantes = new Map();
  for (const it of items) {
    const v = variantes.get(it.raw) ?? { raw: it.raw, ...partirNombre(it.raw), previo: false, numeros: new Set(), autos: new Set(), sesiones: new Set() };
    v.previo ||= Boolean(it.previo);
    if (it.number && it.event) v.numeros.add(`${it.event}#${it.number}`);
    if (it.number) v.autos.add(it.number);
    if (it.session) v.sesiones.add(it.session);
    variantes.set(it.raw, v);
  }
  const lista = [...variantes.values()];
  const padre = new Map(lista.map((v) => [v.raw, v.raw]));
  const raiz = (k) => (padre.get(k) === k ? k : raiz(padre.get(k)));
  const unir = (a, b) => padre.set(raiz(b), raiz(a));
  for (let i = 0; i < lista.length; i++) {
    for (let j = i + 1; j < lista.length; j++) {
      const a = lista[i];
      const b = lista[j];
      // Si figuran juntos en una sesión, son dos personas.
      if ([...a.sesiones].some((x) => b.sesiones.has(x))) continue;
      const mismoAuto = [...a.numeros].some((n) => b.numeros.has(n));
      const compartida = significativas(a.raw).some((t) => significativas(b.raw).some((u) => mismaPalabra(t, u)));
      const mismoNumero = [...a.autos].some((n) => b.autos.has(n)) && significativas(a.raw).some((t) => t.length >= 5 && significativas(b.raw).some((u) => mismaPalabra(t, u)));
      if (mismoNombre(a.raw, b.raw) || (mismoAuto && compartida) || mismoNumero) unir(a.raw, b.raw);
    }
  }
  const grupos = new Map();
  for (const v of lista) grupos.set(raiz(v.raw), [...(grupos.get(raiz(v.raw)) ?? []), v]);
  const out = new Map();
  for (const g of grupos.values()) {
    const mejor = [...g].sort((a, b) => puntaje(b) - puntaje(a) || a.raw.localeCompare(b.raw))[0];
    // Un nombre ya guardado se conserva tal cual (ya es "Nombre Apellido"); los demás se dan vuelta.
    const visible = mejor.previo ? mejor.raw : nombreVisible(mejor.raw);
    for (const v of g) out.set(v.raw, visible);
  }
  return out;
}
