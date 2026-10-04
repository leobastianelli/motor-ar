// Chequeos del guardián: qué está mal o qué falta en los datos del sitio. Funciones puras (reciben datos y la hora), sin red ni disco,
// así se prueban solas. Cada chequeo devuelve "hallazgos": { key, severity, level, title, body, tier }.
//   · key: identidad estable del problema (para no repetir el aviso y para saber cuándo se resolvió).
//   · severity: critical | high | medium | info.
//   · level: sube a medida que el problema se acerca o empeora (el aviso insiste más).
// Reglas del proyecto que rigen acá: los avisos de horarios sólo salen para eventos con fecha CONFIRMADA (si la fecha no es sólida no
// sabemos qué está pendiente), y lo argentino va primero.
import { mergeSessionPatches, sessionKey } from "../sources/overrides.mjs";
import { dedupeFindings } from "./alerts.mjs";

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

const ACTC_SERIES = new Set(["tc", "tc-pista", "tc-mouras", "tc-pista-mouras", "tc-pick-up", "tc-pista-pick-up"]);
const weekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
const DAYS_AFTER_FRIDAY = { Fri: 0, Sat: 1, Sun: 2 };

/**
 * Fechas de la ACTC de este fin de semana que no tienen NINGÚN horario conocido (todas sus sesiones son de relleno a las 12:00). Avisa desde el
 * viernes 00:00 (hora argentina) hasta que termina el último día, sin pedir que la fecha esté confirmada: si hay carrera el fin de semana y no
 * hay ni un horario, hay que cargarlos a mano o buscar otra fuente (caso Rosario, TC Mouras, 27/09/2026: nadie avisó y el pulso no tuvo a qué
 * engancharse). Es más fuerte que `pendingHours`, que sólo mira las sesiones de carrera y empieza el jueves.
 */
export function weekendWithoutAnyHour(events, now, { tierOf = () => 3, name = (id) => id } = {}) {
  const nowMs = Date.parse(now);
  const out = [];
  for (const e of events) {
    if (!ACTC_SERIES.has(e.seriesId) || !e.sessions.length) continue;
    const first = e.sessions.reduce((a, s) => (Date.parse(s.start) < Date.parse(a.start) ? s : a), e.sessions[0]);
    const offset = DAYS_AFTER_FRIDAY[weekdayFmt.format(new Date(first.start))];
    if (offset === undefined) continue; // no es una fecha de fin de semana
    const firstDay = startOfDay(first.start);
    const fridayMs = firstDay - offset * DAY;
    const lastDayEnd = startOfDay(e.sessions.reduce((a, s) => (Date.parse(s.start) > Date.parse(a.start) ? s : a), e.sessions[0]).start) + DAY;
    if (nowMs < fridayMs || nowMs >= lastDayEnd) continue;
    if (!e.sessions.every((s) => s.timeKnown === false)) continue;
    const hours = (firstDay - nowMs) / HOUR;
    const level = hours <= 0 ? 4 : 3;
    out.push({
      key: `sin-horarios:${e.id}`,
      severity: "critical",
      level,
      tier: tierOf(e.seriesId),
      title: `Sin ningún horario: ${name(e.seriesId)} · ${e.circuit?.city ?? e.name} (${hours <= 0 ? "HOY" : dayLabel(first.start)})`,
      body: `La fecha es este fin de semana y ninguna de sus ${e.sessions.length} ${e.sessions.length === 1 ? "sesión tiene hora" : "sesiones tiene hora"}. Sin horarios el pulso no sabe cuándo pedir los resultados. Cargarlos a mano (manual-overrides.json, con fuente) o buscar el cronograma en SoloTC, Carburando o el autódromo.`,
      hours,
    });
  }
  return out;
}

/**
 * Cargas manuales que se descartaron al fusionarlas con la fuente (ver mergeSessionPatches en overrides.mjs): no hay dónde ponerlas porque
 * la fuente ya trae esa sesión con resultados. Es informativo: nunca se descarta una carga sin que quede dicho.
 */
export function manualDiscarded(sourceEvents, manual) {
  const out = [];
  const sourceById = new Map(sourceEvents.map((e) => [e.id, e]));
  for (const [id, patch] of Object.entries(manual.events ?? {})) {
    const src = sourceById.get(id);
    if (!src || !patch?.sessions) continue;
    const discarded = [];
    mergeSessionPatches(id, src.sessions, patch.sessions, dayKey, discarded);
    for (const d of discarded) {
      out.push({ key: `manual-descartada:${id}:${sessionKey(d)}`, severity: "info", level: 1, tier: 3, title: `Carga manual descartada: ${id} · ${d.name}`, body: `No se muestra porque ${d.reason}. Revisar manual-overrides.json: o el nombre no coincide con el de la fuente o ya no hace falta.` });
    }
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
    const days = (nowMs - endOfEvent(e)) / DAY;
    // Un hueco de más de 30 días ya no se arregla con una resincronización: se sigue mostrando, pero como información (no cuenta como problema abierto).
    if (days > 30) {
      out.push({ key: `resultados:${e.id}`, severity: "info", level: 1, tier: tierOf(e.seriesId), title: `Hueco viejo sin resultados: ${name(e.seriesId)} · ${e.circuit?.city ?? e.name} (${dayLabel(e.sessions.at(-1).start)})`, body: `Pasaron ${Math.floor(days)} días y la fuente nunca publicó la carrera: es un hueco viejo de la fuente. Si se consiguen los resultados de otra fuente confiable, cargarlos en manual-overrides.json.` });
      continue;
    }
    out.push({ key: `resultados:${e.id}`, severity: "medium", level: 1, tier: tierOf(e.seriesId), title: `Sin resultados: ${name(e.seriesId)} · ${e.circuit?.city ?? e.name} (${dayLabel(e.sessions.at(-1).start)})`, body: `Pasaron más de ${after} h de la última sesión y la fuente no publicó la carrera.` });
  }
  return out;
}

/**
 * Sesiones de una categoría con resultados por sesión (F1: prácticas, clasificación, sprint y carrera) que terminaron y siguen sin resultados.
 * A diferencia de `resultsOverdue` (36 h, sólo la carrera), acá se insiste rápido: los resultados de una sesión tienen que estar a los minutos.
 * Sube de nivel a la hora y a las 3 horas; después de `before` horas (2 días) se deja de avisar (queda para `resultsOverdue`).
 */
export function sessionResultsMissing(events, now, { seriesIds, after = 0.5, before = 48, tierOf = () => 3, name = (id) => id } = {}) {
  const nowMs = Date.parse(now);
  const out = [];
  for (const e of events) {
    if (!seriesIds.has(e.seriesId)) continue;
    const late = e.sessions
      .filter((s) => s.timeKnown !== false && !s.results?.length)
      .map((s) => ({ s, hours: (nowMs - (Date.parse(s.start) + (s.durationMin ?? 60) * 60_000)) / HOUR }))
      .filter(({ hours }) => hours >= after && hours < before);
    if (!late.length) continue;
    const worst = Math.max(...late.map((x) => x.hours));
    const level = worst >= 3 ? 3 : worst >= 1 ? 2 : 1;
    out.push({
      key: `sesion-sin-resultados:${e.id}`,
      severity: level >= 3 ? "high" : "medium",
      level,
      tier: tierOf(e.seriesId),
      title: `Sesiones sin resultados: ${name(e.seriesId)} · ${e.circuit?.city ?? e.name}`,
      body: `${late.map(({ s, hours }) => `${s.name} (terminó hace ${hours < 1 ? `${Math.round(hours * 60)} min` : `${Math.round(hours)} h`}${s.resultsUnread ? "; la fuente los publicó y no los pudimos leer" : ""})`).join(", ")}. Se vuelven a pedir en cada sincronización.`,
    });
  }
  return out;
}

// ——— Fuentes caídas ———

/**
 * Las fallas que dejó la sincronización (`failures[]`). Una falla suelta puede ser un mal momento de la fuente: se avisa desde la
 * segunda vez seguida (`consecutive`). Lo que ya perdió datos (la protección tuvo que conservarlos) avisa en el acto.
 */
export function sourceFailures(failures = []) {
  const out = [];
  const lost = [];
  const groups = new Map(); // origen → fallas
  const tables = [];
  const loose = [];
  for (const text of failures) {
    const t = String(text);
    // La protección del armado deja avisos que no son fallas de una fuente.
    if (/^Se descartaron/i.test(t)) {
      out.push({ key: "correccion:automatica", severity: "info", level: 1, tier: 3, title: "Datos corregidos automáticamente", body: `${t.slice(0, 400)}. No hace falta hacer nada; se avisa por si se repite.` });
    } else if (/^Se conservaron/i.test(t)) {
      lost.push(t);
    } else if (/^Campeonato\s+\S+:\s*la fuente no trajo la tabla/i.test(t)) {
      tables.push(t);
    } else {
      const host = failureHost(t);
      if (host) groups.set(host, [...(groups.get(host) ?? []), t]);
      else loose.push(t);
    }
  }
  // Varias pérdidas de datos son un solo problema: un aviso con todas las líneas.
  if (lost.length) {
    out.push({ key: "fuente:perdio-datos", severity: "high", level: 1, tier: 3, title: "Una fuente dejó de traer datos (se conservaron los anteriores)", body: lost.map((l) => l.slice(0, 500)).join("\n").slice(0, 900) });
  }
  // Un origen caído tira varias cosas a la vez (el 4/10/2026 la ACTC dio 502 y salieron ~15 avisos): un solo aviso por origen.
  for (const [host, list] of groups) {
    if (list.length < 2) {
      loose.push(...list);
      continue;
    }
    out.push({
      key: `fuente:${host}`,
      severity: "medium",
      level: 1,
      tier: 3,
      consecutive: 2,
      title: `${hostName(host)} no responde (${list.length} cosas no se pudieron actualizar)`,
      body: list.map((l) => `· ${l.slice(0, 200)}`).join("\n").slice(0, 900),
    });
  }
  if (tables.length >= 2) {
    out.push({
      key: "fuente:tablas-sin-datos",
      severity: "medium",
      level: 1,
      tier: 3,
      consecutive: 2,
      title: `${tables.length} tablas de campeonato no llegaron, se conservaron las anteriores`,
      body: tables.map((l) => `· ${l.replace(/:\s*la fuente no trajo la tabla, se conservó la anterior/i, "")}`).join("\n").slice(0, 900),
    });
  } else loose.push(...tables);
  for (const t of loose) {
    const label = failureLabel(t);
    out.push({ key: `fuente:${label}`, severity: "medium", level: 1, tier: 3, consecutive: 2, title: `Falla de una fuente: ${label}`, body: t.slice(0, 500) });
  }
  return dedupeFindings(out);
}

const TLD_PARTS = new Set(["ar", "com", "org", "net", "gov", "edu", "co", "info"]);
const hostName = (host) => (host === "actc" ? "La ACTC" : `La fuente ${host}`);

/** Origen de una falla: el dominio de la URL que menciona ("https://www.actc.org.ar/x" → "actc"), o "actc" si sólo nombra a la ACTC. */
function failureHost(text) {
  const m = text.match(/https?:\/\/([^\s/)"'<>]+)/i);
  if (m) {
    const parts = m[1].toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "").split(".");
    while (parts.length > 1 && TLD_PARTS.has(parts.at(-1))) parts.pop();
    return parts.at(-1) || null;
  }
  return /\bACTC\b/.test(text) ? "actc" : null;
}

/** Nombre de la fuente: lo anterior al primer ":" fuera de paréntesis. Si el paréntesis queda abierto ("Cronogramas (ACTC: ..."), se saca lo colgado. */
export function failureLabel(text) {
  const t = String(text);
  let depth = 0;
  let cut = -1;
  for (let i = 0; i < t.length && cut < 0; i++) {
    if (t[i] === "(") depth++;
    else if (t[i] === ")") depth = Math.max(0, depth - 1);
    else if (t[i] === ":" && depth === 0) cut = i;
  }
  if (cut < 0) cut = t.indexOf(":");
  let label = (cut >= 0 ? t.slice(0, cut) : t).trim();
  if (label.lastIndexOf("(") > label.lastIndexOf(")")) label = label.slice(0, label.lastIndexOf("(")).trim() || label;
  return label.slice(0, 60);
}

// ——— Datos manuales que se quedaron viejos ———

const racedRounds = (events, seriesId) => events.filter((e) => e.seriesId === seriesId && e.sessions.some((s) => RACE_KINDS.has(s.kind) && s.results?.length)).length;

/** Inicio de la última sesión de carrera con resultados de la fecha más nueva de la categoría (0 si no hay). */
function lastRaceStart(events, seriesId) {
  let last = 0;
  for (const e of events) {
    if (e.seriesId !== seriesId) continue;
    for (const s of e.sessions) if (RACE_KINDS.has(s.kind) && s.results?.length) last = Math.max(last, Date.parse(s.start) || 0);
  }
  return last;
}

/** Tablas de campeonato que cubren menos fechas que las ya corridas (la web las oculta sola, acá se avisa para conseguir la nueva). */
export function staleStandings(snapshot, manual, events, { tierOf = () => 3, name = (id) => id, now = new Date().toISOString() } = {}) {
  const out = [];
  const ids = new Set([...Object.keys(snapshot.standings ?? {}), ...Object.keys(manual.standings ?? {})]);
  for (const id of ids) {
    const auto = snapshot.meta?.[id]?.standingsAsOfRound;
    const hand = manual.standings?.[id]?.asOfRound;
    const asOf = Math.max(auto ?? 0, hand ?? 0);
    const raced = racedRounds(events, id);
    if (asOf === 0 || raced <= asOf) continue;
    const isManual = (hand ?? 0) >= (auto ?? 0);
    // La fuente automática suele actualizar la tabla horas después de la final: no se avisa hasta 24 h desde que arrancó la última carrera.
    if (!isManual && Date.parse(now) - lastRaceStart(events, id) < 24 * HOUR) continue;
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

/**
 * ¿Una sesión de la carga manual (`patch`) ya la trae la fuente sola (sin aplicar la carga)? Se buscan por tipo + nombre, igual que al
 * fusionar (`sessionKey`, ver overrides.mjs). Sólo importa lo que la carga aportó: si puso hora, que la fuente tenga hora; si puso
 * resultados, que la fuente tenga resultados.
 */
function manualSessionCovered(sourceEvent, patch) {
  const src = sourceEvent?.sessions?.find((s) => sessionKey(s) === sessionKey(patch));
  if (!src) return { covered: false, reason: `"${patch.name}"` };
  if (patch.start && patch.timeKnown !== false && (src.timeKnown === false || !src.start)) return { covered: false, reason: `la hora de "${patch.name}"` };
  if (patch.results?.length && !src.results?.length) return { covered: false, reason: `los resultados de "${patch.name}"` };
  return { covered: true };
}

/**
 * Cargas manuales (`manual.events`) de un evento que ya terminó hace más de 2 días. No alcanza con que haya terminado: hay que fijarse si
 * la fuente (sin aplicar la carga, `sourceEvents`) ya trae todo lo que la carga puso a mano. Si sí, se puede sacar. Si la fuente nunca
 * trajo algo (un horario o un resultado que sólo existe a mano), sacar la carga borraría ese dato: se avisa distinto, sin pedir que se
 * saque, diciendo qué falta.
 */
export function manualExpired(events, sourceEvents, manual, now) {
  const nowMs = Date.parse(now);
  const out = [];
  const sourceById = new Map(sourceEvents.map((e) => [e.id, e]));
  for (const id of Object.keys(manual.events ?? {})) {
    const e = events.find((x) => x.id === id);
    if (!e || endOfEvent(e) + 2 * DAY >= nowMs) continue;
    const patches = manual.events[id]?.sessions ?? [];
    const missing = patches.map((p) => manualSessionCovered(sourceById.get(id), p)).filter((r) => !r.covered).map((r) => r.reason);
    if (!missing.length) {
      out.push({ key: `manual-vencida:${id}`, severity: "info", level: 1, tier: 3, title: `Carga manual ya cumplida: ${id}`, body: "El evento terminó hace más de 2 días y la fuente automática ya trae todo lo que se había cargado a mano: se puede sacar la carga de manual-overrides.json." });
    } else {
      out.push({ key: `manual-necesaria:${id}`, severity: "info", level: 1, tier: 3, title: `Carga manual necesaria: ${id}`, body: `La fuente todavía no trae ${missing.join(", ")}. No sacar la carga de manual-overrides.json: se perdería ese dato.` });
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
