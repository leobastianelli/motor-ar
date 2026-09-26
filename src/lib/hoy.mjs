// Qué corre hoy (día calendario argentino), en una sola lista por hora, y qué mostrar cuando no corre nada:
// lógica pura, sin Next ni React, para que la página /hoy y `npm test` la compartan. La agrupación por día usa
// el mismo `dayKey` (hora argentina) que el resto del sitio (session-status.mjs): la hora manda.
import { dayKey } from "./session-status.mjs";
import { DESCRIPCION_MAX, elegir, juntar, TITULO_MAX } from "./seo-titulos.mjs";

const TZ = "America/Argentina/Buenos_Aires";
const weekdayFmt = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, weekday: "long" });
const dayNumFmt = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, day: "numeric" });
const monthNumFmt = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, month: "numeric" });
const monthLongFmt = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, month: "long" });
const timeFmt = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// Mediodía del día `key` (YYYY-MM-DD): alcanza para formatear el día calendario sin pisar el de al lado por el huso horario.
const noonOf = (key) => new Date(`${key}T12:00:00-03:00`);

/** "Sábado". */
export const nombreDia = (key) => cap(weekdayFmt.format(noonOf(key)));
/** "3/10". */
export const fechaCorta = (key) => `${dayNumFmt.format(noonOf(key))}/${monthNumFmt.format(noonOf(key))}`;
/** "3 de octubre". */
export const fechaLarga = (key) => `${dayNumFmt.format(noonOf(key))} de ${monthLongFmt.format(noonOf(key))}`;
/** "08:00", en hora argentina. */
export const horaDe = (startIso) => timeFmt.format(new Date(startIso));

/** Sesiones de un día calendario (hora argentina), en el orden en que arrancan. */
export function sesionesDelDia(items, key) {
  return items.filter((i) => dayKey(i.session.start) === key).sort((a, b) => new Date(a.session.start).getTime() - new Date(b.session.start).getTime());
}

/**
 * El día de hoy: todas sus sesiones (ya corridas o por correr), o si no hay ninguna, el próximo día con al
 * menos una, buscando sólo hacia adelante desde `now` (nunca hacia atrás: lo de ayer ya no es de hoy).
 * `items` puede traer sesiones de cualquier fecha, pasada o futura.
 * @returns {{ key: string|undefined, items: any[], isToday: boolean }}
 */
export function diaDeHoy(items, now) {
  const today = dayKey(now);
  const hoy = sesionesDelDia(items, today);
  if (hoy.length) return { key: today, items: hoy, isToday: true };
  const future = items.filter((i) => dayKey(i.session.start) > today);
  if (!future.length) return { key: undefined, items: [], isToday: false };
  const key = dayKey(future.sort((a, b) => new Date(a.session.start).getTime() - new Date(b.session.start).getTime())[0].session.start);
  return { key, items: sesionesDelDia(future, key), isToday: false };
}

/** Título de pestaña para /hoy: de la variante más completa a la más corta, hasta que entre en el largo. */
export function tituloHoy(dia) {
  if (!dia.key) return elegir(["Automovilismo hoy: agenda y horarios", "Automovilismo hoy"], TITULO_MAX);
  if (dia.isToday) {
    const d = nombreDia(dia.key).toLowerCase();
    const f = fechaCorta(dia.key);
    return elegir([`Automovilismo hoy, ${d} ${f}: qué corre y a qué hora`, `Automovilismo hoy ${f}: qué corre y a qué hora`, "Qué corre hoy en el automovilismo argentino"], TITULO_MAX);
  }
  const d = nombreDia(dia.key).toLowerCase();
  const f = fechaCorta(dia.key);
  return elegir([`Hoy no corre nadie: sigue el ${d} ${f}`, `Sin carreras hoy: próxima fecha, ${d} ${f}`, "Automovilismo: hoy no hay carreras"], TITULO_MAX);
}

/** "F1 en Malasia a las 04:00" (sin hora si todavía no está confirmada). */
function lineaDe(i) {
  const lugar = i.event?.circuit?.city ? ` en ${i.event.circuit.city}` : "";
  const hora = i.session.timeKnown === false ? "" : ` a las ${horaDe(i.session.start)}`;
  return `${i.series?.short ?? i.series?.name ?? ""}${lugar}${hora}`.trim();
}

/** Una línea por evento (no por sesión): si dos sesiones del mismo evento caen el mismo día, sólo la primera cuenta. */
function lineasPorEvento(items) {
  const vistos = new Set();
  const out = [];
  for (const i of items) {
    const id = i.event?.id ?? i.event;
    if (vistos.has(id)) continue;
    vistos.add(id);
    out.push(lineaDe(i));
  }
  return out;
}

/** Descripción de /hoy: lo principal del día, o el aviso de que no hay nada con la próxima fecha. */
export function descripcionHoy(dia) {
  if (!dia.key) return "Agenda de automovilismo: horarios de F1, Turismo Carretera y el resto de las categorías en hora argentina.";
  const lineas = lineasPorEvento(dia.items).filter(Boolean);
  if (dia.isToday) {
    return juntar([lineas.length ? `${lineas.join(", ")}.` : "", "Horarios en hora argentina, actualizados en vivo."], DESCRIPCION_MAX);
  }
  return juntar(["Hoy no hay carreras.", `Próxima fecha: ${nombreDia(dia.key)} ${fechaLarga(dia.key)}${lineas.length ? `, con ${lineas.join(", ")}` : ""}.`], DESCRIPCION_MAX);
}
