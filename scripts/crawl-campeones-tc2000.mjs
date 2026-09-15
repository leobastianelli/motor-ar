// Recorre el archivo de TC2000 de Campeones (campeones.com.ar, sólo direcciones sin parámetros y 61 s entre pedidos,
// como pide su robots.txt) y guarda las notas de fin de semana en research/campeones/posts.json (no se sube al repo).
// Uso: node scripts/crawl-campeones-tc2000.mjs [desde=2026-02-15]
import fs from "node:fs";

const SINCE = process.argv[2] ?? "2026-02-15";
const UA = { "User-Agent": "fierros-motor-ar/0.1 (leonelbastianelli@gmail.com)", "Accept-Encoding": "identity" };
const DELAY = 61_000;
const OUT = "research/campeones/posts.json";
const WEEKEND = /horario|cronograma|pole|«1»|gan[oó]|venci|triunf|profeta|se larga|largada|mejor del s[aá]bado|clasific|al frente|domin/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const plain = (s) =>
  s
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h\d|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#8211;|&#8212;/g, "–")
    .replace(/&#171;|&#187;|&#8220;|&#8221;/g, "\"")
    .replace(/&#8217;/g, "'")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();

async function get(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

fs.mkdirSync("research/campeones", { recursive: true });
const cache = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : [];
const known = new Set(cache.map((p) => p.link));

/** Bajada + cuerpo de la nota (el sitio usa Elementor: el cuerpo va en el widget theme-post-content). */
export function bodyOf(html) {
  const excerpt = html.match(/<meta name="description" content="([^"]*)"/)?.[1]?.replace(/&quot;/g, '"') ?? "";
  const start = html.indexOf("elementor-widget-theme-post-content");
  const end = start < 0 ? -1 : html.indexOf("elementor-widget-posts", start);
  const body = start < 0 ? "" : html.slice(html.indexOf(">", start) + 1, end < 0 ? start + 40000 : end);
  return `${excerpt}\n${plain(body)}`.slice(0, 12000);
}

// Con --refetch sólo se vuelven a bajar las notas guardadas sin cuerpo (no se recorre el archivo).
const REFETCH = process.argv.includes("--refetch");

// 1) Listado del archivo, página por página, hasta llegar a la fecha pedida.
const listed = REFETCH ? cache.filter((p) => p.text.length < 300).map((p) => ({ ...p, refetch: true })) : [];
for (let page = 1; page <= (REFETCH ? 0 : 12); page++) {
  const url = page === 1 ? "https://campeones.com.ar/category/tc2000/" : `https://campeones.com.ar/category/tc2000/page/${page}/`;
  const html = await get(url);
  const items = [...html.matchAll(/<article[\s\S]*?<\/article>/g)].map((m) => {
    const a = m[0].match(/<a href="(https:\/\/campeones\.com\.ar\/[a-z0-9-]+\/)"[^>]*>([\s\S]*?)<\/a>/);
    const date = m[0].match(/datetime="([^"]+)"/)?.[1] ?? "";
    return a ? { link: a[1], title: plain(a[2]), date } : null;
  }).filter((x) => x && x.title);
  const oldest = items.map((i) => i.date).filter(Boolean).sort()[0] ?? "";
  console.log(`archivo ${page}: ${items.length} notas · más vieja ${oldest.slice(0, 10)}`);
  listed.push(...items);
  await sleep(DELAY);
  if (!items.length || (oldest && oldest.slice(0, 10) < SINCE)) break;
}

// 2) Notas de fin de semana que todavía no están guardadas.
const wanted = listed.filter((i) => i.refetch || (WEEKEND.test(i.title) && !known.has(i.link) && (!i.date || i.date.slice(0, 10) >= SINCE)));
console.log(`notas a bajar: ${wanted.length}`);
for (const item of wanted) {
  try {
    const html = await get(item.link);
    const date = html.match(/property="article:published_time" content="([^"]+)"/)?.[1] ?? item.date;
    const text = bodyOf(html);
    const at = cache.findIndex((p) => p.link === item.link);
    if (at >= 0) cache[at] = { ...cache[at], date, text };
    else cache.push({ link: item.link, title: item.title, date, text });
    fs.writeFileSync(OUT, JSON.stringify(cache, null, 1));
    console.log(`  ok ${date.slice(0, 10)} · ${item.title}`);
  } catch (error) {
    console.log(`  error ${item.link}: ${error.message}`);
  }
  await sleep(DELAY);
}
console.log(`listo: ${cache.length} notas guardadas en ${OUT}`);
