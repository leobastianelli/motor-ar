// Títulos y descripciones para buscadores, armados con "el momento" (src/lib/momento.mjs): lo que dice la pestaña de Google cambia
// igual que la página (antes de la fecha, fin de semana, en pista, con resultados). JavaScript puro, sin Next, para que `npm test` lo cubra.
// El layout agrega " — Fierros" (10 caracteres): el cuerpo apunta a ~56 como máximo (Google corta cerca de los 60 y lo primero que se pierde es la marca).

export const TITULO_MAX = 56;
export const DESCRIPCION_MAX = 158;

const TZ = "America/Argentina/Buenos_Aires";
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const whenFmt = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, weekday: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dayOf = (iso) => dayFmt.format(new Date(iso));

/** "sábado 26 a las 08:00" (con "(hora argentina)" al final del renglón que lo usa); sin hora confirmada, lo dice. */
export function cuando(s) {
  const p = Object.fromEntries(whenFmt.formatToParts(new Date(s.start)).map((x) => [x.type, x.value]));
  return s.timeKnown === false ? `${p.weekday} ${p.day}, horario a confirmar` : `${p.weekday} ${p.day} a las ${p.hour}:${p.minute}`;
}

const esGP = (name) => /^(GP|Gran Premio)\b/i.test(name);
const corto = (name) => name.replace(/^Gran Premio (de |del )?/i, "GP de ");
const apellido = (name) => name.split(" / ").map((p) => p.trim().split(/\s+/).at(-1)).join(" / ");

/** ¿Hay una sesión de este momento hoy (día argentino), corrida o por correr? Sólo entonces un título puede decir "hoy". */
function hayHoy(m, now) {
  return m.modo === "en-pista" || m.sesiones.some((s) => dayOf(s.start) === dayOf(now) && true);
}

/** La primera variante que entra en el largo; si ninguna, la más corta. Las variantes van de la más completa a la más corta. */
export function elegir(variantes, max = TITULO_MAX) {
  const unicas = [...new Set(variantes.filter(Boolean))];
  return unicas.find((t) => t.length <= max) ?? unicas.at(-1);
}

/** Variantes de un nombre de categoría: el completo y el corto ("Turismo Carretera" / "TC"). */
const nombres = (series) => [...new Set([series.name, series.short].filter(Boolean))];

/** Variantes en orden de preferencia: primero la plantilla más completa con cada nombre, después la siguiente. Se acorta el nombre antes que las palabras clave. */
const combinar = (names, plantillas) => plantillas.flatMap((f) => names.map(f));

/** Cómo se nombra una fecha en un título: "GP de Azerbaiyán" en la F1; en el resto, el lugar ("en Calafate"). */
function lugar(evento) {
  const name = evento.name ?? "";
  const ciudad = evento.city;
  return esGP(name) ? { gp: corto(name), en: ciudad ? `en ${ciudad}` : undefined } : { gp: undefined, en: ciudad ? `en ${ciudad}` : name ? `en ${name}` : undefined };
}

const carreraTerminada = (m) => m.fecha?.carrera?.estado === "terminada" || (m.sesiones.length > 0 && m.sesiones.every((s) => s.estado === "terminada"));

/**
 * @param {{ name: string, short?: string }} series
 * @param {number|string} year
 * @param {any} m momentoDeCategoria
 * @param {string} now ISO
 */
export function tituloCategoria(series, year, m, now) {
  const f = m.fecha;
  if (m.modo === "en-pista" && f) {
    const l = lugar(f);
    return elegir(
      combinar(nombres(series), [
        (n) => (l.gp ? `${n} en vivo: ${l.gp}, horarios y resultados` : `${n} en vivo ${l.en}: horarios y resultados`),
        (n) => (l.gp ? `${n} en vivo: ${l.gp}` : `${n} en vivo ${l.en}`),
      ]),
    );
  }
  if (m.modo === "finde" && f) {
    const l = lugar(f);
    const hoy = hayHoy(m, now) ? " hoy" : "";
    return elegir(
      combinar(nombres(series), [
        (n) => (l.gp ? `${n}${hoy}: ${l.gp}, horarios y resultados` : `${n}${hoy} ${l.en}: horarios y resultados`),
        (n) => (l.gp ? `${n}${hoy}: ${l.gp} y horarios` : `${n}${hoy} ${l.en}: horarios`),
      ]),
    );
  }
  if (m.modo === "resultados" && f) {
    const l = lugar(f);
    const de = l.gp ? `del ${l.gp}` : `de ${f.city ?? f.name}`;
    return elegir(combinar(nombres(series), [(n) => `${n}: resultados ${de} y campeonato`, (n) => `${n}: resultados ${de}`, (n) => `${n}: resultados y campeonato ${year}`]));
  }
  return elegir(combinar(nombres(series), [(n) => `${n} ${year}: horarios, resultados y campeonato`, (n) => `${n} ${year}: horarios y resultados`, (n) => `${n} ${year}: horarios`]));
}

/**
 * La página de una fecha. Una fecha terminada habla de resultados; una por venir o en curso, de horarios y dónde ver.
 * @param {{ name: string, short?: string }} series
 * @param {any} evento el evento (nombre y ciudad)
 * @param {number|string} year
 * @param {any} m momentoDeEvento
 */
export function tituloEvento(series, evento, year, m) {
  const l = lugar({ name: evento.name, city: evento.city ?? evento.circuit?.city });
  const cortos = nombres(series).map((n) => (l.gp ? l.gp : `${n} ${l.en}`));
  const ganador = m.fecha?.carrera?.ganador;
  if (carreraTerminada(m)) {
    return elegir(combinar(cortos, [(n) => `${n} ${year}: resultados${ganador ? " y ganador" : ""}`, (n) => `${n}: resultados`]));
  }
  const vivo = m.modo === "en-pista" ? " en vivo" : "";
  return elegir(combinar(cortos, [(n) => `${n} ${year}${vivo}: horarios en Argentina y dónde ver`, (n) => `${n} ${year}${vivo}: horarios y dónde ver`, (n) => `${n} ${year}: horarios`]));
}

/**
 * La ficha de un piloto. `corre` es que esa fecha es suya (ficha con equipo, o figura en los resultados): si no, no sabemos y no lo decimos.
 * @param {string} name
 * @param {number|string} year
 * @param {any} m momentoDePiloto
 * @param {string} now ISO
 * @param {boolean} corre
 */
export function tituloPiloto(name, year, m, now, corre) {
  const f = m.fecha;
  if ((m.modo === "finde" || m.modo === "en-pista") && corre && f) {
    const hoy = hayHoy(m, now) ? " hoy" : "";
    const donde = f.city ? ` en ${f.city}` : "";
    return elegir([`${name}${hoy}: horarios${donde} y resultados`, `${name}${hoy}: horarios y resultados`, `${name}${hoy}: horarios`]);
  }
  return elegir([`${name}: cuándo corre, resultados y campeonato ${year}`, `${name}: cuándo corre, resultados y campeonato`, `${name}: cuándo corre y resultados ${year}`, `${name}: resultados ${year}`]);
}

// ---- Descripciones ----

/** Une oraciones mientras entren en el largo. La primera siempre va. */
export function juntar(oraciones, max = DESCRIPCION_MAX) {
  let out = "";
  for (const o of oraciones.filter(Boolean)) {
    const next = out ? `${out} ${o}` : o;
    if (out && next.length > max) break;
    out = next;
  }
  return out;
}

const cierre = (t) => (/[.!?…]$/.test(t) ? t : `${t}.`);
const dondeVerlo = (broadcasts) => {
  const names = [...new Set((broadcasts ?? []).map((b) => b.name).filter(Boolean))].slice(0, 3);
  return names.length ? `Dónde verlo: ${names.join(", ")}.` : "";
};

/** "P2: ganó Russell, Colapinto 11.º" (una sesión terminada con resultados). */
function resultadoDe(s) {
  if (!s.ganador) return "";
  const arg = (s.argentinos ?? []).slice(0, 2).map((a) => `${apellido(a.name)} ${a.noTermino ?? `${a.pos}.º`}`);
  return `${s.name}: ganó ${apellido(s.ganador.name)}${arg.length ? `, ${arg.join(", ")}` : ""}.`;
}

/** "P2: Colapinto 11.º" (lo que hizo el piloto en una sesión terminada). */
function filaDe(name, s) {
  if (!s.fila) return "";
  return `${s.name}: ${apellido(name)} ${s.fila.noTermino ?? `${s.fila.pos}.º`}.`;
}

/** "GP de Azerbaiyán" en la F1; en el resto, el lugar ("San Luis"): los nombres de las fechas nacionales son "Fecha 11 · San Luis". */
const fechaCorta = (f) => (esGP(f.name) ? f.name : (f.city ?? f.name));
/** Lo mismo con la categoría delante cuando el lugar solo no se entiende: "TC en San Luis". */
const fechaLarga = (f, series) => (esGP(f.name) ? f.name : `${series.short ?? series.name} en ${f.city ?? f.name}`);
/** "el sábado 26 a las 08:00 (hora argentina)" o "en curso". */
const cuandoLarga = (s) => (s.estado === "en-vivo" ? "en curso" : `el ${cuando(s)}${s.timeKnown === false ? "" : " (hora argentina)"}`);

const carreraPendiente = (f) => (f?.carrera && f.carrera.estado !== "terminada" ? `${f.carrera.name} ${cuandoLarga(f.carrera)}.` : "");
const ultimaTerminada = (sesiones) => [...sesiones].reverse().find((s) => s.estado === "terminada" && s.hasResults);
const ganadorCarrera = (f) => (f?.carrera?.estado === "terminada" && f.carrera.ganador ? resultadoDe({ ...f.carrera, name: f.carrera.name }) : "");

/**
 * Descripción de una categoría o de una fecha (`m` es el momento de cualquiera de las dos).
 * `fallback` es el texto de siempre: se usa cuando el momento no aporta nada concreto.
 */
export function descripcionMomento(series, m, /** @type {{ broadcasts?: { name: string }[], fallback?: string, fechaPropia?: boolean }} */ { broadcasts = [], fallback = "", fechaPropia = false } = {}) {
  const f = m.fecha;
  const donde = dondeVerlo(broadcasts);
  const enCurso = m.modo === "en-pista" || m.modo === "finde" || fechaPropia;
  let partes = [];
  if (enCurso && f) {
    const terminada = carreraTerminada(m);
    const ult = ultimaTerminada(m.sesiones);
    const gana = ganadorCarrera(f);
    partes = terminada
      ? [gana ? `${fechaLarga(f, series)}. ${gana}` : `${fechaLarga(f, series)}: resultados de todas las sesiones y campeonato.`, "Resultados de todas las sesiones y argentinos.", donde]
      : [`${fechaLarga(f, series)}${esGP(f.name) && f.city ? ` (${f.city})` : ""}: ${carreraPendiente(f) || "horarios de todas las sesiones."}`, ult ? resultadoDe(ult) : "", donde, "Horarios en hora argentina."];
  } else if (m.modo === "resultados" && f) {
    partes = [ganadorCarrera(f) ? `${fechaLarga(f, series)}. ${ganadorCarrera(f)}` : `${fechaLarga(f, series)}: resultados de todas las sesiones.`, "Resultados, campeonato y próxima fecha.", donde];
    if (m.proximaFecha) partes.splice(2, 0, `Sigue ${fechaCorta(m.proximaFecha)}.`);
  } else if (m.proximaFecha) {
    const pf = m.proximaFecha;
    const uf = m.ultimaFecha;
    partes = [
      `${series.name}: próxima fecha, ${fechaCorta(pf)}. ${carreraPendiente(pf) || `Empieza el ${cuando(pf.primeraSesion)}.`}`,
      uf ? `Última fecha, ${fechaCorta(uf)}. ${ganadorCarrera(uf)}`.trim() : "",
      "Calendario, resultados y campeonato.",
    ];
  }
  const texto = juntar(partes.map((p) => (p ? cierre(p.replace(/\s+/g, " ").trim()) : "")));
  return texto || fallback;
}

/** Descripción de la ficha de un piloto: lo que hizo esta fecha y lo que le queda, o su próxima fecha. */
export function descripcionPiloto(name, m, /** @type {{ broadcasts?: { name: string }[], fallback?: string, corre?: boolean }} */ { broadcasts = [], fallback = "", corre = false } = {}) {
  const f = m.fecha;
  if (!f || !corre) return fallback;
  const donde = dondeVerlo(broadcasts);
  const hechas = m.sesiones.filter((s) => s.estado === "terminada" && s.fila).slice(-2).map((s) => filaDe(name, s));
  const proxima = m.proximaSesion;
  const pendiente = proxima ? `${proxima.name} ${cuandoLarga(proxima)}.` : "";
  if (m.modo === "finde" || m.modo === "en-pista") {
    return juntar([`${name} en ${fechaCorta(f)}: ${hechas.length ? hechas.join(" ") : pendiente}`, hechas.length ? pendiente : "", donde, fallback.split(/(?<=\.)\s+/)[0]]);
  }
  if (m.modo === "resultados" && hechas.length) {
    return juntar([`${name} en ${fechaCorta(f)}: ${hechas.join(" ")}`, m.proximaFecha ? `Sigue ${fechaCorta(m.proximaFecha)}.` : "", fallback.split(/(?<=\.)\s+/)[0]]);
  }
  if (m.proximaFecha) {
    return juntar([`${name}: próxima fecha, ${fechaCorta(m.proximaFecha)}. ${carreraPendiente(m.proximaFecha) || `Empieza el ${cuando(m.proximaFecha.primeraSesion)}.`}`, ...fallback.split(/(?<=\.)\s+/)]);
  }
  return fallback;
}
