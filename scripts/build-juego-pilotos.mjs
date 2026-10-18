// Base de pilotos argentinos para el juego diario (docs/juego/00-diseno.md).
// Cruza Wikidata (SPARQL) con los artículos de Wikipedia en español, las listas de campeones y nuestros datos de 2026.
// Regla de certeza: ante la duda el piloto queda afuera y el motivo va a docs/juego/reporte-base.md.
// Uso: node scripts/build-juego-pilotos.mjs   (npm run sync:juego)
// Las descargas se cachean en JUEGO_CACHE (por defecto una carpeta temporal fuera del repo). Borrá el caché para forzar datos nuevos.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { repairMojibake } from "../src/lib/sources/common.mjs";
import { clean, section, tables } from "../src/lib/sources/wikitext.mjs";
import { categoriaDe, CATEGORIAS } from "./juego-categorias.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = process.env.JUEGO_CACHE ?? path.join(os.tmpdir(), "fierros-juego-cache");
fs.mkdirSync(CACHE, { recursive: true });
const UA = "fierros-motor-ar/0.1 (leonelbastianelli@gmail.com)";
const NOW_YEAR = 2026;

// ---------------------------------------------------------------- red con caché

let lastRequest = 0;
async function polite(url, init = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = lastRequest + 300 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequest = Date.now();
    try {
      const res = await fetch(url, { ...init, headers: { "User-Agent": UA, ...init.headers } });
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      return res;
    } catch {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw new Error(`Sin respuesta de ${url}`);
}

const safe = (s) => encodeURIComponent(s).replace(/%/g, "_").slice(0, 150);
function fromCache(key) {
  const file = path.join(CACHE, key);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}
const toCache = (key, text) => fs.writeFileSync(path.join(CACHE, key), text);

async function wikiRaw(lang, title, hops = 0) {
  const key = `wp-${lang}-${safe(title)}.txt`;
  let text = fromCache(key);
  if (text === null) {
    const res = await polite(`https://${lang}.wikipedia.org/w/index.php?title=${encodeURIComponent(title.replace(/ /g, "_"))}&action=raw`);
    if (res.status === 404) text = "";
    else if (!res.ok) throw new Error(`${lang}.wikipedia ${title}: ${res.status}`);
    else text = repairMojibake(await res.text());
    toCache(key, text);
  }
  const redirect = text.match(/^\s*#(?:REDIRECCI[ÓO]N|REDIRECT)\s*\[\[([^\]|#]+)/i);
  if (redirect && hops < 2) return wikiRaw(lang, redirect[1].trim(), hops + 1);
  return text;
}

async function sparql(query, key) {
  let text = fromCache(key);
  if (text === null) {
    const res = await polite("https://query.wikidata.org/sparql", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/sparql-results+json" },
      body: `format=json&query=${encodeURIComponent(query)}`,
    });
    if (!res.ok) throw new Error(`Wikidata SPARQL ${res.status}: ${(await res.text()).slice(0, 200)}`);
    text = await res.text();
    toCache(key, text);
  }
  return JSON.parse(text).results.bindings.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])));
}

const qid = (uri) => uri?.match(/(Q\d+)$/)?.[1] ?? null;

// ---------------------------------------------------------------- utilidades de texto

const strip = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const slugify = (s) => strip(s).replace(/ /g, "-");
const unParen = (s) => s.replace(/\s*\([^)]*\)\s*$/, "").trim();
const ROMANO = /\s+(i{1,3}|iv|v|vi{0,3}|ix|x)$/i;

// ---------------------------------------------------------------- provincias y regiones

const PROVINCIAS = {
  Q1486: "Ciudad de Buenos Aires",
  Q44754: "Buenos Aires",
  Q44759: "Córdoba",
  Q44823: "Santa Fe",
  Q44762: "Entre Ríos",
  Q44795: "La Pampa",
  Q44797: "Mendoza",
  Q44805: "San Juan",
  Q44818: "San Luis",
  Q44764: "Jujuy",
  Q44803: "Salta",
  Q44829: "Tucumán",
  Q44756: "Catamarca",
  Q44827: "Santiago del Estero",
  Q44796: "La Rioja",
  Q44798: "Misiones",
  Q44758: "Corrientes",
  Q44757: "Chaco",
  Q44761: "Formosa",
  Q44800: "Neuquén",
  Q44802: "Río Negro",
  Q45007: "Chubut",
  Q44821: "Santa Cruz",
  Q44832: "Tierra del Fuego",
};
const REGIONES = {
  Bonaerense: ["Ciudad de Buenos Aires", "Buenos Aires"],
  Centro: ["Córdoba", "Santa Fe", "Entre Ríos", "La Pampa"],
  Cuyo: ["Mendoza", "San Juan", "San Luis"],
  NOA: ["Jujuy", "Salta", "Tucumán", "Catamarca", "Santiago del Estero", "La Rioja"],
  NEA: ["Misiones", "Corrientes", "Chaco", "Formosa"],
  Patagonia: ["Neuquén", "Río Negro", "Chubut", "Santa Cruz", "Tierra del Fuego"],
  Exterior: ["Exterior"],
};
const regionDe = (prov) => Object.entries(REGIONES).find(([, list]) => list.includes(prov))?.[0] ?? null;

// Títulos de artículo de Wikipedia que son una provincia (o la ciudad de Buenos Aires) sin necesidad de consultar Wikidata.
const TITULO_A_PROVINCIA = new Map();
for (const name of Object.values(PROVINCIAS)) {
  if (name === "Ciudad de Buenos Aires") continue;
  const n = strip(name);
  for (const t of [`provincia de ${n}`, `provincia del ${n}`, `${n} provincia`, `${n} provincia de argentina`, `${n} provincia argentina`]) TITULO_A_PROVINCIA.set(t, name);
}
TITULO_A_PROVINCIA.set("provincia de tierra del fuego antartida e islas del atlantico sur", "Tierra del Fuego");
TITULO_A_PROVINCIA.set("provincia de tierra del fuego", "Tierra del Fuego");
for (const t of ["buenos aires", "ciudad de buenos aires", "ciudad autonoma de buenos aires", "capital federal argentina", "capital federal"]) TITULO_A_PROVINCIA.set(t, "Ciudad de Buenos Aires");
// Nombre pelado en texto sin enlace: "Córdoba", "Santa Fe"... "Buenos Aires" solo es ambiguo (ciudad o provincia) y no se resuelve.
const TEXTO_A_PROVINCIA = new Map();
for (const name of Object.values(PROVINCIAS)) if (name !== "Buenos Aires" && name !== "Ciudad de Buenos Aires") TEXTO_A_PROVINCIA.set(strip(name), name);
for (const t of ["ciudad de buenos aires", "ciudad autonoma de buenos aires", "capital federal", "caba"]) TEXTO_A_PROVINCIA.set(t, "Ciudad de Buenos Aires");
for (const t of ["provincia de buenos aires", "pcia de buenos aires", "provincia buenos aires"]) TEXTO_A_PROVINCIA.set(t, "Buenos Aires");

// ---------------------------------------------------------------- ocupaciones

const OCUPACIONES = {
  Q10349745: "piloto de automovilismo",
  Q378622: "piloto de carreras",
  Q10841764: "piloto de Fórmula 1",
  Q10842936: "piloto de rally",
  Q55441806: "piloto de rally raid (auto)",
  Q131717390: "motociclista de rally raid",
  Q3014296: "motociclista",
  Q108806370: "piloto de cuatriciclo",
  Q12327806: "motociclista de motocross",
};
const SOLO_MOTO = new Set(["Q131717390", "Q3014296", "Q108806370", "Q12327806"]);

// ---------------------------------------------------------------- paso A: Wikidata

async function wikidataPersonas() {
  const q = `SELECT ?p ?pLabel ?o ?birth ?prec ?death ?place ?art WHERE {
  VALUES ?o { ${Object.keys(OCUPACIONES).map((o) => `wd:${o}`).join(" ")} }
  ?p wdt:P27 wd:Q414; wdt:P106 ?o.
  OPTIONAL { ?p p:P569/psv:P569 [ wikibase:timeValue ?birth; wikibase:timePrecision ?prec ] }
  OPTIONAL { ?p wdt:P570 ?death }
  OPTIONAL { ?p wdt:P19 ?place }
  OPTIONAL { ?art schema:about ?p; schema:isPartOf <https://es.wikipedia.org/> }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}`;
  const rows = await sparql(q, "wd-personas-v1.json");
  const map = new Map();
  for (const r of rows) {
    const id = qid(r.p);
    const p = map.get(id) ?? { id, label: r.pLabel, ocupaciones: new Set(), births: new Set(), precs: new Set(), places: new Set(), dead: false, titles: new Set() };
    p.ocupaciones.add(qid(r.o));
    if (r.birth) {
      p.births.add(Number(r.birth.slice(0, 4)));
      p.precs.add(Number(r.prec));
    }
    if (r.death) p.dead = true;
    if (r.place) p.places.add(qid(r.place));
    if (r.art) p.titles.add(decodeURIComponent(r.art.replace(/^https:\/\/es\.wikipedia\.org\/wiki\//, "")).replace(/_/g, " "));
    map.set(id, p);
  }
  return [...map.values()];
}

/** Para una lista de QIDs de lugares: provincia argentina (por P131*) o "Exterior". */
async function resolverLugares(ids) {
  const out = new Map();
  const todos = [...new Set(ids)].filter(Boolean);
  const provValues = Object.keys(PROVINCIAS).map((q) => `wd:${q}`).join(" ");
  for (let i = 0; i < todos.length; i += 60) {
    const lote = todos.slice(i, i + 60);
    const query = `SELECT ?pl ?prov ?c ?isCountry WHERE {
  VALUES ?pl { ${lote.map((q) => `wd:${q}`).join(" ")} }
  OPTIONAL { ?pl wdt:P131* ?prov . VALUES ?prov { ${provValues} } }
  OPTIONAL { ?pl wdt:P17 ?c }
  BIND(EXISTS { ?pl wdt:P31/wdt:P279* wd:Q6256 } AS ?isCountry)
}`;
    const rows = await sparql(query, `wd-lugares-${safe(lote.join("_")).slice(0, 80)}-${lote.length}-${lote[0]}.json`);
    const por = new Map();
    for (const r of rows) {
      const id = qid(r.pl);
      const e = por.get(id) ?? { provs: new Set(), paises: new Set(), esPais: false };
      if (r.prov) e.provs.add(qid(r.prov));
      if (r.c) e.paises.add(qid(r.c));
      if (r.isCountry === "true") e.esPais = true;
      por.set(id, e);
    }
    for (const id of lote) {
      const e = por.get(id);
      if (!e) {
        out.set(id, { error: "lugar sin datos en Wikidata" });
      } else if (e.provs.size === 1) {
        out.set(id, { prov: PROVINCIAS[[...e.provs][0]] });
      } else if (e.provs.size > 1) {
        out.set(id, { error: `lugar en más de una provincia (${[...e.provs].map((q) => PROVINCIAS[q]).join(", ")})` });
      } else if (id === "Q414") {
        out.set(id, { pais: true });
      } else if (e.esPais) {
        out.set(id, { prov: "Exterior" });
      } else if (e.paises.size > 0 && !e.paises.has("Q414")) {
        out.set(id, { prov: "Exterior" });
      } else {
        out.set(id, { error: "no se pudo subir hasta una provincia" });
      }
    }
  }
  return out;
}

/** Título de Wikipedia (es) → QID de Wikidata, siguiendo redirecciones. */
async function titulosAQid(titles) {
  const out = new Map();
  const todos = [...new Set(titles)];
  for (let i = 0; i < todos.length; i += 40) {
    const lote = todos.slice(i, i + 40);
    const key = `wp-qid-${safe(lote.join("|")).slice(0, 100)}-${lote.length}-${i}.json`;
    let text = fromCache(key);
    if (text === null) {
      const url = `https://es.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops&ppprop=wikibase_item&redirects=1&titles=${encodeURIComponent(lote.join("|"))}`;
      const res = await polite(url);
      if (!res.ok) throw new Error(`API es.wikipedia ${res.status}`);
      text = await res.text();
      toCache(key, text);
    }
    const q = JSON.parse(text).query ?? {};
    const alias = new Map();
    for (const n of q.normalized ?? []) alias.set(n.from, n.to);
    for (const r of q.redirects ?? []) alias.set(r.from, r.to);
    const porTitulo = new Map(Object.values(q.pages ?? {}).map((p) => [p.title, p.pageprops?.wikibase_item ?? null]));
    for (const t of lote) {
      let cur = t;
      for (let k = 0; k < 3 && alias.has(cur); k++) cur = alias.get(cur);
      out.set(t, porTitulo.get(cur) ?? null);
    }
  }
  return out;
}

// ---------------------------------------------------------------- paso B: ficha y primera oración

/** Contenido de la primera plantilla "{{Ficha de ...". */
function extraerFicha(wt) {
  const m = wt.match(/\{\{\s*Ficha de [^|{}\n]+/i);
  if (!m) return null;
  let depth = 0;
  let i = m.index;
  for (; i < wt.length; i++) {
    const two = wt.slice(i, i + 2);
    if (two === "{{") {
      depth++;
      i++;
    } else if (two === "}}") {
      depth--;
      i++;
      if (depth === 0) break;
    }
  }
  const body = wt.slice(m.index + 2, i - 1);
  const params = new Map();
  let d = 0;
  let cur = "";
  const parts = [];
  for (let k = 0; k < body.length; k++) {
    const two = body.slice(k, k + 2);
    if (two === "{{" || two === "[[") {
      d++;
      cur += two;
      k++;
    } else if (two === "}}" || two === "]]") {
      d = Math.max(0, d - 1);
      cur += two;
      k++;
    } else if (body[k] === "|" && d === 0) {
      parts.push(cur);
      cur = "";
    } else cur += body[k];
  }
  parts.push(cur);
  const nombrePlantilla = parts.shift().trim();
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = strip(part.slice(0, eq)).replace(/ /g, "");
    const val = part.slice(eq + 1).trim();
    if (!params.has(key) || (!params.get(key) && val)) params.set(key, val);
  }
  return { plantilla: nombrePlantilla, params, fin: i + 1 };
}

const sinComentarios = (s) => String(s ?? "").replace(/<!--[\s\S]*?-->/g, "").replace(/<ref[^>]*\/>/gi, "").replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "");

/** Primer paréntesis (fuera de enlaces y plantillas) del primer párrafo con negrita. */
function primeraOracion(wt, desde = 0) {
  const body = sinComentarios(wt.slice(desde));
  const linea = body.split("\n").find((l) => /^'''/.test(l.trim()) || /^[^{|!*#=\s].*'''/.test(l.trim()));
  if (!linea) return null;
  const idxBold = linea.indexOf("'''");
  let i = linea.indexOf("'''", idxBold + 3);
  i = i === -1 ? idxBold : i + 3;
  let start = -1;
  let depth = 0;
  for (; i < linea.length; i++) {
    const two = linea.slice(i, i + 2);
    if (two === "[[") {
      i = linea.indexOf("]]", i) + 1 || linea.length;
    } else if (two === "{{") {
      let d = 0;
      for (; i < linea.length; i++) {
        const t = linea.slice(i, i + 2);
        if (t === "{{") {
          d++;
          i++;
        } else if (t === "}}") {
          d--;
          i++;
          if (d === 0) break;
        }
      }
    } else if (linea[i] === "(") {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (linea[i] === ")") {
      depth--;
      if (depth === 0 && start !== -1) return linea.slice(start, i);
    } else if (depth === 0 && /es |fue |era /.test(linea.slice(i, i + 4)) && start === -1) {
      return null; // llegó al verbo sin paréntesis de nacimiento
    }
  }
  return null;
}

const MESES = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre";
const RE_FECHA_TXT = new RegExp(`(?:\\[\\[)?\\d{1,2}(?:º|°|\\.º)?\\s+de\\s+(?:${MESES})(?:\\]\\])?\\s+de\\s+(?:\\[\\[)?\\d{4}(?:\\]\\])?|(?:${MESES})\\s+de\\s+\\d{4}`, "gi");

function aniosEn(raw) {
  const s = sinComentarios(raw);
  const found = new Set([...s.matchAll(/(?<![\d.])(1[89]\d\d|20[0-3]\d)(?![\d])/g)].map((m) => Number(m[1])));
  return [...found];
}

/** Año de nacimiento y lugar crudo que dice el artículo (ficha primero, primera oración como alternativa). */
function nacimientoWiki(wt) {
  const ficha = extraerFicha(wt);
  const res = { ficha, fechaFicha: null, lugarFicha: null, anioFicha: null, anioOracion: null, lugarOracion: null, notas: [] };
  const get = (...keys) => keys.map((k) => ficha?.params.get(k)).find((v) => v) ?? null;
  if (ficha) {
    const fecha = get("fechadenacimiento", "nacimiento", "fechanacimiento", "nacido");
    res.fechaFicha = fecha;
    if (fecha) {
      const a = aniosEn(fecha);
      if (a.length === 1) res.anioFicha = a[0];
      else if (a.length > 1) res.notas.push(`ficha con más de un año de nacimiento (${a.join(", ")})`);
    }
    res.lugarFicha = get("lugardenacimiento", "lugarnacimiento", "lugar", "origen");
  }
  const par = primeraOracion(wt, ficha?.fin ?? 0);
  if (par) {
    const nac = sinComentarios(par).split(/\s+[–—-]\s+|[–—]|(?<=\d{4})\s*-\s*(?=\[\[|[A-ZÁÉÍÓÚ])/)[0];
    const a = aniosEn(nac);
    if (a.length === 1) {
      res.anioOracion = a[0];
      let lug = nac.replace(/\{\{[^{}]*\}\}/g, " ").replace(RE_FECHA_TXT, " ").replace(/\[\[\d{4}\]\]/g, " ");
      lug = lug.replace(/\b(nacido|nacida|n\.|en|el)\b/gi, " ").replace(/\d{4}/g, " ").replace(/^[\s,;:]+|[\s,;:]+$/g, "");
      if (lug) res.lugarOracion = lug;
    }
  }
  return res;
}

const enlaces = (raw) =>
  [...sinComentarios(raw).matchAll(/\[\[(?!(?:Archivo|File|Imagen|Image):)([^\]|]+)(?:\|([^\]]*))?\]\]/gi)].map((m) => ({
    target: m[1].split("#")[0].replace(/_/g, " ").trim(),
    shown: (m[2] ?? m[1]).trim(),
  }));

// ---------------------------------------------------------------- categorías de un artículo

const TEXTOS_CATEGORIA = new Map(); // texto → { mapeo, veces }
function registrarTexto(texto, res) {
  const key = texto.trim();
  if (!key) return;
  const e = TEXTOS_CATEGORIA.get(key) ?? { cat: res?.cat ?? null, estado: res ? (res.cat ? "mapeada" : "ignorada") : "sin regla", regla: res?.regla ?? "", veces: 0 };
  e.veces++;
  TEXTOS_CATEGORIA.set(key, e);
}

/** Categorías de la lista cerrada que aparecen en un campo (wikitext) de ficha o celda de tabla. */
function categoriasEnCampo(raw) {
  const cats = new Set();
  const s = sinComentarios(raw);
  const candidatos = new Set();
  for (const l of enlaces(s)) {
    candidatos.add(l.target);
    candidatos.add(l.shown);
  }
  const plano = s.replace(/\[\[[^\]]*\]\]/g, "|");
  for (const seg of plano.split(/<br\s*\/?>|\||,|;|\/|\sy\s|\se\s|\+|\sy\s/i)) {
    const c = clean(seg);
    if (c && !/^[\d\s().-]+$/.test(c)) candidatos.add(c);
  }
  const whole = clean(s);
  if (whole) candidatos.add(whole);
  for (const t of [...candidatos]) {
    const temp = t.match(/^(?:Anexo:)?Temporada \d{4}(?:\/\d{2,4})? (?:de la |del |de )(.+)$/i);
    if (temp) candidatos.add(temp[1]);
  }
  for (const t of candidatos) {
    if (/\{\{|\}\}/.test(t)) continue;
    const res = categoriaDe(t);
    registrarTexto(t, res);
    if (res?.cat) cats.add(res.cat);
  }
  return cats;
}

const COL_CATEGORIA = /^(categoria|categorias|serie|series|campeonato|competicion|categoria serie|categoria campeonato|campeonato categoria|serie categoria)$/;

function categoriasArticulo(wt, ficha) {
  const cats = new Set();
  const origen = { ficha: new Set(), tablas: new Set() };
  let ultimoAnio = null;
  const anio = (s) => {
    for (const y of aniosEn(String(s))) ultimoAnio = Math.max(ultimoAnio ?? 0, y);
  };
  if (ficha) {
    for (const [key, val] of ficha.params) {
      if (!val) continue;
      if (/^campeonato\d*$/.test(key) || key === "competicionactual" || key === "anterioresciompeticiones" || key === "categoria" || key === "categorias" || key === "competicionesanteriores") {
        for (const c of categoriasEnCampo(val)) {
          cats.add(c);
          origen.ficha.add(c);
        }
      }
      if (/^anos\d*$/.test(key) || key === "anosactivo" || key === "ultimaparticipacion" || key === "temporadadedebut" || key === "ultimacarrera") anio(val);
    }
  }
  for (const t of tables(wt)) {
    const hdr = t.rows.find((r) => r.cells.some((c) => c.header) && r.cells.length >= 2);
    if (!hdr) continue;
    const idx = hdr.cells.map((c, i) => (COL_CATEGORIA.test(strip(c.text)) ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) continue;
    const yIdx = hdr.cells.findIndex((c) => /^(temporada|ano|anos|year)$/.test(strip(c.text)));
    for (const row of t.rows) {
      if (row === hdr || row.cells.every((c) => c.header)) continue;
      for (const i of idx) {
        const cell = row.cells[i];
        if (!cell) continue;
        for (const c of categoriasEnCampo(cell.raw)) {
          cats.add(c);
          origen.tablas.add(c);
        }
      }
      if (yIdx >= 0 && row.cells[yIdx]) anio(row.cells[yIdx].text);
    }
  }
  return { cats, origen, ultimoAnio };
}

const PARIENTE = /\b(hij[oa]s?|padre|madre|hermanos?|hermanas?|sobrin[oa]s?|tí[oa]s?|prim[oa]s?|niet[oa]s?|abuel[oa]s?|espos[oa]|cuñad[oa]|suegr[oa]|yerno|familia|papá|mamá|pariente|descendiente)\b/i;
/** Categorías de la lista que nombra el propio piloto en el primer párrafo (se descartan las oraciones que hablan de un pariente). */
function categoriasIntro(wt, ficha) {
  const body = sinComentarios(wt.slice(ficha?.fin ?? 0));
  const linea = body.split("\n").find((l) => /^'''/.test(l.trim()) || /^[^{|!*#=\s].*'''/.test(l.trim()));
  if (!linea) return new Set();
  const cats = new Set();
  const oraciones = linea.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚ"«\[{'])/);
  for (const o of oraciones) {
    if (PARIENTE.test(clean(o))) continue;
    for (const l of enlaces(o)) {
      for (const t of [l.target, l.shown]) {
        const res = categoriaDe(t);
        registrarTexto(t, res);
        if (res?.cat) cats.add(res.cat);
      }
    }
  }
  return cats;
}


/** Títulos que declara la ficha por categoría de la lista cerrada (para contrastar con las listas). */
/** Cantidad de títulos que dice un campo "títulosN" de la ficha: "7 (1998, ...)" → 7; "2.º en 2005" (subcampeón) → 0; "1997" (un año) → 1. */
function numeroTitulos(t) {
  const txt = clean(t ?? "");
  const m = txt.match(/^\s*(\d+)\s*(\.?\s*[º°ª])?/);
  if (!m) return 0;
  if (m[2]) return 0;
  const n = Number(m[1]);
  if (n >= 1900) return new Set(txt.match(/\b(19|20)\d\d\b/g)).size;
  return n;
}
let DETALLE_FICHA = {};
function titulosFicha(ficha) {
  DETALLE_FICHA = {};
  const por = {};
  if (!ficha) return por;
  for (const [key, val] of ficha.params) {
    const m = key.match(/^campeonato(\d+)$/);
    if (!m) continue;
    const cats = [...categoriasEnCampo(val)];
    if (cats.length !== 1) continue;
    const t = ficha.params.get(`titulos${m[1]}`);
    const n = numeroTitulos(t);
    por[cats[0]] = (por[cats[0]] ?? 0) + n;
    DETALLE_FICHA[cats[0]] = [...(DETALLE_FICHA[cats[0]] ?? []), { campo: clean(val).slice(0, 80), titulos: clean(t ?? "").slice(0, 80) }];
  }
  return por;
}

// ---------------------------------------------------------------- listas de campeones

const FUENTES = {};
const histPath = path.join(ROOT, "src/data/history.json");

function camposDeHistoria() {
  const h = JSON.parse(fs.readFileSync(histPath, "utf8")).series;
  FUENTES.TC = h.tc.source.url;
  FUENTES.TC2000 = h.tc2000.source.url;
  FUENTES.TN = h.tn.source.url;
  FUENTES.F1 = h.f1.source.url;
  const lista = [];
  for (const c of h.tc.champions) lista.push({ cat: "TC", anio: c.year, nombre: c.driver, nota: c.detail });
  for (const c of h.tc2000.champions) lista.push({ cat: "TC2000", anio: c.year, nombre: c.driver, nota: c.detail });
  for (const c of h.tn.champions) lista.push({ cat: "TN", anio: c.year, nombre: c.driver, nota: c.group ?? c.detail });
  for (const c of h.f1.champions) if (c.argentine) lista.push({ cat: "F1", anio: c.year, nombre: c.driver, nota: c.detail });
  return lista;
}

const celdaPersona = (cell) => {
  const l = enlaces(cell.raw)[0];
  return { nombre: clean(cell.raw), link: l?.target ?? null };
};

async function campeonesTCPista() {
  const wt = await wikiRaw("es", "TC Pista");
  FUENTES["TC Pista"] = "https://es.wikipedia.org/wiki/TC_Pista";
  const t = tables(section(wt, "Campeones"))[0];
  const out = [];
  for (const row of t.rows) {
    const y = row.cells[0]?.text.match(/^\d{4}$/)?.[0];
    if (!y || !row.cells[1]) continue;
    out.push({ cat: "TC Pista", anio: Number(y), ...celdaPersona(row.cells[1]), nota: row.cells[2]?.text ?? "" });
  }
  return out;
}

async function campeonesTopRace() {
  const wt = await wikiRaw("es", "Top Race");
  FUENTES["Top Race"] = "https://es.wikipedia.org/wiki/Top_Race";
  const out = [];
  const descartados = [];
  const ts = tables(section(wt, "Campeones"));
  const debug = [];
  for (const t of ts) {
    let modo = null; // "original" | "v6"
    for (const row of t.rows) {
      const first = row.cells[0];
      if (!first) continue;
      if (row.cells.every((c) => c.header) || row.cells.length === 1) {
        if (/top race v6|trv6/i.test(first.text)) modo = "v6";
        else if (/original/i.test(first.text)) modo = "original";
        continue;
      }
      if (!modo || !row.cells[1]) continue;
      const y = first.text.match(/^(\d{4})$/)?.[1];
      debug.push(modo + " | " + first.text + " | " + clean(row.cells[1].raw));
      if (!y) {
        descartados.push(`${first.text}: ${clean(row.cells[1].raw)} (torneo que no es el campeonato anual)`);
        continue;
      }
      const anio = Number(y);
      // 2005: la Top Race original pasó a ser una segunda divisional ("Top Race Pista", campeón Claudio Kohler); la clase principal es la TRV6 (Ortelli).
      if (modo === "original" && anio >= 2005) {
        descartados.push(`${anio} Top Race original (segunda divisional): ${clean(row.cells[1].raw)}`);
        continue;
      }
      if (modo === "v6" && anio < 2005) continue;
      out.push({ cat: "Top Race", anio, ...celdaPersona(row.cells[1]), nota: modo === "v6" ? "TRV6" : "Top Race original" });
    }
  }
  if (process.env.JUEGO_DEBUG) console.log(debug.join("\n"));
  return { lista: out, descartados };
}

async function campeonesRally() {
  // Lista oficial por clase (scripts/juego-rally-campeones.tsv, transcripta del documento del Campeonato Rally Argentino).
  // La tabla de Wikipedia marca en negrita la "clase de mayor categoría", que no es un campeonato oficial: no sirve para contar títulos.
  const URL_OFICIAL = "https://www.rallyargentino.com/documentos/Campeones-Rally-Argentino-1980-2025.pdf";
  FUENTES.Rally = URL_OFICIAL;
  const out = [];
  const problemas = [];
  const filas = fs.readFileSync(path.join(ROOT, "scripts/juego-rally-campeones.tsv"), "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#"));
  for (const l of filas) {
    const [anio, clase, nombre] = l.split("\t");
    if (!/^\d{4}$/.test(anio) || !clase || !nombre) throw new Error(`Fila de rally inválida: ${l}`);
    // Las copas no son campeonatos.
    if (/^(copa|rc2 copa|clase copa)\b/i.test(clase)) continue;
    out.push({ cat: "Rally", anio: Number(anio), clase, nombre, nota: `clase ${clase}`, fuentes: [URL_OFICIAL], rallyOficial: true });
  }
  return { lista: out, problemas };
}

async function campeonesDakar() {
  const wt = await wikiRaw("es", "Rally Dakar");
  FUENTES.Dakar = "https://es.wikipedia.org/wiki/Rally_Dakar";
  const out = [];
  const copilotos = [];
  const bloques = [
    { sec: "Motos, coches y camiones", vehiculos: ["motos", "autos", "camiones"] },
    { sec: "Cuatriciclos, UTV/SSV y prototipos ligeros/Challenger", vehiculos: ["cuatriciclos", "UTV/SSV", "Challenger/prototipos"] },
  ];
  for (const b of bloques) {
    const t = tables(section(wt, b.sec))[0];
    for (const row of t.rows) {
      const y = row.cells[0]?.text.match(/^(\d{4})$/)?.[1];
      if (!y) continue;
      b.vehiculos.forEach((veh, k) => {
        const cell = row.cells[2 + 2 * k];
        if (!cell) return;
        const segs = cell.raw.split(/<br\s*\/?>/i);
        segs.forEach((seg, j) => {
          if (!/bandera\s*\|\s*ARG/i.test(seg)) return;
          const link = enlaces(seg)[0]?.target ?? null;
          const nombre = clean(seg);
          if (j === 0) out.push({ cat: "Dakar", anio: Number(y), nombre, link, nota: veh });
          else copilotos.push(`${y} ${veh}: ${nombre} (copiloto/acompañante, no se cuenta)`);
        });
      });
    }
  }
  return { lista: out, copilotos };
}

// ---------------------------------------------------------------- programa principal

const t0 = Date.now();
const log = (...a) => console.log(`[${Math.round((Date.now() - t0) / 1000)}s]`, ...a);

const excluidos = []; // { nombre, id, motivo }
const excluir = (p, motivo) => excluidos.push({ id: p.id, nombre: p.label, titulo: p.titulo ?? null, motivo });

log("Wikidata: personas");
const personas = await wikidataPersonas();
log(`${personas.length} personas`);
const conArticulo = personas.filter((p) => p.titles.size === 1);
for (const p of personas) {
  if (p.titles.size > 1) excluir(p, `varios artículos en es.wikipedia (${[...p.titles].join(" / ")})`);
  else if (p.titles.size === 0) excluir(p, "sin artículo en es.wikipedia");
  else p.titulo = [...p.titles][0];
}

log("Wikidata: lugares de nacimiento");
const lugaresWd = await resolverLugares(personas.flatMap((p) => [...p.places]));

log(`Wikipedia: ${conArticulo.length} artículos`);
let n = 0;
for (const p of conArticulo) {
  p.wt = await wikiRaw("es", p.titulo);
  if (++n % 50 === 0) log(`  ${n}/${conArticulo.length}`);
  if (!p.wt) excluir(p, "artículo vacío o no descargable");
}
const candidatos = conArticulo.filter((p) => p.wt);

// --- nacimiento: lugar según Wikipedia
for (const p of candidatos) p.nac = nacimientoWiki(p.wt);
const titulosEnlazados = new Set();
for (const p of candidatos) {
  p.lugarRaw = p.nac.lugarFicha || p.nac.lugarOracion || "";
  p.lugarFuente = p.nac.lugarFicha ? "ficha" : p.nac.lugarOracion ? "primera oración" : null;
  p.enlacesLugar = enlaces(p.lugarRaw).filter((l) => !/^\d|^\d{1,2} de |^(argentina)$/i.test(l.target));
  for (const l of p.enlacesLugar) if (!TITULO_A_PROVINCIA.has(strip(l.target))) titulosEnlazados.add(l.target);
}
log(`Wikipedia: ${titulosEnlazados.size} enlaces de lugar a resolver`);
const qidDeTitulo = await titulosAQid([...titulosEnlazados]);
const lugaresWp = await resolverLugares([...qidDeTitulo.values()]);

function provinciaWiki(p) {
  if (!p.lugarRaw) return { error: "el artículo no dice el lugar de nacimiento" };
  const detalle = [];
  const resolverLink = (l) => {
    const k = strip(l.target);
    if (TITULO_A_PROVINCIA.has(k)) return { prov: TITULO_A_PROVINCIA.get(k), directa: true };
    const id = qidDeTitulo.get(l.target);
    const r = id ? lugaresWp.get(id) : null;
    if (r?.prov) return { prov: r.prov, directa: false };
    if (r?.pais) return { pais: true };
    return { error: true };
  };
  if (p.enlacesLugar.length) {
    // Regla: el primer enlace es la localidad (o la provincia/ciudad si es lo único); los siguientes sólo nombran provincia o país.
    const primero = p.enlacesLugar[0];
    const r1 = resolverLink(primero);
    if (r1.pais) return { error: "el primer enlace del lugar es sólo el país" };
    if (r1.error) return { error: "no se pudo resolver la localidad del artículo ([[" + primero.target + "]])" };
    detalle.push("[[" + primero.target + "]]→" + r1.prov);
    for (const l of p.enlacesLugar.slice(1)) {
      const r = resolverLink(l);
      if (r.error || r.pais) continue;
      const k = strip(l.target);
      // "Buenos Aires" después de una localidad bonaerense es la provincia: se ignora. Cualquier otra provincia distinta es un conflicto.
      if (k === "buenos aires" && !r1.directa && r1.prov === "Buenos Aires") continue;
      if (r.prov !== r1.prov) return { error: "lugar contradictorio en el artículo (" + detalle.join(", ") + ", [[" + l.target + "]]→" + r.prov + ")" };
    }
    return { prov: r1.prov, detalle };
  }
  const res = new Set();
  const plano = clean(p.lugarRaw);
  for (const parte of plano.split(",")) {
    const k = strip(parte);
    if (TEXTO_A_PROVINCIA.has(k)) {
      res.add(TEXTO_A_PROVINCIA.get(k));
      detalle.push('"' + parte.trim() + '"→' + TEXTO_A_PROVINCIA.get(k));
    }
  }
  if (res.size === 1) return { prov: [...res][0], detalle };
  return { error: res.size ? "lugar ambiguo en el artículo (" + detalle.join(", ") + ")" : 'lugar sin enlaces y sin provincia inequívoca ("' + plano + '")' };
}

/** Año más alto que aparece en la prosa del artículo (sin referencias): si es viejo, el piloto no figura activo. */
function anioMaximoProsa(wt) {
  const prosa = sinComentarios(wt).replace(/\{\{[^{}]*\}\}/g, " ");
  const a = [...prosa.matchAll(/(?<![\d.])(19\d\d|20[0-3]\d)(?![\d])/g)].map((m) => Number(m[1]));
  return a.length ? Math.max(...a) : 0;
}

// --- listas de campeones
log("Listas de campeones");
const campeones = camposDeHistoria();
const topRace = await campeonesTopRace();
const rally = await campeonesRally();
const dakar = await campeonesDakar();
const tcPista = await campeonesTCPista();
campeones.push(...tcPista, ...topRace.lista, ...rally.lista, ...dakar.lista);
// Campeones que faltan en history.json u otras categorías internacionales: scripts/juego-campeones-extra.json (cada fila con sus fuentes).
const EXTRAS = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/juego-campeones-extra.json"), "utf8"));
for (const e of EXTRAS.campeones) campeones.push({ cat: e.categoria, anio: e.anio, nombre: e.nombre, link: e.link, nota: e.nota, fuentes: e.fuentes, extra: true });
// Títulos de las listas que no son campeonatos oficiales (cada uno con su motivo y fuentes en el mismo archivo).
for (const x of EXTRAS.excluidos ?? []) {
  const i = campeones.findIndex((c) => c.cat === x.categoria && c.anio === x.anio && strip(c.nombre) === strip(x.nombre) && !c.extra);
  if (i === -1) throw new Error(`Exclusión sin campeón en las listas: ${x.categoria} ${x.anio} ${x.nombre}`);
  campeones.splice(i, 1);
}
FUENTES["Mundial de Turismos"] = "https://en.wikipedia.org/wiki/World_Touring_Car_Championship";
FUENTES.Resistencia = "https://en.wikipedia.org/wiki/List_of_FIA_World_Endurance_champions";
FUENTES["Súper TC2000 (2012-2021)"] = "https://es.wikipedia.org/wiki/S%C3%BAper_TC2000";
// Correcciones de corre2026 investigadas a mano: scripts/juego-correcciones.json
const CORRECCIONES = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/juego-correcciones.json"), "utf8"));
const RESOLUCIONES = fs.existsSync(path.join(ROOT, "scripts/juego-resoluciones-titulos.json")) ? JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/juego-resoluciones-titulos.json"), "utf8")) : {};

// índice de nombres → personas (todas las candidatas con artículo, incluso las que luego se excluyan)
const porNombre = new Map();
const porConjunto = new Map(); // mismas palabras en cualquier orden ("Luis Rubén Di Palma" = "Rubén Luis Di Palma")
const conjunto = (k) => k.split(" ").filter(Boolean).sort().join(" ");
const porTitulo = new Map();
const add = (m, k, p) => {
  if (!k) return;
  const s = m.get(k) ?? new Set();
  s.add(p);
  m.set(k, s);
};
for (const p of candidatos) {
  const nombres = new Set([strip(p.label), strip(unParen(p.titulo))]);
  const nomFicha = p.nac.ficha?.params.get("nombre");
  if (nomFicha) nombres.add(strip(clean(nomFicha)));
  p.nombres = nombres;
  for (const k of nombres) add(porNombre, k, p);
  for (const k of nombres) add(porConjunto, conjunto(k), p);
  add(porTitulo, strip(p.titulo), p);
}

const sinAsignar = [];
const asignados = new Map(); // persona → [{cat, anio, nota}]
// Nombres de las listas que no coinciden con el título del artículo (verificados a mano).
const ALIAS_CAMPEONES = new Map([["juan fangio", "Juan Manuel Fangio"]]);
function asignar(c) {
  if (!c.link && ALIAS_CAMPEONES.has(strip(c.nombre))) c = { ...c, link: ALIAS_CAMPEONES.get(strip(c.nombre)) };
  let encontrados = [];
  let via = "";
  if (c.link) {
    // el enlace de la lista es lo más seguro: si apunta a un artículo de la base, es esa persona
    encontrados = [...(porTitulo.get(strip(c.link)) ?? [])];
    via = "enlace";
    if (!encontrados.length) {
      const hit = [...candidatos].filter((p) => strip(p.titulo) === strip(c.link));
      encontrados = hit;
    }
  }
  if (!encontrados.length) {
    const k = strip(unParen(c.nombre));
    let set = porNombre.get(k);
    if (!set) set = porNombre.get(k.replace(ROMANO, ""));
    encontrados = [...(set ?? [])];
    via = "nombre";
    if (!encontrados.length) {
      const cj = [...(porConjunto.get(conjunto(k)) ?? [])];
      if (cj.length) {
        encontrados = cj;
        via = "mismas palabras";
      }
    }
  }
  // La lista oficial del rally no tiene enlaces: sólo vale si el artículo del candidato habla de rally (evita homónimos de pista).
  if (c.rallyOficial) encontrados = encontrados.filter((p) => /rally/i.test(p.wt ?? ""));
  // guarda de edad: no puede ser campeón antes de los 14
  encontrados = encontrados.filter((p) => {
    const y = p.births.size === 1 ? [...p.births][0] : null;
    return y === null || c.anio - y >= 14;
  });
  if (encontrados.length === 1) {
    const p = encontrados[0];
    const arr = asignados.get(p) ?? [];
    // En el rally cada clase de un mismo año es un título aparte; en el resto, uno por categoría y año.
    if (!arr.some((x) => x.categoria === c.cat && x.anio === c.anio && x.clase === c.clase)) arr.push({ categoria: c.cat, anio: c.anio, clase: c.clase, via, fuentes: c.fuentes ?? (FUENTES[c.cat] ? [FUENTES[c.cat]] : []) });
    asignados.set(p, arr);
  } else {
    sinAsignar.push({ ...c, motivo: encontrados.length ? `ambiguo entre ${encontrados.map((p) => `${p.label} (${p.titulo})`).join(" / ")}` : "no está entre los pilotos argentinos de Wikidata con artículo" });
  }
}
for (const c of campeones) asignar(c);

// --- 2026
const d26 = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/drivers-2026.json"), "utf8")).drivers;
const season = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/season-2026.json"), "utf8"));
const SERIE_A_CAT = { tc: "TC", "tc-pista": "TC Pista", tc2000: "TC2000", tn: "TN", "rally-argentino": "Rally", f1: "F1" };
const entradas26 = d26.map((d) => ({ slug: d.slug, nombre: d.name, series: d.series, claves: new Set([d.key, ...(d.keys ?? []), ...(d.aliases ?? []), d.name].map(strip)) }));
for (const serie of ["f1", "f2"]) {
  for (const row of season.standings?.[serie] ?? []) {
    const k = strip(row.driver);
    let e = entradas26.find((x) => x.claves.has(k));
    if (!e) {
      e = { slug: null, nombre: row.driver, series: [], claves: new Set([k]) };
      entradas26.push(e);
    }
    if (!e.series.includes(serie)) e.series.push(serie);
  }
}
const por26 = new Map();
entradas26.forEach((e) => e.claves.forEach((k) => add(por26, k, e)));

// --- slugs conocidos
const legendsSrc = fs.readFileSync(path.join(ROOT, "src/data/legends.ts"), "utf8");
const slugLegend = new Map([...legendsSrc.matchAll(/slug:\s*"([^"]+)",\s*name:\s*"([^"]+)"/g)].map((m) => [strip(m[2]), m[1]]));

// ---------------------------------------------------------------- evaluación de cada candidato

log("Evaluando candidatos");
const REVISAR_TITULOS = [];
const SIN_DATOS_2026 = ["Top Race", "Dakar", "IndyCar", "Mundial de Turismos", "Resistencia"]; // categorías que drivers-2026.json y season-2026.json no cubren
const APLICADAS = [];
const INDETERMINABLES = [];
function correccion(p, slugs) {
  const claves = [...slugs, slugLegend.get(strip(p.label)), slugify(p.label), slugify(unParen(p.titulo))].filter(Boolean);
  for (const k of claves) if (CORRECCIONES[k] && typeof CORRECCIONES[k].corre2026 === "boolean") return { slug: k, corre2026: CORRECCIONES[k].corre2026, fuente: CORRECCIONES[k].fuente, nota: CORRECCIONES[k].nota };
  return null;
}
const AMBIGUOS_2026 = [];
const incluidos = [];

// homónimos dentro de las candidatas, para la regla de nombre único
const nombresRepetidos = new Map();
for (const p of candidatos) for (const k of p.nombres) nombresRepetidos.set(k, (nombresRepetidos.get(k) ?? 0) + 1);

for (const p of candidatos) {
  // 1) año
  if (p.births.size !== 1) {
    excluir(p, p.births.size ? `Wikidata tiene más de un año de nacimiento (${[...p.births].join(", ")})` : "Wikidata sin fecha de nacimiento");
    continue;
  }
  const anioWd = [...p.births][0];
  if ([...p.precs].some((x) => x < 9)) {
    excluir(p, "fecha de nacimiento de Wikidata con precisión menor a un año");
    continue;
  }
  const aniosWp = [p.nac.anioFicha, p.nac.anioOracion].filter((x) => x != null);
  if (!aniosWp.length) {
    excluir(p, `Wikipedia sin año de nacimiento legible${p.nac.notas.length ? ` (${p.nac.notas.join("; ")})` : ""}`);
    continue;
  }
  if (new Set(aniosWp).size > 1) {
    excluir(p, `Wikipedia con años de nacimiento distintos (ficha ${p.nac.anioFicha}, oración ${p.nac.anioOracion})`);
    continue;
  }
  if (aniosWp[0] !== anioWd) {
    excluir(p, `año de nacimiento distinto: Wikidata ${anioWd}, Wikipedia ${aniosWp[0]}`);
    continue;
  }
  // 2) provincia
  if (p.places.size !== 1) {
    excluir(p, p.places.size ? "Wikidata con más de un lugar de nacimiento" : "Wikidata sin lugar de nacimiento");
    continue;
  }
  const rwd = lugaresWd.get([...p.places][0]);
  if (!rwd?.prov) {
    excluir(p, `provincia de Wikidata sin resolver (${rwd?.error ?? "?"})`);
    continue;
  }
  const rwp = provinciaWiki(p);
  if (!rwp.prov) {
    excluir(p, `provincia de Wikipedia sin resolver: ${rwp.error}`);
    continue;
  }
  if (rwp.prov !== rwd.prov) {
    excluir(p, `provincia distinta: Wikidata ${rwd.prov}, Wikipedia ${rwp.prov} (${p.lugarFuente}: ${clean(p.lugarRaw)})`);
    continue;
  }
  // 3) categorías
  const { cats, origen, ultimoAnio } = categoriasArticulo(p.wt, p.nac.ficha);
  origen.intro = new Set();
  for (const c of categoriasIntro(p.wt, p.nac.ficha)) {
    if (!cats.has(c)) origen.intro.add(c);
    cats.add(c);
  }
  const titulosRaw = asignados.get(p) ?? [];
  const titulosDetalle = titulosRaw.map(({ categoria, anio, clase }) => (clase ? { categoria, anio, clase } : { categoria, anio })).sort((a, b) => a.anio - b.anio || a.categoria.localeCompare(b.categoria));
  for (const t of titulosDetalle) cats.add(t.categoria);
  const soloMoto = [...p.ocupaciones].every((o) => SOLO_MOTO.has(o));
  if (!cats.size) {
    excluir(p, "sin categorías de la lista");
    continue;
  }
  if (soloMoto && !(cats.has("Dakar") || cats.has("Rally"))) {
    excluir(p, "motociclista sin Dakar ni Rally");
    continue;
  }
  // 4) 2026
  const nombresP = [...p.nombres];
  const entradas = new Set();
  for (const k of nombresP) for (const e of por26.get(k) ?? []) entradas.add(e);
  let corre2026 = false;
  let slug26 = null;
  if (p.dead) {
    corre2026 = false;
  } else if (entradas.size) {
    const lista = [...entradas];
    const compatibles = lista.filter((e) => e.series.some((s) => cats.has(SERIE_A_CAT[s])));
    const homonimosBase = nombresP.some((k) => nombresRepetidos.get(k) > 1);
    const exPiloto = /\bex-?piloto\b|\bex-?corredor\b|\bretirad[oa]\b/i.test(clean(p.wt.slice(0, 1500)));
    if (compatibles.length === 1 && !homonimosBase) {
      corre2026 = true;
      slug26 = compatibles[0].slug;
    } else if (compatibles.length === 0 && lista.length === 1 && !homonimosBase && !exPiloto) {
      corre2026 = true;
      slug26 = lista[0].slug;
    } else {
      const corr = correccion(p, [...lista.map((e) => e.slug)]);
      if (corr) {
        corre2026 = corr.corre2026;
        slug26 = lista.find((e) => e.slug && e.series.some((x) => cats.has(SERIE_A_CAT[x])))?.slug ?? null;
        APLICADAS.push({ nombre: p.label, ...corr, motivo: "ambiguo en 2026" });
      } else {
      AMBIGUOS_2026.push({ nombre: p.label, titulo: p.titulo, entradas: lista.map((e) => `${e.nombre} [${e.series.join(", ")}]`), motivo: homonimosBase ? "otro piloto de la lista con el mismo nombre" : exPiloto ? "el artículo lo da por retirado y las series de 2026 no encajan" : "varias coincidencias" });
      excluir(p, "corre2026 ambiguo (ver reporte)");
      continue;
      }
    }
  } else {
    const sinDatos = SIN_DATOS_2026.filter((c) => cats.has(c));
    const corr = correccion(p, []);
    if (corr) {
      corre2026 = corr.corre2026;
      APLICADAS.push({ nombre: p.label, ...corr, motivo: "sin datos 2026" });
    } else if (sinDatos.length && !p.dead && !(ultimoAnio !== null && ultimoAnio <= 2019 && anioMaximoProsa(p.wt) <= 2021)) {
      INDETERMINABLES.push({ nombre: p.label, titulo: p.titulo, slug: slugify(p.label), cats: sinDatos, ultimoAnio });
      excluir(p, `corre2026 indeterminable: tiene ${sinDatos.join("/")} (sin datos 2026 en el repo) y actividad reciente o desconocida (último año ${ultimoAnio ?? "?"})`);
      continue;
    }
  }
  // 5) títulos: contraste con la ficha
  const slugBaseTmp = slug26 ?? slugLegend.get(strip(p.label)) ?? slugLegend.get(strip(unParen(p.titulo))) ?? slugify(p.label);
  const fichaT = titulosFicha(p.nac.ficha);
  const contados = {};
  for (const t of titulosDetalle) contados[t.categoria] = (contados[t.categoria] ?? 0) + 1;
  const difs = [];
  for (const cat of CATEGORIAS) {
    const a = contados[cat] ?? 0;
    const b = fichaT[cat];
    if (b === undefined && a === 0) continue;
    if ((b ?? 0) !== a) difs.push(`${cat}: listas ${a}, ficha ${b ?? "sin dato"}`);
  }
  if (difs.length) REVISAR_TITULOS.push({ slug: slugBaseTmp, ficha: DETALLE_FICHA, contados, difs, nombre: p.label, titulo: p.titulo, anios: titulosDetalle.map((t) => `${t.categoria} ${t.anio}`).join(", ") });

  // 6) armado
  const slugBase = slug26 ?? slugLegend.get(strip(p.label)) ?? slugLegend.get(strip(unParen(p.titulo))) ?? slugify(p.label);
  const camposUrls = [...new Set(titulosRaw.flatMap((t) => t.fuentes))].filter(Boolean);
  incluidos.push({
    slug: slugBase,
    nombre: unParen(p.titulo),
    nacio: anioWd,
    provincia: rwd.prov,
    region: regionDe(rwd.prov),
    categorias: CATEGORIAS.filter((c) => cats.has(c)),
    titulos: titulosDetalle.length,
    titulosDetalle,
    corre2026,
    fuentes: {
      wikidata: `https://www.wikidata.org/wiki/${p.id}`,
      wikipedia: `https://es.wikipedia.org/wiki/${encodeURIComponent(p.titulo.replace(/ /g, "_")).replace(/%3A/g, ":").replace(/%2C/g, ",")}`,
      campeones: camposUrls,
    },
    _meta: { origen: { ficha: [...origen.ficha], tablas: [...origen.tablas], intro: [...origen.intro] }, lugar: `${p.lugarFuente}: ${clean(p.lugarRaw)}` },
  });
}

// slugs únicos
const vistos = new Map();
for (const p of incluidos) {
  const n = (vistos.get(p.slug) ?? 0) + 1;
  vistos.set(p.slug, n);
  if (n > 1) {
    excluidos.push({ id: "", nombre: p.nombre, titulo: null, motivo: `slug repetido (${p.slug}): revisar a mano` });
    p._duplicado = true;
  }
}
const finales = incluidos.filter((p) => !p._duplicado && !(vistos.get(p.slug) > 1));
for (const p of incluidos) if (vistos.get(p.slug) > 1 && !p._duplicado) excluidos.push({ id: "", nombre: p.nombre, titulo: null, motivo: `slug repetido (${p.slug}): revisar a mano` });
finales.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

// ---------------------------------------------------------------- salidas

const outDir = path.join(ROOT, "src/data/juego");
fs.mkdirSync(outDir, { recursive: true });
const json = {
  generatedAt: new Date().toISOString(),
  fuentes: FUENTES,
  pilotos: finales.map(({ _meta, ...rest }) => rest),
};
fs.writeFileSync(path.join(outDir, "pilotos.json"), `${JSON.stringify(json, null, 2)}\n`);
fs.writeFileSync(path.join(CACHE, "detalle-meta.json"), JSON.stringify(finales.map((p) => ({ slug: p.slug, ...p._meta })), null, 1));

// asignados fuera de la base
const idsFinales = new Set(finales.map((p) => p.fuentes.wikidata.split("/").pop()));
const campeonesExcluidos = [];
for (const [p, arr] of asignados) {
  if (!idsFinales.has(p.id)) {
    const ex = excluidos.find((e) => e.id === p.id);
    campeonesExcluidos.push({ nombre: p.label, titulo: p.titulo, titulos: arr.map((t) => `${t.categoria} ${t.anio}`).join(", "), motivo: ex?.motivo ?? "?" });
  }
}

const esc = (s) => String(s).replace(/\|/g, "\\|");
const motivoCorto = (m) => m.replace(/\(.*$/, "").replace(/:.*$/, "").replace(/ \d{4}.*$/, "").trim();
const porMotivo = new Map();
for (const e of excluidos) porMotivo.set(motivoCorto(e.motivo), (porMotivo.get(motivoCorto(e.motivo)) ?? 0) + 1);

const L = [];
L.push("# Reporte de la base de pilotos del juego", "");
L.push(`Generado el ${new Date().toISOString().slice(0, 10)} por \`npm run sync:juego\` (scripts/build-juego-pilotos.mjs). No editar a mano: se pisa en cada corrida.`, "");
L.push("## Totales", "");
L.push(`- Personas consultadas en Wikidata (argentinas, con ocupación de piloto o motociclista): **${personas.length}**`);
L.push(`- Con artículo único en es.wikipedia: **${conArticulo.length}**`);
L.push(`- Incluidas en \`pilotos.json\`: **${finales.length}**`);
L.push(`- Excluidas: **${excluidos.length}**`, "");
L.push("Excluidas por motivo:", "");
L.push("| Motivo | Cantidad |", "|---|---|");
for (const [m, c] of [...porMotivo].sort((a, b) => b[1] - a[1])) L.push(`| ${esc(m)} | ${c} |`);
L.push("");
L.push("## Listas de campeones usadas", "");
for (const [k, v] of Object.entries(FUENTES)) L.push(`- ${k}: ${v}`);
L.push("");
L.push("Criterios por categoría:", "");
L.push("- TC, TC2000, TN y F1 (sólo ganadores argentinos): `src/data/history.json` (TN cuenta todas las clases).");
L.push("- TC Pista: tabla \"Campeones\" de es.wikipedia (1995 en adelante).");
L.push("- Top Race: 1997-2004 la Top Race original; desde 2005 la TRV6 (clase principal). Descartados:");
for (const d of topRace.descartados) L.push(`  - ${d}`);
L.push("- Rally Argentino: campeón general = el que está en **negrita** en la tabla de pilotos de es.wikipedia (\"campeones absolutos o de mayor categoría\"). Años sin un único nombre en negrita:");
if (rally.problemas.length) for (const d of rally.problemas) L.push(`  - ${d}`);
else L.push("  - ninguno");
L.push("- Dakar: sólo el primer nombre (piloto) de cada celda de ganadores con bandera ARG, en motos, autos, camiones, cuatriciclos, UTV/SSV y Challenger. No se cuentan clásicos ni copilotos. Argentinos copilotos no contados:");
if (dakar.copilotos.length) for (const d of dakar.copilotos) L.push(`  - ${d}`);
else L.push("  - ninguno");
L.push("");
L.push("## Mapeo de categorías", "");
L.push("Todos los textos de categoría distintos que se leyeron de fichas y tablas, y a qué se mapearon. \"ignorada\" = categoría conocida que no cuenta; \"sin regla\" = ninguna regla la reconoce (no cuenta, revisar si falta una).", "");
L.push("| Texto | Resultado | Veces |", "|---|---|---|");
const orden = (e) => (e.estado === "mapeada" ? 0 : e.estado === "ignorada" ? 1 : 2);
const ordenados = [...TEXTOS_CATEGORIA].sort((a, b) => orden(a[1]) - orden(b[1]) || b[1].veces - a[1].veces || a[0].localeCompare(b[0]));
for (const [t, e] of ordenados.filter(([, e]) => e.estado !== "sin regla")) {
  L.push(`| ${esc(t.slice(0, 90))} | ${e.estado === "mapeada" ? e.cat : `ignorada (${e.regla})`} | ${e.veces} |`);
}
const sinRegla = ordenados.filter(([t, e]) => e.estado === "sin regla" && t.length > 2 && !/^\d+ carreras?$/.test(t));
L.push("", `Textos sin regla (no cuentan; ${sinRegla.length} distintos, entre paréntesis las veces que aparecen):`, "");
L.push(sinRegla.map(([t, e]) => `${esc(t.slice(0, 70))} (${e.veces})`).join(" · "));
L.push("");
L.push("## Títulos a revisar", "");
L.push("Los títulos contados desde las listas no coinciden con lo que dice la ficha del piloto (sólo categorías de la lista cerrada). No se excluyen; quedan los de las listas.", "");
const fichaMas = REVISAR_TITULOS.filter((r) => r.difs.some((d) => /ficha (\d+)/.test(d) && Number(d.match(/ficha (\d+)/)[1]) > Number(d.match(/listas (\d+)/)[1])));
const otras = REVISAR_TITULOS.filter((r) => !fichaMas.includes(r));
L.push("### La ficha dice más que las listas", "", "Resolución caso por caso en `scripts/juego-resoluciones-titulos.json` (clave `slug|categoría`). \"pendiente\" = todavía sin explicar.", "");
if (fichaMas.length) {
  L.push("| Piloto | Diferencia | Campo de la ficha | Títulos contados | Resolución | Fuente |", "|---|---|---|---|---|---|");
  for (const r of fichaMas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))) {
    for (const d of r.difs) {
      const cat = d.split(":")[0];
      if (!(Number(d.match(/ficha (\d+)/)?.[1] ?? 0) > Number(d.match(/listas (\d+)/)[1]))) continue;
      const res = RESOLUCIONES[`${r.slug}|${cat}`];
      const campos = (r.ficha[cat] ?? []).map((x) => `${x.campo} → ${x.titulos || "—"}`).join(" / ");
      L.push(`| ${esc(r.nombre)} | ${esc(d)} | ${esc(campos)} | ${esc(r.anios || "—")} | ${esc(res?.resolucion ?? "pendiente")} | ${esc(res?.fuente ?? "")} |`);
    }
  }
} else L.push("Ninguno.");
L.push("", "### Otras diferencias (ficha sin dato, o las listas dicen más)", "");
if (otras.length) {
  L.push("| Piloto | Diferencias | Títulos contados |", "|---|---|---|");
  for (const r of otras.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))) L.push(`| ${esc(r.nombre)} | ${esc(r.difs.join("; "))} | ${esc(r.anios || "—")} |`);
} else L.push("Ninguno.");
L.push("");
L.push("## Campeones sin asignar", "");
L.push("Campeones de las listas que no se pudieron asignar con seguridad a un piloto de la base (no están entre los candidatos o el nombre es ambiguo). Cada fila es un título que no se cuenta a nadie.", "");
if (sinAsignar.length) {
  L.push("| Categoría | Año | Nombre en la lista | Enlace | Motivo |", "|---|---|---|---|---|");
  for (const c of sinAsignar.sort((a, b) => a.cat.localeCompare(b.cat) || a.anio - b.anio)) L.push(`| ${c.cat} | ${c.anio} | ${esc(c.nombre)} | ${esc(c.link ?? "")} | ${esc(c.motivo)} |`);
} else L.push("Ninguno.");
L.push("");
L.push("## Campeones asignados a pilotos que quedaron excluidos", "");
L.push("Estos pilotos tienen títulos en las listas pero no entraron a la base por el motivo indicado. Si se corrige el dato, entran solos.", "");
if (campeonesExcluidos.length) {
  L.push("| Piloto | Títulos | Motivo |", "|---|---|---|");
  for (const c of campeonesExcluidos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))) L.push(`| ${esc(c.nombre)} | ${esc(c.titulos)} | ${esc(c.motivo)} |`);
} else L.push("Ninguno.");
L.push("");
L.push("## corre2026 investigado a mano", "");
L.push("Aplicados desde `scripts/juego-correcciones.json` (cada uno con su fuente):", "");
if (APLICADAS.length) {
  L.push("| Piloto | corre2026 | Motivo de la consulta | Fuente | Nota |", "|---|---|---|---|---|");
  for (const a of APLICADAS) L.push(`| ${esc(a.nombre)} | ${a.corre2026} | ${esc(a.motivo)} | ${esc(a.fuente ?? "")} | ${esc(a.nota ?? "")} |`);
} else L.push("Ninguno.");
L.push("", "Siguen afuera por corre2026 indeterminable (categorías sin datos 2026 en el repo y sin confirmación):", "");
if (INDETERMINABLES.length) {
  L.push("| Piloto | Categorías sin datos | Último año conocido |", "|---|---|---|");
  for (const a of INDETERMINABLES) L.push(`| ${esc(a.nombre)} | ${esc(a.cats.join(", "))} | ${a.ultimoAnio ?? "?"} |`);
} else L.push("Ninguno.");
L.push("");
L.push("## Campeones extra (scripts/juego-campeones-extra.json)", "");
L.push(EXTRAS.comentario, "");
L.push("| Categoría | Año | Piloto | Nota | Fuentes |", "|---|---|---|---|---|");
for (const e of EXTRAS.campeones) L.push(`| ${e.categoria} | ${e.anio} | ${esc(e.nombre)} | ${esc(e.nota ?? "")} | ${e.fuentes.join(" ; ")} |`);
L.push("", "Años sin campeón (confirmado):", "");
for (const e of EXTRAS.sinCampeonato) L.push(`- ${e.categoria} ${e.anios}: ${e.nota}${e.fuentes ? ` (${e.fuentes.join(" ; ")})` : ""}`);
L.push("", "Categorías internacionales sin campeones argentinos:", "");
for (const [k, v] of Object.entries(EXTRAS.sinTitulosArgentinos)) L.push(`- ${k}: ${v}`);
L.push("");
L.push("## corre2026 ambiguos", "");
if (AMBIGUOS_2026.length) {
  L.push("| Piloto | Coincidencias en 2026 | Motivo |", "|---|---|---|");
  for (const a of AMBIGUOS_2026) L.push(`| ${esc(a.nombre)} | ${esc(a.entradas.join("; "))} | ${esc(a.motivo)} |`);
} else L.push("Ninguno.");
L.push("");
L.push("## Excluidos", "");
L.push("| Piloto | Artículo | Motivo |", "|---|---|---|");
for (const e of excluidos.sort((a, b) => a.motivo.localeCompare(b.motivo, "es") || a.nombre.localeCompare(b.nombre, "es"))) L.push(`| ${esc(e.nombre)} | ${esc(e.titulo ?? "—")} | ${esc(e.motivo)} |`);
L.push("");
fs.mkdirSync(path.join(ROOT, "docs/juego"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "docs/juego/reporte-base.md"), `${L.join("\n")}\n`);
log(`Listo: ${finales.length} pilotos, ${excluidos.length} excluidos, ${sinAsignar.length} títulos sin asignar`);
fs.writeFileSync(path.join(CACHE, "indeterminables.json"), JSON.stringify(INDETERMINABLES, null, 1));
