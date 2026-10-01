import { getAllDrivers, getAllSeries, getDriver, getSeries } from "./data";

// Direcciones de las páginas de horarios, pensadas para las búsquedas ("horario turismo carretera", "a qué hora corre Colapinto").
const SERIES_SLUGS: Record<string, string> = {
  f1: "formula-1",
  f2: "formula-2",
  tc: "turismo-carretera",
  "tc-pista": "tc-pista",
  "tc-mouras": "tc-mouras",
  "tc-pista-mouras": "tc-pista-mouras",
  "tc-pick-up": "tc-pick-up",
  "tc-pista-pick-up": "tc-pista-pick-up",
  tn: "turismo-nacional",
  tc2000: "tc2000",
  gt3: "gt-world-challenge",
  wec: "wec",
  imsa: "imsa",
  f3: "formula-3",
  "f4-italia": "formula-4-italia",
  "ligier-jfc": "ligier-jfc",
};

/** Categorías que tienen página de horarios. */
export const horarioSeriesIds = () => Object.keys(SERIES_SLUGS);

export const horarioSeriesSlug = (seriesId: string) => SERIES_SLUGS[seriesId] ?? seriesId;

export type HorarioTarget = { kind: "series"; seriesId: string } | { kind: "driver"; driverSlug: string; seriesId: string };

export function resolveHorario(slug: string): HorarioTarget | undefined {
  const seriesId = Object.entries(SERIES_SLUGS).find(([, s]) => s === slug)?.[0];
  if (seriesId && getSeries(seriesId)) return { kind: "series", seriesId };
  const driver = getDriver(slug);
  if (driver) return { kind: "driver", driverSlug: driver.slug, seriesId: driver.seriesId };
  return undefined;
}

export function allHorarioSlugs() {
  return [
    ...getAllSeries()
      .filter((s) => SERIES_SLUGS[s.id])
      .map((s) => SERIES_SLUGS[s.id]),
    ...getAllDrivers().map((d) => d.slug),
  ];
}
