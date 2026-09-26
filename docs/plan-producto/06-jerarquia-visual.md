# 06 — Jerarquía visual: que se entienda qué importa al bajar por la página

Leer primero `docs/plan-producto/00-indice.md` (reglas de todas las etapas).

## Problema (auditado el 26/09/2026 en el celular)

El dueño lo describe así: "siento todo un poco confuso a nivel de jerarquías a medida que voy bajando por la página, sobre todo en el celular". Causas concretas:

1. **Todo grita igual.** Los títulos de sección (Recién terminó, Agenda, Carrera a carrera, Progreso, La historia en números) usan la misma tipografía display condensada gigante que el `<h1>`. La ficha de Colapinto tiene 5 secciones así; la home, 7.
2. **Las bandas de fondo cambian sin significado.** Claro → negro → claro → celeste → negro. Cada cambio se siente como otra página.
3. **Todo pesa lo mismo.** En la home, "Recién terminó" apila 6 tarjetas con podio completo (~1500 px en el celular). Un entrenamiento de TC Pick Up ocupa lo mismo que la carrera de F1, que queda cuarta.
4. **Información repetida.** En la ficha del piloto, "Próxima fecha" aparece dos veces: en la tarjeta de la portada y debajo del bloque del fin de semana.
5. **Cada página tiene su propio formato de fila** para lo mismo (una sesión con hora, estado y resultado): la agenda, el bloque del momento, la ficha del piloto y la página de la fecha lo resuelven distinto.
6. **La jerarquía para Google no coincide con la visual.** En la home, el nombre de la sesión en vivo ("Clasificación") es un `<h2>`, al mismo nivel que "Agenda".

## Las reglas (el sistema)

1. **Tres niveles de título, en todo el sitio, y nada más:**
   - **Nivel 1 (`<h1>`)**: la tipografía display condensada grande. Sólo el título de la página.
   - **Nivel 2 (`<h2>`)**: el título de sección. Un solo estilo para todo el sitio, bastante más chico que el `<h1>` (orientativo: ~28 px en el celular, ~40 px en escritorio, misma familia condensada), con una línea fina arriba y, si hay, el enlace "Ver todo" alineado a la derecha. Todos los `<h2>` salen de `SectionTitle` (src/components/pista.tsx): sin tamaños sueltos en globals.css (`.calendar-tape h2`, los títulos de sesión de la página de la fecha, `.story-*`, etc.).
   - **Nivel 3 (`<h3>`)**: el título de una tarjeta o un ítem. Sans, negrita, ~17 px.
   - Las etiquetas chicas en mayúsculas ("ÚLTIMO RESULTADO", "DÓNDE VERLO") son metadatos, no títulos: nunca `<h*>`.
   - **Nivel visual = nivel semántico**: lo que se ve como sección es `<h2>`; lo que se ve como tarjeta, `<h3>`. Ningún nombre de sesión es `<h2>`.
2. **Una sola banda oscura por página**, reservada para lo principal del momento (en la home, "Recién terminó"; en la fecha, los resultados de la sesión más reciente). El resto de las secciones van sobre el fondo claro, separadas por espacio y una línea fina. El celeste (`--blue`) se usa sólo para destacar a los argentinos y lo "en vivo o próximo", no como fondo de secciones.
3. **La importancia define el tamaño; la hora, el orden.** El orden sigue siendo por hora (regla de la home, ver `home-priority-and-freshness`), pero:
   - carreras y finales: tarjeta completa (podio + argentinos);
   - clasificaciones y sprints: tarjeta compacta (una línea con la pole o el ganador, más los argentinos);
   - entrenamientos: una sola línea por categoría ("TC Pick Up · Entrenamientos: Ciantini, Cifre") o agrupados bajo "Entrenamientos (3)", plegable.
   - "Recién terminó" muestra como máximo 4 elementos y termina en "Ver todos los resultados".
4. **Una sola anatomía de fila de sesión** para todo el sitio: hora (tabular) | nombre de la sesión (negrita) + una línea gris con categoría, lugar o ganador | dato clave a la derecha (el estado, o la posición del argentino, en negrita). Reutilizar la fila de la agenda (`agenda-row`) o extraer un componente común para el bloque del momento, la ficha del piloto y la página de la fecha. En la ficha del piloto, la posición ("11.º") es el dato clave, a la derecha, y no un tercer tamaño de letra en el medio.
5. **Nada repetido.** En la ficha del piloto, la próxima fecha va sólo en la tarjeta de la portada. Sacar también los rótulos que no dicen nada: "Temporada 2026" en la franja de estadísticas, "Sin tiempos en vivo" cuando no hay tiempos.
6. **Ritmo vertical en escala**: 48 px entre secciones en el celular (64 en escritorio), 16 px dentro de una sección, 8 px dentro de una tarjeta. Menos espacio dentro de un grupo que entre grupos.

## Alcance

Home, `/hoy`, `/categorias/[slug]`, `/eventos/[id]`, `/pilotos/[slug]`, `/horarios/[slug]`, `/notas` y `/calendario`. Historia y páginas legales, sólo si heredan los estilos sin trabajo extra.

## Qué NO hacer

- No cambiar el orden de las secciones ni la lógica del momento (etapas 01 a 03), salvo lo que dice la regla 3 sobre el tamaño.
- No sacar datos: se compactan o se pliegan, no se borran.
- No cambiar la identidad (tipografía Archivo, colores base, logo) ni sumar un sistema visual nuevo: es poner orden con lo que hay.
- No volver dinámicas las páginas ni cambiar `revalidate`.

## Verificación

- `npm test`, `npm run lint` y `next build` (tabla de rutas igual).
- **Esquema de títulos** de cada página del alcance: listarlo en el PR (h1 / h2 / h3), antes y después. Un solo h1, h2 sólo para secciones, sin saltos.
- **Capturas de página completa en 375 px y 1440 px, antes y después**, de home, categoría F1, categoría TC, fecha de F1 (Baku) y ficha de Colapinto, fuera del repo. **La prueba del entrecerrar los ojos**: con la captura achicada, se tiene que distinguir de un vistazo qué es título de página, qué es sección y qué es contenido.
- Medir el alto total de la home en 375 px antes y después: tiene que bajar.
