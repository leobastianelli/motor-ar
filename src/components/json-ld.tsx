import { itemListData, seasonEventSummaryData, sessionEventData, sportsEventData } from "@/lib/json-ld-core.mjs";
import { SITE_URL } from "@/lib/site";
import type { RaceEvent, Series, Session } from "@/lib/types";

/** Datos estructurados (schema.org) para buscadores. El contenido se escapa para que no pueda cerrar el script. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/**
 * `SportsEvent` de una fecha, para buscadores. Google no tiene un tipo de resultado específico para
 * deportes: valida contra `Event` genérico, que pide campos pensados para otra cosa (conciertos, shows).
 * Se completan los que sí se pueden sostener con datos reales:
 * - `image`/`description`: la imagen para compartir y la bajada que ya se arma en generateMetadata.
 * - `organizer.url`: sitio oficial de quien organiza (ACTC, APAT, FIA, etc.).
 * - `performer`/`competitor`: los pilotos que efectivamente corrieron, tomados de la primera sesión con
 *   resultados cargados. Si la fecha todavía no se corrió, no hay a quién listar y se omite — no se
 *   inventa una lista de largada que la fuente no publicó.
 * - `subEvent`: cada sesión de la fecha, con su propio horario y si ya terminó o todavía no.
 * A propósito NO se agrega `offers`: Fierros no vende ni controla el acceso a ninguna transmisión, y
 * completar precio/disponibilidad sin verificarlos sería inventar un dato (ver SPECS.md).
 * La lógica de qué campos lleva cada sesión vive en `src/lib/json-ld-core.mjs` (sin JSX, se prueba con `npm test`).
 */
export function sportsEventJsonLd(event: RaceEvent, series: Pick<Series, "name" | "org" | "orgUrl">, description: string, now: string) {
  return sportsEventData(event, series, description, now, SITE_URL);
}

/** `SportsEvent` de una sola sesión, para `/hoy`: la lista mezcla sesiones de fechas distintas. */
export function sportsEventFromSession(session: Session, event: RaceEvent, series: Pick<Series, "name" | "org" | "orgUrl">, now: string) {
  return sessionEventData(session, event, series, now, SITE_URL);
}

/** Resumen de una fecha para el `ItemList` del calendario de una categoría. */
export function seasonEventSummary(event: RaceEvent, series: Pick<Series, "name" | "org" | "orgUrl">, now: string) {
  return seasonEventSummaryData(event, series, now, SITE_URL);
}

/** `ItemList` genérica de schema.org, en el orden dado (1-based). */
export const itemListJsonLd = (items: object[]) => itemListData(items);

/** Migas de pan: [["Inicio", "/"], ["Pilotos", "/pilotos"], ...]. */
export const breadcrumb = (items: [string, string][]) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${SITE_URL}${path}` })),
});

/** "27/05/2003" → "2003-05-27"; "1911" → "1911". */
export const isoDate = (text?: string) => {
  const m = text?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return text?.match(/^\d{4}$/) ? text : undefined;
};
