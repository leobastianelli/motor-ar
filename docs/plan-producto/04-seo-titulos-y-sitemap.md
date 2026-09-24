# 04 — SEO: títulos según el momento, sitemap completo y encabezados

Leer primero `docs/plan-producto/00-indice.md` (hallazgos S1 a S6). Supone terminadas 01 a 03, porque usa las mismas funciones del momento.

## Objetivo

Que los títulos y las descripciones digan lo que la gente busca (**horarios**, **hoy**, **resultados**, **dónde ver**, el año) y cambien según el momento, igual que la página. Y que Google encuentre todas las páginas con fechas de modificación reales.

## Qué hacer

### 1. Títulos y descripciones (`generateMetadata`)

Plantillas. El layout agrega " — Fierros" al final: ver `title.template` en `src/app/layout.tsx`. Apuntar a unos 60 caracteres en total. Si una plantilla se pasa, acortar el nombre del evento, no las palabras clave.

| Página | Antes de la fecha / entre semana | Fin de semana | Después (resultados) |
|---|---|---|---|
| Categoría | `Fórmula 1 2026: horarios en Argentina, resultados y campeonato` | `Fórmula 1: GP de Azerbaiyán, horarios y resultados` | `Fórmula 1: resultados del GP de Azerbaiyán y campeonato` |
| Evento | `GP de Azerbaiyán 2026: horarios en Argentina y dónde ver` | igual | `GP de Azerbaiyán 2026: resultados y ganador` |
| Piloto | `Franco Colapinto: cuándo corre, resultados y campeonato 2026` | `Franco Colapinto hoy: horarios en Baku y resultados` | igual que entre semana |
| Crónica | `Fórmula 2 en Baku: Stenshorne hizo el mejor tiempo en la clasificación 2` (con la categoría, S4) | | |

Las descripciones también según el momento, con datos concretos. Por ejemplo, un fin de semana: "Carrera el sábado 26 a las 08:00 (hora argentina). P2: ganó Russell, Colapinto 11.º. Dónde verlo: Fox Sports, Disney+". Salen de `momentoDeCategoria` / `momentoDePiloto`.

Como las páginas son ISR, el título se regenera junto con la página y no queda viejo más de `revalidate` segundos.

Los títulos de las crónicas automáticas se arman en `src/lib/notas-auto.ts`: agregar el nombre de la categoría al principio. Cuidado con las pruebas de `notas-auto.test.mjs` y con el menú, que muestra títulos cortos. Si hace falta, separar el título para SEO del título visible.

### 2. Sitemap (`src/app/sitemap.ts`)

- Las notas salen de `getAllNotes()` (incluye las crónicas automáticas), no de `getNotes()`.
- `lastModified` real:
  - páginas que dependen de la temporada (inicio, calendario, categorías, eventos, pilotos, horarios): `season.source.createdAt` (la versión vigente del almacén);
  - eventos: la fecha de su última sesión terminada, si es anterior;
  - notas: su fecha;
  - páginas fijas (acerca, términos, privacidad, fuentes): sin fecha, o la del último cambio conocido.
- `changeFrequency` y `priority` se pueden dejar: Google los ignora y no molestan.

### 3. Encabezados del menú (S6)

En `src/components/masthead.tsx`, los títulos de grupo del menú desplegable ("Nacionales", "Internacionales", "Destacados"…) son `<h3>` y aparecen antes del `<h1>` en todas las páginas. Pasarlos a un elemento que no sea encabezado (`<p>` o `<span>` con la misma clase), manteniendo la accesibilidad: el grupo puede usar `aria-labelledby` o `role="group"` con `aria-label`. Pedir revisión del agente `a11y-review` sobre ese componente.

### 4. Datos estructurados (opcional, si alcanza el tiempo)

- En eventos, cada sesión como `subEvent` (`SportsEvent` con `startDate` y `eventStatus`). La función está en `src/components/json-ld.tsx` (`sportsEventJsonLd`).
- En categorías, la temporada como `ItemList` de sus eventos.

## Qué NO hacer

- No cambiar URL (eso es la 05).
- No meter palabras clave de relleno en el texto visible: los títulos tienen que seguir sonando naturales.
- No prometer "en vivo" en un título si no hay una sesión en curso.

## Verificación

1. `npm test` (con pruebas para las plantillas de título: largo, momento y caracteres especiales) y `npx next build`.
2. Con `FIERROS_NOW` en los cuatro momentos, listar el `<title>` y la `<meta name="description">` de `/categorias/f1`, `/eventos/f1-2026-15`, `/pilotos/franco-colapinto` y una crónica, y ponerlos en el PR.
3. `/sitemap.xml` en local: incluye las crónicas automáticas (contar las URL antes y después) y las fechas no son todas iguales.
4. Ningún `<h2>` ni `<h3>` antes del `<h1>` en esas páginas.

## Terminado cuando

Los títulos cambian con el momento en producción, el sitemap está completo y con fechas reales, y el menú no usa encabezados.
