import pilotosJson from "@/data/juego/pilotos.json";
import pistasJson from "@/data/juego/pistas.json";
import { dia, fechaValida, segundosHastaFinDelDia } from "./dia.mjs";
import { JUEGO_INICIO, MAX_INTENTOS } from "./config.mjs";
import { pilotoDelDia } from "./rotacion.mjs";

// Todo lo que sabe la respuesta del día vive acá y sólo se importa desde los route handlers: nada de esto llega al navegador.

export interface PilotoJuego {
  slug: string;
  nombre: string;
  nacio: number;
  provincia: string;
  region?: string;
  categorias: string[];
  titulos: number;
  titulosDetalle?: { categoria: string; anio: number }[];
  corre2026: boolean;
  fuentes: { wikidata?: string; wikipedia?: string; campeones?: string[] };
}
export interface PistaJuego {
  texto: string;
  fuente: string;
}
export type PistasJuego = Record<string, { desde: string; pistas: PistaJuego[] }>;

/** Inicio del juego. Se puede adelantar o atrasar con la variable JUEGO_INICIO (útil para probar en una vista previa). */
export const INICIO: string = fechaValida(process.env.JUEGO_INICIO) ? (process.env.JUEGO_INICIO as string) : JUEGO_INICIO;

let cacheBase: PilotoJuego[] | null = null;
/** La base de pilotos (generada por `npm run sync:juego`). Se importa para que viaje con las funciones de /api/juego; vacía, el juego dice "Muy pronto". */
export function pilotosJuego(): PilotoJuego[] {
  if (cacheBase) return cacheBase;
  const lista: unknown[] = Array.isArray(pilotosJson?.pilotos) ? pilotosJson.pilotos : [];
  cacheBase = (lista as PilotoJuego[]).filter((p) => p && typeof p.slug === "string" && typeof p.nombre === "string");
  return cacheBase;
}

export const pistasDelJuego = (): PistasJuego => pistasJson as unknown as PistasJuego;

let avisoSemilla = false;
export function semilla(): string {
  const s = process.env.JUEGO_SEMILLA;
  if (s) return s;
  if (!avisoSemilla) {
    avisoSemilla = true;
    if (process.env.NODE_ENV === "production") console.error("[juego] Falta JUEGO_SEMILLA: se usa una semilla fija y el orden de los pilotos es predecible. Cargala en Vercel.");
    else console.warn("[juego] Falta JUEGO_SEMILLA: se usa la semilla de desarrollo.");
  }
  return process.env.NODE_ENV === "production" ? "fierros-sin-semilla" : "dev";
}

const respuestas = new Map<string, PilotoJuego | null>();
/** El piloto del día (memorizado: la rotación recorre todos los días desde el lanzamiento). */
export function respuestaDelDia(fecha: string): PilotoJuego | null {
  const clave = `${semilla()}|${fecha}|${pilotosJuego().length}`;
  if (!respuestas.has(clave)) {
    if (respuestas.size > 400) respuestas.clear();
    respuestas.set(clave, pilotoDelDia(fecha, pilotosJuego(), pistasDelJuego(), semilla(), INICIO) as PilotoJuego | null);
  }
  return respuestas.get(clave) ?? null;
}

export const buscarPiloto = (slug: string) => pilotosJuego().find((p) => p.slug === slug);

const SLUG = /^[a-z0-9-]{1,80}$/;

/** Lista de slugs separados por coma, sin repetidos. Devuelve null si algo no es un piloto de la base o hay demasiados. */
export function slugsValidos(texto: string | null): PilotoJuego[] | null {
  if (!texto) return null;
  const slugs = [...new Set(texto.split(","))];
  if (slugs.length > MAX_INTENTOS + 4) return null;
  const pilotos: PilotoJuego[] = [];
  for (const s of slugs) {
    const p = SLUG.test(s) ? buscarPiloto(s) : undefined;
    if (!p) return null;
    pilotos.push(p);
  }
  return pilotos;
}

export type Contexto = { ok: true; fecha: string; respuesta: PilotoJuego; hoy: string } | { ok: false; status: number; error: string };

/** Valida la fecha pedida (sólo de hoy o anteriores, desde el lanzamiento) y busca la respuesta de ese día. */
export function contexto(fecha: string | null, ahora = new Date()): Contexto {
  if (!fecha || !fechaValida(fecha)) return { ok: false, status: 400, error: "fecha inválida" };
  const hoy = dia(ahora, INICIO).fecha;
  if (fecha > hoy) return { ok: false, status: 400, error: "ese día todavía no llegó" };
  if (fecha < INICIO) return { ok: false, status: 404, error: "el juego todavía no empezó" };
  const respuesta = respuestaDelDia(fecha);
  if (!respuesta) return { ok: false, status: 404, error: "sin piloto para ese día" };
  return { ok: true, fecha, respuesta, hoy };
}

/** Cache de la CDN hasta que termine el día argentino (los días pasados no cambian: un día entero alcanza). */
export function cacheHastaFinDelDia(fecha: string, hoy: string, ahora = new Date()): string {
  const s = fecha === hoy ? segundosHastaFinDelDia(ahora) : 86400;
  return `public, max-age=0, s-maxage=${s}`;
}

export function json(cuerpo: unknown, init: { status?: number; cache?: string } = {}) {
  return Response.json(cuerpo, { status: init.status ?? 200, headers: { "Cache-Control": init.cache ?? "no-store" } });
}
