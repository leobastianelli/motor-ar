// Lógica pura de los datos estructurados (schema.org) de una fecha: arma los objetos, sin JSX ni alias `@/`, para que
// `npm test` la cubra. `src/components/json-ld.tsx` sólo le pone la URL del sitio y el <script> alrededor.
import { dayKey } from "./session-status.mjs";
import { sessionStatus } from "./session-status.mjs";

const RACE_KINDS = ["final", "carrera"];

/** Si el horario todavía no se sabe, sólo el día: la hora de relleno (mediodía) no es un dato real. */
const startOfSession = (s) => (s.timeKnown === false ? dayKey(s.start) : s.start);

/** Dónde se corre, con la dirección desarmada (Google pide `location` en cada evento, también en los anidados y en las listas). */
export function placeOf(circuit) {
  return {
    "@type": "Place",
    name: circuit.name,
    address: {
      "@type": "PostalAddress",
      ...(circuit.city ? { addressLocality: circuit.city } : {}),
      ...(circuit.province ? { addressRegion: circuit.province } : {}),
      addressCountry: circuit.country,
    },
  };
}

/** Quién organiza la categoría. Sin web conocida, sólo el nombre. */
export const organizerOf = (series) => ({ "@type": "Organization", name: series.org, ...(series.orgUrl ? { url: series.orgUrl } : {}) });

/** La imagen para compartir de la fecha: la misma que usan las redes. */
export const eventImage = (event, siteUrl) => `${siteUrl}/eventos/${event.id}/opengraph-image`;

/** Lo que comparten todas las sesiones de una fecha: dónde, quién organiza, imagen y enlace. */
const sharedOf = (event, series, siteUrl) => ({
  location: placeOf(event.circuit),
  organizer: organizerOf(series),
  image: eventImage(event, siteUrl),
  url: `${siteUrl}/eventos/${event.id}`,
});

/** Una línea que describe una sesión: qué, de qué fecha y dónde, y que la hora está en hora argentina. */
const sessionDescription = (session, event, series) =>
  `${session.name} de ${series.name} (${event.name}), en ${event.circuit.name}. Horario en hora argentina y dónde verlo en Fierros.`;

/**
 * `SportsEvent` de una sesión dentro de una fecha (`subEvent`). Sin horario confirmado, `startDate`/`endDate` llevan
 * sólo el día; con horario, `endDate` se calcula con la duración. `eventStatus` sólo distingue si ya terminó: no hay
 * un tercer estado para "en curso" en la lista que pide el sitio (Google valida contra `EventScheduled`/`EventCompleted`
 * en el `Event` genérico).
 */
export function subEventOf(session, now, event, series, siteUrl) {
  const done = sessionStatus(session, now) === "done";
  return {
    "@type": "SportsEvent",
    name: session.name,
    description: sessionDescription(session, event, series),
    sport: "Automovilismo",
    startDate: startOfSession(session),
    endDate: session.timeKnown === false ? dayKey(session.start) : new Date(Date.parse(session.start) + session.durationMin * 60_000).toISOString(),
    eventStatus: `https://schema.org/${done ? "EventCompleted" : "EventScheduled"}`,
    ...sharedOf(event, series, siteUrl),
  };
}

/** `SportsEvent` de una sola sesión suelta (la agenda de /hoy mezcla sesiones de fechas distintas). */
export function sessionEventData(session, event, series, now, siteUrl) {
  return { ...subEventOf(session, now, event, series, siteUrl), name: `${series.name} · ${session.name}` };
}

/** Los datos de `SportsEvent` de una fecha completa, con `subEvent` por cada sesión. `siteUrl` sin barra final. */
export function sportsEventData(event, series, description, now, siteUrl) {
  const withResults = event.sessions.find((s) => RACE_KINDS.includes(s.kind) && s.results?.length) ?? event.sessions.find((s) => s.results?.length);
  const competitors = withResults?.results?.map((r) => ({ "@type": "Person", name: r.driver }));

  return {
    "@type": "SportsEvent",
    name: `${series.name} · ${event.name}`,
    description,
    sport: "Automovilismo",
    startDate: startOfSession(event.sessions[0]),
    endDate: startOfSession(event.sessions.at(-1)),
    eventStatus: "https://schema.org/EventScheduled",
    ...sharedOf(event, series, siteUrl),
    ...(competitors?.length ? { competitor: competitors, performer: competitors } : {}),
    subEvent: event.sessions.map((s) => subEventOf(s, now, event, series, siteUrl)),
  };
}

/**
 * Resumen de una fecha para el `ItemList` del calendario de una categoría. Google valida cada elemento como un evento
 * completo: sin `location` lo marca inválido, así que lleva lo mismo que la página de la fecha menos las sesiones.
 */
export function seasonEventSummaryData(event, series, now, siteUrl) {
  const done = event.sessions.every((s) => sessionStatus(s, now) === "done");
  return {
    "@type": "SportsEvent",
    name: `${series.name} · ${event.name}`,
    description: `${series.name} en ${event.circuit.city || event.circuit.name}: horarios en hora argentina, dónde verlo y resultados de cada sesión.`,
    sport: "Automovilismo",
    startDate: startOfSession(event.sessions[0]),
    endDate: startOfSession(event.sessions.at(-1)),
    eventStatus: `https://schema.org/${done ? "EventCompleted" : "EventScheduled"}`,
    ...sharedOf(event, series, siteUrl),
  };
}

/** `ItemList` genérica de schema.org, en el orden dado (1-based). */
export const itemListData = (items) => ({ "@type": "ItemList", itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, item })) });
