import { SITE_URL } from "@/lib/site";

/** Datos estructurados (schema.org) para buscadores. El contenido se escapa para que no pueda cerrar el script. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
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
