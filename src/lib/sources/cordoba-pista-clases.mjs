// Clases de Córdoba Pista: el modelo es una CATEGORÍA (`cordoba-pista`) con CLASES que corren juntas en cada fecha, igual que el TN
// (categoría "tn" con Clase 2 y Clase 3). Los ids de las clases son propios de la categoría: la "Clase 3" de Córdoba Pista (`clase3`) no
// tiene nada que ver con la Clase 3 del TN ni con la de ninguna otra categoría. Todo lo que se arma con una clase (id de sesión, filtro,
// campeonato, dirección de la página) lleva antes el id de la categoría, así que dos clases con el mismo nombre en categorías distintas no
// pueden chocar.
//
// Colores de los sellos: texto blanco, contraste medido con la fórmula WCAG (mínimo 4,5:1). El de Clase 3 y el de Turismo Fiat 128 no
// son los de la investigación (#8a4b00 y #a13d63): se parecían al ocre del TN (#b47805) y al rosa de Ligier JFC (#b3285a).

export const SERIES_ID = "cordoba-pista";

/** Orden y nombres: los del listado de divisionales de la FRAD. */
export const CLASES = [
  { id: "tc4000", name: "TC 4000", short: "TC 4000", code: "T4K", color: "#1e6f4f" }, // 6,10:1
  { id: "tcp4000", name: "TC Pista 4000", short: "TCP 4000", code: "TP4K", color: "#4b5d16" }, // 7,30:1
  { id: "fiat", name: "Turismo Fiat", short: "T. Fiat", code: "TFI", color: "#0f766e" }, // 5,47:1
  { id: "fiat128", name: "Turismo Fiat 128", short: "T. Fiat 128", code: "TF128", color: "#7a2e8f" }, // 8,03:1
  { id: "tch", name: "Turismo Cordobés Histórico", short: "T. Histórico", code: "TCH", color: "#6d4c1f" }, // 7,77:1
  { id: "clase3", name: "Clase 3", short: "Clase 3", code: "CL3", color: "#3c4d8f" }, // 7,92:1
  { id: "frplus", name: "Fórmula Renault Plus", short: "FR Plus", code: "FRP", color: "#a1343c" }, // 6,84:1
];

export const claseById = Object.fromEntries(CLASES.map((c) => [c.id, c]));

const fold = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "");

/**
 * Nombre de un grupo de Speedhive ("TC 4000", "TCP 4000", "T FIAT 128", "T.C.H.", "FORMULA R. PLUS"…) o de la clase de una fila
 * ("Tursimo FIAT 128", "Formula R.Plus") → id de la clase; null si no es una de las siete. Los nombres cambian de una fecha a otra
 * (hasta con errores de tipeo), por eso se mira la forma y no el texto exacto.
 */
export function claseDeTexto(text) {
  const n = fold(text);
  if (!n) return null;
  if (/FORMULA/.test(n)) return "frplus";
  if (/FIAT.*128|128/.test(n)) return "fiat128";
  if (/FIAT/.test(n)) return "fiat";
  if (/TCPISTA|TCP4000|^TCP/.test(n)) return "tcp4000";
  if (/TC4000/.test(n)) return "tc4000";
  if (/^TCH$|^TCH/.test(n)) return "tch";
  if (/CLASE3/.test(n)) return "clase3";
  return null;
}
