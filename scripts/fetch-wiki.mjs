// Descarga el wikitext de las páginas de Wikipedia usadas por los sincronizadores.
// Uso: node scripts/fetch-wiki.mjs
import fs from "node:fs";

const PAGES = {
  "es-tc": ["es", "Turismo_Carretera"],
  "es-tc2000": ["es", "Turismo_Competición_2000"],
  "es-tn": ["es", "Turismo_Nacional"],
  "es-tc-2026": ["es", "Anexo:Temporada_2026_de_Turismo_Carretera"],
  "es-tc2000-2026": ["es", "Anexo:Temporada_2026_de_TC2000"],
  "en-f2": ["en", "FIA_Formula_2_Championship"],
  "en-f2-2026": ["en", "2026_Formula_2_Championship"],
  "en-indycar": ["en", "IndyCar_Series"],
  "en-indycar-2026": ["en", "2026_IndyCar_Series"],
  "en-nascar-champions": ["en", "List_of_NASCAR_Cup_Series_champions"],
  "en-nascar-2026": ["en", "2026_NASCAR_Cup_Series"],
};

const UA = { "User-Agent": "pista-motor-ar/0.1 (leonelbastianelli@gmail.com)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function raw(lang, title, hops = 0) {
  const url = `https://${lang}.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=raw`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers: UA });
    if (res.ok) {
      const text = await res.text();
      const redirect = text.match(/^#(?:REDIRECT|REDIRECCIÓN)\s*\[\[([^\]]+)\]\]/i);
      if (redirect && hops < 2) return raw(lang, redirect[1].replace(/ /g, "_"), hops + 1);
      return text;
    }
    await sleep(1500 * attempt);
  }
  throw new Error(`No se pudo descargar ${lang}:${title}`);
}

fs.mkdirSync("research/wiki", { recursive: true });
for (const [key, [lang, title]] of Object.entries(PAGES)) {
  const text = await raw(lang, title);
  fs.writeFileSync(`research/wiki/${key}.txt`, text);
  console.log(`${key.padEnd(20)} ${String(text.length).padStart(7)} bytes`);
  await sleep(500);
}
