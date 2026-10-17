import type { Nota } from "@/data/notas";
import { esMulticlase, fraseEnClase, nombreClase, puestoEnClase } from "./clase.mjs";
import { nombreVisibleSesion } from "./momento.mjs";
import { provisionalSuffix } from "./provisorio.mjs";
import type { RaceEvent, ResultRow, Session, SessionKind } from "./types";

// Notas automáticas: una crónica por fecha que se arma sola con los resultados que van entrando (prácticas, clasificación, sprint, carrera).
// No dependen de cargas a mano ni de medios: son texto propio hecho con datos de las fuentes, se actualizan con cada resultado nuevo y,
// como hay una sola por fecha (`<id de la fecha>-cronica`), un mismo fin de semana nunca reparte el asunto en varias notas.

const TZ = "America/Argentina/Buenos_Aires";
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const dayParts = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, weekday: "long", day: "numeric", month: "numeric" });
/** "jueves 24/9" (armado a mano: el separador de la fecha numérica cambia según la versión de ICU). */
const dayName = (d: Date) => {
  const p = Object.fromEntries(dayParts.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.weekday} ${p.day}/${p.month}`;
};
const dayOf = (iso: string) => dayFmt.format(new Date(iso));

/** Cuánto tiempo, desde la última sesión con resultados, la crónica de una fecha sigue entre las notas. */
const FRESH_DAYS = 6;
/** Tope de crónicas a la vez: primero lo más nuevo y, dentro del mismo día, las categorías argentinas. */
const MAX_AUTO = 12;

const PRIORITY: Record<SessionKind, number> = { carrera: 5, final: 5, sprint: 4, clasificacion: 3, serie: 2, practica: 1 };
const priority = (s: Session) => PRIORITY[s.kind] - (s.kind === "clasificacion" && /sprint/i.test(s.name) ? 0.5 : 0);

const lower = (name: string) => name.charAt(0).toLowerCase() + name.slice(1);
const ordinal = (pos: number) => `${pos}.º`;
const withResults = (s: Session) => (s.results?.length ?? 0) > 0;
/** Una tripulación ("A / B / C") lleva el verbo en plural. */
const crew = (driver: string) => driver.includes(" / ");

/** Sólo los que terminaron la sesión con posición numérica (no abandonos ni descalificados) figuran entre los primeros. */
const classified = (r: ResultRow) => !r.status && (!r.positionText || /^\d+$/.test(r.positionText));
const top = (s: Session, n: number) => (s.results ?? []).filter(classified).sort((a, b) => a.pos - b.pos).slice(0, n);

/** Un renglón por sesión: "Práctica 1: 1.º George Russell (1:45.387), 2.º Max Verstappen (+0.400), 3.º …". */
function line(s: Session, siblings: Session[]): string {
  const rows = top(s, 3);
  if (!rows.length) return "";
  const parts = rows.map((r) => `${ordinal(r.pos)} ${r.driver}${r.gap ? ` (${r.gap})` : ""}`);
  return `${nombreVisibleSesion(s, siblings)}${provisionalSuffix(s)}: ${parts.join(", ")}.`;
}

/** Titular según la sesión más importante del último día con resultados. */
function headline(event: RaceEvent, s: Session): string {
  const first = top(s, 1)[0];
  if (!first) return event.name;
  const name = lower(nombreVisibleSesion(s, event.sessions));
  switch (s.kind) {
    case "carrera":
    case "final":
    case "sprint":
    case "serie":
      return `${event.name}: ${first.driver} ${crew(first.driver) ? "ganaron" : "ganó"} la ${name}${provisionalSuffix(s)}`;
    case "clasificacion":
      return `${event.name}: ${first.driver} hizo el mejor tiempo en la ${name}`;
    default:
      return `${event.name}: ${first.driver} fue el más rápido en la ${name}`;
  }
}

/**
 * Titular para buscadores: con el nombre de la categoría delante ("Fórmula 2 en Baku: …", "Fórmula 1, GP de Azerbaiyán: …").
 * `title` empieza con el nombre de la fecha; en las nacionales ("Fecha 9 · Rio Cuarto") queda sólo el lugar.
 */
export function seoHeadline(seriesName: string, eventName: string, title: string): string {
  if (title.toLowerCase().includes(seriesName.toLowerCase())) return title;
  if (/^(GP|Gran Premio)\b/i.test(eventName)) return `${seriesName}, ${title}`;
  const place = eventName.replace(/^Fecha \d+ · /, "");
  return `${seriesName} en ${place}${title.startsWith(eventName) ? title.slice(eventName.length) : `: ${title}`}`;
}

interface Options {
  now: string;
  /** Slugs de los pilotos argentinos con ficha, para destacar cómo les fue. */
  argentines: Set<string>;
  /** Prioridad de la categoría (1 = argentina, 2 = internacional con argentinos, 3 = el resto). */
  tierOf: (seriesId: string) => number;
  seriesName: (seriesId: string) => { name: string; short: string } | undefined;
}

export function autoNotes(events: RaceEvent[], { now, argentines, tierOf, seriesName }: Options): (Nota & { tier: number })[] {
  const nowMs = Date.parse(now);
  const out: (Nota & { tier: number })[] = [];

  for (const event of events) {
    const done = event.sessions.filter(withResults).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    if (!done.length) continue;
    const lastStart = Date.parse(done.at(-1)!.start);
    if (lastStart > nowMs || nowMs - lastStart > FRESH_DAYS * 86400000) continue;
    const series = seriesName(event.seriesId);
    if (!series) continue;

    // Sesiones agrupadas por día; el último día va en el resumen y los anteriores en el detalle.
    const days = new Map<string, Session[]>();
    for (const s of done) days.set(dayOf(s.start), [...(days.get(dayOf(s.start)) ?? []), s]);
    const ordered = [...days.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    const [latestDay, latest] = ordered[0];

    // Las sesiones más importantes del día, en el orden en que se corrieron (hasta tres: los TN y GT tienen muchas).
    const pick = (list: Session[]) =>
      [...list]
        .sort((a, b) => priority(b) - priority(a) || Date.parse(b.start) - Date.parse(a.start))
        .slice(0, 3)
        .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    const lead = pick(latest);
    const main = [...latest].sort((a, b) => priority(b) - priority(a) || Date.parse(b.start) - Date.parse(a.start))[0];

    // Cómo les fue a los argentinos en las sesiones destacadas (sin repetir a quien ya está entre los tres primeros).
    // En una carrera multiclase los argentinos van siempre, con su clase, aunque estén entre los tres primeros de la general.
    const shown = new Set(lead.flatMap((s) => (esMulticlase(s.results) ? [] : top(s, 3).map((r) => r.driver))));
    const home: string[] = [];
    for (const s of lead) {
      for (const r of s.results ?? []) {
        if (!r.driverSlug || !argentines.has(r.driverSlug) || shown.has(r.driver)) continue;
        shown.add(r.driver);
        const visible = lower(nombreVisibleSesion(s, event.sessions));
        // Multiclase (GT3, la general del Rally): vale el puesto en su clase, con la general entre paréntesis.
        const enClase = !r.status && fraseEnClase(s.results, r, s.kind, { plural: crew(r.driver) });
        home.push(
          r.status
            ? `${r.driver} no completó la ${visible}`
            : enClase
              ? `${r.driver} ${enClase.replace(/ \(/, ` en la ${visible} (`)}`
              : `${r.driver} ${crew(r.driver) ? "fueron" : "fue"} ${ordinal(r.pos)} en la ${visible}`,
        );
      }
    }

    const summary = [...lead.map((s) => line(s, event.sessions)).filter(Boolean), ...(home.length ? [`${home.slice(0, 3).join("; ")}.`] : [])].join(" ");
    const details = ordered
      .slice(1)
      .map(([day, list]) => `${capitalize(dayName(new Date(`${day}T12:00:00-03:00`)))}: ${pick(list).map((s) => line(s, event.sessions)).filter(Boolean).join(" ")}`);

    const sources = [...new Set(done.map((s) => s.resultsSource?.name).filter((n): n is string => !!n))];
    // Un argentino que ganó su clase en la sesión principal es la noticia, aunque la general la haya ganado otro auto (Portimão, 17/10/2026).
    const classWin = (main.results ?? []).find((r) => r.driverSlug && argentines.has(r.driverSlug) && puestoEnClase(main.results, r)?.pos === 1);
    const classTitle =
      classWin && classWin.pos !== 1 && ["carrera", "final", "sprint", "clasificacion"].includes(main.kind)
        ? `${event.name}: ${classWin.driver} ${main.kind === "clasificacion" ? (crew(classWin.driver) ? "hicieron la pole de" : "hizo la pole de") : crew(classWin.driver) ? "ganaron en" : "ganó en"} ${nombreClase(classWin.class!)}${main.kind === "clasificacion" || event.name.includes(main.name) ? "" : ` en la ${lower(nombreVisibleSesion(main, event.sessions))}`}`
        : null;
    const title = classTitle ?? headline(event, main);
    out.push({
      slug: `${event.id}-cronica`,
      title,
      seoTitle: seoHeadline(series.name, event.name, title),
      publishedAt: latestDay,
      source: { medio: `Fierros · ${series.short}`, url: `/eventos/${event.id}`, headline: event.name },
      summary,
      details,
      auto: { sources },
      events: [event.id],
      series: [event.seriesId],
      tier: tierOf(event.seriesId),
    });
  }

  return out.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.tier - b.tier).slice(0, MAX_AUTO);
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
