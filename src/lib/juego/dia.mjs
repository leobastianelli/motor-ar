import { JUEGO_INICIO } from "./config.mjs";

// Argentina es UTC−3 todo el año (sin horario de verano), así que el día argentino es el día UTC corrido tres horas.
const OFFSET_MS = 3 * 3600 * 1000;
const DIA_MS = 86400 * 1000;

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** ¿Es un YYYY-MM-DD de calendario real? */
export function fechaValida(fecha) {
  if (typeof fecha !== "string" || !FECHA.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

/** Fecha argentina (YYYY-MM-DD) de un instante. */
export function fechaArgentina(instante) {
  return new Date(instante.getTime() - OFFSET_MS).toISOString().slice(0, 10);
}

export function diasEntre(desde, hasta) {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / DIA_MS);
}

export function sumarDias(fecha, n) {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);
}

/** Fecha argentina y número de juego (#1 = el día de lanzamiento; 0 o negativo = todavía no empezó). */
export function dia(instante, inicio = JUEGO_INICIO) {
  const fecha = fechaArgentina(instante);
  return { fecha, numero: diasEntre(inicio, fecha) + 1 };
}

/** Segundos que faltan para las 00:00 argentinas siguientes. */
export function segundosHastaFinDelDia(instante) {
  const siguiente = Date.parse(`${sumarDias(fechaArgentina(instante), 1)}T00:00:00Z`) + OFFSET_MS;
  return Math.max(1, Math.ceil((siguiente - instante.getTime()) / 1000));
}
