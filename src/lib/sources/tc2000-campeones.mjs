// TC2000 desde las notas de Campeones (campeones.com.ar). El sitio oficial no permite leer resultados y Wikipedia está
// desactualizada, así que de las crónicas se toma lo que se puede leer con seguridad: sede, días, número de fecha, hora de
// la carrera, pole y ganador. Lo que sale de una sola fuente se marca "según Campeones". Nunca se inventa: si una nota no
// dice algo con claridad, ese dato queda vacío.

export const CAMPEONES = "Campeones";
const FEED = "https://campeones.com.ar/category/tc2000/feed/";

const VENUES = [
  ["eusebio marcilla|junín|junin", "Junín", "Autódromo Eusebio Marcilla", "Buenos Aires"],
  ["toay|provincia de la pampa", "Toay", "Autódromo Provincia de La Pampa", "La Pampa"],
  ["el zonda|eduardo copello", "San Juan", "Autódromo El Zonda Eduardo Copello", "San Juan"],
  ["villicum", "San Juan", "Circuito San Juan Villicum", "San Juan"],
  ["callejero", "Buenos Aires", "Circuito callejero de la Ciudad de Buenos Aires", "Buenos Aires"],
  ["juan manuel fangio|rosario", "Rosario", "Autódromo Juan Manuel Fangio", "Santa Fe"],
  ["güemes|guemes|salta", "Salta", "Autódromo Martín Miguel de Güemes", "Salta"],
  ["juan maría traverso|san nicolás|san nicolas", "San Nicolás", "Autódromo Juan María Traverso", "Buenos Aires"],
  ["termas de río hondo|termas de rio hondo", "Termas de Río Hondo", "Autódromo Termas de Río Hondo", "Santiago del Estero"],
  ["alta gracia|oscar cabalén|oscar cabalen", "Córdoba", "Autódromo Oscar Cabalén", "Córdoba"],
  ["concordia", "Concordia", "Autódromo Ciudad de Concordia", "Entre Ríos"],
  ["rafaela", "Rafaela", "Autódromo Ciudad de Rafaela", "Santa Fe"],
  ["paraná|parana", "Paraná", "Autódromo Ciudad de Paraná", "Entre Ríos"],
  ["posadas", "Posadas", "Autódromo Rosamonte", "Misiones"],
  ["oberá|obera", "Oberá", "Autódromo Ciudad de Oberá", "Misiones"],
  ["roberto mouras|la plata", "La Plata", "Autódromo Roberto Mouras", "Buenos Aires"],
  ["potrero de los funes", "San Luis", "Circuito Rosendo Hernández", "San Luis"],
  ["mendoza", "Mendoza", "Autódromo San Martín", "Mendoza"],
].map(([words, city, circuit, province]) => ({ re: new RegExp(`(?<!\\p{L})(?:${words})(?!\\p{L})`, "giu"), city, circuit, province }));

const ORDINALS = { primera: 1, segunda: 2, tercera: 3, cuarta: 4, quinta: 5, sexta: 6, "séptima": 7, septima: 7, octava: 8, novena: 9, "décima": 10, decima: 10, "undécima": 11, undecima: 11, "duodécima": 12, duodecima: 12 };

const DAY = 86400000;
const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);
const RESULT_TITLE = /gan[oó]|venci[oó]|triunf|victoria|profeta|se impuso|se llev[oó] la (?:carrera|final|victoria)/i;

/** Domingo (hora argentina) del fin de semana de una nota. Un lunes con resultado es del domingo anterior; si no, es previa. */
function sundayOf(post) {
  const d = new Date(Date.parse(post.date) - 3 * 3600000);
  const day = d.getUTCDay();
  const shift = day === 1 && RESULT_TITLE.test(post.title) ? -1 : (7 - day) % 7;
  return ymd(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + shift * DAY);
}

/** Nombre propio de 1 a 4 palabras con mayúscula, admitiendo "de", "del" y "la" en el medio (Ponce de León). */
const NAME = "([A-ZÁÉÍÓÚÑ][a-záéíóúñü]+(?:\\s+(?:de\\s+|del\\s+|la\\s+)?[A-ZÁÉÍÓÚÑ][a-záéíóúñü]+){0,3})";
const NOT_NAME = new Set(["El", "La", "Los", "Las", "En", "Con", "Tras", "Desde", "Honda", "Toyota", "Chevrolet", "Fiat", "Renault", "Peugeot", "Citroën", "Así", "Todo"]);
const clean = (name) => name?.replace(/\s+/g, " ").trim();
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** "TC2000 en Junín: Lucas Carabajal, al frente" → "Lucas Carabajal, al frente" */
const stripTitle = (title) => title.replace(/^(?:TC2000|Turismo Competición 2000)(?:\s+en\s+[^:]+)?:\s*/i, "");

/** Completa un apellido suelto ("Rossi") con el nombre conocido o con el que aparece en las notas del mismo finde. */
function fullName(short, posts, known) {
  if (!short) return undefined;
  const k = known.find((n) => n === short || n.endsWith(` ${short}`));
  if (k) return k;
  for (const p of posts) {
    const m = `${p.title} ${p.text}`.match(new RegExp(`([A-ZÁÉÍÓÚÑ][a-záéíóúñü]+) ${escape(short)}(?!\\p{L})`, "u"));
    if (m && !NOT_NAME.has(m[1])) return `${m[1]} ${short}`;
  }
  return short;
}

const firstName = (candidates) => candidates.map(clean).find((n) => n && !NOT_NAME.has(n.split(" ")[0]));

function venueOf(posts) {
  const score = new Map();
  for (const p of posts) {
    for (const v of VENUES) {
      const hits = (p.title.match(v.re)?.length ?? 0) * 3 + (p.text.match(v.re)?.length ?? 0);
      if (hits) score.set(v.city, { ...v, hits: (score.get(v.city)?.hits ?? 0) + hits });
    }
  }
  return [...score.values()].sort((a, b) => b.hits - a.hits)[0];
}

/** Número de fecha: el ordinal más repetido (los títulos pesan más; el texto a veces anticipa la fecha siguiente). */
function roundOf(posts) {
  const votes = new Map();
  const vote = (n, w) => votes.set(n, (votes.get(n) ?? 0) + w);
  const RE = /(?<!\p{L})(primera|segunda|tercera|cuarta|quinta|sexta|s[eé]ptima|octava|novena|d[eé]cima|und[eé]cima|duod[eé]cima)\s+(?:fecha|carrera|del año|competencia)/giu;
  for (const p of posts) {
    for (const [s, w] of [[p.title, 5], [p.text.slice(0, 800), 2], [p.text, 1]]) {
      for (const m of s.matchAll(RE)) if (ORDINALS[m[1].toLowerCase()]) vote(ORDINALS[m[1].toLowerCase()], w);
      for (const m of s.matchAll(/\b(\d{1,2})\s*[º°ª]\s*fecha/gi)) vote(Number(m[1]), w);
    }
  }
  return [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/**
 * Hora de largada: la hora pegada a "final", "carrera" o "se disputará" en la misma oración ("la final dominical, pautada a
 * las 13:00", "desde las 13:05, la gran final", "a partir de las 13 hs"). Se junta la de todas las notas y gana la más repetida.
 */
function raceTimeOf(posts) {
  const TIME = "(\\d{1,2})(?:[:.](\\d{2}))?\\s*(?:hs|horas|h)?(?!\\s*(?:minutos|vueltas))";
  const AFTER = new RegExp(`(?:final|carrera|se disputará|se largará)[^.]{0,80}?(?:desde|a partir de|a)\\s+las\\s+${TIME}`, "gi");
  const BEFORE = new RegExp(`(?:desde|a partir de)\\s+las\\s+${TIME},?\\s+(?:la\\s+)?(?:gran\\s+)?(?:final|carrera)`, "gi");
  const votes = new Map();
  for (const p of posts) {
    const weight = /se larga|largada/i.test(p.title) ? 3 : 1;
    for (const sentence of p.text.split(/(?<=\.)\s+|\n/)) {
      for (const m of [...sentence.matchAll(AFTER), ...sentence.matchAll(BEFORE)]) {
        const h = Number(m[1]);
        if (h < 8 || h > 19) continue;
        const time = `${String(h).padStart(2, "0")}:${m[2] ?? "00"}`;
        const prev = votes.get(time) ?? { n: 0, latest: "" };
        votes.set(time, { n: prev.n + weight, latest: p.date > prev.latest ? p.date : prev.latest });
      }
    }
  }
  // Empate: vale la nota más nueva (el cronograma del lunes puede cambiar durante el finde).
  return [...votes.entries()].sort((a, b) => b[1].n - a[1].n || b[1].latest.localeCompare(a[1].latest))[0]?.[0];
}

function poleOf(posts, known) {
  const found = [];
  for (const p of posts) {
    const title = stripTitle(p.title);
    found.push(
      p.text.match(new RegExp(`«pole(?:\\s+position)?»\\s+(?:fue|es|quedó)\\s+(?:de|para)\\s+${NAME}`))?.[1],
      title.match(new RegExp(`${NAME},?\\s+(?:el mejor del s[aá]bado|se quedó con la «pole|logró (?:la|su \\S+) «pole|con su \\S+ «pole|se adjudicó la «pole|volvió con «pole|conquistó el mejor tiempo de la clasificación)`))?.[1],
      title.match(new RegExp(`«1»\\s+de la mano de\\s+${NAME}`))?.[1],
      title.match(new RegExp(`es de ${NAME}:\\s*se quedó con la «pole`))?.[1],
    );
  }
  return fullName(firstName(found), posts, known);
}

function winnerOf(posts, known) {
  for (const p of posts.filter((x) => RESULT_TITLE.test(x.title))) {
    const title = stripTitle(p.title);
    const name = firstName([
      title.match(new RegExp(`^${NAME}[,:]?\\s+(?:le ganó|ganó|venció|se impuso|triunfó|festejó|aguantó y ganó|resistió y se llevó la (?:carrera|final|victoria)|se llevó la (?:carrera|final|victoria)|brindó por su \\S+ triunfo|volvió al triunfo|otra vez profeta)`))?.[1],
      p.text.match(new RegExp(`(?:triunfo|victoria)\\s+en TC2000\\s+del?\\s+(?:local\\s+)?${NAME}`))?.[1],
    ]);
    if (name) return { name: fullName(name, posts, known), url: p.link };
  }
  return undefined;
}

/** Agrupa notas por fin de semana y arma una fecha por grupo con sede reconocible y algún dato de pista. */
export function parseWeekends(posts, known = []) {
  const groups = new Map();
  // Las comillas de las notas llegan como «», "" o “” según de dónde se lean.
  const quotes = (s) => s.replace(/["“]([^"”\n]{1,40})["”]/g, "«$1»");
  for (const raw of posts) {
    const p = { ...raw, title: quotes(raw.title), text: quotes(raw.text) };
    const key = sundayOf(p);
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const weekends = [];
  for (const [sunday, list] of groups) {
    const venue = venueOf(list);
    if (!venue) continue;
    const winner = winnerOf(list, known);
    const pole = poleOf(list, known);
    const raceTime = raceTimeOf(list);
    // Una nota suelta sin datos del finde (previa, color, entrevista) no es una fecha.
    if (!winner && !pole && !raceTime) continue;
    weekends.push({
      raceDay: sunday,
      round: roundOf(list),
      city: venue.city,
      circuit: venue.circuit,
      province: venue.province,
      raceTime,
      pole,
      winner: winner?.name,
      winnerUrl: winner?.url,
      sources: [...new Set(list.map((p) => p.link))].slice(0, 6),
    });
  }
  return weekends.sort((a, b) => a.raceDay.localeCompare(b.raceDay));
}

/** Notas recientes desde el feed (una sola dirección, sin parámetros). */
export async function campeonesFeed(io) {
  const xml = await io.text(FEED, { revalidate: 3600 });
  const plain = (s) =>
    s
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|li|h\d|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&#8211;|&#8212;/g, "–")
      .replace(/&#171;/g, "«")
      .replace(/&#187;/g, "»")
      .replace(/&#8220;|&#8221;/g, "\"")
      .replace(/&nbsp;|&#160;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/[ \t]+/g, " ")
      .trim();
  return xml
    .split("<item>")
    .slice(1)
    .map((item) => ({
      title: plain(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""),
      link: plain(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? ""),
      date: new Date(plain(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "")).toISOString(),
      text: plain(item.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/)?.[1] ?? ""),
    }));
}

/** Suma fines de semana nuevos a los guardados (mismo domingo = misma fecha): lo nuevo completa o corrige, nunca borra. */
export function mergeWeekends(stored, fresh) {
  const out = new Map((stored ?? []).map((w) => [w.raceDay, { ...w }]));
  for (const w of fresh) {
    const prev = out.get(w.raceDay);
    out.set(
      w.raceDay,
      prev
        ? { ...prev, ...Object.fromEntries(Object.entries(w).filter(([, v]) => v !== undefined)), sources: [...new Set([...(prev.sources ?? []), ...(w.sources ?? [])])] }
        : w,
    );
  }
  return [...out.values()].sort((a, b) => a.raceDay.localeCompare(b.raceDay));
}
