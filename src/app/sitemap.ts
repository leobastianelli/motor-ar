import type { MetadataRoute } from "next";
import { getAllDrivers, getAllSeries, getIndexedDrivers, getSeason } from "@/lib/data";
import { legends } from "@/data/legends";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const season = await getSeason();
  const now = new Date();
  const page = (path: string, changeFrequency: "hourly" | "daily" | "weekly" | "monthly", priority: number) => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency, priority });

  const drivers = new Set([...getAllDrivers().map((d) => d.slug), ...getIndexedDrivers().map((d) => d.slug)]);
  return [
    page("/", "hourly", 1),
    page("/calendario", "daily", 0.9),
    page("/pilotos", "daily", 0.8),
    page("/categorias", "weekly", 0.7),
    page("/historicos", "monthly", 0.5),
    page("/fuentes", "monthly", 0.2),
    page("/terminos", "monthly", 0.1),
    page("/privacidad", "monthly", 0.1),
    ...getAllSeries().map((s) => page(`/categorias/${s.id}`, "weekly", 0.7)),
    ...season.getAllEvents().map((e) => page(`/eventos/${e.id}`, "daily", 0.8)),
    ...[...drivers].map((slug) => page(`/pilotos/${slug}`, "weekly", 0.6)),
    ...legends.map((l) => page(`/historicos/${l.slug}`, "monthly", 0.5)),
  ];
}
