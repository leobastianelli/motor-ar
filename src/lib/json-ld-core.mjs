// Lógica pura de los datos estructurados (schema.org) de una fecha: arma los objetos, sin JSX ni alias `@/`, para que
// `npm test` la cubra. `src/components/json-ld.tsx` sólo le pone la URL del sitio y el <script> alrededor.
import { dayKey } from "./session-status.mjs";
import { sessionStatus } from "./session-status.mjs";

const RACE_KINDS = ["final", "carrera"];

/** Si el horario todavía no se sabe, sólo el día: la hora de relleno (mediodía) no es un dato real. */
const startOfSession = (s) => (s.timeKnown === false ? dayKey(s.start) : s.start);

/**
 * `SportsEvent` de una sesión dentro de una fecha (`subEvent`). Sin horario confirmado, `startDate`/`endDate` llevan
 * sólo el día; con horario, `endDate` se calcula con la duración. `eventStatus` sólo distingue si ya terminó: no hay
 * un tercer estado para "en curso" en la lista que pide el sitio (Google valida contra `EventScheduled`/`EventCompleted`
 * en el `Event` genérico).
 */
export function subEventOf(session, now) {
  const done = sessionStatus(session, now) === "done";
  return {
    "@type": "SportsEvent",
    name: session.name,
    startDate: startOfSession(session),
    endDate: session.timeKnown === false ? dayKey(session.start) : new Date(Date.parse(session.start) + session.durationMin * 60_000).toISOString(),
    eventStatus: `https://schema.org/${done ? "EventCompleted" : "EventScheduled"}`,
  };
}

/** Los datos de `SportsEvent` de una fecha completa, con `subEvent` por cada sesión. `siteUrl` sin barra final. */
export function sportsEventData(event, series, description, now, siteUrl) {
  const withResults = event.sessions.find((s) => RACE_KINDS.includes(s.kind) && s.results?.length) ?? event.sessions.find((s) => s.results?.length);
  const competitors = withResults?.results?.map((r) => ({ "@type": "Person", name: r.driver }));

  return {
    "@type": "SportsEvent",
    name: `${series.name} · ${event.name}`,
    description,
    image: `${siteUrl}/eventos/${event.id}/opengraph-image`,
    sport: "Automovilismo",
    startDate: startOfSession(event.sessions[0]),
    endDate: startOfSession(event.sessions.at(-1)),
    eventStatus: "https://schema.org/EventScheduled",
    location: { "@type": "Place", name: event.circuit.name, address: [event.circuit.city, event.circuit.province, event.circuit.country].filter(Boolean).join(", ") },
    organizer: { "@type": "Organization", name: series.org, ...(series.orgUrl ? { url: series.orgUrl } : {}) },
    ...(competitors?.length ? { competitor: competitors, performer: competitors } : {}),
    subEvent: event.sessions.map((s) => subEventOf(s, now)),
  };
}

/** Resumen de una fecha para el `ItemList` del calendario de una categoría: nombre, enlace y cuándo es. */
export function seasonEventSummaryData(event, siteUrl) {
  const first = event.sessions[0];
  return { "@type": "SportsEvent", name: event.name, url: `${siteUrl}/eventos/${event.id}`, startDate: startOfSession(first) };
}

/** `ItemList` genérica de schema.org, en el orden dado (1-based). */
export const itemListData = (items) => ({ "@type": "ItemList", itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, item })) });
