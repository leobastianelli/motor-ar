// Generador puro de calendarios .ics (RFC 5545). JavaScript puro, sin Next ni alias "@/", para que `npm test` lo
// cubra sin depender de la temporada ni de Neon: quien arma el calendario (las rutas `/calendario/...`) le pasa
// objetos ya resueltos (con el ganador y los argentinos que ya calculó `momento.mjs`; acá no se recalcula nada).
import { dayKey } from "./session-status.mjs";

const CRLF = "\r\n";
const DOMAIN = "somosfierros.ar";
/** Ancho máximo de una línea de contenido, en octetos, antes de tener que plegarla (RFC 5545 §3.1). */
const FOLD_LIMIT = 75;

const pad2 = (n) => String(n).padStart(2, "0");

/**
 * Escapa un valor de texto para una propiedad ICS: barra invertida, punto y coma, coma y saltos de línea
 * (RFC 5545 §3.3.11). Tiene que aplicarse ANTES de plegar la línea.
 * @param {string} value
 */
export function escapeText(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Pliega una línea larga a `FOLD_LIMIT` octetos por línea física (RFC 5545 §3.1): las líneas siguientes empiezan
 * con un espacio, que cuenta como uno de los octetos. Se corta por bytes UTF-8, nunca a mitad de un carácter
 * multibyte (un acento partido a la mitad rompería el archivo para cualquier lector).
 * @param {string} line
 */
export function foldLine(line) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= FOLD_LIMIT) return line;
  const chunks = [];
  let start = 0;
  while (start < bytes.length) {
    const max = chunks.length === 0 ? FOLD_LIMIT : FOLD_LIMIT - 1; // -1: el espacio de continuación cuenta como octeto.
    let end = Math.min(start + max, bytes.length);
    // 10xxxxxx es un byte de continuación UTF-8: si el corte cae ahí, retroceder hasta el byte inicial del carácter.
    while (end > start && (bytes[end] & 0xc0) === 0x80) end--;
    chunks.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
  }
  return chunks.join(`${CRLF} `);
}

/** YYYYMMDDTHHMMSSZ en UTC: para DTSTAMP y para DTSTART/DTEND con hora conocida. */
function utcStamp(iso) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`;
}

/** YYYYMMDD del día (en hora argentina) de `iso`, para eventos de día completo. */
function dateOnly(iso) {
  return dayKey(iso).replace(/-/g, "");
}

/** YYYYMMDD del día siguiente (en hora argentina): el fin exclusivo de un evento de día completo. */
function dateOnlyNextDay(iso) {
  const [y, m, d] = dayKey(iso).split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return `${next.getUTCFullYear()}${pad2(next.getUTCMonth() + 1)}${pad2(next.getUTCDate())}`;
}

/**
 * El nombre tal como se muestra en el título del evento. Con `timeKnown` falso avisa que el horario todavía no
 * está confirmado (el evento igual se agenda, de día completo, para que no se pierda la fecha).
 * @param {string} sessionName nombre visible de la sesión (`nombreVisibleSesion` de `momento.mjs`)
 * @param {boolean} timeKnown
 */
function summaryName(sessionName, timeKnown) {
  return timeKnown === false ? `${sessionName} (horario a confirmar)` : sessionName;
}

/**
 * La descripción: por qué el horario puede no ser definitivo, dónde verlo si se sabe, el resultado si ya lo hay
 * (ganador y los argentinos, con su posición) y el enlace a la fecha. Todo lo que ya calculó el sitio (no se
 * recalcula acá): `ganador` y `argentinos` vienen tal como los arma `resumenSesion` en `momento.mjs`.
 * @param {CalendarSession} s
 */
function descriptionFor(s) {
  const lines = [];
  if (s.timeKnown === false) lines.push("Horario todavía sin confirmar: el día es seguro, la hora puede cambiar.");
  else if (s.timeStatus === "tentative") lines.push("Horario tentativo: una sola fuente lo confirma por ahora, puede cambiar.");
  if (s.dondeVerlo?.length) lines.push(`Dónde verlo: ${s.dondeVerlo.join(", ")}.`);
  if (s.hasResults) {
    if (s.ganador) lines.push(`Ganador${s.provisorio ? " (provisorio)" : ""}: ${s.ganador.name}.`);
    if (s.argentinos?.length) {
      const nuestros = s.argentinos.map((a) => `${a.name} ${a.noTermino ?? `${a.pos}.º`}`).join(", ");
      lines.push(`Argentinos: ${nuestros}.`);
    }
  }
  if (s.eventUrl) lines.push(`Más información: ${s.eventUrl}`);
  return lines.join("\n");
}

/**
 * @typedef {Object} CalendarSession
 * @property {string} uid id estable de la sesión (`session.id`); se arma `<uid>@somosfierros.ar`
 * @property {string} category código corto de la categoría (p. ej. "TC")
 * @property {string} sessionName nombre visible de la sesión (p. ej. "Clasificación")
 * @property {string} city ciudad de la fecha
 * @property {string} [location] circuito y ciudad, para LOCATION (si falta, se usa sólo la ciudad)
 * @property {string} start ISO 8601 con offset
 * @property {number} durationMin
 * @property {boolean} [timeKnown] false: sólo el día es confiable (evento de día completo)
 * @property {"confirmed"|"tentative"} [timeStatus]
 * @property {string} eventUrl `https://www.somosfierros.ar/eventos/<id>`
 * @property {string[]} [dondeVerlo] nombres de canales/plataformas, si se sabe
 * @property {boolean} [hasResults]
 * @property {{ name: string }} [ganador]
 * @property {boolean} [provisorio] el resultado es la planilla de la ACTC, todavía sin la revisión de los comisarios
 * @property {{ name: string, pos: number, noTermino?: string }[]} [argentinos]
 * @property {string} [dtstamp] ISO; si falta, se usa el `dtstamp` de `buildCalendar`
 */

/**
 * Arma las líneas (sin plegar) de un VEVENT.
 * @param {CalendarSession} s
 * @param {string} dtstamp ISO por defecto, si `s.dtstamp` no vino
 */
export function buildEvent(s, dtstamp) {
  const lines = ["BEGIN:VEVENT", `UID:${s.uid}@${DOMAIN}`, `DTSTAMP:${utcStamp(s.dtstamp ?? dtstamp)}`];
  if (s.timeKnown === false) {
    lines.push(`DTSTART;VALUE=DATE:${dateOnly(s.start)}`, `DTEND;VALUE=DATE:${dateOnlyNextDay(s.start)}`);
  } else {
    const endIso = new Date(new Date(s.start).getTime() + s.durationMin * 60000).toISOString();
    lines.push(`DTSTART:${utcStamp(s.start)}`, `DTEND:${utcStamp(endIso)}`);
  }
  lines.push(`SUMMARY:${escapeText(`${s.category} · ${summaryName(s.sessionName, s.timeKnown)} · ${s.city}`)}`);
  lines.push(`LOCATION:${escapeText(s.location ?? s.city)}`);
  const description = descriptionFor(s);
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
  if (s.eventUrl) lines.push(`URL:${s.eventUrl}`);
  lines.push("END:VEVENT");
  return lines;
}

/**
 * Arma el VCALENDAR completo: cabecera, un VEVENT por sesión y pie. Líneas separadas por CRLF y plegadas a
 * 75 octetos, como pide el RFC 5545.
 * @param {{ name: string, sessions: CalendarSession[], dtstamp?: string }} options `dtstamp`: ISO; por defecto, ahora.
 */
export function buildCalendar({ name, sessions, dtstamp = new Date().toISOString() }) {
  const head = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fierros//Calendario de Turismo Carretera//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    "X-WR-TIMEZONE:America/Argentina/Buenos_Aires",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];
  const body = sessions.flatMap((s) => buildEvent(s, dtstamp));
  const lines = [...head, ...body, "END:VCALENDAR"];
  return lines.map(foldLine).join(CRLF) + CRLF;
}
