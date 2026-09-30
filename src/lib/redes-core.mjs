// Borradores para redes: a partir de la temporada arma los textos que Leonel publica en X (agenda del finde, "terminó la sesión", "a qué hora
// corre"). Lógica pura, sin red ni disco: recibe los datos y la hora, devuelve los borradores nuevos. Nada se publica solo: el mensaje de Telegram
// lleva un botón que abre X con el texto escrito y la persona confirma (ver scripts/borradores-redes.mjs).
// Reglas de contenido: sólo datos que el sitio ya muestra, un enlace por borrador, sin "EN VIVO", y si falta un dato no se manda.
import { dateStatus, dayKey } from "./monitor/checks.mjs";
import { nombreVisibleSesion } from "./momento.mjs";
import { isProvisional, provisionalSuffix } from "./provisorio.mjs";

export const BASE_URL = "https://www.somosfierros.ar";
export const X_LIMIT = 280;
const TZ = "America/Argentina/Buenos_Aires";
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
/** Una sesión sólo genera borrador si terminó hace menos de esto: sin ese tope, el primer envío (estado vacío) mandaría toda la temporada. */
export const RESULT_WINDOW_MS = 24 * HOUR;
/** Tope de borradores "terminó la sesión" por corrida; el resto sale en la corrida siguiente. */
export const MAX_RESULTS_PER_RUN = 8;
const COMPETITIVE = new Set(["clasificacion", "sprint", "carrera", "final"]);
const RACE_KINDS = new Set(["carrera", "final", "sprint"]);

const timeFmt = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const weekdayFmt = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, weekday: "long" });
const hhmm = (iso) => timeFmt.format(new Date(iso));
const weekday = (iso) => weekdayFmt.format(new Date(iso));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const shortDay = (iso) => cap(weekday(iso)).slice(0, 3);

// ——— Largo como lo cuenta X ———

const URL_RE = /https?:\/\/\S+/g;
/** Los enlaces cuentan 23; lo demás pesa 1 si está en los rangos latinos/puntuación de twitter-text y 2 si no (emojis incluidos). */
export function xLength(text) {
  let n = 0;
  for (const ch of text.replace(URL_RE, "\u0000".repeat(23))) {
    const c = ch.codePointAt(0);
    n += c <= 4351 || (c >= 8192 && c <= 8205) || (c >= 8208 && c <= 8223) || (c >= 8242 && c <= 8247) ? 1 : 2;
  }
  return n;
}
const fits = (text) => xLength(text) <= X_LIMIT;

/** Enlace de intención de X: abre la app con el texto escrito y la persona toca "Publicar". */
export const xIntentUrl = (text) => `https://x.com/intent/post?text=${encodeURIComponent(text)}`;

// ——— Datos ———

const normalize = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const surname = (name) => String(name).trim().split(/\s+/).at(-1);
const ordinal = (pos) => `${pos}.º`;
const endOf = (s) => (s.timeKnown === false ? Date.parse(`${dayKey(s.start)}T00:00:00-03:00`) + DAY : Date.parse(s.start) + (s.durationMin ?? 60) * MIN);

/** Índice nombre → piloto argentino (con alias); en las tripulaciones ("A / B") alcanza con que alguno sea de los nuestros. */
function driverIndex(drivers) {
  const byName = new Map();
  for (const d of drivers) for (const n of [d.name, ...(d.aliases ?? [])]) byName.set(normalize(n), d);
  return (name) => byName.get(normalize(name)) ?? String(name).split(" / ").map((n) => byName.get(normalize(n))).find(Boolean);
}

/** Categoría argentina (1), internacional con argentinos (2) o el resto (3): la misma prioridad de la home. */
function tiers(series, drivers) {
  const withArgentines = new Set(drivers.map((d) => d.seriesId));
  const byId = Object.fromEntries(series.map((s) => [s.id, s]));
  return { byId, tierOf: (id) => (byId[id]?.scope !== "internacional" ? 1 : withArgentines.has(id) ? 2 : 3) };
}

const racedRounds = (events, id) => events.filter((e) => e.seriesId === id && e.sessions.some((s) => RACE_KINDS.has(s.kind) && s.results?.length)).length;

/** Líder del campeonato si la tabla está al día (cubre todas las fechas ya corridas); si no, null. Elige entre la automática y la manual como el sitio. */
export function freshLeader(season, manual, events, seriesId) {
  const auto = season.meta?.[seriesId]?.standingsHidden ? null : { rows: season.standings?.[seriesId], asOf: season.meta?.[seriesId]?.standingsAsOfRound ?? 0 };
  const hand = manual?.standings?.[seriesId] ? { rows: manual.standings[seriesId].rows, asOf: manual.standings[seriesId].asOfRound ?? 0 } : null;
  const pick = hand && (!auto?.rows?.length || hand.asOf >= auto.asOf) ? hand : auto;
  if (!pick?.rows?.length || pick.asOf === 0 || racedRounds(events, seriesId) > pick.asOf) return null;
  const top = pick.rows.find((r) => r.pos === 1);
  return top?.driver ? { driver: top.driver, points: top.points } : null;
}

const fmtPoints = (p) => (Number.isInteger(p) ? String(p) : String(p).replace(".", ","));

// ——— Terminó la sesión ———

const HOW = {
  R: "abandonó",
  D: "fue descalificado",
  W: "no largó",
  DNS: "no largó",
};
/** Qué le pasó a un argentino en una sesión: su posición, o por qué no terminó. */
function outcome(row, kind) {
  const code = String(row.positionText ?? "");
  if (HOW[code]) return HOW[code];
  if (/abandon/i.test(row.status ?? "")) return "abandonó";
  if (/descalific/i.test(row.status ?? "")) return "fue descalificado";
  if (/no larg/i.test(row.status ?? "")) return "no largó";
  if (/^(NC|EX|—)$/.test(code) || /sin tiempo|no clasificado/i.test(row.status ?? "")) return kind === "clasificacion" ? "no marcó tiempo" : "no fue clasificado";
  return kind === "clasificacion" ? `largará ${ordinal(row.pos)}` : `terminó ${ordinal(row.pos)}`;
}

/**
 * Borrador de una sesión con resultados. Devuelve null si faltan datos (sin podio completo) o si no entra en 280 caracteres ni resumido.
 * `abroad`: piloto argentino (de la lista de pilotos afuera) que corrió esa sesión, con su fila.
 */
export function sessionDraft({ event, session, series, leader, argentines }) {
  const rows = session.results ?? [];
  const podium = [1, 2, 3].map((p) => rows.find((r) => r.pos === p));
  if (podium.some((r) => !r?.driver) || !series) return null;
  const url = `${BASE_URL}/eventos/${event.id}`;
  const isQuali = session.kind === "clasificacion";
  // Cuando una fecha tiene más de una sesión del mismo tipo (F2 Baku: "Clasificación 1" y "Clasificación 2"; una fecha
  // con "Carrera principal" y "Carrera principal 2"), "Clasificación" o "Ganó" a secas no distingue cuál fue: se usa
  // el nombre propio de la sesión.
  const sameKindCount = event.sessions.filter((s) => s.kind === session.kind).length;
  const genericLabel = isQuali ? "Clasificación" : session.kind === "sprint" ? "Sprint" : null;
  const label = sameKindCount > 1 ? nombreVisibleSesion(session, event.sessions) : genericLabel;
  // Resultado provisorio de la ACTC (planilla antes de la revisión de los comisarios): el borrador lo dice al lado del ganador.
  const prov = provisionalSuffix(session);
  const head = (name) => (label ? `${label}: ${isQuali ? "pole de" : "ganó"} ${name(podium[0])}${prov}` : `Ganó ${name(podium[0])}${prov}`);
  for (const full of [true, false]) {
    const name = (r) => (full ? r.driver : surname(r.driver));
    for (const withLeader of [true, false]) {
      for (const withEvent of [true, false]) {
        const inPodium = new Set(podium.map((r) => r.pos));
        const argLines = argentines
          .filter(({ row }) => !inPodium.has(row.pos) || /^(R|D|W|DNS)$/.test(String(row.positionText ?? "")))
          .map(({ driver, row }) => `${surname(driver.name)} ${outcome(row, session.kind)}`);
        const parts = [
          `🏁 ${series.short}${withEvent ? ` · ${event.name}` : ""}. ${head(name)}; 2.º ${name(podium[1])}, 3.º ${name(podium[2])}.`,
          argLines.length ? `${argLines.join(" y ")}.` : "",
          withLeader && leader && RACE_KINDS.has(session.kind) && series.scope === "nacional"
            ? `Campeonato: lidera ${leader.driver}${leader.points != null ? ` (${fmtPoints(leader.points)} pts)` : ""}.`
            : "",
        ].filter(Boolean);
        const text = `${parts.join(" ")}\n${url}`;
        if (fits(text)) return { text, link: url };
      }
    }
  }
  return null;
}

function resultDrafts({ events, season, manual, now, catalog, enviados }) {
  const nowMs = Date.parse(now);
  const { byId, tierOf } = tiers(catalog.series, catalog.drivers);
  const find = driverIndex(catalog.drivers);
  const out = [];
  for (const event of events) {
    if (tierOf(event.seriesId) > 2) continue;
    for (const session of event.sessions) {
      // El provisorio y el oficial son dos borradores distintos: si el provisorio ya salió, el oficial no queda tapado por su clave.
      // Si el oficial no cambió nada del podio provisorio, no se repite la noticia.
      const provisional = isProvisional(session);
      const key = provisional ? `sesion:${session.id}:provisorio` : `sesion:${session.id}`;
      if (enviados[key] || !COMPETITIVE.has(session.kind) || !session.results?.length) continue;
      if (!provisional && enviados[`sesion:${session.id}:provisorio`] && session.resultsSource?.provisional && session.resultsSource.note === "Oficial") continue;
      const end = endOf(session);
      if (nowMs < end || nowMs - end > RESULT_WINDOW_MS) continue;
      const argentines = session.results
        .map((row) => ({ row, driver: find(row.driver) }))
        .filter(({ driver }) => driver && driver.seriesId === event.seriesId && byId[driver.seriesId]?.scope === "internacional");
      const draft = sessionDraft({
        event,
        session,
        series: byId[event.seriesId],
        leader: freshLeader(season, manual, events, event.seriesId),
        argentines,
      });
      if (draft) out.push({ key, kind: "resultado", eventId: event.id, at: end, ...draft });
    }
  }
  return out.sort((a, b) => a.at - b.at).slice(0, MAX_RESULTS_PER_RUN);
}

// ——— A qué hora corre ———

/** "Dónde verlo": las transmisiones (TV y streaming) de la categoría. Si no hay datos verificados, null y el borrador no lo menciona. */
function whereToWatch(broadcasts, seriesId) {
  const names = (broadcasts?.[seriesId]?.items ?? []).filter((i) => i.kind !== "timing").map((i) => i.name);
  if (!names.length) return null;
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} y ${names.at(-1)}`;
}

const SESSION_NOUN = { clasificacion: "clasificación", sprint: "sprint", carrera: "carrera", final: "final" };
const SESSION_PHRASE = { clasificacion: "clasifica", sprint: "corre el sprint", carrera: "corre la carrera", final: "corre la final" };
const SESSION_PHRASE_PLURAL = { clasificacion: "clasifican", sprint: "corren el sprint", carrera: "corren la carrera", final: "corren la final" };

/** Hora argentina (0-23) de un instante. */
const hourOf = (iso) => Number(timeFmt.format(new Date(iso)).slice(0, 2));
/** El borrador sale desde las 08:00 del día de la sesión. Las que empiezan antes de las 09:00 (la F1 en Asia) salen desde las 20:00 de la víspera. */
const EARLY_START_HOUR = 9;

function timeDrafts({ events, now, catalog, enviados }) {
  const nowMs = Date.parse(now);
  const today = dayKey(now);
  const tomorrow = dayKey(new Date(nowMs + DAY).toISOString());
  const hour = hourOf(now);
  const abroad = catalog.drivers.filter((d) => d.team && catalog.series.find((s) => s.id === d.seriesId)?.scope === "internacional");
  const out = [];
  for (const event of events) {
    const mine = abroad.filter((d) => d.seriesId === event.seriesId);
    if (!mine.length) continue;
    // Sesiones con hora confirmada que todavía no empezaron (un "hoy a las 05:00" a las 08:00 no sirve).
    const upcoming = event.sessions.filter((s) => COMPETITIVE.has(s.kind) && s.timeKnown !== false && Date.parse(s.start) > nowMs);
    for (const [day, when, open] of [
      [today, "Hoy", (s) => hour >= 8 && dayKey(s.start) === today],
      [tomorrow, "Mañana", (s) => hour >= 20 && hourOf(s.start) < EARLY_START_HOUR && dayKey(s.start) === tomorrow],
    ]) {
      const key = `horario:${event.id}:${day}`;
      const sessions = upcoming.filter(open).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
      if (enviados[key] || !sessions.length) continue;
      const who = mine.length === 1 ? surname(mine[0].name) : mine.map((d) => surname(d.name)).join(" y ");
      const url = mine.length === 1 ? `${BASE_URL}/horarios/${mine[0].slug}` : `${BASE_URL}/eventos/${event.id}`;
      const watch = whereToWatch(catalog.broadcasts, event.seriesId);
      const place = event.circuit?.city ? ` en ${event.circuit.city}` : "";
      const base =
        sessions.length === 1
          ? `⏰ ${when} a las ${hhmm(sessions[0].start)} (hora argentina) ${who} ${(mine.length === 1 ? SESSION_PHRASE : SESSION_PHRASE_PLURAL)[sessions[0].kind]}${place}.`
          : `⏰ ${when}, en hora argentina, ${who} ${mine.length === 1 ? "corre" : "corren"}${place}: ${sessions.map((s) => `${hhmm(s.start)} ${SESSION_NOUN[s.kind]}`).join(" y ")}.`;
      const text = [...(watch ? [`${base} Dónde verlo: ${watch}.
${url}`] : []), `${base}
${url}`].find(fits);
      if (text) out.push({ key, kind: "horario", eventId: event.id, at: Date.parse(sessions[0].start), text, link: url });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

// ——— Agenda del fin de semana ———

/** Viernes a partir de las 09:00 (hora argentina), todo el día: si la corrida de las 09:00 no salió, la siguiente lo manda igual. */
const isAgendaTime = (now) => weekday(now) === "viernes" && Number(timeFmt.format(new Date(now)).slice(0, 2)) >= 9;

function weekendDays(now) {
  const friday = Date.parse(`${dayKey(now)}T12:00:00-03:00`);
  return [0, 1, 2].map((k) => dayKey(new Date(friday + k * DAY).toISOString()));
}

/** Sesión principal del evento: la última carrera/final con hora, o la última competitiva sin hora. */
function mainSession(event) {
  const races = event.sessions.filter((s) => s.kind === "final" || s.kind === "carrera");
  return races.at(-1) ?? event.sessions.filter((s) => s.kind === "sprint").at(-1) ?? event.sessions.at(-1);
}

function agendaDraft({ events, now, catalog, enviados }) {
  if (!isAgendaTime(now)) return null;
  const days = weekendDays(now);
  const key = `agenda:${days[0]}`;
  if (enviados[key]) return null;
  const { byId, tierOf } = tiers(catalog.series, catalog.drivers);
  const items = events
    .filter((e) => byId[e.seriesId] && tierOf(e.seriesId) <= 2 && dateStatus(e).status === "confirmed")
    .map((e) => ({ e, main: mainSession(e) }))
    .filter(({ main }) => main && days.includes(dayKey(main.start)))
    // La hora manda; entre dos a la misma hora, primero las argentinas (misma regla que la home). Sin hora, al final de su día.
    .sort((a, b) => Date.parse(a.main.start) - Date.parse(b.main.start) || tierOf(a.e.seriesId) - tierOf(b.e.seriesId));
  if (!items.length) return null;
  const line = ({ e, main }) => {
    const place = e.circuit?.city ? ` (${e.circuit.city})` : "";
    const time = main.timeKnown === false ? "hora a confirmar" : hhmm(main.start);
    return `${shortDay(main.start)} ${time} · ${byId[e.seriesId].short}${place}`;
  };
  const head = "🗓️ El finde en el automovilismo argentino (hora argentina):";
  const url = `${BASE_URL}/`;
  const compose = (n) => {
    const shown = items.slice(0, n).map(line);
    const more = n < items.length ? `\nY más en ${url}` : `\n${url}`;
    return `${head}\n${shown.join("\n")}${more}`;
  };
  // El corte se hace por el final de la lista ordenada, que es lo menos prioritario (más tarde, o igual de tarde y menos argentino).
  let n = items.length;
  while (n > 0 && !fits(compose(n))) n--;
  if (n === 0) return null;
  return { key, kind: "agenda", at: Date.parse(now), text: compose(n), link: url, image: `${BASE_URL}/placa/imagen` };
}

// ——— Así quedó el finde ———

/** Una carga manual no es una fuente automática: el resumen del finde sólo cuenta con lo que sincroniza solo. */
const isAutoSource = (event) => !/^carga manual/i.test(event.source ?? "");
const classified = (r) => !r.positionText || /^\d+$/.test(r.positionText);
/** La carrera o final principal, si ya se corrió; a diferencia de `mainSession` (agenda), no cae a una sesión clasificatoria. */
const mainRace = (event) => event.sessions.filter((s) => RACE_KINDS.has(s.kind)).at(-1);

/**
 * Domingo del fin de semana que se resume: hoy si ya es domingo desde las 20:00, o ayer si es lunes antes del
 * mediodía (para no perderse la última carrera si terminó pasada la medianoche). Fuera de esa ventana, null.
 */
function summarySunday(now) {
  const wd = weekday(now);
  const hour = hourOf(now);
  if (wd === "domingo" && hour >= 20) return dayKey(now);
  if (wd === "lunes" && hour < 12) return dayKey(new Date(Date.parse(now) - DAY).toISOString());
  return null;
}

/** Viernes, sábado y domingo del fin de semana que terminó ese domingo, en formato dayKey. */
const summaryDays = (sunday) => [2, 1, 0].map((k) => dayKey(new Date(Date.parse(`${sunday}T00:00:00-03:00`) - k * DAY).toISOString()));

function summaryDraft({ events, now, catalog, enviados }) {
  const sunday = summarySunday(now);
  if (!sunday) return null;
  const key = `resumen:${sunday}`;
  if (enviados[key]) return null;
  const days = summaryDays(sunday);
  const { byId, tierOf } = tiers(catalog.series, catalog.drivers);
  const find = driverIndex(catalog.drivers);

  const items = events
    .filter((e) => byId[e.seriesId] && isAutoSource(e))
    .map((e) => ({ e, main: mainRace(e) }))
    .filter(({ main }) => main && days.includes(dayKey(main.start)) && main.results?.length)
    .map(({ e, main }) => {
      const winner = main.results.find((r) => r.pos === 1 && classified(r));
      if (!winner) return null;
      // Los argentinos que corren afuera (tier 2): su posición, salvo que ya sean el ganador (evita repetirlo).
      const argentines =
        tierOf(e.seriesId) === 2
          ? main.results
              .map((row) => ({ row, driver: find(row.driver) }))
              .filter(({ driver, row }) => driver && driver.seriesId === e.seriesId && row.pos !== 1)
          : [];
      return { e, main, winner: winner.driver, argentines };
    })
    .filter(Boolean)
    // La hora manda; entre dos a la misma hora, primero las argentinas (misma regla que la home).
    .sort((a, b) => Date.parse(a.main.start) - Date.parse(b.main.start) || tierOf(a.e.seriesId) - tierOf(b.e.seriesId));
  if (!items.length) return null;

  const line = ({ e, main, winner, argentines }) => {
    // Cuando la fecha tiene más de una sesión del mismo tipo (dos "Carrera principal"), se aclara cuál fue.
    const sameKindCount = e.sessions.filter((s) => s.kind === main.kind).length;
    const label = sameKindCount > 1 ? nombreVisibleSesion(main, e.sessions) : null;
    const argNote = argentines.map(({ driver, row }) => `${surname(driver.name)} ${outcome(row, main.kind)}`).join(" y ");
    return `${byId[e.seriesId].short}${label ? ` (${label})` : ""}: ganó ${winner}${provisionalSuffix(main)}${argNote ? `; ${argNote}` : ""}`;
  };
  const head = "🏁 Así quedó el finde (hora argentina):";
  const url = `${BASE_URL}/`;
  const compose = (n) => {
    const shown = items.slice(0, n).map(line);
    const more = n < items.length ? `\ny más en ${url}` : `\n${url}`;
    return `${head}\n${shown.join("\n")}${more}`;
  };
  // El corte se hace por el final de la lista ordenada, que es lo menos prioritario (misma regla que la agenda).
  let n = items.length;
  while (n > 0 && !fits(compose(n))) n--;
  if (n === 0) return null;
  return { key, kind: "resumen", at: Date.parse(now), text: compose(n), link: url };
}

// ——— Punto de entrada ———

/**
 * Borradores nuevos para este momento.
 * `season`: la temporada cruda (events, standings, meta). `enviados`: { clave: fecha } de lo que ya se mandó.
 * `catalog`: { drivers, series, broadcasts } (los datos estáticos del sitio). `manual`: manual-overrides.json (fechas y tablas cargadas a mano).
 */
export function borradores(season, now, { enviados = {}, catalog, manual = {}, events } = {}) {
  const evs = events ?? season.events;
  const ctx = { events: evs, season, manual, now, catalog, enviados };
  const agenda = agendaDraft(ctx);
  const resumen = summaryDraft(ctx);
  return [...(agenda ? [agenda] : []), ...(resumen ? [resumen] : []), ...timeDrafts(ctx), ...resultDrafts(ctx)];
}
