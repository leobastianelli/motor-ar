// Chequeos del guardián: qué está mal o qué falta en los datos del sitio. Funciones puras (reciben datos y la hora), sin red ni disco,
// así se prueban solas. Cada chequeo devuelve "hallazgos": { key, severity, level, title, body, tier }.
//   · key: identidad estable del problema (para no repetir el aviso y para saber cuándo se resolvió).
//   · severity: critical | high | medium | info.
//   · level: sube a medida que el problema se acerca o empeora (el aviso insiste más).
// Reglas del proyecto que rigen acá: los avisos de horarios sólo salen para eventos con fecha CONFIRMADA (si la fecha no es sólida no
// sabemos qué está pendiente), y lo argentino va primero.
import { mergeSessionPatches } from "../sources/overrides.mjs";

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const RACE_KINDS = new Set(["final", "carrera", "sprint"]);
const TZ = "America/Argentina/Buenos_Aires";
const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, weekday: "short", day: "numeric", month: "numeric" });

/** YYYY-MM-DD en hora argentina. */
export const dayKey = (iso) => keyFmt.format(new Date(iso));
export const dayLabel = (iso) => dayFmt.format(new Date(iso)).replace(".", "");
const startOfDay = (iso) => Date.parse(`${dayKey(iso)}T00:00:00-03:00`);
const endOfEvent = (e) => Math.max(...e.sessions.map((s) => Date.parse(s.start) + (s.timeKnown === false ? DAY : (s.durationMin ?? 60) * 60_000)));

/** Las fechas como las ve la gente: las de la instantánea más las cargas manuales (mismas reglas que createSeason en data.ts). */
export function visibleEvents(snapshotEvents, manual = {}) {
  const known = new Set(snapshotEvents.map((e) => e.id));
  const all = [...snapshotEvents, ...(manual.newEvents ?? []).filter((e) => !known.has(e.id))];
  return all.map((e) => {
    const patch = manual.events?.[e.id];
    return patch?.sessions ? { ...e, sessions: mergeSessionPatches(e.id, e.sessions, patch.sessions, dayKey) } : e;
  });
}

// ——— Calibración de fechas ———

const OFFICIAL_SOURCE = /ACTC \(calendario\)|APAT|Jolpica|GT World Challenge Europe \(oficial\)|FIA Formula 2|calendario oficial/i;

/**
 * ¿Qué tan sólida es la fecha de un evento?
 *  · confirmed: la publica una fuente oficial y tiene sede.
 *  · tentative: viene sólo de Wikipedia o de una carga manual, o la fuente oficial la marca "a confirmar" / sin sede.
 *  · conflict: dos fuentes no coinciden (`dateConflict`, lo marcan los cruces).
 */
export function dateStatus(event) {
  if (event.dateConflict) return { status: "conflict", reason: event.dateConflict };
  // Una carga manual puede declarar que la fecha está confirmada (`dateConfirmed`): sólo faltan los horarios.
  if (event.dateConfirmed) return { status: "confirmed", reason: "confirmada a mano" };
  if (!event.circuit?.city || /confirmar/i.test(`${event.name} ${event.circuit?.city} ${event.circuit?.name}`)) return { status: "tentative", reason: "sin sede confirmada" };
  if (event.sessions.some((s) => s.timeKnown !== false && (s.timeSources?.length || s.timeStatus === "confirmed"))) return { status: "confirmed", reason: "horario oficial publicado" };
  if (OFFICIAL_SOURCE.test(event.source ?? "")) return { status: "confirmed", reason: "fuente oficial" };
  return { status: "tentative", reason: `sólo ${String(event.source ?? "sin fuente").replace(/^Carga manual · /, "carga manual · ").slice(0, 80)}` };
}

/** Fechas que no se pueden dar por buenas: tentativas a menos de 14 días, en conflicto, o el mismo número de fecha repetido. */
export function dateIssues(events, now, { tierOf = () => 3, name = (id) => id } = {}) {
  const nowMs = Date.parse(now);
  const out = [];
  for (const e of events) {
    const first = Date.parse(e.sessions[0].start);
    if (endOfEvent(e) < nowMs) continue;
    const { status, reason } = dateStatus(e);
    if (status === "confirmed") continue;
    if (status === "tentative" && first - nowMs > 14 * DAY) continue;
    out.push({
      key: `fecha:${e.id}`,
      severity: status === "conflict" ? "high" : "medium",
      level: status === "conflict" ? 2 : 1,
      tier: tierOf(e.seriesId),
      title: `Fecha ${status === "conflict" ? "en conflicto" : "sin confirmar"}: ${name(e.seriesId)} · ${e.name} (${dayLabel(e.sessions[0].start)})`,
      body: `${status === "conflict" ? "Dos fuentes no coinciden" : "No es sólida todavía"}: ${reason}. Mientras no se confirme no se avisa por horarios de este evento.`,
    });
  }
  // Un mismo número de fecha repetido dentro de la misma familia de ids (tcm-2026-7 y tcm-2026-7b). GT tiene dos campeonatos con numeración
  // propia (gt3-2026-s1 y gt3-2026-e1): no es una repetición.
  const seen = new Map();
  for (const e of events) {
    const k = `${e.seriesId}#${e.round}#${e.id.replace(/\d+[a-z]?$/, "")}`;
    if (seen.has(k) && e.round) {
      out.push({ key: `fecha-duplicada:${e.seriesId}#${e.round}`, severity: "high", level: 2, tier: tierOf(e.seriesId), title: `Fecha repetida: ${name(e.seriesId)} tiene dos veces la fecha ${e.round}`, body: `${seen.get(k)} y ${e.id}.` });
    }
    seen.set(k, e.id);
  }
  return out;
}

// ——— Horarios pendientes ———

/**
 * Eventos con fecha confirmada que están a menos de 72 h y todavía no tienen horario de carrera. Los horarios suelen conocerse el jueves
 * o el viernes: el aviso arranca 72 h antes del día del evento y sube de nivel a las 48 h, a las 24 h y el mismo día.
 */
export function pendingHours(events, now, { tierOf = () => 3, name = (id) => id } = {}) {
  const nowMs = Date.parse(now);
  const out = [];
  for (const e of events) {
    if (dateStatus(e).status !== "confirmed") continue;
    const pending = e.sessions.filter((s) => RACE_KINDS.has(s.kind) && s.timeKnown === false && startOfDay(s.start) + DAY > nowMs);
    if (!pending.length) continue;
    const dayMs = Math.min(...pending.map((s) => startOfDay(s.start)));
    const hours = (dayMs - nowMs) / HOUR;
    if (hours > 72) continue;
    const level = hours <= 0 ? 4 : hours <= 24 ? 3 : hours <= 48 ? 2 : 1;
    const when = hours <= 0 ? "HOY" : dayLabel(pending[0].start);
    out.push({
      key: `horarios:${e.id}`,
      severity: level >= 3 ? "critical" : level === 2 ? "high" : "medium",
      level,
      tier: tierOf(e.seriesId),
      title: `Faltan horarios: ${name(e.seriesId)} · ${e.circuit?.city ?? e.name} (${when})`,
      body: `${pending.length} ${pending.length === 1 ? "sesión de carrera sin hora" : "sesiones de carrera sin hora"}: ${pending.map((s) => s.name).join(", ")}.`,
      hours,
    });
  }
  return out;
}

/** Eventos ya corridos (hace más de `after` horas) de una categoría con fuente automática y sin resultado de carrera publicado. */
export function resultsOverdue(events, now, { autoSeries, after = 36, tierOf = () => 3, name = (id) => id } = {}) {
  const nowMs = Date.parse(now);
  const out = [];
  for (const e of events) {
    if (!autoSeries.has(e.seriesId) || endOfEvent(e) + after * HOUR > nowMs) continue;
    if (e.sessions.some((s) => RACE_KINDS.has(s.kind) && s.results?.length)) continue;
    out.push({ key: `resultados:${e.id}`, severity: "medium", level: 1, tier: tierOf(e.seriesId), title: `Sin resultados: ${name(e.seriesId)} · ${e.circuit?.city ?? e.name} (${dayLabel(e.sessions.at(-1).start)})`, body: `Pasaron más de ${after} h de la última sesión y la fuente no publicó la carrera.` });
  }
  return out;
}

// ——— Fuentes caídas ———

/**
 * Las fallas que dejó la sincronización (`failures[]`). Una falla suelta puede ser un mal momento de la fuente: se avisa desde la
 * segunda vez seguida (`consecutive`). Lo que ya perdió datos (la protección tuvo que conservarlos) avisa en el acto.
 */
export function sourceFailures(failures = []) {
  return failures.map((text) => {
    const t = String(text);
    // La protección del armado deja avisos que no son fallas de una fuente.
    if (/^Se descartaron/i.test(t)) {
      return { key: "correccion:automatica", severity: "info", level: 1, tier: 3, title: "Datos corregidos automáticamente", body: `${t.slice(0, 400)}. No hace falta hacer nada; se avisa por si se repite.` };
    }
    if (/^Se conservaron/i.test(t)) {
      return { key: "fuente:perdio-datos", severity: "high", level: 1, tier: 3, title: "Una fuente dejó de traer datos (se conservaron los anteriores)", body: t.slice(0, 500) };
    }
    const label = t.split(":")[0].trim().slice(0, 60);
    return { key: `fuente:${label}`, severity: "medium", level: 1, tier: 3, consecutive: 2, title: `Falla de una fuente: ${label}`, body: t.slice(0, 500) };
  });
}

// ——— Datos manuales que se quedaron viejos ———

const racedRounds = (events, seriesId) => events.filter((e) => e.seriesId === seriesId && e.sessions.some((s) => RACE_KINDS.has(s.kind) && s.results?.length)).length;

/** Tablas de campeonato que cubren menos fechas que las ya corridas (la web las oculta sola, acá se avisa para conseguir la nueva). */
export function staleStandings(snapshot, manual, events, { tierOf = () => 3, name = (id) => id } = {}) {
  const out = [];
  const ids = new Set([...Object.keys(snapshot.standings ?? {}), ...Object.keys(manual.standings ?? {})]);
  for (const id of ids) {
    const auto = snapshot.meta?.[id]?.standingsAsOfRound;
    const hand = manual.standings?.[id]?.asOfRound;
    const asOf = Math.max(auto ?? 0, hand ?? 0);
    const raced = racedRounds(events, id);
    if (asOf === 0 || raced <= asOf) continue;
    const isManual = (hand ?? 0) >= (auto ?? 0);
    out.push({
      key: `tabla:${id}`,
      severity: tierOf(id) === 1 ? "high" : "medium",
      level: 1,
      tier: tierOf(id),
      title: `Campeonato atrasado: ${name(id)}`,
      body: `La tabla llega hasta la fecha ${asOf} y ya se corrieron ${raced}. ${isManual ? "Es una carga manual (manual-overrides.json): hay que cargar la tabla nueva." : "Viene de la fuente automática, que todavía no la actualizó."} La web la oculta mientras tanto.`,
    });
  }
  return out;
}

/** Cargas manuales de un evento que ya terminó hace más de 2 días: se pueden revisar o limpiar. */
export function manualExpired(events, manual, now) {
  const nowMs = Date.parse(now);
  const out = [];
  for (const id of Object.keys(manual.events ?? {})) {
    const e = events.find((x) => x.id === id);
    if (e && endOfEvent(e) + 2 * DAY < nowMs) {
      out.push({ key: `manual-vencida:${id}`, severity: "info", level: 1, tier: 3, title: `Carga manual ya cumplida: ${id}`, body: "El evento terminó hace más de 2 días. Revisar que la fuente automática tenga todo y sacar la carga de manual-overrides.json." });
    }
  }
  return out;
}

// ——— Vigilancia de una tabla manual con la portada oficial ———

/**
 * Campeonato de pilotos de la portada de TC2000. La portada trae los títulos de las dos pestañas juntos ("CAMPEONATO DE PILOTOS",
 * "CAMPEONATO DE EQUIPOS") y después las filas de pilotos ("1°", nombre, puntos) y las de equipos: se leen las de pilotos y se corta al
 * empezar las de equipos (cuando la posición vuelve a 1) o en "VER LISTA COMPLETA".
 */
export function parseTc2000Home(text) {
  const rows = [];
  // La portada escribe "1&deg;" y los acentos como entidades HTML.
  const ENT = { deg: "°", ordm: "°", amp: "&", nbsp: " ", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ" };
  const decode = (l) => l.replace(/&(\w+);/g, (m, n) => ENT[n] ?? m).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  const lines = String(text).split("\n").map((l) => decode(l).trim()).filter(Boolean);
  const start = lines.findIndex((l) => /CAMPEONATO DE PILOTOS/i.test(l));
  if (start === -1) return rows;
  for (let i = start + 1; i + 2 < lines.length; i++) {
    if (/VER LISTA COMPLETA/i.test(lines[i])) break;
    const pos = lines[i].match(/^(\d+)\s*°$/);
    if (!pos || !/^\d+(?:[.,]\d+)?$/.test(lines[i + 2])) continue;
    if (Number(pos[1]) === 1 && rows.length) break;
    rows.push({ pos: Number(pos[1]), driver: lines[i + 1], points: Number(lines[i + 2].replace(",", ".")) });
    i += 2;
  }
  return rows;
}

const plain = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, " ").trim();

const PARTICLES = new Set(["de", "del", "la", "los", "las", "da", "do", "di"]);
const words = (s) => plain(s).split(" ").filter((w) => w && !PARTICLES.has(w));

/** ¿Son el mismo piloto aunque se escriba distinto ("Gabriel P. de Leon" / "Gabriel Ponce de León")? Comparten al menos dos palabras. */
export function sameDriver(a, b) {
  const wa = words(a);
  const wb = new Set(words(b));
  const shared = wa.filter((w) => wb.has(w)).length;
  return shared >= Math.min(2, wa.length, wb.size);
}

/**
 * Compara la tabla manual de una categoría con las filas de una fuente oficial que sí podemos leer. Se comparan los PUNTOS de cada
 * piloto (no las posiciones: con un empate, dos fuentes pueden ordenar distinto y ninguna se equivoca).
 */
export function compareStandings(manualRows, officialRows, { series, name }) {
  const diffs = [];
  for (const o of officialRows) {
    const m = manualRows.find((r) => sameDriver(r.driver, o.driver));
    if (!m) diffs.push(`${o.pos}.º ${o.driver} (${o.points}) no está en la tabla manual`);
    else if (Number(m.points) !== o.points) diffs.push(`${o.driver}: oficial ${o.points} pts, manual ${m.points} pts`);
  }
  if (!diffs.length) return [];
  return [{ key: `manual-desactualizado:${series}`, severity: "high", level: 1, tier: 1, title: `La tabla cargada a mano de ${name} no coincide con la oficial`, body: `${diffs.slice(0, 6).join(" · ")}${diffs.length > 6 ? ` · …y ${diffs.length - 6} más` : ""}. Traé la tabla nueva y la actualizamos.` }];
}

// ——— Cruce de fechas entre dos fuentes ———

/**
 * Fechas del TN de APAT contra las de Speedhive ("APAT TN - FECHA 9 - RIO CUARTO", con su fecha de inicio): una segunda fuente
 * independiente. Devuelve { idDelEvento: "motivo" } para las que difieren en más de un día.
 */
export function tnDateConflicts(events, speedhiveEvents) {
  const out = {};
  for (const s of speedhiveEvents) {
    const round = String(s.name ?? "").match(/\bTN\b[^\n]*?FECHA\s*(\d+)/i)?.[1];
    if (!round || /pruebas comunitarias/i.test(s.name)) continue;
    const ours = events.find((e) => e.seriesId === "tn" && e.round === Number(round));
    if (!ours) continue;
    const first = dayKey(ours.sessions[0].start);
    const last = dayKey(ours.sessions.at(-1).start);
    const day = String(s.startDate).slice(0, 10);
    const near = (a, b) => Math.abs(Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) <= DAY;
    if (!near(day, first) && !near(day, last)) out[ours.id] = `APAT dice ${first === last ? first : `${first} a ${last}`} y Speedhive ${day}`;
  }
  return out;
}

export const withConflicts = (events, conflicts) => events.map((e) => (conflicts[e.id] ? { ...e, dateConflict: conflicts[e.id] } : e));
