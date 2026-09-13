// Descarga fotos con licencia libre de Wikimedia Commons y guarda sus créditos en src/data/photos.json.
// Uso: node scripts/fetch-photos.mjs
import fs from "node:fs";

const UA = { "User-Agent": "fierros-motor-ar/0.1 (leonelbastianelli@gmail.com)" };
const WIDTH = 1920;

const PHOTOS = {
  "franco-colapinto": { file: "File:Franco Colapinto 2025 Italian Grand Prix FP3.jpg", alt: "El Alpine número 43 de Franco Colapinto en Monza, 2025" },
  "nicolas-varrone": {
    file: "File:Winners in GTEAm, Nico Varrone, Nicky Catsburg & Ben Keating - Chevrolet Corvette C8.R on the podium at the 2023 Le Mans (53468549675).jpg",
    alt: "Nicolás Varrone celebra en el podio de las 24 Horas de Le Mans 2023",
  },
  "agustin-canapino": { file: "File:Agustín Canapino 2017.jpg", alt: "Agustín Canapino en boxes, 2017" },
  "juan-manuel-fangio": { file: "File:Juan Manuel Fangio and Alfred Neubauer 1955 Dutch GP.jpg", alt: "Juan Manuel Fangio conversa con Alfred Neubauer en el GP de Países Bajos de 1955" },
  "carlos-reutemann": { file: "File:Carlos Reutemann 7os 46.jpg", alt: "Carlos Reutemann en un circuito en los años setenta" },
  "juan-maria-traverso": { file: "File:Juan María Traverso y fanático.jpg", alt: "Juan María Traverso junto a un fanático con una bandera de Chevrolet" },
  "series-tc": { file: "File:TC Gran Premio Coronación 2025. Sábado, Clasificación - 06.jpg", alt: "Un auto de Turismo Carretera en clasificación, Gran Premio Coronación 2025" },
};

const strip = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

fs.mkdirSync("public/img/commons", { recursive: true });
const credits = {};
for (const [key, { file, alt }] of Object.entries(PHOTOS)) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(file)}&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=${WIDTH}&format=json`;
  const page = Object.values((await (await fetch(api, { headers: UA })).json()).query.pages)[0];
  const info = page.imageinfo[0];
  const meta = info.extmetadata;
  const license = strip(meta.LicenseShortName?.value);
  if (!/CC BY|CC0|Public domain/i.test(license)) throw new Error(`${key}: licencia no apta (${license})`);

  const image = Buffer.from(await (await fetch(info.thumburl, { headers: UA })).arrayBuffer());
  const target = `public/img/commons/${key}.jpg`;
  fs.writeFileSync(target, image);

  credits[key] = {
    src: `/img/commons/${key}.jpg`,
    width: info.thumbwidth,
    height: info.thumbheight,
    alt,
    author: strip(meta.Artist?.value) || "Autor desconocido",
    license,
    licenseUrl: meta.LicenseUrl?.value ?? null,
    sourceUrl: info.descriptionurl,
  };
  console.log(`${key.padEnd(22)} ${info.thumbwidth}x${info.thumbheight} · ${license} · ${credits[key].author}`);
  await new Promise((r) => setTimeout(r, 500));
}

fs.writeFileSync("src/data/photos.json", JSON.stringify(credits, null, 2));
