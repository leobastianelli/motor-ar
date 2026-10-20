// Córdoba Pista 2026 desde el cronometraje oficial (MyLaps Speedhive, API pública de resultados, sin clave): calendario, hora real de cada
// sesión y clasificación completa de cada una, para las siete clases (TC 4000, TC Pista 4000, Turismo Fiat, Turismo Fiat 128, Turismo
// Cordobés Histórico, Clase 3 y Fórmula Renault Plus). Organización "Federacion Regional Automovilismo Deportivo de la Provincia de Cordoba"
// (id 345223), que también sube karting y otros campeonatos regionales: por eso los eventos se reconocen por las clases que traen y no por
// el nombre (que cambió en cada fecha: "1ra FECHA CORDOBA PISTA - FORMULA R PLUS", "FORMULA R PLUS - CORDOBA PISTA", "APICER PARQUE CIUDAD
// DE RIO IV"…). Plantilla: speedhive-tn.mjs.
//
// Modelo (igual que el TN): una categoría (`cordoba-pista`), una fecha por evento, y las sesiones de todas las clases en el mismo evento;
// cada sesión lleva `classId` y el nombre de la clase ("Final TC 4000"). El campeonato de cada clase sale de estos resultados
// (cordoba-pista-campeonato.mjs). Los resultados son "provisorios": el cronometrista los sube después de cada sesión y no traen las
// penalizaciones de tiempo que aplican los comisarios (sí las descalificaciones).
import { repairMojibake } from "./common.mjs";
import { CLASES, claseById, claseDeTexto, SERIES_ID } from "./cordoba-pista-clases.mjs";
import { campeonatosDeCordobaPista } from "./cordoba-pista-campeonato.mjs";
import { desambiguar, resolverNombres } from "./cordoba-pista-nombres.mjs";
import { belongsToEvent } from "./plausible.mjs";

const API = "https://eventresults-api.speedhive.com/api/v0.2.3/eventresults";
export const ORG = 345223; // Federación Regional de Automovilismo Deportivo de la Provincia de Córdoba
export const SPEEDHIVE_CP_SOURCE = "Speedhive · cronometraje FRAD (provisorio)";
const TIME_SOURCE = "Speedhive (cronometraje FRAD)";
const EVENT_SOURCE = "MyLaps Speedhive (cronometraje de la FRAD)";
const DAY = 86400000;
const YEAR = "2026";
const DURATION = { practica: 25, clasificacion: 20, serie: 20, final: 30 };
const CLASES_ORDEN = Object.fromEntries(CLASES.map((c, i) => [c.id, i]));

const dayOf = (iso) => iso.slice(0, 10);
const fold = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

/** "00.288" → "+0.288"; "01:02.345" → "+1:02.345". */
const gapText = (diff) => {
  const t = String(diff ?? "").replace(/^0+(?=\d)/, "").replace(/^:/, "");
  return t && !/^0*\.?0*$/.test(t) ? `+${t}` : "";
};
const lapTime = (t) => String(t ?? "").replace(/^0+(?=\d)/, "");

/**
 * Una sesión de Speedhive → qué es (sin el número, que sale del orden de salida). null si no es una sesión que mostramos: los
 * "ENTRENAMIENTO GRAL" (resumen de todas las prácticas, con hora 1970) y lo que no se reconoce.
 */
export function tipoDeSesion(s) {
  const n = fold(s.name);
  if (String(s.startTime).startsWith("1970") || /\bGRAL\b|GRAL\./.test(n) || /GRAL ENTRENAMIENTO/.test(n)) return null;
  if (s.type === "practice") return { kind: "practica" };
  if (s.type === "qualify") return { kind: "clasificacion", superClasificacion: /SUPER/.test(n) };
  if (s.type === "race") {
    if (/SERIE/.test(n)) return { kind: "serie" };
    if (/FINAL/.test(n)) return { kind: "final" };
  }
  return null;
}

/** ¿Es un evento de Córdoba Pista? Por las clases que trae (con TC 4000 y al menos otras dos), no por el nombre. */
export function esCordobaPista(detail) {
  const clases = new Set((detail.sessions?.groups ?? []).map((g) => claseDeTexto(g.name)).filter(Boolean));
  return clases.has("tc4000") && clases.size >= 3;
}

/** Sede según el cronometraje → sede como la escribe el resto del sitio (mismas ciudades que la ACTC, para "Corren el mismo finde"). */
export function sedeDe(location) {
  const n = fold(location?.name);
  if (/CABALEN/.test(n)) return { name: "Autódromo Oscar Cabalén", city: "Alta Gracia", country: "Argentina", flag: "AR", province: "Córdoba" };
  if (/RIO ?(IV|4|CUARTO)/.test(n)) return { name: "Autódromo Parque Ciudad de Río Cuarto", city: "Río Cuarto", country: "Argentina", flag: "AR", province: "Córdoba" };
  return null;
}

const STATUS = [
  [/^dq|dsq|disq/i, "Descalificado"],
  [/dns|no larg/i, "No largó"],
  [/dnf|abandon|retir/i, "Abandonó"],
];

/**
 * Clasificación de una sesión (API de Speedhive) → filas nuestras, con el nombre ya resuelto (`nombre(raw)`). En series y finales, quien no
 * completó el 75 % de las vueltas del que más dio no está clasificado ("NC"), como en el PDF oficial; el descalificado lleva "DSQ".
 */
export function filasDe(classification, kind, nombre, claseId) {
  const todas = [...(classification.rows ?? [])].filter((r) => !claseId || (claseDeTexto(r.resultClass) ?? claseId) === claseId);
  const rows = todas.sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999));
  const timed = kind === "practica" || kind === "clasificacion";
  const race = kind === "serie" || kind === "final";
  const top = Math.max(0, ...rows.map((r) => r.numberOfLaps ?? 0));
  const minimo = Math.floor(top * 0.75);
  return rows.map((r, i) => {
    const statusText = r.status && !/^normal$/i.test(r.status) ? r.status : "";
    const status = statusText ? STATUS.find(([re]) => re.test(statusText))?.[1] : undefined;
    const descalificado = status === "Descalificado";
    const noClasificado = !descalificado && race && top > 0 && (r.numberOfLaps ?? 0) < minimo;
    const lapsBehind = r.difference?.lapsBehind ?? 0;
    return {
      pos: i + 1,
      ...(descalificado ? { positionText: "DSQ", status } : noClasificado ? { positionText: "NC", status: "No clasificado" } : status ? { status } : {}),
      number: String(r.startNumber ?? ""),
      driver: nombre(r.name),
      team: "",
      gap: i === 0 ? lapTime(timed ? r.bestTime : r.totalTime) : lapsBehind > 0 ? `+${lapsBehind} ${lapsBehind === 1 ? "vuelta" : "vueltas"}` : gapText(r.difference?.timeDifference),
      ...(r.numberOfLaps ? { laps: r.numberOfLaps } : {}),
    };
  });
}

const nombreDeSesion = (kind, n, total, clase, superClasificacion) => {
  const c = clase.short;
  if (kind === "practica") return `${n}° Entrenamiento ${c}`;
  if (kind === "clasificacion") return `${superClasificacion ? "Súper clasificación" : "Clasificación"} ${c}`;
  if (kind === "serie") return total > 1 ? `Serie ${n} ${c}` : `Serie ${c}`;
  return total > 1 ? `Final ${n} ${c}` : `Final ${c}`;
};

/**
 * Sesiones de un evento de Speedhive → lista de { classId, kind, n, total, startTime, id (de Speedhive), superClasificacion, rowsClass? }.
 * El orden de salida fija el número (1.º, 2.º entrenamiento; serie 1 y 2; final 1 y 2): los títulos de Speedhive ("ENTRENAMIENTO 1" y
 * "1ER ENTRENAMIENTO" el mismo día) no se repiten de una forma confiable. Una sesión con varias clases en la tabla ("FINAL TC PISTA 4000 Y
 * TC 4000", fecha 5) se reparte: cada clase recibe la suya (las filas se separan por `resultClass`).
 */
export function sesionesDeEvento(detail) {
  const out = [];
  for (const group of detail.sessions?.groups ?? []) {
    const grupoClase = claseDeTexto(group.name);
    if (!grupoClase) continue;
    const ordenadas = [...group.sessions].sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)) || a.id - b.id);
    for (const s of ordenadas) {
      const tipo = tipoDeSesion(s);
      if (!tipo) continue;
      out.push({ ...tipo, classId: grupoClase, startTime: s.startTime, speedhiveId: s.id, name: s.name });
    }
  }
  return out;
}

/** Clave de una sesión dentro del evento: clase, tipo y número de orden. */
const ordinales = (lista) => {
  const count = new Map();
  const total = new Map();
  for (const s of lista) total.set(`${s.classId}|${s.kind}${s.superClasificacion ? "|s" : ""}`, (total.get(`${s.classId}|${s.kind}${s.superClasificacion ? "|s" : ""}`) ?? 0) + 1);
  return lista.map((s) => {
    const k = `${s.classId}|${s.kind}${s.superClasificacion ? "|s" : ""}`;
    count.set(k, (count.get(k) ?? 0) + 1);
    return { ...s, n: count.get(k), total: total.get(k) };
  });
};

const sessionId = (eventId, s) => `${eventId}-${s.classId}-${s.kind}${s.superClasificacion ? "-super" : ""}${s.total > 1 ? s.n : ""}`;

/** Ids de las fechas que la versión anterior ya conocía, por id de evento de Speedhive (así un evento conserva su número de fecha). */
const fechasPrevias = (previous) =>
  new Map((previous.events ?? []).filter((e) => e.seriesId === SERIES_ID && e.speedhiveEventId).map((e) => [e.speedhiveEventId, e]));

/**
 * Córdoba Pista: calendario y resultados por sesión. `windowDays`: las fechas más viejas que eso no se vuelven a pedir (se toman de la
 * versión anterior, que nunca se achica). `now` es para las pruebas.
 */
export async function cordobaPistaSeason(io, previous = { events: [], standings: {}, meta: {} }, { windowDays = 21, delayMs = 250, now = new Date() } = {}) {
  const nowMs = now.getTime();
  const errors = [];
  const ignored = [];
  const list = await io.json(`${API}/organizations/${ORG}/events?count=${windowDays > 60 ? 500 : 100}&sort=date&sortDirection=desc`, { revalidate: 300 });
  if (!Array.isArray(list)) throw new Error("Speedhive no devolvió la lista de eventos de la FRAD");
  const previas = fechasPrevias(previous);

  // 1. Qué eventos de la organización son de Córdoba Pista. Los ya conocidos no se vuelven a detectar; el resto, sólo los autos de este año
  //    dentro de la ventana (la FRAD sube también karting y campeonatos regionales).
  const candidatos = list.filter((e) => e.sport === "Car" && String(e.startDate).startsWith(YEAR));
  const detalles = new Map();
  for (const e of candidatos) {
    const conocido = previas.has(e.id);
    const reciente = Date.parse(`${e.startDate}T12:00:00Z`) >= nowMs - (windowDays + 4) * DAY;
    if (conocido && !reciente) continue; // fuera de la ventana: se conserva lo de antes
    await io.sleep(delayMs);
    try {
      const detail = await io.json(`${API}/events/${e.id}?sessions=true`, { revalidate: 120 });
      if (!esCordobaPista(detail)) continue;
      // Sin sede conocida no es una fecha nuestra (p. ej. el Campeonato Regional Bulnense, que también corre TC 4000 y TC Pista en Pedro Devalle):
      // queda anotado aparte (no es una falla: se repetiría en cada sync y dispararía la alerta de salud) y no consume un número de fecha.
      if (!sedeDe(detail.location)) ignored.push(`evento ${e.id}: sede desconocida «${detail.location?.name}»`);
      else detalles.set(e.id, { ...e, detail });
    } catch (error) {
      errors.push(`evento ${e.id}: ${error.message}`);
    }
  }
  // Fuera de la ventana pero conocidos: sólo hacen falta para numerar (vienen de la versión anterior).
  const todos = [...detalles.values()].map((d) => ({ id: d.id, startDate: d.startDate }));
  for (const [id, e] of previas) if (!detalles.has(id)) todos.push({ id, startDate: dayOf(e.sessions[0].start) });
  todos.sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)) || a.id - b.id);
  // Número de fecha: el que ya tenía; uno nuevo toma el siguiente (la calendarización es cronológica).
  let maxRound = Math.max(0, ...[...previas.values()].map((e) => e.round));
  const round = new Map();
  for (const t of todos) round.set(t.id, previas.get(t.id)?.round ?? ++maxRound);

  // 2. Sesiones y resultados de los eventos pedidos.
  const pedidos = [];
  for (const d of detalles.values()) {
    const sesiones = ordinales(sesionesDeEvento(d.detail));
    const rows = new Map();
    for (const s of sesiones) {
      if (Date.parse(`${s.startTime}-03:00`) > nowMs) continue; // todavía no se corrió
      await io.sleep(delayMs);
      try {
        rows.set(s.speedhiveId, await io.json(`${API}/sessions/${s.speedhiveId}/classification`, { revalidate: 120 }));
      } catch (error) {
        errors.push(`sesión ${s.speedhiveId}: ${error.message}`);
      }
    }
    pedidos.push({ ...d, sesiones, rows });
  }

  // 3. Nombres: un solo criterio por clase, con los nombres ya guardados como referencia (el nombre de un piloto no cambia entre corridas).
  const items = Object.fromEntries(CLASES.map((c) => [c.id, []]));
  for (const p of pedidos) {
    const r = round.get(p.id);
    for (const s of p.sesiones) {
      const c = p.rows.get(s.speedhiveId);
      for (const row of c?.rows ?? []) items[claseDeTexto(row.resultClass) ?? s.classId].push({ raw: repairMojibake(row.name), number: String(row.startNumber ?? ""), event: String(r), session: String(s.speedhiveId) });
    }
  }
  for (const e of previous.events ?? []) {
    if (e.seriesId !== SERIES_ID) continue;
    for (const s of e.sessions) for (const row of s.results ?? []) if (s.classId) items[s.classId]?.push({ raw: row.driver, number: row.number, event: String(e.round), session: s.id, previo: true });
  }
  const nombres = Object.fromEntries(Object.entries(items).map(([id, it]) => [id, resolverNombres(it)]));
  const nombreDe = (classId) => (raw) => desambiguar(classId, nombres[classId].get(repairMojibake(raw)) ?? repairMojibake(raw));

  // 4. Los eventos.
  const eventos = [];
  let filled = 0;
  for (const p of pedidos) {
    const n = round.get(p.id);
    const id = `${SERIES_ID}-${YEAR}-${n}`;
    const sede = sedeDe(p.detail.location);
    const url = `https://speedhive.mylaps.com/events/${p.id}`;
    const sessions = [];
    for (const s of p.sesiones) {
      const clase = claseById[s.classId];
      const c = p.rows.get(s.speedhiveId);
      const start = `${s.startTime}-03:00`;
      const base = {
        id: sessionId(id, s),
        classId: s.classId,
        kind: s.kind,
        name: nombreDeSesion(s.kind, s.n, s.total, clase, s.superClasificacion),
        start,
        timeKnown: true,
        timeStatus: "confirmed",
        timeSources: [{ name: TIME_SOURCE, url, start }],
        durationMin: DURATION[s.kind],
      };
      // Una sesión con varias clases en la tabla: cada clase toma sus filas.
      const clases = new Set((c?.rows ?? []).map((r) => claseDeTexto(r.resultClass) ?? s.classId));
      const destinos = clases.size > 1 ? [...clases] : [s.classId];
      for (const dest of destinos) {
        const propia = dest === s.classId ? base : { ...base, classId: dest, id: sessionId(id, { ...s, classId: dest }), name: nombreDeSesion(s.kind, s.n, s.total, claseById[dest], s.superClasificacion) };
        const rows = c ? filasDe(c, s.kind, nombreDe(dest), clases.size > 1 ? dest : undefined) : [];
        const out = { ...propia };
        if (rows.length) {
          Object.assign(out, { results: rows, resultsSource: { name: SPEEDHIVE_CP_SOURCE, url: `https://speedhive.mylaps.com/sessions/${s.speedhiveId}` } });
          filled++;
        }
        // Dos sesiones con el mismo id (la tabla repartida ya tenía su propia sesión): gana la que tiene más pilotos.
        const i = sessions.findIndex((x) => x.id === out.id);
        if (i === -1) sessions.push(out);
        else if ((out.results?.length ?? 0) > (sessions[i].results?.length ?? 0)) sessions[i] = out;
      }
    }
    if (!sessions.length) continue;
    sessions.sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || (CLASES_ORDEN[a.classId] ?? 0) - (CLASES_ORDEN[b.classId] ?? 0) || a.id.localeCompare(b.id));
    eventos.push({
      id,
      seriesId: SERIES_ID,
      round: n,
      name: `Fecha ${n} · ${sede.city}`,
      circuit: sede,
      sessions,
      source: EVENT_SOURCE,
      speedhiveEventId: p.id,
    });
  }

  // 5. Fechas que no se volvieron a pedir (o que fallaron): lo de la versión anterior.
  const nuevos = new Map(eventos.map((e) => [e.speedhiveEventId, e]));
  const events = [];
  for (const [speedhiveId, old] of previas) events.push(desambiguarEvento(carryOver(nuevos.get(speedhiveId) ?? old, old)));
  for (const e of eventos) if (!previas.has(e.speedhiveEventId)) events.push(e);
  events.sort((a, b) => a.round - b.round);

  if (!events.length) throw new Error(`Speedhive no trajo ninguna fecha de Córdoba Pista entre ${list.length} eventos de la FRAD${errors.length ? ` (${errors.join("; ")})` : ""}`);
  const campeonatos = campeonatosDeCordobaPista(events, { previous: previous.meta?.[SERIES_ID]?.clases });
  return {
    events,
    standings: {},
    meta: { [SERIES_ID]: { clases: campeonatos }, cordobaPista: { events: events.length, filledResults: filled, errors, ignored } },
  };
}

/**
 * Arrastra a una fecha lo que la versión anterior ya tenía y la de hoy no trae: fechas fuera de la ventana, sesiones o resultados que
 * Speedhive dejó de publicar. Nada de lo que ya se mostró desaparece por un mal día de la fuente ("las fuentes nunca se achican").
 */
export function carryOver(event, old) {
  if (!old || event === old) return event;
  const byId = new Map(event.sessions.map((s) => [s.id, s]));
  const sessions = event.sessions.map((s) => {
    const prev = old.sessions.find((o) => o.id === s.id);
    if (!prev || !belongsToEvent(event, prev)) return s;
    return !s.results?.length && prev.results?.length ? { ...s, results: prev.results, resultsSource: prev.resultsSource } : s;
  });
  for (const o of old.sessions) if (!byId.has(o.id) && o.results?.length && belongsToEvent(event, o)) sessions.push(o);
  return { ...event, sessions: sessions.sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || (CLASES_ORDEN[a.classId] ?? 0) - (CLASES_ORDEN[b.classId] ?? 0) || a.id.localeCompare(b.id)) };
}

/**
 * Los homónimos (`desambiguar`) también en lo que se arrastra de la versión anterior: las fechas que no se vuelven a pedir conservan sus
 * resultados tal como se guardaron, y sin esto un homónimo agregado después quedaría con el nombre viejo en esas fechas.
 */
export function desambiguarEvento(event) {
  let cambio = false;
  const sessions = event.sessions.map((s) => {
    if (!s.classId || !s.results?.length) return s;
    const results = s.results.map((r) => {
      const driver = desambiguar(s.classId, r.driver);
      if (driver === r.driver) return r;
      cambio = true;
      return { ...r, driver };
    });
    return cambio ? { ...s, results } : s;
  });
  return cambio ? { ...event, sessions } : event;
}

/** Si Speedhive falla por completo: se conserva lo de la versión anterior. */
export function keepPreviousCordobaPista(events, previous) {
  const old = (previous.events ?? []).filter((e) => e.seriesId === SERIES_ID).map(desambiguarEvento);
  const have = new Set(events.map((e) => e.id));
  return [...events, ...old.filter((e) => !have.has(e.id))];
}
