// Nombres de pilotos del Nuevo Car Show. Las planillas del cronometraje escriben "APELLIDO Nombre" ("DELLA SANTINA Nahuel") desde la fecha 2 y
// "NOMBRE APELLIDO" todo en mayúsculas en la fecha 1 ("NAHUEL DELLA SANTINA"), con alguna errata ("BONELLIO") y a veces sin la tilde
// ("Matias" / "Matías"). Los autos de dos pilotos (100 Millas, Gran Carrera) figuran "JUSID M./ GRINOVERO F.". Acá se decide cómo se muestra
// cada uno: "Nombre Apellido".
import { displayName, knownIndex } from "./actc-timing.mjs";
import { mismoNombre } from "./cordoba-pista-nombres.mjs";

const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "");
const esMayuscula = (w) => /\p{Lu}/u.test(w) && w === w.toUpperCase();
const titulo = (s) => s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, p, c) => p + c.toUpperCase());
const limpiar = (raw) => String(raw).replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();

/** "APELLIDO Nombre" → "Nombre Apellido"; null si todo viene en mayúsculas (no se sabe qué es apellido). */
function dePlanilla(parte) {
  const tokens = limpiar(parte).split(" ").filter(Boolean);
  let i = 0;
  while (i < tokens.length && esMayuscula(tokens[i])) i++;
  if (i === 0 || i === tokens.length) return null;
  return titulo([...tokens.slice(i), ...tokens.slice(0, i)].join(" "));
}

/** ¿Es un auto de dos pilotos ("APELLIDO I./ APELLIDO I.")? */
const esDupla = (raw) => limpiar(raw).includes("/");

function dupla(raw) {
  return limpiar(raw)
    .split("/")
    .map((p) => {
      const tokens = p.trim().split(" ").filter(Boolean);
      // Iniciales: "M.", "F", "J.m" o "J.M." (dos nombres de pila).
      const inicial = tokens.findIndex((t) => /^\p{L}(\.?\p{L})?\.?$/u.test(t) && (t.length === 1 || t.includes(".")));
      if (inicial <= 0) return titulo(tokens.join(" "));
      const letras = tokens[inicial].replace(/\./g, "").toUpperCase();
      return `${[...letras].join(".")}. ${titulo(tokens.slice(0, inicial).join(" "))}`;
    })
    .join(" / ");
}

/**
 * Nombres de una clase: `crudos` son todas las escrituras (una por aparición). Devuelve un Map escritura → nombre a mostrar. Las escrituras
 * "NOMBRE APELLIDO" se ordenan con las "APELLIDO Nombre" de la misma clase como referencia, y las que son la misma persona (errata de una
 * letra, tilde, segundo nombre de más) se unen en la escritura más completa y con tilde.
 */
export function nombresDeClase(crudos) {
  const distintos = [...new Set(crudos)];
  const conocidos = knownIndex(distintos.filter((r) => !esDupla(r)).map(dePlanilla).filter(Boolean));
  const visible = new Map();
  for (const raw of distintos) {
    if (esDupla(raw)) visible.set(raw, dupla(raw));
    else visible.set(raw, dePlanilla(raw) ?? displayName(limpiar(raw).split(" "), conocidos));
  }
  // Unir las escrituras de la misma persona. Dos que figuran juntas en una misma sesión no se unen (las pasa quien llama).
  const nombres = [...new Set(visible.values())].filter((n) => !n.includes("/"));
  const cuenta = new Map();
  for (const r of crudos) cuenta.set(visible.get(r), (cuenta.get(visible.get(r)) ?? 0) + 1);
  const padre = new Map(nombres.map((n) => [n, n]));
  const raiz = (n) => (padre.get(n) === n ? n : raiz(padre.get(n)));
  for (let i = 0; i < nombres.length; i++) {
    for (let j = i + 1; j < nombres.length; j++) if (mismoNombre(nombres[i], nombres[j])) padre.set(raiz(nombres[j]), raiz(nombres[i]));
  }
  const grupos = new Map();
  for (const n of nombres) grupos.set(raiz(n), [...(grupos.get(raiz(n)) ?? []), n]);
  const mejor = new Map();
  for (const g of grupos.values()) {
    const tildes = (n) => (n.match(/[^\p{ASCII}]/gu) ?? []).length;
    const elegido = [...g].sort((a, b) => tildes(b) - tildes(a) || b.split(" ").length - a.split(" ").length || (cuenta.get(b) ?? 0) - (cuenta.get(a) ?? 0) || a.localeCompare(b))[0];
    for (const n of g) mejor.set(n, elegido);
  }
  return new Map([...visible].map(([raw, n]) => [raw, mejor.get(n) ?? n]));
}

/** Clave para comparar nombres sin tildes ni mayúsculas. */
export const claveDeNombre = (n) => fold(n).toLowerCase().replace(/[^a-z]+/g, " ").trim().split(" ").sort().join(" ");
