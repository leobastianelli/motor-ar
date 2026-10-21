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

/** Marcadores que la fuente pone donde falta el dato ("A CONFIRMAR"): nunca se muestran como si fueran un lugar. */
const MARCADOR = /^\s*(a\s+(confirmar|definir)|por\s+(confirmar|definir)|sin\s+(confirmar|definir)|tb[ad]|n\/?a|[-–—?]*)\s*$/i;
/** @param {string|undefined} c */
export const ciudadValida = (c) => (c && !MARCADOR.test(c) && !/\b(a\s+confirmar|a\s+definir)\b/i.test(c) ? c.trim() : undefined);
/** El nombre de una fecha ("Fecha 9 · A CONFIRMAR") sin marcadores: si lo trae, no se usa entero. */
const nombreValido = (n) => (n && !/\b(a\s+confirmar|a\s+definir)\b/i.test(n) ? n : "");

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
  const name = nombreValido(evento.name);
  const ciudad = ciudadValida(evento.city);
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

const MES = (iso) => Number(dayOf(iso).slice(5, 7));
const DIA = (iso) => Number(dayOf(iso).slice(8, 10));

/**
 * Los días de una fecha en formato argentino: "25/10", "24 y 25/10", "23 al 25/10", "30/10 al 2/11".
 * @param {{ start: string, end?: string }} f
 */
export function diasDe(f) {
  const fin = f.end && Date.parse(f.end) > Date.parse(f.start) ? new Date(Date.parse(f.end) - 90 * 60000).toISOString() : f.start; // una sesión que termina pasada la medianoche no suma un día
  const [d1, d2, m1, m2] = [DIA(f.start), DIA(fin), MES(f.start), MES(fin)];
  if (dayOf(fin) <= dayOf(f.start)) return `${d1}/${m1}`;
  if (m1 !== m2) return `${d1}/${m1} al ${d2}/${m2}`;
  return `${d1}${d2 === d1 + 1 ? " y " : " al "}${d2}/${m2}`;
}

const esNacional = (series) => series.scope !== "internacional";

/** Cómo busca la gente cada categoría nacional: la sigla corta primero y el nombre largo si entra. */
const NOMBRES_BUSQUEDA = {
  tc: ["TC", "Turismo Carretera"],
  "tc-pista": ["TC Pista"],
  "tc-pick-up": ["TC Pick Up"],
  "tc-pista-pick-up": ["TC Pista Pick Up"],
  "tc-mouras": ["TC Mouras"],
  "tc-pista-mouras": ["TC Pista Mouras"],
  tc2000: ["TC2000"],
  tn: ["Turismo Nacional", "TN"],
  "rally-argentino": ["Rally Argentino"],
  "nuevo-car-show": ["Nuevo Car Show"],
  "cordoba-pista": ["Córdoba Pista"],
  "formula-nacional": ["Fórmula Nacional", "FNA"],
};

/**
 * La página de horarios de una categoría. La gente busca "horario f1", "horarios tc rosario", "a qué hora es el gt world challenge".
 * - Internacionales: "en Argentina" porque la promesa es la hora argentina (el GP, o el lugar, y los días).
 * - Nacionales: sin "en Argentina" (ya corren acá): "Horarios TC en Rosario: 24 y 25/10", con el nombre largo si entra.
 * - Un lugar que es un marcador ("A CONFIRMAR") o vacío no se nombra: queda la fecha en días o "próxima fecha".
 * - Nada de "hoy" ni "este finde": la página se regenera cada 15 minutos (y puede servirse más vieja), así que sólo se dice lo que sigue siendo cierto: los días.
 * No promete ninguna hora: las horas van en la descripción, que dice "a confirmar" cuando no hay horario confirmado.
 * @param {{ id?: string, name: string, short?: string, scope?: string }} series
 * @param {any} m momentoDeCategoria
 */
export function tituloHorario(series, m) {
  const enCurso = (m.modo === "en-pista" || m.modo === "finde") && m.fecha;
  const f = enCurso ? m.fecha : m.proximaFecha;
  const l = f ? lugar({ name: f.name, city: f.city }) : undefined;
  const donde = l?.gp ?? ciudadValida(f?.city);
  const dias = f ? diasDe(f) : undefined;
  if (esNacional(series)) {
    const [corto, largo] = NOMBRES_BUSQUEDA[series.id ?? ""] ?? [series.name];
    const conLargo = largo ? `${largo} (${corto})` : corto;
    const ronda = f && Number.isInteger(f.round) ? ` · Fecha ${f.round}` : "";
    const en = donde ? ` en ${donde}` : "";
    const sep = donde ? ": " : ": próxima fecha, ";
    if (f && dias) return elegir([`Horarios ${conLargo}${en}${sep}${dias}`, `Horarios ${corto}${en}${sep}${dias}${ronda}`, `Horarios ${corto}${en}${sep}${dias}`, `Horarios ${corto}${en}`]);
    return elegir([`Horarios ${conLargo}: calendario y dónde verlo`, `Horarios ${corto}: calendario y dónde verlo`, `Horarios ${corto}`]);
  }
  const buscado = series.short && series.short.length <= 3 ? [series.short, series.name] : [series.name, series.short].filter(Boolean);
  if (f && dias) {
    const ref = donde ? `: ${donde}, ${dias}` : `: próxima fecha, ${dias}`;
    return elegir(combinar(buscado, [(n) => `Horarios ${n} en Argentina${ref}`, (n) => `Horarios ${n} en Argentina${donde ? `: ${donde}` : ""}`, (n) => `Horarios ${n} en Argentina`]));
  }
  return elegir(combinar(buscado, [(n) => `Horarios ${n} en Argentina: cada sesión y dónde verla`, (n) => `Horarios ${n} en Argentina`]));
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
  const arg = (s.argentinos ?? []).slice(0, 2).map((a) => `${apellido(a.name)} ${a.noTermino ?? (a.clase ? `${a.clase.pos}.º en ${a.clase.class}` : `${a.pos}.º`)}`);
  return `${s.name}: ${s.multiclase ? "ganó la general" : "ganó"} ${apellido(s.ganador.name)}${s.provisorio ? " (provisorio)" : ""}${arg.length ? `, ${arg.join(", ")}` : ""}.`;
}

/** "P2: Colapinto 11.º" (lo que hizo el piloto en una sesión terminada). */
function filaDe(name, s) {
  if (!s.fila) return "";
  return `${s.name}: ${apellido(name)} ${s.fila.noTermino ?? (s.fila.clase ? `${s.fila.clase.pos}.º en ${s.fila.clase.class}` : `${s.fila.pos}.º`)}.`;
}

/** "GP de Azerbaiyán" en la F1; en el resto, el lugar ("San Luis"): los nombres de las fechas nacionales son "Fecha 11 · San Luis". */
const fechaCorta = (f) => (esGP(f.name) ? f.name : (ciudadValida(f.city) ?? (nombreValido(f.name) || "fecha con lugar a confirmar")));
/** Lo mismo con la categoría delante cuando el lugar solo no se entiende: "TC en San Luis". */
const fechaLarga = (f, series) => (esGP(f.name) ? f.name : `${series.short ?? series.name}${ciudadValida(f.city) ? ` en ${ciudadValida(f.city)}` : ""}`);
/** "el sábado 26 a las 08:00 (hora argentina)" o "en curso". */
const DIAS = /\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/i;
/** "el sábado 26 a las 08:00 (hora argentina)"; si el nombre de la sesión ya trae el día ("Series y finales (domingo)"), sólo "el 26 a las 08:00". */
const cuandoLarga = (s) => {
  if (s.estado === "en-vivo") return "en curso";
  const c = DIAS.test(s.name ?? "") ? cuando(s).replace(DIAS, "").trim() : cuando(s);
  return `el ${c}${s.timeKnown === false ? "" : " (hora argentina)"}`;
};

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
      : [`${fechaLarga(f, series)}${esGP(f.name) && ciudadValida(f.city) ? ` (${f.city})` : ""}: ${carreraPendiente(f) || "horarios de todas las sesiones."}`, ult ? resultadoDe(ult) : "", donde, "Horarios en hora argentina."];
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

/**
 * Descripción de la página de horarios de una categoría. Las horas salen de la próxima carrera (o de la primera sesión) y llevan "(hora argentina)" sólo si están confirmadas.
 * Si la fecha de este finde ya terminó y no hay otra cargada, no se inventa nada: queda el `fallback`.
 * Las nacionales no dicen "en Argentina" ni "hora argentina" de relleno: ya corren acá.
 */
export function descripcionHorario(series, m, /** @type {{ broadcasts?: { name: string }[], fallback?: string }} */ { broadcasts = [], fallback = "" } = {}) {
  const f = m.fecha;
  const donde = dondeVerlo(broadcasts);
  const nac = esNacional(series);
  const apertura = nac ? `Horarios de ${series.name}.` : `Horarios de ${series.name} en Argentina.`;
  const cierreSesiones = nac ? "Todas las sesiones y dónde verlas." : "Todas las sesiones en hora argentina y dónde verlas.";
  const enCurso = (m.modo === "en-pista" || m.modo === "finde") && f && !carreraTerminada(m);
  /** "Rosario, 24 y 25/10" o, sin lugar confirmado, "24 y 25/10". */
  const fechaDe = (x) => [esGP(x.name) ? x.name : ciudadValida(x.city), diasDe(x)].filter(Boolean).join(", ");
  let partes = [];
  if (enCurso) {
    partes = [`${apertura} Esta fecha: ${fechaDe(f)}. ${carreraPendiente(f) || "Horarios de todas las sesiones."}`, donde, cierreSesiones];
  } else if (m.proximaFecha) {
    const pf = m.proximaFecha;
    partes = [`${apertura} Próxima fecha: ${fechaDe(pf)}. ${carreraPendiente(pf) || `Empieza el ${cuando(pf.primeraSesion)}.`}`, cierreSesiones];
  }
  const sinHora = (t) => (nac ? t.replace(/ \(hora argentina\)/g, "") : t);
  return juntar(partes.map((p) => (p ? cierre(sinHora(p.replace(/\s+/g, " ")).trim()) : ""))) || fallback;
}
