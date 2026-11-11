# DESIGN.md — Fierros

Sistema visual de https://www.somosfierros.ar (Next.js 16, CSS plano, sin Tailwind ni librerías de UI). Un agente que lea este archivo tiene que poder hacer UI coherente con el sitio sin mirar el resto del repo.

Todo valor sale de **`src/app/tokens.css`**. Si hace falta un color, tamaño, espacio o tiempo que no está ahí, se agrega como token; nunca se escribe suelto en un componente.

## Dónde vive cada cosa

| Archivo | Qué tiene |
|---|---|
| `src/app/tokens.css` | Los tokens: color, tipo, espacio, forma, sombras, movimiento, capas. Las variables viejas (`--ink`, `--paper`, `--blue`…) son alias de los tokens. |
| `src/app/globals.css` | El CSS heredado de la entrega "Pista". Se va vaciando: no se le agregan reglas nuevas. |
| `src/app/chrome.css` | Marco del sitio: cabecera, menú, pie, aviso de datos viejos, banners de cookies e instalación. |
| `src/app/sitio.css` | Páginas internas: componentes compartidos y cada página encima. Todo cuelga de `main` para ganarle a `globals.css` sin `!important`. |
| `src/app/home.css` | La home (`.home`, `home-*`). |
| `src/app/juego/juego.css` | El juego diario (`jg-*`). |

## 1. Tono

Web de un equipo de competición más que portal de noticias: fotos reales de pista, letra ancha, mucho aire y un solo color que identifica. Argentina y fierrera, sin rayas, llamas ni brillos. Lo que importa es leer una hora, una posición o una diferencia de un vistazo.

## 2. Color

| Token | Valor | Rol |
|---|---|---|
| `--bg` | `#eef1f4` | Fondo de página |
| `--surface` | `#fbfcfd` | Tarjetas, torres de tiempos, paneles sobre el fondo |
| `--raise` | `#e3e8ed` | Relleno de controles y placeholders |
| `--fg` | `#0a1622` | Texto principal |
| `--fg-muted` | `#55616d` | Texto secundario (5.6:1 sobre `--bg`) |
| `--line` / `--line-strong` | tinta al 12% / 24% | Separadores |
| `--panel` | `#0a1622` | Cabecera, pie, portadas, banda de resultados, juego |
| `--panel-raise` | `#162433` | Lo que va encima del panel |
| `--on-panel` / `--on-panel-muted` | `#eef3f7` / `#9fb0bf` | Texto sobre el panel |
| `--accent` | `#74acdf` | Celeste bandera: lo argentino, lo próximo, la acción principal. Relleno, barra o franja; no texto chico sobre claro. |
| `--accent-ink` | `#1d679f` | Celeste para texto y enlaces sobre claro |
| `--accent-wash` | celeste al 20% | Fondo de la fila de un argentino |
| `--live` | `#e0362c` | **Sólo** "en vivo": punto que late, franja de 3px. Siempre acompañado del texto "En vivo". |
| `--hit` / `--near` / `--miss` | verde / amarillo / gris azulado | Sólo el juego (acierto, cerca, no coincide) |

Colores de categoría: salen de `src/data/series.ts` y llegan en línea (`--cat` o `background`). Se usan en el sello y en filetes finos, nunca para pintar una tarjeta entera. El sello lleva una sombra interna que oscurece un poco el color para que el blanco se lea.

**Fotos:** todas pasan por el mismo revelado (`--photo-grade`, `--photo-tint`) y, cuando llevan texto encima, por `--scrim`. Cada foto muestra su crédito (`<PhotoCredit>`), que es obligatorio por licencia.

## 3. Tipografía

Tres familias, todas con `next/font` en `src/app/layout.tsx`:

| Token | Familia | Uso |
|---|---|---|
| `--font-display` | Archivo (eje `wdth`, normal e itálica) | Títulos y posiciones. De Omnibus-Type, estudio argentino. |
| `--font-body` | Geist | Texto, nombres, botones |
| `--font-num` | Geist Mono | Horas, tiempos, diferencias, puntos, fechas cortas |

- **Título de página (N1):** Archivo 900 itálica, `font-stretch: var(--wider)` (118%), `clamp(40px, 7–8.6vw, 76–92px)`, interlineado 1.02 (nunca menos: la itálica corta los descendentes).
- **Título de sección (N2):** Archivo 800, `--wide` (112%), `var(--fs-h2)` = `clamp(30px, 5vw, 44px)`.
- **Título de tarjeta (N3):** Archivo 800, `--wide`, 20–22px.
- **Texto:** Geist 400–600, escala `--fs-12` a `--fs-26`.
- **Etiquetas:** 12px, 600, mayúsculas con `letter-spacing: .08em`. Sólo para nombrar un dato, una por bloque como mucho.
- Toda cifra que se compara va en `--font-num` con `tabular-nums`, alineada a la derecha.

## 4. Espacio, forma y elevación

- **Espacio:** `--s-1` a `--s-9` = 4, 8, 12, 16, 24, 32, 48, 72, 112. Entre secciones, `--s-7` en el celular y `--s-8` en escritorio. Contenedor `--container` (1240px) con `--gutter` (16px en el celular, 28px desde 801px).
- **Forma:** todo recto (`--radius: 0`). La firma es el **corte en diagonal**: `--cut-btn` en botones y `--cut-corner` en tarjetas, fotos y paneles. Los sellos de categoría son paralelogramos (`--skew: -10deg`). Sólo son redondos los puntos (luces del juego, punto de "en vivo").
- **Elevación:** las tarjetas no llevan sombra; se separan por el tono (`--surface` sobre `--bg`). `--shadow-1` y `--shadow-2` sólo para lo que flota: menús, submenús, banners.

## 5. Componentes

- **Portada de página:** panel oscuro; con foto, la foto a sangre con revelado y velo. Título N1 abajo a la izquierda y, si hace falta, un panel con el dato del momento.
- **Sello de categoría:** paralelogramo con el color de la serie, código en Archivo 800 blanco.
- **Torre de tiempos** (resultados, clasificación, campeonato): filas de 52–56px; posición en Archivo a la derecha, número o sigla en mono, nombre 600 con el equipo debajo, tiempo en mono. Fila del argentino: `--accent-wash` y franja de 3px celeste. Sin colores alternados en las filas. En el celular se esconde una columna antes de achicar la letra.
- **Fila por hora** (agenda, cronograma): hora en mono 20px en una columna fija (72px en el celular, 90px en escritorio), nombre y metadatos, estado a la derecha. Al pasar el mouse, fondo `--surface`. En vivo: fondo y franja roja.
- **Estado:** etiqueta chica; "Próxima" en celeste, "En vivo" con punto que late, "Finalizada" y "Sin datos" como texto secundario sin fondo.
- **Botón primario:** `--accent` con texto `--on-accent`, corte en diagonal, 48px de alto. Secundario: borde `--line-strong`, se rellena con `--fg` al pasar. Terciario: enlace `--accent-ink` con flecha que se corre 4px al pasar.
- **Filtros:** botones de 40px con borde fino; el elegido, relleno `--fg`.

## 6. Movimiento

Corto y con motivo. Tiempos `--t-fast`/`--t-med`/`--t-slow` y curva `--ease-out`.

- Las portadas entran una vez al cargar: la foto se asienta (escala 1.08 a 1) y el título sube.
- Las secciones aparecen al entrar en pantalla, sólo donde el navegador soporta `animation-timeline: view()`. En el resto se ven quietas desde el principio.
- Lo que está en vivo late; los subrayados del menú y de las pestañas se dibujan de izquierda a derecha; las tarjetas suben 2px al pasar.
- Con `prefers-reduced-motion` todo queda quieto (`tokens.css` pone los tiempos en 0 y cada hoja lo apaga).

## 7. Celular primero

La mayoría entra por el celular: se diseña a 390px y después se abre. Nada desborda en horizontal (los atajos y filtros se deslizan con `scroll-snap`). Los objetivos táctiles miden al menos 44px. El menú del celular es un panel oscuro con ítems de 56px.

## 8. No

- Colores, tamaños o tiempos sueltos en componentes.
- Rojo para algo que no esté en vivo.
- Celeste como fondo de secciones enteras, o como texto chico sobre claro (para eso, `--accent-ink`).
- Brillos, degradados decorativos o sombras en tarjetas. El único degradado es el velo de las fotos.
- Animaciones que no comunican nada, o que no se apagan con reducir movimiento.
- Reglas nuevas en `globals.css`.
