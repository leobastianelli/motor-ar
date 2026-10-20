// Placa «Horarios del finde» para redes (src/app/placa/finde/[formato]/[n]/route.tsx): todas las sesiones de viernes a domingo, en hora argentina,
// agrupadas por día y, dentro del día, por categoría. Lógica pura (sin JSX, sin red ni disco): la usan la imagen, la página /placa y el borrador
// del viernes por Telegram (redes-core.mjs), así que los tres cuentan las mismas placas.
// Regla (memoria del proyecto): nunca se saca una sesión para que entre. Primero se agrupa (las series de una fecha en un renglón; más de tres
// sesiones seguidas del mismo tipo, con el rango de horas) y, si igual no entra, se parte en varias placas (carrusel), nunca se recorta.
import { fmtTime } from "./fmt-core.mjs";
import { dayKey } from "./session-status.mjs";
import { weekendWindow } from "./tiempo.mjs";

export const FORMATOS = /** @type {const} */ ({ feed: { w: 1080, h: 1350 }, historia: { w: 1080, h: 1920 } });
/** @typedef {keyof typeof FORMATOS} Formato */

const DIAS = ["Viernes", "Sábado", "Domingo"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const PLURAL = /** @type {Record<string, string>} */ ({ practica: "entrenamientos", clasificacion: "clasificaciones", serie: "series", sprint: "sprints", final: "finales", carrera: "carreras" });
/** Nombres de pila que van segundos en un nombre compuesto («José María López»): ahí el apellido es la última palabra. */
const NOMBRE_COMPUESTO = new Set(["María", "José", "Juan", "Pablo", "Luis", "Manuel", "Ignacio", "Martín", "Agustín"]);

/** Apellido para la placa: «Colapinto», «Pérez Companc», «López» (de José María López). */
export function apellido(name) {
  const w = String(name).trim().split(/\s+/);
  return w.length >= 3 && !NOMBRE_COMPUESTO.has(w[1]) ? w.slice(1).join(" ") : w.at(-1);
}

/**
 * Tablas de resultado que las fuentes cargan como sesión sin hora (la «Clasificación general» de cada clase del Car Show, la «Clasificación
 * final» de cada clase del rally): no son una salida a pista, no tienen horario propio y no van en una agenda.
 */
const esTablaDeResultado = (s) => s.timeKnown === false && /^clasificaci[oó]n (final|general)\b/i.test(s.name);

/** Nombre corto de una sesión para un renglón de la placa. */
export function etiqueta(session, internacional) {
  let n = String(session.name).replace(/\s*\((viernes|s[aá]bado|domingo)\)\s*$/i, "").trim();
  n = n
    .replace(/^(\d)\s*[°º]\s*Entrenamiento\b/i, "Entren. $1")
    .replace(/^Entrenamiento (\d)\b/i, "Entren. $1")
    .replace(/^(\d)\s*[ªa]\s*Clasificaci[oó]n\b/i, "Clasif. $1")
    .replace(/^(\d)\s*[ªa]\s*Serie\b/i, "Serie $1")
    .replace(/^Pr[aá]ctica(?: libre)? (\d)\b/i, internacional ? "Práctica $1" : "Entren. $1");
  return n.length <= 30 ? n : (PLURAL[session.kind] ? PLURAL[session.kind].charAt(0).toUpperCase() + PLURAL[session.kind].slice(1) : "Sesión");
}

/**
 * Renglones de horarios de una categoría en un día: cada uno con su hora (o «a confirmar») y qué es. Las sesiones con hora van primero, en orden;
 * las que no tienen hora, al final. Hasta tres seguidas del mismo tipo van cada una con su hora, salvo las series (todas en un renglón);
 * más de tres, en un renglón con el rango («08:00 a 12:00 · 9 entrenamientos»).
 */
export function horarios(sessions, internacional) {
  const ordenadas = [...sessions].sort((a, b) => Number(a.timeKnown === false) - Number(b.timeKnown === false) || Date.parse(a.start) - Date.parse(b.start));
  /** @type {{ kind: string, tbc: boolean, items: any[] }[]} */
  const grupos = [];
  for (const s of ordenadas) {
    const tbc = s.timeKnown === false;
    const g = grupos.at(-1);
    if (g && g.kind === s.kind && g.tbc === tbc) g.items.push(s);
    else grupos.push({ kind: s.kind, tbc, items: [s] });
  }
  /** @type {{ time: string, label: string, tbc: boolean }[]} */
  const out = [];
  for (const g of grupos) {
    const time = (s) => (g.tbc ? "a confirmar" : fmtTime(s.start));
    if (g.items.length > 3) {
      const rango = g.tbc ? "a confirmar" : `${fmtTime(g.items[0].start)} a ${fmtTime(g.items.at(-1).start)}`;
      out.push({ time: rango, label: `${g.items.length} ${PLURAL[g.kind] ?? "sesiones"}`, tbc: g.tbc });
    } else if (g.kind === "serie" && g.items.length > 1 && !g.tbc) {
      // «1ª Serie Clase 1», «2ª Serie Clase 1» → «Series Clase 1».
      const resto = [...new Set(g.items.map((s) => s.name.replace(/^(\d\s*[ªa]?\s*)?Serie\s*\d*\s*/i, "").trim()))];
      out.push({ time: g.items.map((s) => fmtTime(s.start)).join(" · "), label: resto.length === 1 && resto[0] ? `Series ${resto[0]}` : "Series", tbc: false });
    } else for (const s of g.items) out.push({ time: time(s), label: etiqueta(s, internacional), tbc: g.tbc });
  }
  return out;
}

/**
 * Bloques del finde: una categoría en un día, con sus horarios. Entran las mismas fechas que muestra la agenda del sitio, de todas las categorías.
 * Una jornada doble (dos fechas el mismo día, en el mismo lugar y con los mismos horarios, como Córdoba Pista) va en un solo bloque.
 * @param {any[]} events fechas visibles (visibleEvents)
 * @param {string} now
 * @param {{ seriesById: Record<string, any>, drivers: { name: string, seriesId: string }[] }} catalog
 */
export function finde(events, now, { seriesById, drivers }) {
  const { days } = weekendWindow(now);
  const keys = days.map((d) => d.key);
  const argentinos = /** @type {Record<string, string[]>} */ ({});
  for (const d of drivers) if (seriesById[d.seriesId]?.scope === "internacional") (argentinos[d.seriesId] ??= []).push(apellido(d.name));
  const tier = (s) => (s.scope !== "internacional" ? 1 : argentinos[s.id] ? 2 : 3);

  /** @type {any[]} */
  const bloques = [];
  for (const e of events) {
    const s = seriesById[e.seriesId];
    if (!s) continue;
    for (const day of keys) {
      const ses = (e.sessions ?? []).filter((x) => dayKey(x.start) === day && !esTablaDeResultado(x));
      if (!ses.length) continue;
      const internacional = s.scope === "internacional";
      const filas = horarios(ses, internacional);
      const where = e.circuit?.city ?? "";
      const igual = bloques.find((b) => b.day === day && b.series.id === s.id && b.where === where && JSON.stringify(b.filas) === JSON.stringify(filas));
      if (igual) {
        if (e.round) igual.fechas.push(e.round);
        continue;
      }
      const conHora = ses.filter((x) => x.timeKnown !== false).map((x) => Date.parse(x.start));
      bloques.push({
        day,
        series: { id: s.id, code: s.code, short: s.short, color: s.color },
        who: internacional ? (argentinos[s.id]?.join(" y ") ?? s.short) : s.short,
        where,
        fechas: e.round ? [e.round] : [],
        filas,
        first: conHora.length ? Math.min(...conHora) : Infinity,
        tier: tier(s),
      });
    }
  }
  // Por día; dentro del día, por la hora de la primera sesión (lo que no tiene hora, al final) y, a la misma hora, primero lo argentino.
  bloques.sort((a, b) => a.day.localeCompare(b.day) || a.first - b.first || a.tier - b.tier);
  const lugar = (b) => (b.fechas.length > 1 ? `${b.where} · fechas ${b.fechas.slice(0, -1).join(", ")} y ${b.fechas.at(-1)}` : b.where);
  const dias = days.map((d, i) => ({ key: d.key, nombre: DIAS[i], num: Number(d.key.slice(8, 10)) }));
  const mes = (k) => MESES[Number(k.slice(5, 7)) - 1];
  const [a, , c] = keys;
  const rango = mes(a) === mes(c) ? `${Number(a.slice(8))} al ${Number(c.slice(8))} de ${mes(c)}` : `${Number(a.slice(8))} de ${mes(a)} al ${Number(c.slice(8))} de ${mes(c)}`;
  return {
    rango,
    dias,
    bloques: bloques.map((b) => ({ day: b.day, series: b.series, who: b.who, lugar: lugar(b), filas: b.filas })),
  };
}

// ——— Medidas de la placa (variante «cartel de fichas») ———
// El alto de cada renglón es fijo y la imagen lo respeta, así que lo único estimado es cuántos horarios entran por línea: se calcula con un
// ancho por carácter un poco mayor que el real de Archivo (mejor una línea de más que un horario cortado).

/**
 * @param {Formato} formato
 * @param {number} [k] escala de la letra y los renglones (1 = la normal; ver ESCALAS)
 */
export function medidas(formato, k = 1) {
  const historia = formato === "historia";
  const r = (n) => Math.round(n * k);
  const m = {
    W: FORMATOS[formato].w,
    H: FORMATOS[formato].h,
    M: 60,
    cuadros: 40,
    cabeza: historia ? 430 : 290,
    pie: historia ? 150 : 100,
    diaAlto: r(historia ? 76 : 66),
    nombre: r(historia ? 42 : 38),
    hora: r(historia ? 46 : 42),
    texto: r(historia ? 32 : 30),
    gap: r(30),
    chip: 120,
  };
  const nombreAlto = Math.round(m.nombre * 1.25);
  const linea = Math.round(m.hora * 1.2);
  const ancho = m.W - 2 * m.M - m.chip - 20;
  const area = m.H - m.cuadros - m.cabeza - m.pie - 24;
  return { ...m, k, nombreAlto, linea, ancho, area, bloquePad: 16 };
}

/** Antes de partir el finde en otra placa se achica la letra, hasta un 88 % (el texto más chico queda en 26 px: se sigue leyendo en el celular). */
export const ESCALAS = [1, 0.94, 0.88];

const anchoHorario = (t, m) => t.time.length * m.hora * 0.5 + 10 + t.label.length * m.texto * 0.55 + m.gap;

/** Líneas que ocupan los horarios de un bloque en el ancho disponible. */
export function lineas(filas, m) {
  let n = 1;
  let x = 0;
  for (const t of filas) {
    const w = anchoHorario(t, m);
    if (x && x + w > m.ancho + m.gap) {
      n++;
      x = 0;
    }
    x += w;
  }
  return n;
}

export const altoBloque = (b, m) => m.bloquePad + m.nombreAlto + lineas(b.filas, m) * m.linea;

/**
 * Reparte los bloques en placas por alto, con la letra de `k`. Cada placa: los días que tiene, con sus bloques; `sigue` marca el día que empezó
 * en la placa anterior.
 * @returns {{ key: string, nombre: string, num: number, sigue: boolean, bloques: any[] }[][]}
 */
export function paginar(datos, formato, k = 1) {
  const m = medidas(formato, k);
  /** @type {{ key: string, nombre: string, num: number, sigue: boolean, bloques: any[] }[][]} */
  const placas = [[]];
  let usado = 0;
  for (const b of datos.bloques) {
    let placa = placas.at(-1);
    let dia = placa.at(-1)?.key === b.day ? placa.at(-1) : null;
    const alto = altoBloque(b, m) + (dia ? 0 : m.diaAlto);
    if (usado + alto > m.area && placa.length) {
      placas.push((placa = []));
      usado = 0;
      dia = null;
    }
    if (!dia) {
      const info = datos.dias.find((d) => d.key === b.day);
      const sigue = placas.length > 1 && placas.at(-2).some((d) => d.key === b.day);
      placa.push((dia = { ...info, sigue, bloques: [] }));
      usado += m.diaAlto;
    }
    dia.bloques.push(b);
    usado += altoBloque(b, m);
  }
  return placas;
}

/**
 * Todo lo que necesita la placa de un formato: los datos del finde, las placas en que se reparte (al menos una, aunque esté vacía) y la escala de
 * la letra: la más grande que logra la menor cantidad de placas posible.
 */
export function placaFinde(events, now, catalog, formato) {
  const datos = finde(events, now, catalog);
  const intentos = ESCALAS.map((k) => ({ k, placas: paginar(datos, formato, k) }));
  const menos = Math.min(...intentos.map((i) => i.placas.length));
  const { k, placas } = intentos.find((i) => i.placas.length === menos);
  return { ...datos, escala: k, placas };
}
