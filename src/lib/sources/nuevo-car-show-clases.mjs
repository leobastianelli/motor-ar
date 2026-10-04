// Clases del Nuevo Car Show: una CATEGORÍA (`nuevo-car-show`) con CLASES que corren juntas en cada fecha, igual que Córdoba Pista y el TN. Los
// ids son propios de la categoría: la "Clase 3" del Nuevo Car Show no tiene nada que ver con la del TN ni con la de Córdoba Pista.
//
// Colores de los sellos: texto blanco, contraste medido con la fórmula WCAG (mínimo 4,5:1), y a distancia suficiente de los colores de las
// demás categorías y clases del sitio.

export const SERIES_ID = "nuevo-car-show";

export const CLASES = [
  { id: "clase1", name: "Clase 1", short: "Clase 1", code: "C1", color: "#0369a1" }, // 5,93:1
  { id: "clase2", name: "Clase 2", short: "Clase 2", code: "C2", color: "#15803d" }, // 5,02:1
  { id: "clase3", name: "Clase 3", short: "Clase 3", code: "C3", color: "#b45309" }, // 5,02:1
  { id: "tc4000", name: "TC 4000 SS", short: "TC 4000", code: "T4K", color: "#9f1239" }, // 8,02:1
  { id: "fiat600", name: "Fiat 600 TS", short: "Fiat 600", code: "F600", color: "#475569" }, // 7,58:1
];

export const claseById = Object.fromEntries(CLASES.map((c) => [c.id, c]));
