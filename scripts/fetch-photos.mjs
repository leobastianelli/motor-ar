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
  "series-f1": { file: "File:Opening lap of the 2025 Canadian Grand Prix (cropped).jpg", alt: "Largada del Gran Premio de Canadá de Fórmula 1, 2025" },
  "series-f2": { file: "File:FIA F2 Austria 2025 Nr. 1 Fornaroli.jpg", alt: "El auto Nº1 de Fornaroli en el Gran Premio de Austria de Fórmula 2, 2025" },
  "series-gt3": { file: "File:GT World Challenge Europe 2024 Nürburg Nr. 51 Pier Guidi, Rigon, Rovera.jpg", alt: "El Nº51 en Nürburgring, GT World Challenge Europe 2024" },
  "series-tn": { file: "File:TN APAT Gran Premio Elf 2026, Domingo. Clase 2, Carrera - 03.jpg", alt: "Carrera de Clase 2 del TN APAT, Gran Premio Elf 2026" },
  "series-tc2000": { file: "File:200 km de Buenos Aires 2023, Carrera Sprint de invitados, sábado 7 octubre.jpg", alt: "Autos en pit lane antes de la Carrera Sprint de invitados, 200 km de Buenos Aires 2023" },
  "series-tc-pista": { file: "File:TC Pista 2025, Fecha 10, Buenos Aires. Domingo. Carrera - 09.jpg", alt: "Carrera de TC Pista, Fecha 10 en Buenos Aires, 2025" },
  "series-tc-mouras": { file: "File:TC Mouras 2026, Fecha 5. Domingo, Carrera - 05.jpg", alt: "TC Mouras en carrera, Fecha 5 de 2026" },
  "series-tc-pista-mouras": { file: "File:TC Pista Mouras 2026 Fecha 5. Domingo, Carrera - (5).jpg", alt: "TC Pista Mouras en carrera, Fecha 5 de 2026" },
  "series-tc-pick-up": { file: "File:Gran Premio Autojuntas AUVO 2021 - Ford Ranger TC Pick Up de Eddy Mión.jpg", alt: "El Ford Ranger de Eddy Mión en TC Pick Up, 2021" },
  "series-zonal-bsas": { file: "File:ProCar 4000, Gran Premio FAD Medical 2023 (27).jpg", alt: "Carrera de Procar4000, Gran Premio FAD Medical 2023" },
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
