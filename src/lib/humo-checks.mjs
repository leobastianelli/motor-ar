// Comparaciones puras de la prueba de humo (scripts/humo.mjs): reciben lo que respondió el sitio y devuelven una lista de problemas
// (vacía = todo bien). Sin red ni Next, para que `npm test` las cubra.
import { parseDataMeta } from "./salud-core.mjs";

export const MAX_PAGE_MS = 3000;

const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

/** Texto visible del HTML, sin tildes ni mayúsculas: para buscar nombres sin depender de cómo los parta el marcado. */
export const visibleText = (html) => norm(decode(String(html).replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ")));

/** Versión (`v=`) del `<meta name="fierros-datos">` de una página, o null si no está. */
export function metaVersion(html) {
  const tag = String(html).match(/<meta\b[^>]*\bname="fierros-datos"[^>]*>/)?.[0];
  const content = tag?.match(/\bcontent="([^"]*)"/)?.[1];
  return parseDataMeta(content === undefined ? undefined : decode(content))?.v ?? null;
}

/** 1. /api/salud debe leer del almacén, no del respaldo. */
export function checkSalud(salud) {
  if (!salud) return ["/api/salud no devolvió un JSON válido"];
  const problems = [];
  if (salud.sirviendo?.servedFrom !== "store") problems.push(`/api/salud sirve "${salud.sirviendo?.servedFrom ?? "?"}" en vez de "store"${salud.almacen?.error ? ` (${salud.almacen.error})` : ""}`);
  return problems;
}

/** 2. Cada página responde 200 en menos de MAX_PAGE_MS. `pages`: [{ path, status, ms }] (las páginas que no son de la lista de tiempo no llevan `ms`). */
export function checkPages(pages, { maxMs = MAX_PAGE_MS } = {}) {
  const problems = [];
  for (const p of pages) {
    if (p.status !== 200) problems.push(`${p.path} respondió ${p.status ?? "sin respuesta"}`);
    else if (p.ms !== undefined && p.ms >= maxMs) problems.push(`${p.path} tardó ${p.ms} ms (máximo ${maxMs} ms)`);
  }
  return problems;
}

/** 3. El `v=` es el mismo en las cuatro páginas y coincide con la última versión del almacén. `htmlByPath`: { "/": html, … }. */
export function checkConsistency(salud, htmlByPath) {
  const problems = [];
  const stored = salud?.almacen?.ultimaVersion;
  const seen = Object.entries(htmlByPath).map(([path, html]) => [path, metaVersion(html)]);
  for (const [path, v] of seen) if (v === null) problems.push(`${path} no tiene <meta name="fierros-datos">`);
  const versions = new Set(seen.map(([, v]) => v).filter((v) => v !== null));
  if (versions.size > 1) problems.push(`las páginas muestran versiones distintas: ${seen.map(([p, v]) => `${p}=${v ?? "—"}`).join(", ")}`);
  if (stored == null) problems.push("/api/salud no informa la última versión del almacén");
  else for (const [path, v] of seen) if (v !== null && v !== String(stored)) problems.push(`${path} muestra la versión ${v} y el almacén tiene la ${stored}`);
  return problems;
}

/** 4. La página de cada evento nombra al ganador de sus sesiones recientes. `eventHtml`: { [idEvento]: html }. */
export function checkFreshness(ganadores, eventHtml) {
  const problems = [];
  const text = new Map(Object.entries(eventHtml).map(([id, html]) => [id, visibleText(html)]));
  for (const g of ganadores ?? []) {
    const page = text.get(g.evento);
    if (page === undefined) problems.push(`no se pudo leer la página del evento ${g.evento}`);
    else if (!page.includes(norm(g.ganador))) problems.push(`/eventos/${g.evento} no nombra a ${g.ganador}, ganador de "${g.sesion}" (${g.categoria})`);
  }
  return problems;
}

/** 5. Cada crónica automática está en /notas y, si le toca, en el menú del HTML de `/`. */
export function checkNotes(cronicas, notasHtml, homeHtml) {
  const problems = [];
  for (const c of cronicas ?? []) {
    const href = `/notas/${c.slug}`;
    if (!String(notasHtml).includes(`href="${href}"`)) problems.push(`la crónica "${c.title}" no está en /notas`);
    if (c.enMenu && !String(homeHtml).includes(`href="${href}"`)) problems.push(`la crónica "${c.title}" no está en el menú de /`);
  }
  return problems;
}
