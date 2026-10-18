import { drivers } from "@/data/drivers";
import { legends } from "@/data/legends";
import { series } from "@/data/series";
import { JUEGO_NOMBRE } from "./juego/config.mjs";
import { horarioSeriesSlug, horarioSeriesIds } from "./horarios";
import type { Nota } from "@/data/notas";
import type { Scope } from "./types";

// Estructura del menú principal: cada ítem lleva sus subelementos. Se arma en el servidor con los datos del sitio (categorías,
// pilotos, notas, leyendas), así el menú nunca queda desactualizado respecto de lo que hay.

export interface MenuLink {
  label: string;
  href: string;
  /** Texto de apoyo a la derecha o debajo (medio de una nota, años de una leyenda…). */
  hint?: string;
  /** Sello de color de la categoría. */
  code?: string;
  color?: string;
}
export interface MenuGroup {
  label?: string;
  links: MenuLink[];
}
export interface MenuItem {
  href: string;
  label: string;
  groups: MenuGroup[];
  /** Enlace final del panel ("Ver todas las categorías"). */
  all?: MenuLink;
}

const SCOPES: { id: Scope; label: string }[] = [
  { id: "nacional", label: "Nacionales" },
  { id: "internacional", label: "Internacionales" },
  { id: "zonal", label: "Zonales" },
];

const byScope = (make: (s: (typeof series)[number]) => MenuLink | null): MenuGroup[] =>
  SCOPES.map(({ id, label }) => ({ label, links: series.filter((s) => s.scope === id).flatMap((s) => make(s) ?? []) })).filter((g) => g.links.length > 0);

const chip = (s: (typeof series)[number]) => ({ code: s.code, color: s.color });

/** `notes`: las notas más recientes, ya ordenadas (las de medios y las crónicas automáticas; ver getAllNotes en notas.ts). */
export function getMenu(notes: Nota[]): MenuItem[] {
  const hasHorario = new Set(horarioSeriesIds());
  const seriesById = new Map(series.map((s) => [s.id, s]));

  return [
    // Sin `groups`: es un enlace directo, sin desplegable, para que se vea en el celular sin abrir nada.
    { href: "/hoy", label: "Hoy", groups: [] },
    {
      href: "/",
      label: "Este finde",
      groups: [
        {
          links: [
            { label: "Agenda", href: "/#agenda", hint: "Lo que está pasando y lo que sigue" },
            { label: "Los nuestros", href: "/#nuestros", hint: "Argentinos que corren afuera" },
            { label: "Resultados", href: "/#resultados", hint: "Lo último que se corrió" },
            { label: "Lo que viene", href: "/#viene", hint: "Próximas fechas" },
            { label: "Lo que se dice", href: "/#notas", hint: "Notas de los medios" },
          ],
        },
      ],
    },
    {
      href: "/horarios",
      label: "Horarios",
      groups: byScope((s) => (hasHorario.has(s.id) ? { label: s.name, href: `/horarios/${horarioSeriesSlug(s.id)}`, ...chip(s) } : null)),
      all: { label: "Todos los horarios", href: "/horarios" },
    },
    {
      href: "/calendario",
      label: "Calendario",
      groups: [
        {
          links: [
            { label: "Todas las fechas", href: "/calendario", hint: "Nacional, internacional y zonal" },
            { label: "Automovilismo nacional", href: "/calendario#nacional", hint: "TC, TN, TC2000 y más" },
            { label: "Internacional", href: "/calendario#internacional", hint: "F1, F2, GT, WEC y más" },
            { label: "Zonales", href: "/calendario#zonal", hint: "Procar4000 y otros" },
          ],
        },
      ],
    },
    {
      href: "/pilotos",
      label: "Pilotos",
      groups: [{ label: "Destacados", links: drivers.flatMap((d) => (seriesById.get(d.seriesId) ? [{ label: d.name, href: `/pilotos/${d.slug}`, ...chip(seriesById.get(d.seriesId)!) }] : [])) }],
      all: { label: "Todos los pilotos argentinos", href: "/pilotos" },
    },
    {
      href: "/categorias",
      label: "Categorías",
      groups: byScope((s) => ({ label: s.name, href: `/categorias/${s.id}`, ...chip(s) })),
      all: { label: "Todas las categorías", href: "/categorias" },
    },
    {
      href: "/notas",
      label: "Notas",
      groups: [{ label: "Últimas notas", links: notes.slice(0, 4).map((n) => ({ label: n.title, href: `/notas/${n.slug}`, hint: n.source.medio })) }],
      all: { label: "Todas las notas", href: "/notas" },
    },
    {
      href: "/historicos",
      label: "Historias",
      groups: [{ label: "Leyendas", links: legends.map((l) => ({ label: l.name, href: `/historicos/${l.slug}`, hint: l.years })) }],
      all: { label: "Todas las historias", href: "/historicos" },
    },
    // Enlace directo, sin desplegable.
    { href: "/juego", label: JUEGO_NOMBRE, groups: [] },
  ];
}
