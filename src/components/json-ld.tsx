import { dayKey } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import type { RaceEvent, Series } from "@/lib/types";

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
 * A propósito NO se agrega `offers`: Fierros no vende ni controla el acceso a ninguna transmisión, y
 * completar precio/disponibilidad sin verificarlos sería inventar un dato (ver SPECS.md).
 */
export function sportsEventJsonLd(event: RaceEvent, series: Pick<Series, "name" | "org" | "orgUrl">, description: string) {
  // Si el horario todavía no se sabe, sólo se publica la fecha: la hora de relleno (mediodía) no es un dato real.
  const startOf = (s: RaceEvent["sessions"][number]) => (s.timeKnown === false ? dayKey(s.start) : s.start);
  const withResults = event.sessions.find((s) => ["final", "carrera"].includes(s.kind) && s.results?.length) ?? event.sessions.find((s) => s.results?.length);
  const competitors = withResults?.results?.map((r) => ({ "@type": "Person" as const, name: r.driver }));

  return {
    "@type": "SportsEvent",
    name: `${series.name} · ${event.name}`,
    description,
    image: `${SITE_URL}/eventos/${event.id}/opengraph-image`,
    sport: "Automovilismo",
    startDate: startOf(event.sessions[0]),
    endDate: startOf(event.sessions.at(-1)!),
    eventStatus: "https://schema.org/EventScheduled",
    location: { "@type": "Place", name: event.circuit.name, address: [event.circuit.city, event.circuit.province, event.circuit.country].filter(Boolean).join(", ") },
    organizer: { "@type": "Organization", name: series.org, ...(series.orgUrl ? { url: series.orgUrl } : {}) },
    ...(competitors?.length ? { competitor: competitors, performer: competitors } : {}),
  };
}

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
