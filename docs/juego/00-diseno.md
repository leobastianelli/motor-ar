# Juego diario: adivinar el piloto

Estado: en construcción (17/10/2026). El nombre del juego lo decide Leonel; mientras tanto la ruta es `/juego`.

## Mecánica

- Un piloto argentino por día, el mismo para todos. El día cambia a las 00:00 de Argentina (UTC−3).
- 8 intentos. Cada intento es un piloto de la base. Se compara con el del día en 5 atributos:

| Atributo | Verde | Amarillo | Gris | Flecha |
|---|---|---|---|---|
| Nació (año) | mismo año | a 5 años o menos | más lejos | ↑ si el del día nació después, ↓ si antes |
| Provincia (de nacimiento) | misma provincia | misma región | otra región | — |
| Categorías (en las que corrió) | mismo conjunto | comparten al menos una | ninguna en común | — |
| Títulos | mismo número | — | distinto | ↑ / ↓ |
| Corre en 2026 | igual | — | distinto | — |

- Después del 3.º y del 6.º intento fallido se destapa una pista escrita (2 por piloto).
- Fase 1 sin cuentas: el progreso, la racha y el "ya jugaste hoy" se guardan en el navegador. Al terminar se puede compartir el resultado sin el nombre: una placa 1080×1350 dibujada en el navegador (src/components/juego-placa.ts) más el texto con cuadraditos. En el celular va al menú de compartir; en la computadora se descarga la imagen y se copia el texto.
- Fase 2 (más adelante, si engancha): login y ranking en Neon.

## Regiones

- Bonaerense: Ciudad de Buenos Aires, Provincia de Buenos Aires.
- Centro: Córdoba, Santa Fe, Entre Ríos, La Pampa.
- Cuyo: Mendoza, San Juan, San Luis.
- NOA: Jujuy, Salta, Tucumán, Catamarca, Santiago del Estero, La Rioja.
- NEA: Misiones, Corrientes, Chaco, Formosa.
- Patagonia: Neuquén, Río Negro, Chubut, Santa Cruz, Tierra del Fuego.
- Exterior: argentinos nacidos fuera del país (región propia).

## Categorías (lista cerrada)

`F1`, `IndyCar` (IndyCar, CART/Champ Car, 500 Millas de Indianápolis), `Mundial de Turismos` (WTCC, WTCR, FIA TCR World Tour), `Resistencia` (Mundial de Resistencia WEC y 24 Horas de Le Mans), `TC`, `TC Pista`, `TC2000` (incluye Súper TC2000), `Top Race` (Top Race y Top Race V6; Top Race Series no), `TN` (Turismo Nacional, cualquier clase), `Rally` (Rally Argentino o Mundial de Rally), `Dakar`.

Las de formación o menores no cuentan (Fórmula Renault, TC Mouras, TC Pick Up, etc.). Top Race Series y TC Pista Mouras tampoco.

## Títulos (lista cerrada)

Campeonatos ganados en: Fórmula 1, Turismo Carretera, TC Pista, TC2000/Súper TC2000, Top Race (clase principal de cada año; en 2010 la TRV6 tuvo dos campeonatos, Copa América y Torneo Clausura, y se cuentan los dos), Turismo Nacional (cualquier clase), Rally Argentino (cada campeonato oficial de clase de cada año, incluido el «Absoluto» desde 2000; las copas no cuentan. Fuente: la lista oficial del Campeonato Rally Argentino, transcripta en `scripts/juego-rally-campeones.tsv`. Así cuentan los artículos y la prensa: Raies 16, Villagra 21), Dakar (cualquier vehículo, ganador de la general de su vehículo), Mundial de Turismos (campeón de pilotos del WTCC, WTCR o TCR World Tour), Resistencia (campeón mundial de pilotos del WEC, general, no de clase) e IndyCar/CART (campeón de pilotos; ningún argentino lo ganó, así que `IndyCar` sólo cuenta como categoría).

Se cuentan desde las listas de campeones (Wikipedia y, para el rally, la lista oficial), no desde la ficha del piloto. Los torneos no oficiales no cuentan (ej. el Torneo Lizeviche-Galíndez 1981 del TC): van en `excluidos` de `scripts/juego-campeones-extra.json`. La ficha se usa para cruzar. Los campeones que faltan en las listas del sitio están en `scripts/juego-campeones-extra.json`, cada uno con dos fuentes.

## Regla de certeza

- Año y provincia de nacimiento: tienen que coincidir Wikidata y Wikipedia en español. Si no coinciden, el piloto queda afuera hasta revisarlo a mano.
- Categorías: ficha y tabla de "Resumen de carrera" del artículo en Wikipedia en español, más las listas de campeones y nuestros datos de 2026.
- Títulos: listas de campeones. Si la ficha del piloto dice otro número, se revisa a mano.
- Corre en 2026: nuestros datos de temporada (`src/data/drivers-2026.json`).
- Cada piloto guarda las URL de sus fuentes. Las exclusiones quedan en `docs/juego/reporte-base.md`.
- Sólo pueden salir como "piloto del día" los que tienen sus 2 pistas escritas y revisadas. El resto se puede usar como intento.

## Rotación

- Cada piloto tiene `desde` (fecha desde la que puede salir). Para el día D sólo cuentan los que tienen `desde` < D, así que sumar pilotos nunca cambia el piloto de hoy.
- El día D elige, entre los candidatos que todavía no salieron, el de menor `hash(semilla + D + slug)`. Cuando salieron todos, se vuelve a empezar.
- La semilla está en la variable de entorno `JUEGO_SEMILLA`, sólo en el servidor. La respuesta nunca viaja al navegador hasta que la partida termina.

## Archivos

- `src/data/juego/pilotos.json`: la base, generada por `scripts/build-juego-pilotos.mjs` (`npm run sync:juego`).
- `src/data/juego/pistas.json`: pistas escritas a mano y fecha `desde`, por slug.
- `docs/juego/reporte-base.md`: qué quedó afuera y por qué.

Forma de cada piloto en `pilotos.json`:

```json
{
  "slug": "guillermo-ortelli",
  "nombre": "Guillermo Ortelli",
  "nacio": 1973,
  "provincia": "Buenos Aires",
  "region": "Bonaerense",
  "categorias": ["TC", "TC2000", "Top Race", "TN"],
  "titulos": 9,
  "titulosDetalle": [{ "categoria": "TC", "anio": 1998 }],
  "corre2026": true,
  "fuentes": {
    "wikidata": "https://www.wikidata.org/wiki/Q...",
    "wikipedia": "https://es.wikipedia.org/wiki/Guillermo_Ortelli",
    "campeones": ["https://es.wikipedia.org/wiki/Turismo_Carretera"]
  }
}
```

`provincia` usa los nombres cortos: "Ciudad de Buenos Aires", "Buenos Aires" (la provincia), "Córdoba", "Santa Fe", etc. Para nacidos afuera, `"provincia": "Exterior"`.

## `pistas.json`

Escrito a mano. Un piloto sólo puede ser el del día si tiene sus 2 pistas completas (texto y fuente) y `desde` anterior al día.

```json
{
  "guillermo-ortelli": {
    "desde": "2026-10-20",
    "pistas": [
      { "texto": "Pista 1, se destapa tras el 3.er fallo.", "fuente": "https://es.wikipedia.org/wiki/Guillermo_Ortelli" },
      { "texto": "Pista 2, se destapa tras el 6.º fallo.", "fuente": "https://..." }
    ]
  }
}
```

## Servidor y endpoints

La respuesta del día vive sólo en el servidor (`src/lib/juego/servidor.ts`, `JUEGO_SEMILLA`). Los tres endpoints son `GET` y las respuestas correctas llevan `Cache-Control: public, s-maxage=<hasta las 00:00 argentinas>` (un día entero para días pasados), así la CDN absorbe casi todo. Aceptan la fecha de hoy o anteriores desde el lanzamiento (`JUEGO_INICIO` en `src/lib/juego/config.mjs`, o la variable de entorno del mismo nombre); una fecha futura da 400.

- `/api/juego/intento?fecha=YYYY-MM-DD&slug=<piloto>` → `{ acerto, intento: {slug, nombre, nacio, provincia, categorias, titulos, corre2026}, comparacion: { nacio|provincia|categorias|titulos|corre2026: { estado: "verde"|"amarillo"|"gris", flecha: "arriba"|"abajo"|null } } }`. La flecha apunta al valor del piloto del día respecto del intento.
- `/api/juego/pista?fecha=…&n=1|2&fallados=a,b,c` → `{ n, texto }` (sin la fuente: casi siempre es el artículo del piloto y regalaría la respuesta; las fuentes se ven al terminar). 403 si hay menos de 3 (n=1) o 6 (n=2) pilotos distintos, o si la lista incluye al piloto del día.
- `/api/juego/respuesta?fecha=…&intentos=a,b,c,…` → `{ acerto, piloto: {…datos y fuentes} }`. 403 salvo que la lista incluya al piloto del día o tenga 8 pilotos distintos.
