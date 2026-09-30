// Disparo de la sincronización completa por evidencia, no sólo por reloj (propuesta B de docs/plan-datos/tc-demora-resultados.md).
// Además del criterio por horario (pulso-core.mjs: sesiones con hora conocida terminadas hace 10 min a 6 h sin resultados, candado de 45 min),
// durante un fin de semana con fechas de la ACTC el pulso mira el listado de resultados del portal de tiempos: si hay un documento que todavía
// no está en la temporada guardada, pide la sincronización con un candado corto. No depende de que las sesiones tengan hora (caso Mouras).
// Todo es inyectable (red, base, GitHub) para que npm test lo cubra sin red; el cableado real está en src/app/api/pulso/route.ts.
import { chooseDocs, parseListing, TIMING_SERIES, TIMING_SOURCE } from "./sources/actc-timing.mjs";
import { pendingForDispatch, DISPATCH_LOCK_MINUTES } from "./pulso-core.mjs";

/** Candado cuando hay un documento nuevo (en vez de los 45 min del disparo por reloj). */
export const EVIDENCE_LOCK_MINUTES = 10;
/** Cuántas veces seguidas puede motivar un disparo el mismo documento (si ya está y sigue sin leerse, el portal lo trae vacío o roto: no insistir). */
export const EVIDENCE_MAX_TRIES = 2;
/** El listado del portal se pide con esta caché: como mucho una vez cada 2 min aunque el pulso llame más seguido. */
export const LISTING_REVALIDATE = 120;
/** Horas argentinas en las que se consulta el listado (las sesiones corren de día; la ACTC no carga de madrugada). */
export const EVIDENCE_HOURS = { from: 8, to: 23 };

const DAY = 86400000;
const AR_OFFSET_H = 3;

/** Día (YYYY-MM-DD), día de la semana (0 = domingo) y hora, en horario argentino. */
export function arClock(now) {
  const shifted = new Date(Date.parse(now) - AR_OFFSET_H * 3600000);
  return { day: shifted.toISOString().slice(0, 10), dow: shifted.getUTCDay(), hour: shifted.getUTCHours() };
}

const addDays = (day, n) => new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/**
 * Fechas de series de la ACTC de este fin de semana: hoy es viernes, sábado, domingo o lunes (horario argentino), entre las 8 y las 23, y el
 * día de hoy cae entre el día anterior al primer día del evento y el posterior al último. Sin fecha en ese rango → [] (no se consulta nada).
 */
export function actcWeekendEvents(events, now) {
  const { day, dow, hour } = arClock(now);
  if (![5, 6, 0, 1].includes(dow)) return [];
  if (hour < EVIDENCE_HOURS.from || hour >= EVIDENCE_HOURS.to) return [];
  return events.filter((e) => {
    if (!TIMING_SERIES.has(e.seriesId) || !e.sessions?.length) return false;
    const days = e.sessions.map((s) => s.start.slice(0, 10)).sort();
    return day >= addDays(days[0], -1) && day <= addDays(days.at(-1), 1);
  });
}

/** Ids de documentos del portal que la temporada ya tiene guardados (en `resultsSource.url` de cada sesión con resultados). */
export function storedDocumentIds(events) {
  const ids = new Set();
  for (const e of events) {
    for (const s of e.sessions ?? []) {
      if (s.resultsSource?.name !== TIMING_SOURCE) continue;
      const id = s.resultsSource.url?.match(/\/resultados\/(\d+)/)?.[1];
      if (id) ids.add(Number(id));
    }
  }
  return ids;
}

/**
 * Documentos que el listado trae y la temporada no tiene: por cada fecha del fin de semana, el documento que la sincronización elegiría para
 * cada sesión (mismo criterio: `chooseDocs`, que ignora parciales y grillas y se queda con la versión más nueva/rectificada) si su id no está
 * entre los guardados. Ordenados del más nuevo al más viejo.
 */
export function newDocuments(listing, events, weekend) {
  const stored = storedDocumentIds(events);
  const out = [];
  for (const event of weekend) {
    const lastDay = event.sessions.map((s) => s.start.slice(0, 10)).sort().at(-1);
    const end = Date.parse(`${lastDay}T23:59:59-03:00`);
    const docs = listing.filter((d) => {
      const t = Date.parse(`${d.day}T12:00:00-03:00`);
      return d.seriesId === event.seriesId && t <= end && t >= end - 3 * DAY;
    });
    for (const { doc, session } of chooseDocs(docs).values()) {
      if (!stored.has(doc.id)) out.push({ key: `${doc.seriesId}:${doc.id}`, id: doc.id, seriesId: doc.seriesId, title: doc.title, session: session.name });
    }
  }
  return out.sort((a, b) => b.id - a.id);
}

/**
 * Decisión pura: ¿se pide la sincronización, por qué motivo y con qué candado?
 * - Hay un documento nuevo (y no agotó sus intentos) → por evidencia, candado corto.
 * - Si no, y hay sesiones con hora terminadas sin resultados → por reloj, candado de 45 min (como antes).
 * - Si no → nada.
 * `previo` es lo último que se guardó de evidencia: { doc, tries }.
 */
export function decideDispatch({ pendientes = [], nuevos = [], previo = null }) {
  const doc = nuevos[0];
  if (doc) {
    const tries = previo?.doc === doc.key ? (previo.tries ?? 0) : 0;
    if (tries < EVIDENCE_MAX_TRIES) return { motivo: "evidencia", lockMinutes: EVIDENCE_LOCK_MINUTES, doc, tries: tries + 1 };
  }
  if (pendientes.length) return { motivo: "reloj", lockMinutes: DISPATCH_LOCK_MINUTES };
  return null;
}

/**
 * Paso de sincronización del pulso, con todo lo externo inyectado:
 * - `events`: sesiones visibles (con cargas manuales); `rawEvents`: la temporada guardada tal cual.
 * - `fetchListing()`: HTML del listado de la ACTC. `readPrevious()`: { doc, tries } | null. `claim(lockMinutes)`: boolean.
 *   `record({ doc, tries })`: guarda el documento que motivó el disparo. `dispatch()`: pide el workflow; { ok, status }.
 * Un fallo al leer el listado o al guardar la evidencia se informa y no frena lo demás.
 */
export async function syncStep({ events, rawEvents, now, fetchListing, readPrevious, claim, record, dispatch }) {
  const pendientes = pendingForDispatch(events, now);

  let evidencia = { status: "fuera de fin de semana ACTC" };
  let nuevos = [];
  const weekend = actcWeekendEvents(rawEvents, now);
  if (weekend.length) {
    try {
      const listing = parseListing(await fetchListing());
      if (!listing.length) throw new Error("el listado no trae documentos (¿cambió el formato?)");
      nuevos = newDocuments(listing, rawEvents, weekend);
      evidencia = { status: "ok", documentosNuevos: nuevos.map((d) => d.key) };
    } catch (error) {
      evidencia = { status: "error", error: error instanceof Error ? error.message : String(error) };
    }
  }

  let previo = null;
  if (nuevos.length) {
    try {
      previo = await readPrevious();
    } catch (error) {
      evidencia = { ...evidencia, lecturaEstado: `error: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  const decision = decideDispatch({ pendientes, nuevos, previo });
  const base = { pendientes: pendientes.length, evidencia };
  if (!decision) {
    const agotado = nuevos.length ? " (el documento nuevo ya motivó sus intentos)" : "";
    return { status: "skipped", reason: `nada pendiente${agotado}`, ...base };
  }

  if (!(await claim(decision.lockMinutes))) {
    return { status: "skipped", reason: `ya se disparó hace menos de ${decision.lockMinutes} min`, motivo: decision.motivo, ...base };
  }
  if (decision.motivo === "evidencia") {
    try {
      await record({ doc: decision.doc.key, tries: decision.tries });
    } catch (error) {
      base.evidencia = { ...base.evidencia, registro: `error: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
  const res = await dispatch();
  if (!res.ok) return { status: "error", error: `GitHub respondió ${res.status}`, motivo: decision.motivo, ...base };
  return { status: "disparada", motivo: decision.motivo, ...(decision.doc ? { documento: decision.doc.key } : {}), ...base };
}
