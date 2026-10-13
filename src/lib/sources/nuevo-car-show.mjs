// Nuevo Car Show 2026 (ACAPSFE, Santa Fe) desde el sitio oficial nuevocarshow.com.ar (WordPress): calendario de las 10 fechas y, de cada
// clase (Clase 1, Clase 2, Clase 3, TC 4000 SS y Fiat 600 TS), los resultados de cada sesión, que la organización sube como PDF de
// cronometraje (Orbits / MyLaps). Cada PDF trae la hora real de la sesión. Sin Speedhive ni Wikipedia: no hay otra fuente.
//
// Modelo (igual que Córdoba Pista y el TN): una categoría (`nuevo-car-show`), una fecha por evento y las sesiones de todas las clases en el
// mismo evento; cada sesión lleva `classId` y el nombre de la clase ("Final Clase 3"). El campeonato de cada clase sale de estos resultados
// (nuevo-car-show-campeonato.mjs) y sólo se publica si reproduce la tabla oficial.
//
// El sitio rechaza los pedidos sin navegador (403): hay que mandar un User-Agent de navegador, Accept y Accept-Language. Desde octubre
// también rechaza versiones viejas de Chrome (la 124 daba 403 y la 141 da 200): si vuelve el 403, probar con la versión actual.
import { dateOnly } from "./common.mjs";
import { CLASES, claseById, SERIES_ID } from "./nuevo-car-show-clases.mjs";
import { campeonatosDeNuevoCarShow, parseTablaOficial, slugOficial } from "./nuevo-car-show-campeonato.mjs";
import { claveDeNombre, nombresDeClase } from "./nuevo-car-show-nombres.mjs";
import { leerPlanilla } from "./nuevo-car-show-planilla.mjs";
import { mismoNombre } from "./cordoba-pista-nombres.mjs";
import { belongsToEvent } from "./plausible.mjs";

export const SITE = "https://nuevocarshow.com.ar";
export const NCS_SOURCE = "Nuevo Car Show · planillas de cronometraje";
const TIME_SOURCE = "Nuevo Car Show (planilla de tiempos oficial)";
const EVENT_SOURCE = "nuevocarshow.com.ar (calendario y planillas de cronometraje)";
export const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/json,application/pdf;q=0.9,*/*;q=0.8",
  "Accept-Language": "es-AR,es;q=0.9",
};
const YEAR = 2026;
const DAY = 86400000;
const DURATION = { practica: 20, clasificacion: 20, serie: 15, final: 30 };
const SLUGS = { clase1: "clase-1", clase2: "clase-2", clase3: "clase-3", tc4000: "tc-4000", fiat600: "fiat-600" };
const CLASES_ORDEN = Object.fromEntries(CLASES.map((c, i) => [c.id, i]));
const KIND_ORDEN = { practica: 0, clasificacion: 1, serie: 2, final: 3 };

const fold = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const text = (html) =>
  String(html)
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#8211;|&ndash;/g, "-")
    .replace(/&#8217;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();

// Sedes: como las escribe el calendario del sitio → circuito, con las mismas ciudades que usa el resto del sitio (para "Corren el mismo finde").
const SEDES = {
  "san jorge": { name: "Parque de la Velocidad", city: "San Jorge", country: "Argentina", flag: "AR", province: "Santa Fe" },
  parana: { name: "Autódromo Ciudad de Paraná", city: "Paraná", country: "Argentina", flag: "AR", province: "Entre Ríos" },
  "san nicolas": { name: "Autódromo San Nicolás Ciudad", city: "San Nicolás", country: "Argentina", flag: "AR", province: "Buenos Aires" },
  rafaela: { name: "Autódromo Ciudad de Rafaela", city: "Rafaela", country: "Argentina", flag: "AR", province: "Santa Fe" },
  termas: { name: "Autódromo Internacional de Termas de Río Hondo", city: "Termas de Río Hondo", country: "Argentina", flag: "AR", province: "Santiago del Estero" },
  concordia: { name: "Autódromo Ciudad de Concordia", city: "Concordia", country: "Argentina", flag: "AR", province: "Entre Ríos" },
};
const A_CONFIRMAR = { name: "A confirmar", city: "A confirmar", country: "Argentina", flag: "AR", province: "" };
const sedeDe = (venue) => {
  const k = fold(venue).replace(/ de rio hondo/, "").trim();
  return SEDES[k] ?? A_CONFIRMAR;
};

/** Calendario 2026 verificado en nuevocarshow.com.ar/calendario/ el 4/10/2026 (día de la carrera y sede), por si el sitio no se puede leer y no hay nada guardado. */
export const CALENDARIO_ESTATICO = [
  [1, "03-08", "San Jorge"], [2, "04-19", "Paraná"], [3, "05-17", "San Nicolás"], [4, "06-21", "San Jorge"], [5, "07-12", "Rafaela"],
  [6, "08-16", "Termas"], [7, "09-13", "San Nicolás"], [8, "10-04", "San Jorge"], [9, "11-08", "A Confirmar"], [10, "12-06", "Rafaela"],
].map(([round, md, venue]) => ({ round, day: `${YEAR}-${md}`, venue }));

/**
 * Calendario de la página /calendario/ (Elementor): cada fecha son cuatro títulos seguidos — "FECHA", "01", "08-03", "San Jorge". La fecha
 * que figura es la del domingo (día de la carrera). → [{ round, day: "2026-03-08", venue }]
 */
export function parseCalendario(html) {
  const titulos = [...String(html).matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/g)].map((m) => text(m[1]));
  const out = [];
  for (let i = 0; i + 3 < titulos.length; i++) {
    const m = titulos[i + 2].match(/^(\d{1,2})-(\d{1,2})$/);
    if (titulos[i].toUpperCase() !== "FECHA" || !/^\d{1,2}$/.test(titulos[i + 1]) || !m) continue;
    out.push({ round: Number(titulos[i + 1]), day: `${YEAR}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`, venue: titulos[i + 3] });
  }
  return out;
}

/** Sede confirmada por una noticia ("LA FECHA 9 DEL CAMPEONATO TIENE SEDE CONFIRMADA: EL NUEVO CAR SHOW VUELVE A CONCORDIA") → { round, venue }. */
export function sedeDeNoticia(title) {
  const t = text(title);
  const m = t.match(/FECHA (\d+)\b.*SEDE CONFIRMADA.*VUELVE A ([A-ZÁÉÍÓÚÑ ]+)$/i);
  return m ? { round: Number(m[1]), venue: m[2].trim() } : null;
}

/**
 * Página de resultados de una clase: un acordeón por fecha ("FECHA 6 - Termas de Río Hondo 16/08") con un PDF por sesión.
 * → [{ round, docs: [{ label, url }] }]. Las fechas todavía sin resultados figuran con la lista vacía.
 */
export function parseResultados(html) {
  const out = [];
  for (const d of String(html).split("<details").slice(1)) {
    const titulo = text(d.match(/e-n-accordion-item-title-text">([\s\S]*?)<\/div>/)?.[1] ?? "");
    const round = Number(titulo.match(/FECHA\s+(\d+)/i)?.[1]);
    if (!round) continue;
    const docs = [...d.matchAll(/<h5[^>]*>([\s\S]*?)<\/h5>[\s\S]*?href="([^"]+\.pdf)"/gi)].map((m) => ({ label: text(m[1]), url: m[2] }));
    out.push({ round, docs });
  }
  return out;
}

/** Rótulo de un PDF → qué sesión es. null si no es una sesión que mostramos (los generales de entrenamientos, los invitados). */
export function tipoDeDocumento(label) {
  const t = fold(label);
  if (/invitad/.test(t)) return null; // los invitados no suman puntos: la planilla oficial es la de titulares
  const n = Number(t.match(/\b(\d)\s*(?:ra|da|er|do|ta|to|ro)?\b/)?.[1]) || null;
  if (/millas/.test(t)) return /parte\s*1/.test(t) ? { kind: "final", key: "100m-parte1", name: "100 Millas · Parte 1" } : { kind: "final", key: "100m-parte2", name: "100 Millas · Final" };
  if (/general|\bgral\b/.test(t)) return /clasific/.test(t) ? { kind: "clasificacion", key: "clasi-general", name: "Clasificación general", general: true } : null;
  if (/clasific/.test(t)) return n ? { kind: "clasificacion", key: `clasi${n}`, name: `${n}ª Clasificación` } : { kind: "clasificacion", key: "clasi", name: "Clasificación" };
  if (/serie/.test(t)) return { kind: "serie", key: `serie${n ?? 1}`, name: `${n ?? 1}ª Serie` };
  if (/final/.test(t)) return n ? { kind: "final", key: `final${n}`, name: `Final ${n}` } : { kind: "final", key: "final", name: "Final" };
  if (/tanda/.test(t)) return { kind: "practica", key: `tanda${n ?? 1}`, name: `${n ?? 1}ª Tanda libre` };
  if (/entrenamiento/.test(t)) {
    const dia = { sabado: "sábado", domingo: "domingo", viernes: "viernes" }[t.match(/sabado|domingo|viernes/)?.[0]];
    if (/libre/.test(t)) return { kind: "practica", key: `entlibre${n ?? 1}`, name: `Entrenamiento libre ${n ?? 1}` };
    if (n) return { kind: "practica", key: `ent${n}`, name: `${n}° Entrenamiento` };
    return { kind: "practica", key: dia ? `ent-${fold(dia)}` : "ent", name: dia ? `Entrenamiento del ${dia}` : "Entrenamiento" };
  }
  return null;
}

/** Duración de la sesión según su encabezado ("Carrera (30:00 o 12 Vueltas)", "Práctica (10:00 Tiempo)"); null si no figura. */
export function duracionDe(encabezado) {
  const m = encabezado.join(" ").match(/\((\d+):(\d+)\s*(?:Tiempo|Time|o |or )/i);
  return m ? Math.max(1, Math.round(Number(m[1]) + Number(m[2]) / 60)) : null;
}

const pad = (n) => String(n).padStart(2, "0");
const isoDay = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

/**
 * Hora de la sesión desde la fecha que imprime la planilla. La fecha 1 escribe mes/día (formato estadounidense, con AM/PM) y el resto día/mes:
 * se toma la lectura que cae dentro del fin de semana de la fecha (de 4 días antes del domingo a 1 día después).
 */
export function inicioDe(fechaHora, raceDay) {
  if (!fechaHora) return null;
  const race = Date.parse(`${raceDay}T12:00:00Z`);
  const lecturas = fechaHora.ampm ? [[fechaHora.b, fechaHora.a]] : [[fechaHora.a, fechaHora.b], [fechaHora.b, fechaHora.a]];
  for (const [d, m] of lecturas) {
    const t = Date.parse(`${isoDay(fechaHora.anio, m, d)}T12:00:00Z`);
    if (Number.isFinite(t) && t >= race - 4 * DAY && t <= race + DAY) return `${isoDay(fechaHora.anio, m, d)}T${pad(fechaHora.hh)}:${pad(fechaHora.mm)}:00-03:00`;
  }
  return null;
}

const STATUS = { NE: "No largó", EX: "Excluido", NC: "No clasificado" };
const lapsBehind = (t) => {
  const m = String(t).match(/^(\d+)\s*(?:vueltas?|laps?)$/i);
  return m ? Number(m[1]) : null;
};
const secondsOf = (t) => {
  const m = String(t).match(/^(?:(\d+):)?(\d{1,2})[.,](\d{1,3})$/);
  return m ? Number(m[1] ?? 0) * 60 + Number(m[2]) + Number(`0.${m[3]}`) : null;
};
const clock = (sec) => {
  const m = Math.floor(sec / 60);
  const rest = (sec - m * 60).toFixed(3).padStart(6, "0");
  return m ? `${m}:${rest}` : rest;
};

/** Filas de una planilla → filas nuestras. `nombre(raw)` resuelve el nombre del piloto. */
export function filasDe(filas, kind, nombre) {
  const carrera = kind === "serie" || kind === "final";
  const lider = filas.find((f) => !STATUS[f.posText]);
  return filas.map((f, i) => {
    const estado = STATUS[f.posText] ?? (f.nc ? STATUS.NC : undefined);
    const positionText = STATUS[f.posText] ? f.posText : f.nc ? "NC" : undefined;
    const tiempo = carrera ? f.total : f.best;
    const atraso = lapsBehind(f.gap1);
    let gap = "";
    if (f === lider) gap = tiempo;
    else if (atraso) gap = `+${atraso} ${atraso === 1 ? "vuelta" : "vueltas"}`;
    else if (/^\d/.test(f.gap1)) gap = `+${f.gap1}`;
    else if (!carrera && secondsOf(f.best) !== null && secondsOf(lider?.best) !== null) gap = `+${clock(secondsOf(f.best) - secondsOf(lider.best))}`;
    const laps = Number(f.laps);
    return {
      pos: i + 1,
      ...(positionText ? { positionText, status: estado } : !tiempo ? { status: carrera ? "No clasificado" : "Sin tiempo" } : {}),
      number: f.number,
      driver: nombre(f.name),
      team: f.make,
      gap: STATUS[f.posText] ? "" : gap,
      ...(carrera && Number.isFinite(laps) && f.laps ? { laps } : {}),
    };
  });
}

/** Ids de las fechas que la versión anterior ya conocía (para no volver a pedir lo viejo). */
const previasDe = (previous) => new Map((previous.events ?? []).filter((e) => e.seriesId === SERIES_ID).map((e) => [e.round, e]));

/** De varias entradas con el mismo rótulo (el PDF original y el rectificado), la rectificada; si no, la primera de la lista (la más nueva). */
function elegir(docs) {
  const porClave = new Map();
  for (const d of docs) {
    const tipo = tipoDeDocumento(d.label);
    if (!tipo) continue;
    const previo = porClave.get(tipo.key);
    if (!previo || (/rect/i.test(d.url) && !/rect/i.test(previo.url))) porClave.set(tipo.key, { ...d, tipo });
  }
  return [...porClave.values()];
}

/**
 * Nuevo Car Show: calendario y resultados por sesión y clase. `windowDays`: las fechas más viejas que eso no se vuelven a pedir si la versión
 * anterior ya las tiene (nunca se achican). `now` es para las pruebas.
 */
export async function nuevoCarShowSeason(io, previous = { events: [], standings: {}, meta: {} }, { windowDays = 21, delayMs = 250, now = new Date() } = {}) {
  const nowMs = now.getTime();
  const errors = [];
  const opts = (revalidate) => ({ headers: HEADERS, revalidate });

  // 1. Calendario (obligatorio) y sede confirmada por noticia (opcional).
  let calendario;
  let calendarioEstatico = false;
  try {
    const pagina = await io.json(`${SITE}/wp-json/wp/v2/pages?slug=calendario&_fields=content,modified`, opts(600));
    calendario = parseCalendario(pagina?.[0]?.content?.rendered ?? "");
    if (calendario.length < 8) throw new Error(`el calendario del sitio trajo ${calendario.length} fechas (se esperaban 10)`);
  } catch (error) {
    // El sitio puede bloquear las IP de los centros de datos (GitHub Actions): con datos anteriores, la fuente falla y season.mjs los conserva
    // (queda en failures); sin nada guardado, se usa el calendario verificado a mano para que la categoría igual tenga sus fechas.
    if ((previous.events ?? []).some((e) => e.seriesId === SERIES_ID)) throw error;
    calendario = CALENDARIO_ESTATICO;
    calendarioEstatico = true;
    errors.push(`calendario: ${error.message} (se usa el calendario 2026 embebido, sólo con fechas)`);
  }
  const sedes = new Map(calendario.map((c) => [c.round, c.venue]));
  try {
    const posts = await io.json(`${SITE}/wp-json/wp/v2/posts?search=${encodeURIComponent("sede confirmada")}&per_page=10&_fields=title`, opts(600));
    for (const p of posts ?? []) {
      const s = sedeDeNoticia(p.title?.rendered ?? "");
      if (s && SEDES[fold(s.venue)] && !SEDES[fold(sedes.get(s.round) ?? "")]) sedes.set(s.round, s.venue);
    }
  } catch {
    // las noticias sólo completan una sede a confirmar: sin ellas se muestra "A confirmar"
  }

  // 2. Páginas de resultados de las cinco clases.
  const docs = new Map(); // `${round}|${classId}` → docs
  const publicadas = new Set(); // rondas con algún documento
  for (const clase of CLASES) {
    try {
      const html = await io.json(`${SITE}/wp-json/wp/v2/pages?slug=resultados-${SLUGS[clase.id]}-2026&_fields=content,modified`, opts(300));
      const fechas = parseResultados(html?.[0]?.content?.rendered ?? "");
      if (fechas.length < 6) throw new Error(`la página de resultados trajo ${fechas.length} fechas`);
      for (const f of fechas) {
        docs.set(`${f.round}|${clase.id}`, f.docs);
        if (f.docs.length) publicadas.add(f.round);
      }
    } catch (error) {
      errors.push(`resultados ${clase.short}: ${error.message}`);
    }
  }

  // 2b. Tablas oficiales del campeonato: no se publican, sirven para verificar el cálculo (nuevo-car-show-campeonato.mjs).
  const oficiales = {};
  for (const clase of CLASES) {
    try {
      const pagina = await io.json(`${SITE}/wp-json/wp/v2/pages?slug=${slugOficial(clase.id)}&_fields=content,modified`, opts(300));
      oficiales[clase.id] = parseTablaOficial(pagina?.[0]?.content?.rendered ?? "");
    } catch (error) {
      oficiales[clase.id] = null;
      errors.push(`tabla oficial ${clase.short}: ${error.message}`);
    }
  }

  // 3. Planillas de las fechas pedidas.
  const previas = previasDe(previous);
  const reutilizable = new Map(); // `${id}|${url}` → sesión previa con resultados
  const urlsLeidas = new Set(); // direcciones de planillas que la versión anterior ya leyó
  for (const e of previas.values()) for (const s of e.sessions) if (s.resultsSource?.url && s.results?.length) {
    reutilizable.set(`${s.id}|${s.resultsSource.url}`, s);
    urlsLeidas.add(s.resultsSource.url);
  }
  const leidas = []; // { round, classId, tipo, url, label, planilla | previa }
  let pdfs = 0;
  for (const cal of calendario) {
    const carrera = Date.parse(`${cal.day}T12:00:00Z`);
    const reciente = carrera >= nowMs - (windowDays + 3) * DAY;
    for (const clase of CLASES) {
      const lista = elegir(docs.get(`${cal.round}|${clase.id}`) ?? []);
      const vistos = new Map();
      for (const d of lista) vistos.set(d.url, [...(vistos.get(d.url) ?? []), d]);
      for (const d of lista) {
        const id = sessionId(`${SERIES_ID}-${YEAR}-${cal.round}`, clase.id, d.tipo.key);
        const previa = reutilizable.get(`${id}|${d.url}`);
        if (previa) {
          leidas.push({ round: cal.round, classId: clase.id, tipo: d.tipo, url: d.url, previa });
          continue;
        }
        if (vistos.get(d.url).length > 1 && urlsLeidas.has(d.url)) continue; // archivo repetido que ya se resolvió a qué rótulo corresponde
        const yaTenia = previas.get(cal.round)?.sessions.some((s) => s.classId === clase.id && s.results?.length);
        if (!reciente && yaTenia) continue; // fuera de la ventana: se conserva lo de antes
        await io.sleep(delayMs);
        try {
          const planilla = leerPlanilla(Buffer.from(await io.bytes(d.url, { revalidate: 300, headers: HEADERS })));
          pdfs++;
          if (!planilla.completa) throw new Error("PDF sin tabla de resultados");
          leidas.push({ round: cal.round, classId: clase.id, tipo: d.tipo, url: d.url, planilla, compartido: vistos.get(d.url).length > 1 });
        } catch (error) {
          errors.push(`${clase.short} fecha ${cal.round} ${d.label}: ${error.message}`);
        }
      }
    }
  }

  // 4. Nombres: un solo criterio por clase, con los ya guardados como referencia (el nombre de un piloto no cambia entre corridas).
  const nombres = {};
  for (const clase of CLASES) {
    const crudos = leidas.filter((l) => l.classId === clase.id && l.planilla).flatMap((l) => l.planilla.filas.map((f) => f.name));
    const visibles = nombresDeClase(crudos);
    const guardados = [...previas.values()].flatMap((e) => e.sessions.filter((s) => s.classId === clase.id).flatMap((s) => (s.results ?? []).map((r) => r.driver)));
    nombres[clase.id] = (raw) => {
      const v = visibles.get(raw) ?? raw;
      const igual = guardados.find((g) => claveDeNombre(g) === claveDeNombre(v)) ?? guardados.find((g) => !v.includes("/") && !g.includes("/") && mismoNombre(g, v));
      return igual ?? v;
    };
  }

  // 5. Eventos.
  const events = [];
  for (const cal of calendario) {
    const id = `${SERIES_ID}-${YEAR}-${cal.round}`;
    const circuit = sedeDe(sedes.get(cal.round) ?? cal.venue);
    const sessions = [];
    const delRound = leidas.filter((l) => l.round === cal.round);
    for (const l of delRound) {
      const clase = claseById[l.classId];
      let sesion;
      if (l.previa) {
        sesion = { ...l.previa };
      } else {
        const { planilla, tipo } = l;
        const start = inicioDe(planilla.fechaHora, cal.day);
        // Dos rótulos que apuntan al mismo PDF (el sitio repite un archivo): sólo vale el que coincide con el número que imprime la planilla.
        const impreso = planilla.encabezado.join(" ").match(/ENTRENAMIENTO\s+(\d)/i)?.[1];
        if (l.compartido && impreso && tipo.key !== `ent${impreso}`) continue;
        sesion = {
          id: sessionId(id, clase.id, tipo.key),
          classId: clase.id,
          kind: tipo.kind,
          name: `${tipo.name} ${clase.short}`,
          start: start ?? dateOnly(Number(cal.day.slice(0, 4)), Number(cal.day.slice(5, 7)), Number(cal.day.slice(8, 10))),
          timeKnown: Boolean(start),
          ...(start ? { timeStatus: "confirmed", timeSources: [{ name: TIME_SOURCE, url: l.url, start }] } : {}),
          durationMin: duracionDe(planilla.encabezado) ?? DURATION[tipo.kind],
          results: filasDe(planilla.filas, tipo.kind, nombres[clase.id]),
          resultsSource: { name: NCS_SOURCE, url: l.url },
          ...(tipo.general ? { general: true } : {}),
        };
      }
      sessions.push(sesion);
    }
    // La clasificación general no trae hora propia: va al final de las clasificaciones de esa clase.
    for (const s of sessions.filter((x) => x.general)) {
      const otras = sessions.filter((x) => x.classId === s.classId && x.kind === "clasificacion" && !x.general && x.timeKnown);
      if (otras.length) s.start = otras.map((x) => x.start).sort().at(-1);
      s.timeKnown = false;
      delete s.general;
    }
    for (const s of sessions) delete s.general;
    // Series con una sola serie: "Serie" a secas.
    for (const clase of CLASES) {
      const series = sessions.filter((s) => s.classId === clase.id && s.kind === "serie");
      if (series.length === 1) series[0].name = `Serie ${clase.short}`;
    }
    // Una clase sin final en esta fecha: la final figura con el día de la carrera, sin hora (la hora real sólo la dice el PDF).
    for (const clase of CLASES) {
      if (sessions.some((s) => s.classId === clase.id && s.kind === "final")) continue;
      sessions.push({
        id: sessionId(id, clase.id, "final"),
        classId: clase.id,
        kind: "final",
        name: `Final ${clase.short}`,
        start: dateOnly(Number(cal.day.slice(0, 4)), Number(cal.day.slice(5, 7)), Number(cal.day.slice(8, 10))),
        timeKnown: false,
        durationMin: DURATION.final,
      });
    }
    sessions.sort(ordenar);
    events.push({ id, seriesId: SERIES_ID, round: cal.round, name: `Fecha ${cal.round} · ${circuit.city}`, circuit, sessions, source: EVENT_SOURCE });
  }

  // 6. Nunca se achica: lo que la versión anterior tenía y hoy no llegó se conserva.
  const finales = events.map((e) => carryOver(e, previas.get(e.round)));
  const campeonatos = campeonatosDeNuevoCarShow(finales, { oficiales, previous: previous.meta?.[SERIES_ID]?.clases, now });
  return {
    events: finales,
    standings: {},
    meta: { [SERIES_ID]: { clases: campeonatos }, nuevoCarShow: { events: finales.length, pdfs, calendarioEstatico, rounds: [...publicadas].sort((a, b) => a - b), errors } },
  };
}

const sessionId = (eventId, classId, key) => `${eventId}-${classId}-${key}`;
const esGeneral = (s) => (/general/i.test(s.name) ? 1 : 0);
const ordenar = (a, b) => Date.parse(a.start) - Date.parse(b.start) || (CLASES_ORDEN[a.classId] ?? 0) - (CLASES_ORDEN[b.classId] ?? 0) || KIND_ORDEN[a.kind] - KIND_ORDEN[b.kind] || esGeneral(a) - esGeneral(b) || a.id.localeCompare(b.id);

/**
 * Arrastra a una fecha lo que la versión anterior ya tenía y la de hoy no trae: sesiones o resultados que el sitio dejó de publicar, o
 * fechas fuera de la ventana. Nada de lo que ya se mostró desaparece por un mal día de la fuente ("las fuentes nunca se achican").
 */
export function carryOver(event, old) {
  if (!old) return event;
  const sessions = event.sessions.map((s) => {
    const prev = old.sessions.find((o) => o.id === s.id);
    if (!prev || !belongsToEvent(event, prev)) return s;
    return !s.results?.length && prev.results?.length ? { ...s, ...(prev.timeKnown && !s.timeKnown ? { start: prev.start, timeKnown: true, timeStatus: prev.timeStatus, timeSources: prev.timeSources } : {}), results: prev.results, resultsSource: prev.resultsSource } : s;
  });
  const ids = new Set(sessions.map((s) => s.id));
  for (const o of old.sessions) if (!ids.has(o.id) && o.results?.length && belongsToEvent(event, o)) sessions.push(o);
  return { ...event, sessions: sessions.sort(ordenar) };
}

/** Si el sitio falla por completo: se conserva lo de la versión anterior. */
export function keepPreviousNuevoCarShow(events, previous) {
  const old = (previous.events ?? []).filter((e) => e.seriesId === SERIES_ID);
  const have = new Set(events.map((e) => e.id));
  return [...events, ...old.filter((e) => !have.has(e.id))];
}
