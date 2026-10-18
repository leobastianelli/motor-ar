// Normalización de nombres de categoría a la lista cerrada del juego (docs/juego/00-diseno.md).
// categoriaDe(texto) devuelve:
//   { cat: "TC", regla }                 si el texto es una categoría de la lista;
//   { cat: null, ignorada: true, regla } si es una categoría conocida que NO cuenta (Top Race Series, TC Mouras, Fórmula Renault...);
//   null                                 si ninguna regla lo reconoce (el script lo lista aparte para revisarlo).
// Las reglas de inclusión están ancladas (^...$): un nombre que no encaja entero no cuenta.

export const CATEGORIAS = ["F1", "IndyCar", "Mundial de Turismos", "Resistencia", "TC", "TC Pista", "TC2000", "Top Race", "TN", "Rally", "Dakar"];

function norm(texto) {
  const s = String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[-_.,;:*"'«»]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

// Reglas que descartan (se evalúan primero, así "TC Pista Mouras" no cae en "TC Pista" ni "TC Mouras" en "TC").
const IGNORADAS = [
  [/\bpista mouras\b|\btc mouras\b|\bmouras\b/, "TC Mouras / TC Pista Mouras"],
  [/\bpick ?up\b/, "TC Pick Up / TC Pista Pick Up"],
  [/^top race (series|junior|noa|pista)\b/, "Top Race Series / Junior / NOA / Pista"],
  [/^trv6 series\b|^tr series\b/, "Top Race Series"],
  [/\bformula (renault|3|4|2|junior|1600|ford|fiat|metalurgica|nacional|abarth|regional|europea|e\b|indy)\b|\bf(2|3|4)\b|\bfia f(2|3)\b/, "Fórmulas de formación o menores"],
  [/\bkarting\b|\bkart\b/, "Karting"],
  [/\btcr\b(?! world tour)|\bindy (lights|nxt)\b|\bgt3\b|\bgt world\b|\bgt open\b|\bgt americano\b|\bsuper turismo\b|\bturismo pista\b|\bturismo estandar\b|\bnuevo car show\b|\bcar show\b|\bcopa\b(?! mundial de turismos)|\bsportprototipos\b|\bnascar\b|\bimsa\b|\bmoto gp\b|\bmotogp\b|\bsupermoto\b|\bmotocross\b|\bturismo clase\b/, "Otras categorías fuera de la lista"],
];

const INCLUIDAS = [
  ["F1", /^(campeonato mundial de |mundial de |campeonato de )?(formula (1|uno|one)|f1)( mundial| de la fia)?$/],
  ["TC Pista", /^(tc pista|turismo carretera pista|campeonato argentino de tc pista)$/],
  ["TC", /^(turismo carretera|tc|campeonato argentino de turismo carretera|campeonato de turismo carretera)$/],
  [
    "TC2000",
    /^(campeonato argentino de |campeonato de )?(turismo competicion (2000|2 ?000|dos mil)|(super )?tc ?2000|(super )?tc 2 ?000|stc ?2000|stc 2000|super turismo competicion 2000)( series)?$/,
  ],
  ["Top Race", /^(top race|top race v6|top race v 6|top race original|trv6|tr v6|trv 6|top race trv6)$/],
  [
    "TN",
    /^(((campeonato argentino de )?turismo nacional)|tn)( clase \d+| clase [abc])?$|^clase (\d+|[abc]) (del |de )?(turismo nacional|tn)$|^(turismo nacional|tn) (de )?clase (\d+|[abc])$/,
  ],
  [
    "Rally",
    /^(rally argentino|campeonato argentino de rally|campeonato de rally argentino|rally mundial|campeonato mundial de rally|mundial de rally|campeonato del mundo de rally|world rally championship|wrc|fia world rally championship)$/,
  ],
  ["IndyCar", /^(indycar|indy car|indycar series|verizon indycar series|ntt indycar series|indy racing league|irl|champ car|champ car world series|cart|500 millas de indianapolis|indianapolis 500|indy 500)$/],
  [
    "Mundial de Turismos",
    /^(campeonato mundial de turismos|copa mundial de turismos|campeonato del mundo de turismos|mundial de turismos|world touring car championship|world touring car cup|fia world touring car championship|fia world touring car cup|wtcc|wtcr|fia wtcc|fia wtcr|tcr world tour|fia tcr world tour)( de la fia)?$/,
  ],
  [
    "Resistencia",
    /^(campeonato mundial de resistencia( de la fia)?|mundial de resistencia|world endurance championship|fia world endurance championship|wec|fia wec|24 horas de le mans|24 hs de le mans|24 hours of le mans|le mans|las 24 horas de le mans)$/,
  ],
  ["Dakar", /^(rally dakar|dakar rally|dakar|rally dakar de|rally dakar edicion)( (autos|coches|motos|quads|cuatriciclos|camiones|utv|ssv|challenger))?$/],
];

/** Quita años sueltos al principio o al final ("Rally Dakar 2013", "2010 Rally Dakar") sin tocar "TC 2000". */
function sinAnio(s) {
  return s
    .replace(/\b(de )?(19[5-9]\d|20[0-3]\d)$/, "")
    .replace(/^(19[5-9]\d|20[0-3]\d) /, "")
    .replace(/ de$/, "")
    .trim();
}

export function categoriaDe(texto) {
  const base = norm(texto);
  if (!base) return null;
  for (const [re, regla] of IGNORADAS) if (re.test(base)) return { cat: null, ignorada: true, regla };
  const candidatos = [base];
  const sa = sinAnio(base);
  // "turismo competicion 2000" y "tc 2000" no pueden perder el 2000: sólo se prueba sin año si no es esa familia.
  if (sa !== base && !/\b(tc|competicion|stc) ?2 ?000$/.test(base)) candidatos.push(sa);
  for (const c of candidatos) for (const [cat, re] of INCLUIDAS) if (re.test(c)) return { cat, regla: re.source.slice(0, 60) };
  return null;
}

// Reglas de ignorada que sirven para explicar el mapeo en el reporte.
export const REGLAS_TEXTO = {
  incluidas: INCLUIDAS.map(([cat, re]) => ({ cat, regex: re.source })),
  ignoradas: IGNORADAS.map(([re, regla]) => ({ regla, regex: re.source })),
};
