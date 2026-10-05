// Rally Argentino 2026 (campeonato de la CDA del ACA que dirige la Asociación Civil Rally Argentino, ACRA).
//   · Calendario: rallyargentino.com/calendario.php?anio=2026 (HTML del servidor; 9 fechas, el orden del calendario es el número de carrera).
//   · Resultados: API de tiempos oficiales (api.rallyargentino.com, abierta y sin clave). La carrera en curso sale de `/v2/...`; las anteriores,
//     de `/historico/2026-carrera-NN/v2/...`. La clasificación general trae a todos los clasificados con su clase; las clasificaciones por clase
//     se arman de ahí (posición dentro de la clase = orden de llegada entre los de esa clase).
//   · Campeonato: tabla oficial por clase de rallyargentino.com (rally-argentino-campeonato.mjs).
//
// Modelo: una categoría (`rally-argentino`) con siete clases, una fecha por rally. Cada fecha tiene una sesión "final" por clase (la clasificación
// final de esa clase, con `classId`) y la "Clasificación general" (sin clase, última de la fecha: es la carrera principal). Los horarios de
// cada tramo no son una hora de salida del día (la API sólo da la hora del tramo, sin fecha), así que las sesiones llevan sólo el día
// ("horario a confirmar"); las etapas se ubican en el sábado y el domingo porque en las cuatro fechas con hora de actualización de los tramos
// (3 a 6) el viernes es el shakedown, el sábado la etapa 1 y el domingo la etapa 2.
//
// La API publica sólo a los pilotos clasificados (todos con finalizo "Si"): quienes abandonaron no figuran, y así se aclara en cada resultado.
// La fecha 1 devuelve error 404 (sus resultados sólo existen en una página estática con el podio de cada clase): queda "no pudimos leerlos".
import { dateOnly, dayMonth, pad } from "./common.mjs";
import { campeonatosDeRally, parseCampeonato } from "./rally-argentino-campeonato.mjs";
import { CLASES, claseById, claseDeTexto, SERIES_ID } from "./rally-argentino-clases.mjs";
import { tripulacion } from "./rally-argentino-nombres.mjs";

const SITE = "https://www.rallyargentino.com";
const API = "https://api.rallyargentino.com/api";
const TIEMPOS = "https://tiemposonline.rallyargentino.com";
export const CALENDARIO_URL = `${SITE}/calendario.php?anio=2026`;
export const CAMPEONATO_URL = `${SITE}/campeonato-pilotos.php`;
const YEAR = 2026;
const DAY = 86400000;
const SOURCE = "rallyargentino.com (calendario y tiempos oficiales)";
const RESULTS_SOURCE = "Rally Argentino · tiempos oficiales";
const NOTA = "Figuran los pilotos clasificados: quienes no terminaron la carrera no aparecen en la clasificación de la fuente.";

/** Ciudad y provincia de cada fecha, por el id de la carrera en el calendario oficial (208 a 216). Una fecha nueva se arma del título. */
const SEDES = {
  208: { city: "Madariaga", province: "Buenos Aires" },
  209: { city: "Mina Clavero", province: "Córdoba" },
  210: { city: "Cutral Có y Plaza Huincul", province: "Neuquén" },
  211: { city: "Catamarca", province: "Catamarca" },
  212: { city: "Reconquista", province: "Santa Fe" },
  213: { city: "San Francisco", province: "Córdoba" },
  214: { city: "Diamante y Valle María", province: "Entre Ríos" },
  215: { city: "Villa Dolores y Mina Clavero", province: "Córdoba" },
  216: { city: "San Luis", province: "San Luis" },
};

const TERMINALES = /^(finalizad[oa]|cancelad[oa]|suspendid[oa]|interrumpid[oa]|anulad[oa])$/i;

const fold = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const ymd = (d) => `${d.y}-${pad(d.m)}-${pad(d.d)}`;
const entities = { "&nbsp;": " ", "&amp;": "&", "&aacute;": "á", "&eacute;": "é", "&iacute;": "í", "&oacute;": "ó", "&uacute;": "ú", "&ntilde;": "ñ", "&Aacute;": "Á", "&Eacute;": "É", "&Iacute;": "Í", "&Oacute;": "Ó", "&Uacute;": "Ú", "&#39;": "'" };
const plain = (html) =>
  String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, (e) => entities[e] ?? " ")
    .replace(/\s+/g, " ")
    .trim();

// ---------------------------------------------------------------------------------------------------------------- calendario

/**
 * Fechas del calendario oficial → { start, end } ({ y, m, d } cada una) o null si no se entiende. Formatos que usa el sitio:
 * "27/02 - 01/03", "31/07 - 02/08", "17 - 19 Abril", "22 - 24 de Mayo", "04 - 06 de septiembre"; también "28 Feb - 02 Mar" y un solo día.
 */
export function parseFechas(text, year = YEAR) {
  const t = plain(text).toLowerCase();
  const month = (word) => dayMonth(`1 ${word}`)?.m ?? null;
  let a, b;
  let m;
  if ((m = t.match(/^(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})$/))) {
    a = { d: Number(m[1]), m: Number(m[2]) };
    b = { d: Number(m[3]), m: Number(m[4]) };
  } else if ((m = t.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s+(?:de\s+)?([a-záéíóú]+)$/))) {
    a = { d: Number(m[1]), m: month(m[3]) };
    b = { d: Number(m[2]), m: a.m };
  } else if ((m = t.match(/^(\d{1,2})\s+(?:de\s+)?([a-záéíóú]+)\s*-\s*(\d{1,2})\s+(?:de\s+)?([a-záéíóú]+)$/))) {
    a = { d: Number(m[1]), m: month(m[2]) };
    b = { d: Number(m[3]), m: month(m[4]) };
  } else if ((m = t.match(/^(\d{1,2})\s+(?:de\s+)?([a-záéíóú]+)$/))) {
    a = { d: Number(m[1]), m: month(m[2]) };
    b = a;
  } else return null;
  if (![a.m, b.m].every((x) => x >= 1 && x <= 12) || ![a.d, b.d].every((x) => x >= 1 && x <= 31)) return null;
  const start = { y: year, ...a };
  const end = { y: year, ...b };
  const span = (Date.UTC(end.y, end.m - 1, end.d) - Date.UTC(start.y, start.m - 1, start.d)) / DAY;
  return span >= 0 && span <= 6 ? { start, end } : null;
}

/** Todos los días de una fecha, de la primera a la última ({ y, m, d } cada uno). */
export function diasDe({ start, end }) {
  const out = [];
  for (let t = Date.UTC(start.y, start.m - 1, start.d); t <= Date.UTC(end.y, end.m - 1, end.d); t += DAY) {
    const d = new Date(t);
    out.push({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() });
  }
  return out;
}

/** Sede de una fecha: la conocida por id de carrera o, si es nueva, lo que se pueda sacar del título ("Rally de X - Lugar"). */
export function sedeDe(id, title) {
  const partes = String(title).split(/\s+-\s+/).map((s) => s.trim()).filter(Boolean);
  const known = SEDES[id];
  const city = known?.city ?? partes[1] ?? partes[0];
  return { name: city, city, country: "Argentina", flag: "AR", ...(known?.province ? { province: known.province } : {}) };
}

/**
 * Calendario oficial → fechas { round, id, title, name, start, end, raceNo, published }. El número de fecha es el orden del calendario.
 * `raceNo`: número de carrera en la dirección de resultados ("…/2026-carrera-04"), si el sitio ya la enlazó; `published`: hay enlace de resultados
 * de esa carrera (la fecha en curso enlaza sólo a la portada de los tiempos).
 */
export function parseCalendario(html) {
  const out = [];
  for (const chunk of String(html).split(/<div class="masonry-item/).slice(1)) {
    const when = plain(chunk.match(/class="post-date[^"]*"[^>]*>([\s\S]*?)<\/p>/)?.[1]);
    const link = chunk.match(/<h4[^>]*>\s*<a[^>]*id_carrera=(\d+)[^>]*>([\s\S]*?)<\/a>/);
    const fechas = parseFechas(when);
    if (!link || !fechas) continue;
    const title = plain(link[2]);
    const raceNo = /RESULTADOS/.test(chunk) ? Number(chunk.match(/href="[^"]*2026-carrera-(\d+)[^"]*"/)?.[1]) || null : null;
    out.push({ id: Number(link[1]), title, name: title.split(/\s+-\s+/)[0], ...fechas, raceNo });
  }
  out.sort((a, b) => ymd(a.start).localeCompare(ymd(b.start)));
  return out.map((r, i) => ({ ...r, round: i + 1, published: r.raceNo !== null }));
}

/** ¿El nombre de la carrera en curso (cabecera de los tiempos: "Rally de Entre Ríos") es el de esta fecha del calendario? */
export const esLaFecha = (round, nombre) => fold(nombre).length >= 8 && fold(round.title).includes(fold(nombre));

// ---------------------------------------------------------------------------------------------------------------- resultados

/**
 * ¿Terminó la carrera? Todos los tramos en un estado final (finalizado, cancelado, suspendido, interrumpido o anulado) y alguno corrido.
 * Un tramo pendiente o en curso (o un estado que no conocemos) deja la carrera abierta: no se publica una clasificación a medias.
 */
export function carreraCerrada(tramos) {
  const list = Array.isArray(tramos) ? tramos : [];
  return list.length > 0 && list.every((t) => TERMINALES.test(String(t.estado ?? "").trim())) && list.some((t) => /^finalizad/i.test(String(t.estado)));
}

/** Segundos → "1:22:14.6" (con horas) o "27:14.6"; décimas, como en la tabla oficial. */
export function tiempoDe(seconds) {
  const t = Math.round(Math.round(seconds * 1000) / 100); // primero a milésimas (la fuente suma decimales sueltos: 4999.192999999999), después a décimas
  const h = Math.floor(t / 36000);
  const m = Math.floor((t % 36000) / 600);
  const s = ((t % 600) / 10).toFixed(1).padStart(4, "0");
  return h > 0 ? `${h}:${pad(m)}:${s}` : `${m}:${s}`;
}

/** Diferencia con el líder → "+27.6", "+1:03.0" o "+1:02:03.5". */
export function diferenciaDe(seconds, leader) {
  const diff = Math.round((seconds - leader) * 1000) / 1000;
  if (diff < 60) return `+${(Math.round(diff * 1000 / 100) / 10).toFixed(1)}`;
  return `+${tiempoDe(diff)}`;
}

const ESTADOS = [
  [/descal|dsq|exclu/i, "Descalificado"],
  [/^no$|aband|retir|dnf/i, "Abandonó"],
];

/**
 * Pilotos de la API (ya en el orden de la clasificación) → filas nuestras. La diferencia sale del tiempo total (`totalSegundos`, con las
 * penalizaciones sumadas; `tiempoNetoSegundos` no las incluye y no es el que ordena la tabla). `claseId`: la clase de la sesión; las filas de
 * otra clase (todas las de la tabla general) llevan su clase.
 */
export function filasDe(pilotos, { claseId } = {}) {
  const ok = (p) => String(p.finalizo ?? "Si").trim().toLowerCase() === "si";
  const orden = [...pilotos.filter(ok), ...pilotos.filter((p) => !ok(p))];
  const lider = orden.find(ok)?.totalSegundos;
  return orden.map((p, i) => {
    const terminó = ok(p);
    const estado = terminó ? undefined : ESTADOS.find(([re]) => re.test(String(p.finalizo)))?.[1] ?? String(p.finalizo);
    const total = Number(p.totalSegundos);
    const propia = claseDeTexto(p.clase);
    return {
      pos: i + 1,
      ...(estado ? { positionText: estado === "Descalificado" ? "DSQ" : "R", status: estado } : {}),
      number: String(p.nro ?? ""),
      driver: tripulacion(p.piloto, p.navegante),
      team: String(p.vehiculo ?? "").trim(),
      gap: terminó && Number.isFinite(total) && Number.isFinite(lider) ? (i === 0 ? tiempoDe(total) : diferenciaDe(total, lider)) : "",
      ...(propia && propia !== claseId ? { class: claseById[propia].short } : {}),
    };
  });
}

/** Pilotos de la clasificación general → { [classId]: pilotos de esa clase, en el orden de llegada }. */
export function porClase(pilotos) {
  const out = {};
  for (const p of pilotos) {
    const id = claseDeTexto(p.clase);
    if (id) (out[id] ??= []).push(p);
  }
  return out;
}

/** Firma de una clasificación (número y diferencia de los primeros): detecta la clasificación de OTRA carrera pegada a esta fecha. */
export const firmaDe = (rows) => (rows ?? []).slice(0, 6).map((r) => `${r.number}|${r.gap}`).join(";");

// ---------------------------------------------------------------------------------------------------------------- sesiones

/**
 * Sesiones de una fecha. `res`: { rows (general), clases: { [classId]: rows }, provisional, source: { url } } o null si no hay resultados;
 * `unread`: la fuente publicó los resultados y no se pudieron leer.
 */
export function sesionesDe(round, id, res, unread = false) {
  const dias = diasDe(round);
  const ultimo = dias.at(-1);
  const at = (d) => dateOnly(d.y, d.m, d.d);
  const fuente = res && { name: RESULTS_SOURCE, url: res.source.url, ...(res.provisional ? { status: "provisional" } : {}), note: NOTA };
  const sessions = [];
  if (dias.length === 3) {
    sessions.push({ id: `${id}-etapa1`, kind: "carrera", name: "Etapa 1", start: at(dias[1]), timeKnown: false, durationMin: 600 });
    sessions.push({ id: `${id}-etapa2`, kind: "carrera", name: "Etapa 2", start: at(dias[2]), timeKnown: false, durationMin: 480 });
  }
  for (const clase of CLASES) {
    const rows = res?.clases[clase.id];
    if (!rows?.length) continue;
    sessions.push({ id: `${id}-${clase.id}`, classId: clase.id, kind: "final", name: `Clasificación final ${clase.short}`, start: at(ultimo), timeKnown: false, durationMin: 30, results: rows, resultsSource: fuente });
  }
  sessions.push({
    id: `${id}-general`,
    kind: "carrera",
    name: "Clasificación general",
    start: at(ultimo),
    timeKnown: false,
    durationMin: 30,
    ...(res?.rows.length ? { results: res.rows, resultsSource: fuente } : unread ? { resultsUnread: true } : {}),
  });
  return sessions;
}

// ---------------------------------------------------------------------------------------------------------------- sincronización

/** Día de hoy en la Argentina (UTC-3), "AAAA-MM-DD". */
export const hoyArgentino = (now) => new Date(now.getTime() - 3 * 3600_000).toISOString().slice(0, 10);

async function api(io, path) {
  const body = await io.json(`${API}${path}`, { revalidate: 120 });
  if (!body?.exito) throw new Error(body?.mensaje ?? "respuesta sin éxito");
  return body.datos;
}

/**
 * Calendario 2026 tal como lo publicaba rallyargentino.com el 4/10/2026. El sitio bloquea (403) a los servidores de GitHub Actions, donde corre
 * la sincronización: si la página no se puede leer, se usa este respaldo (y queda anotado) en vez de perder la categoría entera.
 */
export const CALENDARIO_RESPALDO = [
  {id: 208, title: "Rally Pagos del Tuyú - Madariaga", name: "Rally Pagos del Tuyú", start: {y: 2026, d: 27, m: 2}, end: {y: 2026, d: 1, m: 3}, raceNo: 1, round: 1, published: true},
  {id: 209, title: "Rally Sudamericano - Mina Clavero", name: "Rally Sudamericano", start: {y: 2026, d: 17, m: 4}, end: {y: 2026, d: 19, m: 4}, raceNo: 2, round: 2, published: true},
  {id: 210, title: "Rally del Petróleo y los Dinosaurios - Cutral Có y Plaza Huincul - Neuquén", name: "Rally del Petróleo y los Dinosaurios", start: {y: 2026, d: 22, m: 5}, end: {y: 2026, d: 24, m: 5}, raceNo: 3, round: 3, published: true},
  {id: 211, title: "Rally del Poncho - Catamarca", name: "Rally del Poncho", start: {y: 2026, d: 26, m: 6}, end: {y: 2026, d: 28, m: 6}, raceNo: 4, round: 4, published: true},
  {id: 212, title: "Rally del Jaaukanigás - Reconquista Santa Fe", name: "Rally del Jaaukanigás", start: {y: 2026, d: 31, m: 7}, end: {y: 2026, d: 2, m: 8}, raceNo: 5, round: 5, published: true},
  {id: 213, title: "Rally de San Francisco - Córdoba", name: "Rally de San Francisco", start: {y: 2026, d: 4, m: 9}, end: {y: 2026, d: 6, m: 9}, raceNo: 6, round: 6, published: true},
  {id: 214, title: "Rally de Entre Ríos - Diamante y Valle María", name: "Rally de Entre Ríos", start: {y: 2026, d: 2, m: 10}, end: {y: 2026, d: 4, m: 10}, raceNo: null, round: 7, published: false},
  {id: 215, title: "Rally de Traslasierra - Villa Dolores y Mina Clavero", name: "Rally de Traslasierra", start: {y: 2026, d: 6, m: 11}, end: {y: 2026, d: 8, m: 11}, raceNo: null, round: 8, published: false},
  {id: 216, title: "Gran Premio Rally de San Luis", name: "Gran Premio Rally de San Luis", start: {y: 2026, d: 11, m: 12}, end: {y: 2026, d: 13, m: 12}, raceNo: null, round: 9, published: false},
];

/** Rally Argentino: calendario y resultados. `windowDays`: las fechas ya cerradas hace más que eso y con resultados no se vuelven a pedir. */
export async function rallyArgentinoSeason(io, previous = { events: [], standings: {}, meta: {} }, { now = new Date(), windowDays = 21, delayMs = 200 } = {}) {
  const errors = [];
  const ignored = [];
  let rounds = [];
  try {
    rounds = parseCalendario(await io.text(CALENDARIO_URL, { revalidate: 600 }));
    if (!rounds.length) throw new Error("la página no trae ninguna fecha");
  } catch (error) {
    errors.push(`calendario: ${error.message} (se usa el calendario guardado el 4/10)`);
    rounds = CALENDARIO_RESPALDO;
  }
  const hoy = hoyArgentino(now);
  const viejo = hoyArgentino(new Date(now.getTime() - windowDays * DAY));

  let actual = null;
  try {
    const cabecera = await api(io, "/v2/cabecera-dashboard");
    actual = rounds.find((r) => esLaFecha(r, cabecera?.nombre)) ?? null;
  } catch (error) {
    errors.push(`carrera en curso: ${error.message}`);
  }

  const previas = new Map((previous.events ?? []).filter((e) => e.seriesId === SERIES_ID).map((e) => [e.round, e]));
  const firmas = new Map(); // fecha → firma de su clasificación general (para no pegar la de una carrera a otra)
  for (const [round, e] of previas) firmas.set(round, firmaDe(e.sessions.find((s) => s.id.endsWith("-general"))?.results));

  const events = [];
  let filled = 0;
  for (const r of rounds) {
    const id = `${SERIES_ID}-${YEAR}-${r.round}`;
    const prev = previas.get(r.round);
    const empezo = ymd(r.start) <= hoy;
    const terminó = ymd(r.end) < hoy;
    const anterior = prev?.sessions.find((s) => s.id.endsWith("-general"));
    const base = { id, seriesId: SERIES_ID, round: r.round, name: r.name, officialName: r.title, circuit: sedeDe(r.id, r.title), source: SOURCE, rallyId: r.id };
    const raceNo = r.raceNo ?? r.round;
    const urlDe = (fuente) => (fuente === "historico" ? `${TIEMPOS}/tiempos/2026-carrera-${pad(raceNo)}` : `${TIEMPOS}/`);

    // ¿De dónde salen los resultados? La carrera en curso (la que nombra la cabecera de los tiempos) sale de `/v2/...`; las que ya terminaron,
    // del histórico. Las fechas viejas con resultados oficiales guardados no se vuelven a pedir, ni las que la fuente nunca dejó leer (la fecha 1
    // devuelve 404 desde siempre y cada intento cuesta varios reintentos).
    // La carrera actual ya terminada se busca primero en el histórico (oficial); si todavía no pasó ahí, sale de `/v2/...` como provisoria.
    const fuentes = !empezo ? [] : r === actual ? [...(terminó ? ["historico"] : []), "actual"] : terminó ? ["historico"] : [];
    const guardada = Boolean(anterior?.results?.length) && anterior.resultsSource?.status !== "provisional";
    const vieja = ymd(r.end) < viejo;
    // Una fecha marcada ilegible se vuelve a pedir: puede haber sido un bloqueo (403) y no un 404 (cuesta un pedido por corrida).
    if (prev && vieja && guardada) {
      events.push({ ...base, sessions: prev.sessions });
      continue;
    }

    let res = null;
    let unread = false;
    for (const fuente of fuentes) {
      await io.sleep(delayMs);
      try {
        const path = fuente === "historico" ? `/historico/2026-carrera-${pad(raceNo)}/v2/clasificacion-final/general` : "/v2/clasificacion-final/general";
        const datos = await api(io, path);
        const pilotos = datos?.pilotosClasificados ?? [];
        if (!pilotos.length) continue;
        // La carrera en curso sólo cuenta cuando terminó; es provisoria hasta que pasa al histórico (los comisarios pueden aplicar penalizaciones).
        if (fuente === "actual" && !carreraCerrada(datos.tramos)) continue;
        const rows = filasDe(pilotos);
        const firma = firmaDe(rows);
        if (fuente === "actual" && [...firmas].some(([round, f]) => round !== r.round && f && f === firma)) {
          errors.push(`fecha ${r.round}: la clasificación de la carrera en curso es idéntica a la de otra fecha (se descarta)`);
          continue;
        }
        res = {
          rows,
          clases: Object.fromEntries(Object.entries(porClase(pilotos)).map(([cid, list]) => [cid, filasDe(list, { claseId: cid })])),
          // Oficial sólo cuando la API la archivó en el histórico: la fecha del calendario no alcanza para darla por revisada.
          provisional: fuente === "actual",
          source: { url: urlDe(fuente) },
        };
        firmas.set(r.round, firma);
        break;
      } catch (error) {
        if (/(^|\D)404(\D|$)|no se encontro/i.test(error.message)) ignored.push(`fecha ${r.round}: la API no tiene la clasificación (${fuente})`);
        else errors.push(`fecha ${r.round}: ${error.message}`);
        // La fuente publicó los resultados (enlace en el calendario) y no los pudimos leer.
        // Un 403 (Cloudflare bloqueando la red desde la que se corre) no dice nada de la fuente: no se marca como ilegible.
        if (fuente === "historico" && r.published && !/HTTP 403/.test(error.message)) unread = true;
      }
    }
    if (res) filled += 1 + Object.keys(res.clases).length;
    // Si hoy no se pudo leer y la versión anterior ya tenía resultados, se conservan sus sesiones (con los resultados de antes).
    const sessions = !res && prev?.sessions.some((s) => s.results?.length) ? prev.sessions : sesionesDe(r, id, res, unread && !res);
    events.push({ ...base, sessions });
  }

  // Campeonato por clase, de la tabla oficial. Si la página falla, se conserva el anterior (nunca se achica).
  let parsed = null;
  try {
    parsed = parseCampeonato(await io.text(CAMPEONATO_URL, { revalidate: 300 }));
    if (!Object.keys(parsed).length) throw new Error("la página no trae ninguna tabla de clase");
  } catch (error) {
    errors.push(`campeonato: ${error.message}`);
  }
  const clases = campeonatosDeRally(parsed, { previous: previous.meta?.[SERIES_ID]?.clases });

  return {
    events,
    standings: {},
    meta: { [SERIES_ID]: { clases }, rallyArgentino: { events: events.length, filledResults: filled, errors, ignored } },
  };
}
