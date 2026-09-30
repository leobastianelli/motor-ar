# 02 — Rediseño de la home

Rama de trabajo: `claude/page-aesthetic-improvement-e9780d` (mismo punto de partida que `estetica/home`). Alcance: sólo `/`. Sistema: `DESIGN.md` (lo "Propuesto"). Hallazgos: `01-auditoria.md` (H01 a H16).

## Aislamiento

- La home va envuelta en `<div className="home">`. Todo el CSS nuevo está en `src/app/home.css` (selectores `.home …` o clases `home-*`), importado desde `page.tsx`. No se tocó `globals.css`.
- Piezas propias en `src/components/home-parts.tsx` (`HCode`, `HLabel`, `HTitle`, `HState`). No se modificó `pista.tsx`, `notas.tsx` ni `ByTime` (que usa `/hoy`).
- `agenda.tsx`: `Agenda` (sólo la importa la home) pasó a markup `home-*`; `ByTime` quedó idéntico.
- Control: `/pilotos`, `/pilotos/franco-colapinto`, `/hoy` y `/horarios` a 375, antes y después, son **idénticos byte a byte** (`capturas/control-antes/` vs `capturas/control/`, mismas alturas).
- No cambió ningún dato, ni qué sesiones se muestran, ni su orden, ni los textos de estado.

## Qué cambió y por qué

| Hallazgo | Qué se hizo |
|---|---|
| H02 portada | h1 de 48px (64–96px en escritorio), peso 900, ancho 82%, rango de fechas como sobretítulo. El "momento" (arranca / en vivo / último / próximo argentino) pasó de una línea de 14px a una lista de filas con etiqueta de 12px y la hora tabular en 28px (primera fila). En escritorio va a la derecha del título, en filas con filete; en celular, debajo. |
| H01, H11 pilotos | Tarjeta sólo para quien tiene algo para mostrar (en pista, próxima, final). Quien no tiene actividad pasa a una fila de una línea, y "Sin datos · Sin actividad próxima cargada" aparece una sola vez como texto muted, sin chip. Se conserva el orden existente. |
| H06 títulos | Un solo estilo de título de sección: filete de 2px en tinta + h2 (26px celular, 36px escritorio, ancho 85%). "Ver todos" con flecha y 44px de alto táctil. |
| H04 resultados | Dos columnas, sin agujero. El argentino destacado es un bloque celeste con la posición como cifra (56/72px) y el nombre a su lado; las notas de argentinos van como filas debajo. |
| H09 lo que viene | Lista de filas (fecha tabular, ciudad, sello) en lugar de 3 tarjetas. |
| H10 sellos | Variable `--cat-ink` sólo en la home (F1 `#c9361d`, TN `#9a6504`, F4I `#66792f`; el resto, el color de la serie). `series.color` no se tocó. |
| H03 atajos | Escritorio: se pliegan en 2 filas, sin corte al borde. Celular: scroll horizontal con `scroll-snap`; el último chip asoma como pista. Alto 44px, hover y transición de color. |
| H07, H08 agenda | Pestañas de día de 64px (día + número de 28px); filtros de 44px con hover; "Ver por categoría" junto al título. Filas con la hora tabular de 20px en columna fija (72/90px), sellos de 11px. |
| H12 notas | Lista plana (sin tarjeta ni barra superior gruesa), título de 18px, resumen a 3 líneas con `text-wrap:pretty`. |
| H13 banda | La banda oscura única ("Recién terminó"). Mismo orden que antes; cada fila cambia de peso: carrera con podio a la derecha del título, clasificación o práctica en una línea. El argentino fuera del podio va en celeste con texto tinta. |
| H14 en vivo | Título "En vivo" (texto) + punto sólido de 12px (sin halo) + franja roja de 8px; nunca sólo color. El tiempo que falta queda en cifra de 28px. Fila en vivo de la agenda: franja de 4px, fondo blanco y etiqueta "En vivo". |
| Transversales | `text-wrap: balance/pretty`; `tabular-nums` en `.home`; transiciones sólo de color y fondo de 120ms, apagadas con `prefers-reduced-motion`; sin sombras ni degradados. "Finalizada" y "Sin datos" pasan a texto muted (antes `--muted` sobre `#e1e3e3` daba 4.19:1). |

## Altura de la página en 375 (px)

| Modo | Antes | Después |
|---|---|---|
| midweek (30/09 17:30) | 4543 | 3788 |
| weekend (26/09 12:00, en los datos cae en vivo) | 6490 | 5401 |
| results (28/09 12:00) | 4451 | 3686 |
| live (26/09 09:00) | 6766 | 5754 |

En 1280: midweek 2580 → 2660, results 2516 → 2634, live 3840 → 4149 (más aire en la portada y tarjetas más altas; el objetivo de altura era celular). `despues/weekend-*` se capturó el sábado 26/09 20:00 (modo weekend real, sin sesión en vivo): 5091 en 375 y 3828 en 1280.

## Contraste (WCAG 2.x, script en el navegador)

Recorre todo nodo de texto visible dentro de `.home`, calcula el fondo efectivo componiendo fondos semitransparentes, y marca < 4.5:1 (< 3:1 si es texto grande). Se corrió con la agenda en vista por hora y en vista por categoría. Se verificó que el script detecta un caso malo (texto `#999` sobre papel, 2.54:1).

| Modo | 375 | 1280 |
|---|---|---|
| midweek | 0 fallas (306 nodos) | 0 (306) |
| weekend | 0 (427) | 0 (427) |
| results | 0 (298) | 0 (298) |
| live | 0 (480) | 0 (480) |

Falsos positivos y límites: la franja blanca de la fila en vivo de la agenda es un pseudoelemento; el script la ve como papel (más conservador, el texto oscuro sobre blanco sólo mejora). No se evaluó texto sobre las miniaturas de video, ni estados `:hover`.

Sellos (blanco sobre el fondo): F1 5.21, TN 4.96, F4I 4.84 (los demás, de 5.0 a 8.0 según `DESIGN.md`).

## Verificación

- `npm test`: 282 pasan. `npm run lint`: 0 errores, 4 avisos previos (en `src/lib/sources`, no en archivos tocados). `npm run build`: pasa.
- Teclado: se recorrió con Tab toda la home (120 pasos); todo elemento enfocado dentro de `.home` tiene contorno de 3px. Sobre la banda oscura, celeste.
- Archivo ya trae cifras tabulares por defecto (dígitos del mismo ancho); `tabular-nums` queda como resguardo.

## Decisiones tomadas por cuenta propia

- h1 más grande que la escala de `DESIGN.md` (N1 hasta 64px): 64–96px en escritorio, porque el pedido era una portada fuerte (H02).
- Cifra del argentino destacado de 56/72px (`DESIGN.md` sugiere 28–36px): es el dato central del bloque.
- `<h3>` del bloque "En vivo" reemplazado por un `<p>` de 28px (es un dato, no un título de tarjeta). El título de la sección es el `<h2>` "En vivo".
- En "En vivo" y "Recién terminó" se muestra "Faltan N min" y además la cifra `N′` junto al título, como antes.
- Fecha de `weekend` de captura distinta de la indicada (ver arriba), porque a las 12:00 del sábado hay una sesión en vivo.

## Lo que quedó fuera

- Banner de cookies, masthead, menú y footer (globales; otra etapa).
- Skip link, `viewport.themeColor`, `touch-action` global (H16 y guidelines de `layout.tsx`).
- Animación de `.pulse` (H14): el punto es estático por decisión del sistema.
- Reemplazar `series.color` por la tinta ajustada en el resto del sitio.
- Vista móvil real en iOS (verificar `font-stretch` en Safari); capturas con banner de cookies visible; menú móvil abierto.
- Estado de error/vacío de "Recién terminó" (hoy simplemente no se dibuja, como antes).

## Segunda pasada

- **En vivo:** cabecera sólida en `--red` de ancho completo del bloque, con "En vivo" y los minutos en blanco, 900, tabular (32px en celular, 44px en escritorio). Blanco sobre `--red` da 4.41:1; al ser texto grande (≥24px bold) exige 3:1 y pasa. En la portada, la fila "En vivo" es una fila más del momento, sin caja ni borde.
- **Portada en 1280:** grilla de 12 columnas (título en 1–6, momento en 7–12, alineados por arriba). Los atajos de categoría van en una sola línea (sin partirse; con scroll horizontal si no entran).
- **Los nuestros:** `repeat(auto-fit, minmax(300px, 1fr))`: la fila siempre se llena.
- **Recién terminó en 1280:** 2 columnas de ítems, cada uno con su podio o línea debajo; orden cronológico por filas.
- Capturas con `devIndicators` apagado sólo durante la captura (el indicador "N" de Next dev ya no tapa contenido); no se commiteó el cambio de configuración.
- Alturas después, 375 / 1280: midweek 3788 / 2449, weekend 5091 / 3498, results 3686 / 2423, live 5729 / 3880. Contraste: 0 fallas en los 4 modos por 2 anchos.
