import { ATRIBUTOS } from "./comparar.mjs";
import { JUEGO_NOMBRE, JUEGO_URL_CORTA, MAX_INTENTOS } from "./config.mjs";

// Lógica pura del navegador: búsqueda sin tildes, texto para compartir y rachas.

/** Minúsculas y sin tildes, para buscar "nino" y encontrar "Niño". */
export function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Pilotos que coinciden con lo escrito (los que empiezan igual primero), sin los ya usados. */
export function buscar(pilotos, texto, usados = [], limite = 8) {
  const q = normalizar(texto);
  if (!q) return [];
  const fuera = new Set(usados);
  const empiezan = [];
  const contienen = [];
  for (const p of pilotos) {
    if (fuera.has(p.slug)) continue;
    const n = normalizar(p.nombre);
    if (n.startsWith(q) || n.split(" ").some((w) => w.startsWith(q))) empiezan.push(p);
    else if (n.includes(q)) contienen.push(p);
  }
  return [...empiezan, ...contienen].slice(0, limite);
}

const CUADRADO = { verde: "🟩", amarillo: "🟨", gris: "⬛" };

/** Texto para compartir: nunca lleva el nombre del piloto. `intentos` son las comparaciones de cada intento. */
export function textoCompartir({ numero, acerto, comparaciones }) {
  const filas = comparaciones.map((c) => ATRIBUTOS.map((a) => CUADRADO[c[a].estado]).join(""));
  const marcador = acerto ? comparaciones.length : "X";
  return [`Fierros · ${JUEGO_NOMBRE} #${numero}  ${marcador}/${MAX_INTENTOS}`, ...filas, JUEGO_URL_CORTA].join("\n");
}

/** Actualiza las estadísticas al terminar el juego de `fecha`. Una partida ya contada no se cuenta dos veces. */
export function registrarResultado(stats, { fecha, acerto, ayer }) {
  const s = { jugadas: 0, ganadas: 0, racha: 0, maxima: 0, ultimaGanada: null, ultimaJugada: null, ...stats };
  if (s.ultimaJugada === fecha) return s;
  s.jugadas += 1;
  s.ultimaJugada = fecha;
  if (acerto) {
    s.ganadas += 1;
    s.racha = s.ultimaGanada === ayer ? s.racha + 1 : 1;
    s.ultimaGanada = fecha;
    s.maxima = Math.max(s.maxima, s.racha);
  } else {
    s.racha = 0;
  }
  return s;
}

/** La racha que se muestra: si pasó más de un día sin ganar, ya se cortó. */
export function rachaVigente(stats, hoy, ayer) {
  if (!stats?.ultimaGanada) return 0;
  return stats.ultimaGanada === hoy || stats.ultimaGanada === ayer ? stats.racha : 0;
}
