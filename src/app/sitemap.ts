import type { MetadataRoute } from "next";
import { getAllDrivers, getAllSeries, getIndexedDrivers, getSeason } from "@/lib/data";
import { legends } from "@/data/legends";
import { allHorarioSlugs } from "@/lib/horarios";
import { getAllNotes } from "@/lib/notas";
import { sessionEnd, sessionStatus } from "@/lib/session-status.mjs";
import { SITE_URL } from "@/lib/site";
import type { RaceEvent } from "@/lib/types";

export const revalidate = 3600;

/** Cuándo cambió por última vez la página de una fecha: cuando terminó su última sesión, si eso fue antes de la versión vigente de los datos. */
function eventModified(event: RaceEvent, seasonDate: Date, now: string): Date {
  const done = event.sessions.filter((s) => sessionStatus(s, now) === "done").map(sessionEnd);
  return done.length ? new Date(Math.min(Math.max(...done), seasonDate.getTime())) : seasonDate;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const season = await getSeason();
  const now = new Date().toISOString();
  // Las páginas que dependen de la temporada cambian cuando cambia la versión vigente de los datos, no "ahora": si no, Google aprende a ignorar la fecha.
  const seasonDate = new Date(season.source?.createdAt ?? season.source?.generatedAt ?? season.updatedAt);
  const notes = await getAllNotes();
  const newestNote = notes.length ? new Date(`${notes[0].publishedAt}T12:00:00-03:00`) : seasonDate;
  const page = (path: string, changeFrequency: "hourly" | "daily" | "weekly" | "monthly", priority: number, lastModified?: Date) => ({
    url: `${SITE_URL}${path}`,
    ...(lastModified ? { lastModified } : {}),
    changeFrequency,
    priority,
  });

  const drivers = new Set([...getAllDrivers().map((d) => d.slug), ...getIndexedDrivers().map((d) => d.slug)]);
  return [
    page("/", "hourly", 1, seasonDate),
    page("/hoy", "hourly", 0.9, seasonDate),
    page("/calendario", "daily", 0.9, seasonDate),
    page("/horarios", "daily", 0.9, seasonDate),
    ...allHorarioSlugs().map((slug) => page(`/horarios/${slug}`, "hourly", 0.9, seasonDate)),
    page("/pilotos", "daily", 0.8, seasonDate),
    page("/categorias", "weekly", 0.7, seasonDate),
    page("/notas", "daily", 0.7, newestNote),
    // Las de medios y las crónicas automáticas (una por fecha reciente).
    ...notes.map((n) => page(`/notas/${n.slug}`, "monthly", 0.5, new Date(`${n.publishedAt}T12:00:00-03:00`))),
    page("/historicos", "monthly", 0.5),
    page("/juego", "monthly", 0.5),
    page("/fuentes", "monthly", 0.2),
    page("/acerca", "monthly", 0.3),
    page("/terminos", "monthly", 0.1),
    page("/privacidad", "monthly", 0.1),
    ...getAllSeries().map((s) => page(`/categorias/${s.id}`, "weekly", 0.7, seasonDate)),
    // Las clases de las categorías que las tienen (Córdoba Pista).
    ...getAllSeries().flatMap((s) => (s.classes ?? []).map((c) => page(`/categorias/${s.id}/${c.id}`, "weekly", 0.6, seasonDate))),
    ...season.getAllEvents().map((e) => page(`/eventos/${e.id}`, "daily", 0.8, eventModified(e, seasonDate, now))),
    ...[...drivers].map((slug) => page(`/pilotos/${slug}`, "weekly", 0.6, seasonDate)),
    ...legends.map((l) => page(`/historicos/${l.slug}`, "monthly", 0.5)),
  ];
}
