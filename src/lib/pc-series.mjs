// Las categorías que se cargan desde una PC (su fuente bloquea a GitHub Actions): lista única para la sincronización, el vigilante y la documentación.
import { fnaRefresh, FNA, FNA_LABEL } from "./fna-refresh-core.mjs";
import { rallyRefresh, RALLY, RALLY_LABEL } from "./rally-refresh-core.mjs";

/** `label`: rótulo en SOURCES; `command`: el script que la publica (`npm run …`); `refresh`: ver pc-refresh-core.mjs. */
export const PC_SERIES = [
  { seriesId: RALLY, label: RALLY_LABEL, command: "sync:rally", refresh: rallyRefresh },
  { seriesId: FNA, label: FNA_LABEL, command: "sync:fna", refresh: fnaRefresh },
];

/** Rótulos de las fuentes que la sincronización saltea en GitHub Actions. */
export const PC_LABELS = PC_SERIES.map((s) => s.label);

/** Reemplaza en `season` todo lo de cada categoría de la PC por lo de `from` (sin tocar el resto). */
export const carryPcSeries = (season, from) => PC_SERIES.reduce((acc, s) => s.refresh.carry(acc, from), season);
