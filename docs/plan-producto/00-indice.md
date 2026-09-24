# Plan: cada página responde primero lo que importa ahora (y se encuentra en Google)

Objetivo del proyecto: ser el sitio de automovilismo más usado de Argentina. Para eso, cada página tiene que contestar primero la pregunta que la gente tiene **en ese momento**, y cada respuesta tiene que poder encontrarse buscándola.

## Diagnóstico (auditado en producción el 24/09/2026, jueves del GP de Azerbaiyán)

### El principio que la home ya cumple y el resto no

La home cambia el orden de sus secciones según el momento: en pista, fin de semana, resultados o entre semana (`getHomeMode` en `src/lib/data.ts` y `ORDER` en `src/app/page.tsx`). Las demás páginas tienen **un orden fijo**, pensado para un martes cualquiera. Un fin de semana de carrera, lo que está pasando queda enterrado o no aparece.

### Hallazgos de producto

| Página | Qué se ve primero hoy | Qué falta o está enterrado |
|---|---|---|
| `/categorias/f1` | Portada, franja de temporada y campeonato completo. El calendario va al costado (en el celular, debajo del campeonato) | **No hay ningún bloque del fin de semana.** Para ver Baku hay que encontrar "Baku" en la lista de fechas. Tampoco aparecen los resultados de la última fecha ni los argentinos de la categoría. En el celular, la portada mide 650 px y la tabla va antes que todo lo demás. |
| `/pilotos/franco-colapinto` | Portada con "Próxima carrera: sábado 08:00" y después "Carrera a carrera" | Sus resultados de la P1 (18.º) y la P2 (11.º) **no están en su propia página**. "Próxima carrera" apunta a la carrera, cuando su próxima sesión es la P3 de mañana. |
| `/eventos/f1-2026-15` | Portada, cronograma, dónde verlo y "Corren el mismo finde". Recién después, los resultados | Los resultados arrancan en el carácter 749 de 2559 del texto. **Colapinto sólo aparece dentro de la tabla completa**, sin ningún destaque. No hay un bloque "Ahora / Próxima sesión / Último resultado" arriba. |
| `/horarios/franco-colapinto` | Próxima sesión y cronograma | Las sesiones terminadas dicen "Terminó", sin su posición. |
| Home | Se adapta al momento | Está bien. Sólo se toca si lo pide una etapa. |

### Hallazgos de SEO

| # | Problema | Evidencia |
|---|---|---|
| S1 | Los títulos no coinciden con lo que se busca | "Fórmula 1 — Fierros", "Franco Colapinto — Fierros", "Fórmula 1 · GP de Azerbaiyán — Fierros". Ninguno dice "horarios", "hoy", "resultados", "dónde ver" ni el año. |
| S2 | Las descripciones son fijas | La de la categoría dice lo mismo en enero que un sábado de carrera. |
| S3 | Las crónicas automáticas no están en el sitemap | `src/app/sitemap.ts` usa `getNotes()` (sólo las notas a mano), no `getAllNotes()`. |
| S4 | Los títulos de las crónicas no nombran la categoría | "Baku: Martinius Stenshorne hizo el mejor tiempo…": no dice "Fórmula 2". |
| S5 | `lastModified` del sitemap es "ahora" para las 442 URL | Google aprende a ignorar esa fecha. |
| S6 | Hay encabezados antes del `<h1>` en todas las páginas | El menú desplegable usa `<h3>` ("Nacionales", "Internacionales"…). |
| S7 | Las URL de los eventos no dicen nada | `/eventos/f1-2026-15` en vez de algo como `/f1/2026/gp-de-azerbaiyan`. |
| S8 | No se sabe qué busca la gente | No hay verificación de Google Search Console en el HTML (puede estar hecha por DNS: confirmarlo). Sin eso no se puede medir nada de esto. |

Lo que ya está bien: las páginas `/horarios/...` ("A qué hora corre Franco Colapinto: horario y dónde verlo"), los datos estructurados de eventos (`SportsEvent`) y de notas (`Article`), las URL canónicas, el `robots.txt` y la velocidad (0,2 a 0,8 s).

## La solución en una línea

Una sola pieza, **"el momento"**, que para una categoría, un piloto o un evento dice en qué situación está (en pista, fin de semana, resultados recientes, entre semana) y qué mostrar. Se usa en todas las páginas, y los títulos y descripciones de SEO salen de la misma pieza.

## Etapas

| Archivo | Qué | Modelo | Tamaño |
|---|---|---|---|
| `01-momento-y-categoria.md` | La lógica del momento, el bloque "Este fin de semana" y la página de categoría reordenada | Sonnet | Mediano |
| `02-piloto-y-horarios.md` | El piloto ve sus sesiones del fin de semana y su posición; próxima sesión real | Sonnet | Mediano |
| `03-evento.md` | El evento arranca con "ahora / próxima / último resultado" y destaca a los argentinos | Sonnet | Mediano |
| `04-seo-titulos-y-sitemap.md` | Títulos y descripciones según el momento, crónicas en el sitemap, `lastModified` real, encabezados del menú | Sonnet | Chico |
| `05-urls-y-medicion.md` | Search Console y medición. Después, con datos, URL descriptivas con redirecciones 301 | Dueño + Sonnet | Chico, pero delicado |

**Lo único urgente de la etapa 05 es la parte del dueño (Search Console), que se puede hacer ya.** El cambio de URL va al final y se decide con datos.

## Reglas para todas las etapas

- Leer también `docs/plan-datos/00-indice.md`, "Reglas para todas las etapas": una rama y un PR por etapa, `main` actual de GitHub, sin mergear sin verificar, Next 16 distinto de lo conocido.
- **La hora manda:** lo que pasa ahora o lo próximo va primero. Entre dos cosas al mismo tiempo, los argentinos desempatan. Nunca al revés.
- **Los horarios y estados se actualizan sin recargar**, en el navegador, como en la home ("Próxima" pasa a "En vivo" solo). Las páginas son ISR: nada que dependa de la hora puede quedar congelado en el HTML sin corregirse en el navegador.
- **Confianza:** si falta un dato, se dice ("resultados todavía no publicados"). Nunca un hueco vacío ni un dato viejo como si fuera actual.
- **Las páginas tienen que seguir siendo estáticas o ISR.** Comparar la tabla de rutas de `next build` antes y después.
- **Verificación visual obligatoria en celular (375 px) y escritorio**, con capturas en el PR. En el celular, el bloque del momento tiene que verse en la primera pantalla, sin hacer scroll.
- **Para probar un fin de semana sin esperar a que haya uno:** `FIERROS_NOW` permite simular la hora. Probar como mínimo cuatro momentos: un martes, un viernes antes de la primera sesión, un sábado con una sesión en vivo y un lunes con resultados.
- Las pruebas de humo (`scripts/humo.mjs`) y actionlint tienen que seguir pasando.

## Cómo sabemos que funcionó

- **Producto:** en `/categorias/<id>`, `/pilotos/<slug>` y `/eventos/<id>`, un fin de semana, lo que pasa ahora está en la primera pantalla del celular.
- **SEO** (con Search Console, etapa 05): impresiones y clics para búsquedas como "horario fórmula 1", "colapinto hoy", "tc resultados", "dónde ver tc" y "gp de azerbaiyán horario argentina", medidos antes y 4 semanas después.
