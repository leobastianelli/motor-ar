// Clases del Rally Argentino 2026. Igual que Córdoba Pista y el TN, el modelo es una CATEGORÍA (`rally-argentino`) con CLASES que corren
// juntas en cada fecha; los ids de las clases son propios de la categoría (la "RC3" del Rally Argentino no tiene nada que ver con ninguna otra).
// Los nombres vienen de la API de resultados ("RC2", "COPA RC2", "RCMR"…) y de las tablas del campeonato ("rc2copa", "mrally"…), que no
// escriben igual (ni siquiera la API es consistente entre carreras: "Copa RC2" y "COPA RC2"), por eso se reconocen por su forma.
//
// Colores de los sellos: texto blanco, contraste medido con la fórmula WCAG (mínimo 4,5:1).

export const SERIES_ID = "rally-argentino";

/** Orden: el del sitio oficial. La Copa RC2 corre con autos Rally2 pero puntúa aparte (su campeonato tiene tabla propia). */
export const CLASES = [
  { id: "rc2", name: "RC2", short: "RC2", code: "RC2", color: "#1d4ed8" }, // 6,70:1
  { id: "copa-rc2", name: "Copa RC2", short: "Copa RC2", code: "CRC2", color: "#0e7490" }, // 5,36:1
  { id: "copa-toyota", name: "Copa Toyota", short: "Copa Toyota", code: "CTY", color: "#b91c1c" }, // 6,47:1
  { id: "maxi-rally", name: "Maxi Rally", short: "Maxi Rally", code: "MR", color: "#6d28d9" }, // 7,10:1
  { id: "rc3", name: "RC3", short: "RC3", code: "RC3", color: "#15803d" }, // 5,02:1
  { id: "rc4", name: "RC4", short: "RC4", code: "RC4", color: "#a16207" }, // 4,92:1
  { id: "rc5", name: "RC5", short: "RC5", code: "RC5", color: "#be185d" }, // 6,04:1
];

export const claseById = Object.fromEntries(CLASES.map((c) => [c.id, c]));
export const CLASES_ORDEN = Object.fromEntries(CLASES.map((c, i) => [c.id, i]));

const fold = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "");

/**
 * Texto de una clase ("RC2", "COPA RC2", "Copa RC2", "RCMR", "rc2copa", "mrally", "copatoyota"…) → id de la clase; null si no es una de las siete.
 */
export function claseDeTexto(text) {
  const n = fold(text);
  if (!n) return null;
  if (/TOYOTA/.test(n)) return "copa-toyota";
  if (/RC2/.test(n)) return /COPA/.test(n) ? "copa-rc2" : "rc2";
  if (/^RCMR$|MAXI|^MRALLY$|^MR$/.test(n)) return "maxi-rally";
  if (/^RC3$/.test(n)) return "rc3";
  if (/^RC4$/.test(n)) return "rc4";
  if (/^RC5$/.test(n)) return "rc5";
  return null;
}
