# DESIGN.md — Fierros

Sistema visual de https://www.somosfierros.ar (Next.js 16, CSS plano en `src/app/globals.css`, sin Tailwind). Formato tipo Google Stitch / awesome-design-md: un agente que lea este archivo tiene que poder generar UI coherente con el sitio sin mirar el resto del repo.

**Cómo leerlo.** Cada sección tiene dos tipos de contenido:

- **Existente**: lo que hoy está en `globals.css` y en los componentes, con valor exacto y nombre de variable CSS. Es fiel al código a 2026-09-30.
- **Propuesto**: el sistema refinado. Está marcado con el rótulo `Propuesto` y no está implementado. Donde contradice al código actual, lo dice. Ningún valor "Propuesto" debe usarse como si ya existiera la variable.

Fuentes de la identidad: `design/fierros-identidad/` (logo, tipografía), `design/pista-handoff/` (prototipo y `sistema.html`), `docs/plan-producto/06-jerarquia-visual.md` (reglas de jerarquía). Referencias de formato y tono (no de marca) en `docs/plan-estetica/referencias/` (The Verge, Ferrari, PostHog).

---

## 1. Visual Theme & Atmosphere

**Existente.** Fierros es un sitio argentino de automovilismo: horarios, resultados y campeonatos de F1, TC, TN, TC2000, zonales y categorías de formación, siempre en hora `America/Argentina/Buenos_Aires`. La identidad es **Torre**: el símbolo es una F armada con cinco bloques, como las filas de una torre de tiempos. No usa autos, cascos ni recursos de velocidad para decir de qué mundo viene.

La atmósfera es la de un **pit wall**: papel frío, tinta casi negra, celeste técnico y números grandes y alineados. La página se lee como una planilla de boxes: filas, columnas de tiempos, una hora a la izquierda y un dato clave a la derecha. La composición es editorial y de bordes rectos; no se convierte cada bloque en una tarjeta.

**Personalidad (existente y vinculante):** argentina, de taller, precisa. La voz es la de alguien que te dice la hora exacta y el resultado sin adornos. "Horarios que no mienten."

**Propuesto — el tono en una línea:** *torre de tiempos impresa en papel frío*. Todo lo que no ayuda a leer una hora, una posición o una diferencia, sobra.

**Características clave**

- Una sola familia tipográfica: Archivo variable (eje de ancho `wdth`). El ancho y el peso hacen el trabajo que en otros sitios hacen las familias.
- Fondo `--paper` (`#f1f2f0`) y tinta `--ink` (`#101213`). Nunca blanco puro de fondo de página ni negro `#000`.
- Un solo color de acento: celeste `--blue` (`#75bee9`), que marca a los argentinos y lo próximo. El rojo `--red` (`#dc3e25`) es **solo** "en vivo".
- Números tabulares en todo lo que cambia: horarios, vueltas, diferencias, puntos.
- Plano: líneas finas (`--rule`) y fondo blanco sobre papel en lugar de bordes y sombras.
- Cada categoría se reconoce por un código corto y un color propio (nunca un logo oficial).

**Lo que Fierros NO es** (vinculante): no es una landing de SaaS, no es un sitio de "velocidad" con rayas y llamas, no tiene gradientes decorativos, no tiene brillo ni "glow", no tiene movimiento decorativo. No hay héroes de pantalla completa ni carruseles. Si una pantalla parece un producto, está mal; tiene que parecer una planilla.

---

## 2. Color Palette & Roles

### Base (Existente) — `:root` de `globals.css`

| Nombre | Variable | Valor | Rol |
|---|---|---|---|
| Tinta | `--ink` | `#101213` | Texto principal, la banda oscura, botones primarios, líneas fuertes |
| Papel frío | `--paper` | `#f1f2f0` | Fondo de página (`body`) |
| Blanco | `--white` | `#ffffff` | Fondo de tarjetas y filas destacadas sobre papel |
| Celeste técnico | `--blue` | `#75bee9` | Argentinos y acciones propias; "próximo"; filtro seleccionado en agenda; fondo de la fila de un argentino |
| Celeste profundo | `--blue-deep` | `#16658f` | Texto/enlace de acento sobre claro, foco (`:focus-visible`), hover de botón, código de TC Pista y F2 |
| Bandera roja | `--red` | `#dc3e25` | **Solo** en vivo: franja de 9px (`.is-live`, `.schedule-row.current`), `.live-callout`, `.state.live`, hover de enlaces a resumen |
| Amarillo "próxima" | `--yellow` | `#f5c640` | Borde del estado "Próxima"; sello de imagen provisoria (`.placeholder-tag`) |
| Verde zonal | `--green` | `#287e58` | Color de la categoría zonal (Procar4000) |
| Gris texto | `--muted` | `#666b6d` | Texto secundario y metadatos |
| Gris línea | `--line` | `#aeb2b2` | Bordes donde hace falta una línea firme (`.momento-row`, `.schedule-row`) |
| Línea fina | `--rule` | `rgba(16,18,19,.09)` | Separador de filas sobre fondo claro (la mayoría de los casos hoy) |
| Línea fina inversa | `--rule-inverse` | `rgba(255,255,255,.1)` | Separador de filas sobre la banda oscura |

### Colores fuera de variable (Existente, hardcodeados en `globals.css`)

| Valor | Dónde | Rol |
|---|---|---|
| `#abb0b1`, `#aeb3b4`, `#c9cdce` | Banda oscura | Texto secundario sobre tinta (tres grises casi iguales) |
| `#3a3e40` | `.nota-summary`, `.notas-intro` | Texto de lectura secundario sobre claro |
| `#fff5cc` / `#fde4df` / `#e1e3e3` / `#e2e4e4` | `.state.upcoming` / `.live` / `.finished` / `.no-data` | Fondo suave de las etiquetas de estado (`.no-data` lleva texto `#555`) |
| `#dff1fb` | `.timing-mini li.argentine` | Fila de un argentino en la mini-torre |
| `#8a8d8e` | `.calendar-tape li.done` | Carrera ya corrida en el calendario (tachada) |
| `#fff3cd` / `#3d2e00` / `#d9b84a` | `.stale-notice` | Aviso de datos viejos |
| `rgba(16,18,19,.05)` / `.04` | Filtros y `.day-tabs` | Fondo de botones no seleccionados |

### Colores por categoría (Existente) — `src/data/series.ts`, campo `color`

El color va al estilo en línea como `--cat` (franja, subrayado de grupo) y como `background` del sello `.code` (`CategoryCode` en `src/components/pista.tsx`).

| Categoría | Código | Color |
|---|---|---|
| Fórmula 1 | F1 | `#dc3e25` |
| Fórmula 2 | F2 | `#16658f` |
| FIA Fórmula 3 | F3 | `#4a6fa5` |
| Fórmula 4 Italiana | F4I | `#7a8f3c` |
| Ligier JFC | JFC | `#b3285a` |
| Turismo Carretera / TC Pista | TC / TCP | `#16658f` |
| TC Mouras / TC Pista Mouras | TCM / TCPM | `#0e7c7b` |
| TC Pick Up / TC Pista Pick Up | TCPK / TCPPK | `#4f6d7a` |
| TC2000 | TC2K | `#101213` |
| TN APAT | TN | `#b47805` |
| GT World Challenge Europe | GT3 | `#6b3d83` |
| FIA WEC | WEC | `#8a3f1f` |
| Procar4000 (zonal) | ZL | `#287e58` |

Hay además clases `.code.tc/.f2/.gt/.tn/.zon` en el CSS heredado del prototipo; el producto usa el color de `series.ts`, no esas clases.

### Estados (Existente)

`.state` = etiqueta de 13px / 700 con fondo suave, radio 2px, `padding:3px 8px`. Cuatro estados: **En vivo** (fondo `#fde4df`, borde izquierdo 4px rojo), **Próxima** (fondo `#fff5cc`), **Finalizada** (fondo `#e1e3e3`), **Sin datos** (fondo `#e2e4e4`, texto `#555`).

### Degradados (Existente)

El prototipo usa degradados en tres lugares, todos como velo de foto: `.driver-photo:after`, `.category-hero:after`, `.story-shade` (de transparente a `--ink`/`--paper`/negro 88%). Las barras `.duel i` usan un `linear-gradient` de corte duro que funciona como barra de dos colores, no como degradado.

### Propuesto — roles y contraste

Reglas (todas "Propuesto"):

1. **Texto mínimo 4.5:1** contra su fondo real, sin excepciones; 3:1 sólo para elementos gráficos no textuales (franja, bordes de componentes).
2. **Una sola tinta secundaria sobre claro**: `--muted` `#666b6d` (4.81:1 sobre `--paper`, 5.40:1 sobre blanco). Sobre celeste, el secundario es `--ink` al 80% (aprox. `#3a4a54`, 4.5:1); `--muted` sobre celeste da 2.65:1 y no se usa.
3. **Una sola tinta secundaria sobre la banda oscura**: `--on-ink-muted: #abb0b1` (8.57:1 sobre `--ink`). Unifica `#aeb3b4`, `#c9cdce` y `#abb0b1`.
4. **El rojo nunca es color de texto sobre claro**: `#dc3e25` sobre `--paper` da 3.93:1 y sobre blanco 4.41:1. El rojo es relleno, franja o punto; el texto de "En vivo" va en tinta (o blanco sobre relleno rojo con ≥16px/700).
5. **El celeste no es color de texto sobre claro**: para enlaces de acento se usa `--blue-deep` (5.68:1 sobre paper).
6. **Regla del sello de categoría**: texto blanco si el color de fondo da ≥4.5:1; si no, se oscurece el color del sello (no se cambia el texto a tinta, para que todos los sellos se lean igual). Medición del código actual (blanco sobre el color):

| Código | Color actual | Blanco sobre él | Propuesto |
|---|---|---|---|
| F1 | `#dc3e25` | 4.41 (falla) | `#d13a20` (4.84) |
| TN | `#b47805` | 3.73 (falla) | `#9a6504` (4.96) |
| F4I | `#7a8f3c` | 3.61 (falla) | `#66782f` (4.89) |
| ZL | `#287e58` | 4.98 | sin cambio |
| TCM, TCPK, F3, F2/TC, GT3, WEC, JFC | ver tabla | 5.0 a 8.0 | sin cambio |

7. **Conflicto a resolver**: F1 es rojo y "en vivo" es rojo. Mientras no cambie el color de F1, "en vivo" nunca puede depender solo del color: siempre lleva el texto "En vivo" y la franja de 9px a la izquierda de la fila.
8. **Celeste solo para lo argentino y lo próximo/vivo.** No es fondo de secciones (regla de `docs/06`).
9. **Sin degradados decorativos.** Los tres velos de foto migran a un velo plano (`rgba(16,18,19,.6)` sobre la parte de la foto que lleva texto) o a una composición sin texto sobre la foto.

### Hallazgos de contraste del código actual (medidos 2026-09-30)

- `.also-live > b`: rojo `#dc3e25` a 13px sobre blanco = 4.41:1 (falla por 0.09).
- `.calendar-tape li.done`: `#8a8d8e` sobre blanco = 3.34:1 (falla). Con `--muted` pasa (5.40:1).
- Texto secundario `--muted` sobre `--blue` (celeste) = 2.65:1 (falla): revisar cualquier `.arg-highlight`, `.horario-watch`, `.champ-row.leader` que lo use.
- `.task-error` (panel interno): rojo sobre paper = 3.93:1.
- Sellos TN y F4I con texto blanco (ver tabla).

---

## 3. Typography Rules

### Familia (Existente)

- **Archivo** variable, cargada con `next/font/google` en `src/app/layout.tsx`: `Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"], display: "swap" })`. Fallback `Arial, sans-serif`. Diseñada por Omnibus-Type (estudio argentino).
- Es la única familia. El prototipo mencionaba Literata para crónicas; en el producto está oculta (`.serif-spec{display:none}`) y no se usa.
- `body`: 16px, `line-height:1.35`. Los titulares usan `font-stretch` condensado (82% a 92%) y peso 850 o 900; el cuerpo, ancho normal.

### Jerarquía actual (Existente)

| Rol | Selector | Tamaño | Peso / ancho | Interlineado | Tracking |
|---|---|---|---|---|---|
| Título de página (home) | `.weekend-head h1` | 52px (34px en celular) | 900, `font-stretch:82%` | 1 | -2px (-1px) |
| Título de página (categoría) | `.category-hero h1` | `clamp(38px,4vw,56px)` (46px en celular) | 900 condensado | .95 | -2px |
| Título de página (fecha) | `.event-hero h1` | `clamp(44px,5vw,72px)` (44px en celular) | 900 | .9 | -.075em |
| Título de página (piloto) | `.driver-title h1` | `clamp(64px,6.4vw,96px)` (44px en celular) | 900 | .8 | -.075em |
| Título de sección | `.section-title h2` | 36px (26px en celular) | 850, `font-stretch:85%` | 1 | -1px (-.5px) |
| Título de tarjeta | `h3` (`.runner-name`, `.nota-card h3`, `.next-card strong`) | 17 a 26px | 850, `font-stretch:90%` | 1.05 a 1.2 | -.5px |
| Hora en fila | `.schedule-row time`, `.momento-when time`, `.horario-day time` | 22 a 25px (19 a 20px en celular) | 850, tabulares | 1.05 | 0 |
| Posición / cifra clave | `.momento-pos`, `.legend-stat b`, `.season-ribbon strong` | 22 a 38px | 850, tabulares | 1 | 0 |
| Cuerpo | `body`, `.lede` | 16px (lede 15 a 18px) | 400 a 520 | 1.35 a 1.5 | 0 |
| Metadato | `.agenda-meta`, `.nota-meta`, `.source-note` | 13 a 14px | 400 a 650, `--muted` | 1.3 | 0 |
| Etiqueta chica | `.momento-where b`, `.nav-group-title`, `.agenda-pending` | 12 a 13px | 700, MAYÚSCULAS | — | .04em a .06em |
| Números grandes decorativos | `.big-pos`, `.runner-number`, `.mega-number` | 72 a 260px | 900 | .75 a .9 | -7px a -20px |

La regla de `docs/06-jerarquia-visual.md` ya fijó: tres niveles de título (`<h1>`, `<h2>` de sección, `<h3>` de tarjeta), etiquetas en mayúsculas como metadatos (nunca `<h*>`), y "nivel visual = nivel semántico". Hoy hay sobrevivientes fuera de escala: `h3` de 26 a 34px (`.broadcast h3`, `.arg-highlight h3`, `.record-grid h3`), `.runner-name` de 26px, y números decorativos de 100 a 260px.

### Propuesto — escala acotada

**Tres niveles de título. Nada más.**

| Nivel | Uso | Escritorio | Celular | Peso / ancho | Interlineado | Tracking |
|---|---|---|---|---|---|---|
| N1 `<h1>` | Título de página. Uno por página | `clamp(40px,4.4vw,64px)` | 34px | 900, `font-stretch:82%` | 1 | -.03em |
| N2 `<h2>` | Título de sección. Un estilo para todo el sitio | 36px | 26px | 850, `font-stretch:85%` | 1.05 | -.02em |
| N3 `<h3>` | Título de tarjeta o ítem | 18px | 17px | 750, ancho normal | 1.2 | 0 |

N3 es **sans, negrita, 17 a 18px** (regla de `docs/06`), nunca condensado y nunca mayor que N2. Se eliminan los `h3` de 22 a 34px: si algo necesita ser más grande que un N3, es un dato (cifra clave), no un título.

**Escala de cuerpo y datos** (siete valores; todo el texto del sitio cae en uno de ellos):

| Token | Valor | Uso |
|---|---|---|
| `--fs-12` | 12px | Etiquetas en mayúsculas (máximo una por tarjeta), sellos chicos |
| `--fs-14` | 14px | Metadatos, texto de filas secundarias, `--muted` |
| `--fs-16` | 16px | Cuerpo, nombre de sesión o piloto en una fila (peso 650) |
| `--fs-20` | 20px | Hora en fila (peso 850, tabular); bajada de página |
| `--fs-28` | 28px | Cifra clave: posición, puntos, gap principal |
| `--fs-36` | 36px | = N2 escritorio; cifra destacada de una franja de estadísticas |
| Display | N1 | Solo `<h1>` |

**Se elimina** el tercer tamaño de letra "en el medio": la posición de un argentino ("11.º") es el dato clave a la derecha de la fila, en `--fs-20`/`--fs-28`, no un titular. Los números decorativos de 100 a 260px (`.mega-number`, `.runner-number`, `.big-pos` de 100px) pasan a cifra clave de `--fs-28`/`--fs-36` salvo una excepción: el número de piloto en la portada de su ficha.

**Números (Propuesto, y en gran parte ya cumplido):** `font-variant-numeric: tabular-nums` es obligatorio en toda hora, vuelta, diferencia (`+1.036`), posición y cifra de puntos. Propuesta: una clase utilitaria `.num` y aplicarla por regla a `time`, `.lap`, `.delta`, `.rank-row time`, `.momento-pos`, `.horario-pos`. Las diferencias y tiempos se alinean a la derecha en su columna. Verificar con el archivo real que Archivo incluya la característica `tnum` (si no, las cifras se ven proporcionales aunque la regla esté).

**Reglas de texto (Propuesto):**

- Título de sección y de tarjeta en **sentence case** ("Recién terminó", "Carrera a carrera"), no Title Case.
- **MAYÚSCULAS solo en etiquetas de 12px**, con `letter-spacing:.04em`, y nunca más de una por tarjeta. Las etiquetas "ÚLTIMO RESULTADO", "DÓNDE VERLO" son metadatos, no títulos.
- `text-wrap: balance` en N1, N2, N3; `text-wrap: pretty` en párrafos. Ancho de párrafo máximo `65ch` (hoy `.nota-lead` usa 60ch, `.notas-intro` 64ch: alcanza).
- Pesos en uso: 450 (cuerpo largo), 520 (bajada), 650 (nombre en fila), 750 (N3), 850 (hora, cifra, N2), 900 (N1). No agregar otros.
- El eje `wdth` se usa solo en N1 (82%), N2 (85%) y cifras (90%). Nunca en cuerpo.

---

## 4. Component Stylings

### Existente (resumen por componente)

**Masthead** (`.masthead`): sticky, `z-index:20`, altura mínima 72px en escritorio (64px en celular), una línea con logo · menú · hora (`.clock`, Archivo 21px tabular). Enlace activo con subrayado interno de 3px en `--blue` (`box-shadow:inset 0 -3px 0`); en celular, barra izquierda de 4px. Submenús (`.nav-panel`) se despliegan sobre la página. Menú móvil se abre sobre la página con velo (`.nav-backdrop`, `rgba(16,18,19,.35)`).

**Sello de categoría** (`.code`, `<CategoryCode>`): rectángulo con `transform:skew(-6deg)`, `min-width:43px`, alto 32px (variantes: 26px en `.cat-label`, 18px en `.agenda-meta`, 22px en `.cat-jump`), texto blanco 900, fondo = color de la categoría. `.cat-mark` (56x56, skew -7deg) es la versión grande de la portada. `<CategoryLabel>` = sello + nombre (`b` 15px/800) + lugar (`span` 14px `--muted`).

**Fila de sesión** (`.schedule-row`, `.agenda-row`, `.momento-row`, `.session`, `.horario-day li`): cinco variantes con la misma idea. La anatomía común es columna de hora (90px, 64px en celular) · nombre de sesión (16 a 17px, 650 a 750) con una línea gris debajo · estado o dato clave a la derecha. La fila "en vivo" lleva franja izquierda de 9px `--red` y fondo blanco. Separador `1px solid var(--rule)` (o `--line`).

**Etiqueta de estado** (`.state`): ver sección 2. Cuatro variantes.

**Tarjeta** (`.runner-card`, `.next-card`, `.nota-card`, `.driver-auto-results article`): fondo `#fff`, radio `2px`, `padding:18px 20px`, sin borde ni sombra. Las de categoría llevan `box-shadow: inset 5px 0 0 var(--cat)` (franja de color a la izquierda). `.nota-card` lleva `border-top:4px solid var(--ink)`. Se disponen en `grid` con `repeat(auto-fit,minmax(280px,1fr))` y `gap:16px`.

**Banda oscura** (`.results-band`, `.classification-wrap`): fondo `--ink`, texto blanco. Dentro: podio (`.podium li` con separador `--rule-inverse`), fila de argentino en `--blue` con texto tinta (`.podium-ours`, `.rank-row.argentine` con borde izquierdo de 8px blanco).

**Botones:** primario relleno tinta (`.momento-cta`, `.nota-cta`, `.task-login button`): `padding:12px 18px`, 700, sin radio, hover `--blue-deep`. Secundario con borde de 1px tinta (`.add-calendar-toggle`, `.task-done-toggle button`): hover relleno tinta. Terciario: texto subrayado (`.agenda-view-toggle`, `.notas-clear`). Aceptar en banners: `--blue` con texto tinta. Filtros (`.filters button`, `.notas-chips button`): `padding:8px 12px`, seleccionado = relleno tinta con texto blanco, no seleccionado = fondo `rgba(16,18,19,.05)`.

**Inputs:** `font:inherit; font-size:16px; padding:10px 14px; border:1px solid var(--rule|--ink); border-radius:2px`.

**Enlaces:** el título de un ítem cambia a subrayado en `:hover` (patrón de `.list-link`, `.nota-card`, `.runner-card`). Sin cambio de color.

**Foco:** `:focus-visible{outline:3px solid var(--blue-deep);outline-offset:2px}` global. Dentro de fondos oscuros, algunos componentes usan `--blue`.

**Modales / overlays:** solo el menú móvil, el menú de calendario (`.add-calendar-menu`, `box-shadow:0 6px 18px`), los paneles de submenú (`box-shadow:0 26px 40px`) y los banners fijos (cookies, instalar: fondo tinta, `border-top:4px solid var(--blue)`).

**Video:** `VideoSesion` es una fachada 16:9 con botón de play; el `iframe` sin cookies solo se monta al tocar. `.video-mini` (64x36) es solo un enlace.

### Propuesto — componentes del sistema refinado

#### 4.1 Una sola anatomía de fila de sesión (regla 4 de `docs/06`)

```
[hora tabular 90px] [nombre (16/650) + línea gris 14px con categoría · lugar · ganador] [dato clave a la derecha]
```

- Un componente (`SessionRow`) reemplaza las cinco variantes. Columnas: `90px 1fr auto` en escritorio, `64px 1fr auto` en celular.
- La hora va en `--fs-20`, peso 850, tabular. En vivo: franja de 4px `--red` (hoy 9px) + fondo blanco + etiqueta "En vivo".
- El dato clave (estado, o la posición del argentino en `--fs-20`/850) va a la derecha; nunca un tercer tamaño en el medio.
- Altura mínima 56px. Separador: `1px solid var(--rule)`.

#### 4.2 Tarjetas: pocas, planas, una sola profundidad

- **Las tarjetas existen solo si agrupan datos de una cosa** (un argentino con su estado, una próxima fecha, una nota). Las listas de filas no son tarjetas: son filas con `--rule`.
- Receta única: fondo `--white`, radio `2px`, **sin borde, sin sombra**, `padding:16px` (20px desde 801px), contenido con `gap:8px`. Nunca una tarjeta dentro de otra.
- Franja de categoría: `inset 4px 0 0 var(--cat)` (hoy 5px) con `padding-left:20px`. Solo en tarjetas con categoría.
- Un grupo de tarjetas no fuerza 3 columnas iguales por defecto: se prefiere una lista de filas; si son tarjetas, `auto-fit minmax(280px,1fr)` (como hoy) con el botón o el dato final alineado abajo (`margin-top:auto`).
- Se elimina `border-top:4px` de `.nota-card`, `.nota-source` (8px en `.nota-related`): el énfasis lo da el tipo, no una barra.

#### 4.3 Estados vacíos: "Sin datos" no puede pesar como un dato

Problema actual: `.state.no-data` tiene fondo gris, 13px/700 y se repite en cada fila sin datos; en una torre de tiempos compite con los números reales.

- **En la fila:** el valor ausente se muestra como texto plano `--muted`, 14px, peso 400, sin fondo, sin radio: `Sin datos`. El guion largo `—` en los lugares donde irían cifras (tiempo, gap, posición). Nunca en negrita ni en `--fs-20`.
- **Con motivo cuando lo hay** (una línea de 13px `--muted`): "Todavía sin tiempos", "La fuente no publica este dato", "Se carga después de la carrera". El motivo dice la verdad sobre el dato: no se presenta ausencia de fuente como falta de datos del evento.
- **Agrupar:** si una categoría entera no tiene datos, una sola línea ("TC Pick Up: sin resultados cargados") o un bloque plegable ("Sin datos (3)"), no una fila gris por cada sesión.
- **Sección vacía:** una línea `--muted` de 14px con el mismo `padding` que una fila. Sin borde, sin ilustración, sin ícono. Si hay una razón de negocio y un enlace ("Ver calendario"), va en la misma línea.
- **Jerarquía de peso:** dato real (tinta, 650 a 850, tabular) > metadato (`--muted` 14px) > ausencia (`--muted` 14px, regular, `—`). La ausencia nunca es más oscura ni más grande que un metadato.
- **Frescura (vinculante):** nunca se muestra un dato viejo como vigente. Un dato con edad visible lleva "Actualizado hace X" (13px, `--muted`, `.data-age`); uno vencido lleva el aviso `.stale-notice` (texto mínimo 4.5:1).

#### 4.4 Chips de categoría

- **Un solo componente**, tres tamaños fijos: S (alto 18px, fuente 10px, en línea con texto), M (alto 24px, fuente 12px/900, en listas y filas), L (alto 40px, fuente 20px, en portadas). Se retiran las variantes de 22, 26, 32 y 56px.
- Forma: rectángulo con `skew(-6deg)` (se unifica `.cat-mark` de -7deg a -6deg), `min-width = 1.6 × alto`, `padding:0 7px`. Sin radio, sin borde, sin sombra.
- Fondo = `series.color`, **ajustado para que el texto blanco dé ≥4.5:1** (tabla de la sección 2). Texto siempre blanco, 900.
- Un chip = un código de 2 a 5 letras. Los códigos largos (TCPPK) crecen a lo ancho; nunca se cortan.
- Nombre de la categoría al lado en sentence case (`cat-label`), no dentro del chip.
- No hay chips "New" ni "Beta" en forma de píldora. Si hace falta marcar algo nuevo, es texto plano.

#### 4.5 Banda oscura única

- **Una por página**, reservada para lo principal del momento: en la home, "Recién terminó"; en la fecha, los resultados de la sesión más reciente. No se usa para adornar ni para separar secciones.
- Fondo `--ink`, texto blanco, secundario `--on-ink-muted` (`#abb0b1`), separador `--rule-inverse`, argentino en `--blue` con texto tinta.
- Foco sobre la banda: `outline:3px solid var(--blue)` (`--blue-deep` sobre tinta da solo 2.94:1).
- Los banners fijos (cookies, instalar) y el footer no cuentan como banda: son fondo tinta transitorio o de cierre.
- El resto de las secciones van sobre `--paper`, separadas por 48/64px de espacio y una línea `--rule`.

#### 4.6 Botones (un solo sistema)

- **Primario** (una acción por pantalla): fondo `--ink`, texto blanco, 700, `padding:12px 18px`, alto 44px, radio 0; hover `--blue-deep`; activo `translateY(1px)`.
- **Secundario**: borde `1px solid var(--ink)`, fondo transparente; hover relleno tinta.
- **Terciario**: texto subrayado (`text-underline-offset:3px`).
- Filtro / chip seleccionable: alto 44px en táctil; seleccionado = relleno tinta.
- Nunca "un relleno + un fantasma" por reflejo: si hay una acción sola, es un enlace.

#### 4.7 Tabla de tiempos / clasificación

- Columnas: posición (50px, 26px/850, derecha) · código de 3 letras (70px, `driver-code`, 850, `.04em`) · nombre (650) · tiempo o gap (derecha, tabular).
- Fila del argentino: fondo `--blue`, texto `--ink` (todo, también los secundarios), borde izquierdo de 8px.
- Filas de 44 a 48px, separador `--rule` (o `--rule-inverse`).
- Sin zebra. Sin hover de fondo: solo subrayado del nombre.

---

## 5. Layout Principles

### Existente

- **Contenedor:** `max-width:1240px`, márgenes laterales `max(28px, calc((100vw - 1240px)/2))`; en celular, 16px.
- **Bloques de sección:** `.section-block`, `margin: var(--space-8) auto` (72px); en celular `var(--space-7)` (48px).
- **Escala de espacios** (`:root`):

| Variable | Valor |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 24px |
| `--space-6` | 32px |
| `--space-7` | 48px |
| `--space-8` | 72px |
| `--space-9` | 112px |

  Muchos valores del CSS no pasan por estas variables (10px, 14px, 18px, 20px, 22px, 28px, 36px, 40px, 50px, 60px, 70px, etc.).
- **Cabecera de página:** la home tiene una franja de datos de una línea (`.weekend-head`), no un cartel. Categoría, fecha y piloto usan cabeceras compactas (desde 801px: `min-height:0`, padding 26 a 34px).
- **Grillas comunes:** `repeat(auto-fit,minmax(280–320px,1fr))` con gap 16 a 32px; `.result-layout` 3 columnas (`1.2fr .8fr .75fr`); `.event-grid` `1fr 330px`; `.horario-grid` `1fr 320px`; `.nota-body` `minmax(0,1fr) 340px`.
- **Ritmo vertical de `docs/06`:** 48px entre secciones en celular (64 en escritorio), 16px dentro de una sección, 8px dentro de una tarjeta.
- **Filosofía de espacio:** menos aire dentro de un grupo que entre grupos. Las líneas (`--rule`) se usan solo donde ordenan datos; la jerarquía la resuelven espacio, tamaño y peso.

### Propuesto — escala de 4/8

Una sola escala, todo múltiplo de 4 y casi todo de 8:

| Token | Valor | Uso |
|---|---|---|
| `--space-1` | 4px | Micro separación (sello a texto) |
| `--space-2` | 8px | Dentro de una tarjeta; entre línea principal y secundaria |
| `--space-4` | 16px | Dentro de una sección; padding de tarjeta en celular; gutter en celular |
| `--space-5` | 24px | Entre grupos de una sección; padding de tarjeta en escritorio |
| `--space-6` | 32px | Entre bloques grandes de una misma sección |
| `--space-7` | 48px | Entre secciones en celular |
| `--space-8` | 64px | Entre secciones en escritorio (hoy 72px) |
| `--space-9` | 96px | Reservado para el cierre de página (hoy 112px) |

- **Se retira `--space-3` (12px)**: va a 8 o 16. Los valores sueltos (10, 14, 18, 20, 22, 28, 36, 40, 50, 60, 70) se redondean al token más cercano cuando se toca cada bloque.
- Las cabeceras de página, los footers y los gutters usan la misma escala. Excepción documentada: `max(28px, …)` del contenedor (28 no es múltiplo de 8; pasa a `max(32px, …)`).
- **Alineación:** las columnas de hora, posición y gap se alinean verticalmente entre filas y entre bloques (mismo ancho de columna en agenda, momento, ficha de piloto).
- **Orden por hora, tamaño por importancia** (regla 3 de `docs/06`): carreras y finales en tarjeta completa (podio + argentinos); clasificaciones y sprints compactos (una línea); entrenamientos una línea por categoría o agrupados y plegables. "Recién terminó" muestra 4 elementos como máximo y termina en "Ver todos los resultados".
- **Nada repetido** en la misma página (la próxima fecha va solo en la portada del piloto); no hay rótulos que no digan nada.

---

## 6. Depth & Elevation

### Existente

El sitio es casi plano. Jerarquía por **fondo** (blanco sobre papel), **línea** (`--rule`, `--line`, `--ink`) y **franja de color** (`inset Npx 0 0 var(--cat)`). Sombras que existen hoy:

| Dónde | Valor |
|---|---|
| Menú móvil (`.site-nav`) | `0 18px 32px rgba(16,18,19,.18)` |
| Panel de submenú (`.nav-panel`) | `0 26px 40px rgba(16,18,19,.16)` |
| Menú de calendario (`.add-calendar-menu`) | `0 6px 18px rgba(16,18,19,.18)` |
| Imagen de placa (`.placa img`) | `0 12px 32px rgba(16,18,19,.15)` |
| Punto "en vivo" (`.pulse`) | halo `0 0 0 6px rgba(255,255,255,.22)` |
| Franja de categoría | `inset 5px 0 0 var(--cat)` (no es sombra, es color) |

`z-index` en uso: 1, 2, 3, 10, 20, 30, 40. Transiciones: 150ms en el ícono de play y de `nav-toggle`; `scroll-behavior:smooth` con `prefers-reduced-motion` como resguardo.

### Propuesto — sin elevación

**Cero elevaciones.** Ninguna sombra en ningún componente. Lo que flota se separa con borde, no con sombra.

- **Superficies permitidas** (tres y nada más): `--paper` (página), `--white` (tarjeta o fila destacada), `--ink` (la banda, botones primarios, banners).
- **Menús y paneles** que flotan sobre la página (`.nav-panel`, `.add-calendar-menu`, menú móvil): fondo `--white`, `border:1px solid var(--ink)`, sin sombra. El velo del menú móvil se mantiene (`rgba(16,18,19,.35)`), porque cumple una función (indica que tocando afuera se cierra).
- **Imagen de placa:** `outline:1px solid var(--rule)` en lugar de la sombra de 32px.
- **Punto "en vivo":** círculo sólido de 10px en `--red` (o blanco sobre rojo) con el texto "En vivo" al lado. **Sin halo** (el halo es un "glow").
- **Escala de `z-index`** (nombres, no números sueltos): `--z-sticky:20` (masthead), `--z-menu:30` (paneles y banners fijos), `--z-nav:40` (submenú escritorio). Se retiran 1, 2, 3 y 10 donde se pueda con `isolation:isolate` (como ya hace `.video-sesion`).
- **Movimiento:** solo transiciones de `color`, `background-color` y `opacity` de ≤150ms en hover y foco. Se retiran `transform:scale` del play, la rotación del chevron del submenú queda solo por estado (no animada) y `scroll-behavior:smooth` solo con `prefers-reduced-motion:no-preference`. Sin entradas escalonadas, sin paralaje, sin animaciones de scroll. Nunca se animan `top`, `left`, `width` ni `height`.

---

## 7. Do's and Don'ts

### Do (Existente y Propuesto, vinculantes)

- Poner la hora primero. Las horas son en `America/Argentina/Buenos_Aires` y se muestran siempre tabulares.
- Un solo `<h1>` por página, `<h2>` solo para secciones, `<h3>` solo para tarjetas o ítems; nivel visual = nivel semántico.
- Una sola banda oscura por página, para lo principal del momento.
- Usar celeste solo para argentinos y lo próximo; rojo solo para lo que está en vivo, y siempre con el texto "En vivo".
- Mostrar categorías con código corto + color propio. Sin logos oficiales de organismos o marcas.
- Compactar o plegar datos de menor importancia; nunca borrarlos.
- Mostrar la frescura del dato ("Actualizado hace X") y no presentar un dato viejo como vigente.
- Dejar el estado vacío en texto plano `--muted`, más liviano que un dato real.
- Verificar contraste ≥4.5:1 en cada texto, en los dos fondos (claro y banda oscura), antes de mergear un cambio de fondos.
- Usar el espacio para agrupar: menos aire dentro de un grupo que entre grupos (8/16/48–64).
- Dar foco visible a todo lo interactivo (`:focus-visible`, 3px).

### Don't (Existente y Propuesto, vinculantes)

- No usar degradados, sombras, brillo/halo ni animación decorativa.
- No convertir cada bloque en una tarjeta ni poner una tarjeta dentro de otra.
- No usar una segunda banda oscura ni celeste como fondo de sección.
- No introducir una segunda familia tipográfica ni un cuarto nivel de título.
- No escribir en Title Case ni en MAYÚSCULAS fuera de las etiquetas de 12px.
- No usar rojo como color de texto sobre claro ni `--muted` sobre celeste.
- No mostrar "Sin datos" con el peso de un dato (negrita, chip de fondo gris, 20px o más).
- No escribir "Sin datos" cuando el problema es una fuente caída: se dice que falta la fuente.
- No usar signos de exclamación en mensajes, "¡Ups!", ni frases de relleno ("Elevá tu experiencia", "Sin fricciones").
- No usar `height:100vh` para alturas de pantalla completa; `min-height:100dvh` (hoy `.story-hero` usa `calc(100vh - 92px)`).
- No renunciar a nombres y cifras reales: sin datos de ejemplo tipo "99.99%" ni "Juan Pérez" en pantallas.

### Anti-patrones de `.claude/skills/redesign-skill/SKILL.md` que aplican a Fierros

> **Aclaración.** La skill `redesign-skill` (ver `.claude/skills/redesign-skill/SKILL.md` en la rama `claude/page-aesthetic-improvement-e9780d`) está pensada para sitios de marketing y productos genéricos. Fierros es un **sitio de datos**: hay anti-patrones que aplican tal cual, otros que aplican con ajuste, y otros que **no aplican y hasta contradicen esta identidad**. Esta sección los separa. No se aplica la skill entera.

**Aplican tal cual (los usamos como lista de revisión):**

- Fuente de navegador por defecto o Inter en todos lados: no aplica como falla (usamos Archivo, que tiene carácter), pero sí "solo 400 y 700": se usan pesos 450/520/650/750/850/900.
- Números en fuente proporcional: sí, `tabular-nums` es obligatorio (ya es regla).
- Fondo `#000` puro: no se usa (`--ink` `#101213`).
- Acentos sobresaturados o más de un acento: un solo acento (`--blue`); rojo reservado a "en vivo".
- Estética de "degradado violeta/azul de IA", sombras genéricas, iluminación inconsistente: no hay lugar para nada de eso (ver sección 6).
- Hover, `active` y foco en todo lo interactivo: hover con subrayado o cambio de relleno; foco visible de 3px; activo con `translateY(1px)` (Propuesto).
- Transiciones de duración cero: al revés en nuestro caso: permitimos solo color/opacidad ≤150ms.
- Sin estados de carga: usar *skeletons* con la forma de la fila (alto 56px), no spinners circulares. Sin estados vacíos: ver 4.3. Sin estados de error: mensaje directo e inline ("No pudimos cargar los resultados. Probá de nuevo."), nunca `window.alert`.
- Enlaces muertos (`#`): prohibidos; o enlazan a algo real o se ven deshabilitados.
- Falta de indicación de la página actual en el menú: ya existe (`.site-nav a.active`).
- Animar `top/left/width/height`: prohibido; solo `transform` y `opacity`.
- Nombres o cifras de relleno ("John Doe", "99.99%"): prohibido; se usan nombres y datos reales.
- Clichés de copy de IA ("Elevate", "Seamless", "Game-changer", "In the world of…"), signos de exclamación en éxitos, "Oops!", voz pasiva, Title Case en cada título: prohibidos; escribir claro y específico, en sentence case.
- Tarjeta genérica "borde + sombra + blanco": no usamos borde ni sombra; la tarjeta existe solo si agrupa datos de una cosa (4.2).
- Insignias "New/Beta" en píldora: no hay píldoras; los sellos de categoría son rectángulos.
- Acordeones de FAQ y modales para todo: preferir expansión en línea (`<details>`, ya se usa en `.full-results`, `.calendar-tape`) y evitar modales.
- Íconos: no usar Lucide ni Feather "por defecto" como decoración; si hay íconos, un solo set y un solo grosor de trazo.
- *Div soup*: usar elementos semánticos (`nav`, `main`, `section`, `article`, `time`). Usar `<time datetime>` en toda hora.
- Ancho fijo en píxeles: preferir `%`, `rem`, `max-width`, `minmax()`.
- `z-index` arbitrario tipo 9999: usar la escala de 6.
- Faltantes estratégicos: enlaces legales en el footer (ya), 404 propia, enlace "saltar al contenido" (verificar), navegación de vuelta (las fichas enlazan a su categoría y a la fecha).
- `height:100vh` → `min-height:100dvh` (ver Don't).
- Botones sin alinear al pie en grupos de tarjetas, o listas que empiezan a distinta altura: sí aplica (4.2).
- Huérfanas al final de línea: `text-wrap: balance` / `pretty` (Propuesto).
- Falta de ajuste de interletrado: negativo en títulos grandes, positivo (`.04em`) en etiquetas de 12px (ya).

**Aplican con ajuste para un sitio de datos:**

- "**Secciones oscuras sueltas en una página clara parecen un accidente**": la skill pide elegir todo oscuro o todo claro. Fierros **elige una banda oscura única y deliberada** para lo principal del momento (regla 2 de `docs/06`); no se añaden más. No aplicamos la alternativa de "una variante oscura del mismo tono": es tinta.
- "**Tres columnas de tarjetas iguales**": en datos, una grilla de tarjetas iguales es legítima cuando las tarjetas son del mismo tipo (próximas fechas, argentinos). Se prefiere una lista de filas para comparar, y 3 columnas solo si el contenido lo pide.
- "**Radio uniforme en todo**": usamos un radio mínimo (2px) o cero por decisión de identidad (bordes rectos). La variación pasa por el tamaño y el peso, no por el radio.
- "**Todo en mayúsculas en los subtítulos**": aplicado a un máximo de una etiqueta de 12px por tarjeta, con tracking positivo.
- "**Sin textura, todo plano**": en Fierros lo plano es intencional. No se suma ruido ni patrones.
- "**Falta de espacio en blanco**": la skill dice que lo denso sirve para dashboards, no para marketing. Fierros es un dashboard de datos: lo que importa es la **proporción** entre grupos (8/16/48–64), no duplicar el espacio.

**NO aplican (y no se hacen) porque contradicen la identidad de un sitio de datos argentino:**

- Sumar **grano, ruido, degradados ambientales, imágenes de fondo** detrás de secciones "para dar profundidad".
- **Romper la grilla**, solapar con márgenes negativos, *parallax*, pilas de tarjetas, *split-screen scroll*, revelados por scroll, *smooth scroll con inercia*, física de resortes, entrada escalonada, *glassmorphism*, bordes con foco de luz bajo el cursor, animación del peso variable de la fuente, texto con máscara de video.
- **Cambiar la tipografía por Geist/Satoshi/etc.** o emparejar con una serif: la identidad es Archivo única.
- **Asimetría forzada, "desplazar el centrado"**: la precisión de columnas es el producto.
- **Dashboard sin barra lateral** o "menú de comandos flotante": no hay sidebar; el menú es horizontal.
- **Fotos de "equipo diverso"**: no hay fotos de stock; solo fotos propias o con crédito (`.photo-credit`).

---

## 8. Responsive Behavior

### Existente

- **Un solo breakpoint funcional: 800px.** `@media(max-width:800px)` = celular; `@media(min-width:801px)` = escritorio. Las capturas de verificación se hacen en **375px** y **1440px**.
- **Masthead:** en celular colapsa a logo + botón de menú (56px); el menú despliega una lista con submenús plegables (`.nav-toggle` de 56px). El reloj se oculta.
- **Grillas:** las de columnas fijas pasan a una columna (`.result-layout`, `.event-grid`, `.horario-grid`, `.nota-body`, `.record-grid`). `auto-fit` reacomoda solo.
- **Tiras deslizables:** `.cat-jump`, `.race-strip`, `.timeline`, `.filters` scrollean en horizontal con `scrollbar-width:none`.
- **Escalado de tipografía:** N1 y N2 bajan de tamaño (36→26px en N2; ver sección 3). Las horas en fila pasan de 22 a 19/20px.
- **Fila de sesión:** columna de hora de 90px → 60–64px; la columna "canal" se oculta.
- **Portada de piloto:** la foto pasa a 120px de alto apilada; el título y la próxima fecha fluyen en columna; "Este fin de semana" debe verse sin scroll.
- **Banners fijos:** cookies e instalar pasan a columna con botones a todo el ancho.
- **Foco en táctil:** los botones de filtro miden ~34px de alto (menos que el mínimo táctil).

### Propuesto

- **Objetivos táctiles de 44px** como mínimo en todo lo que se toca (filtros, `.cat-jump a`, botones, filas enlazadas, `.nav-toggle`): se consigue con `min-height:44px`, sin agrandar el texto.
- **Tabla de tiempos en celular:** se conservan posición, código de 3 letras, nombre abreviado y tiempo/gap; los datos secundarios bajan a una segunda línea de 13px `--muted`. Las columnas de hora y posición no se desalinean entre filas.
- **Orden móvil = orden de importancia:** lo principal del momento primero (banda oscura única), después agenda, argentinos, próximas fechas, notas.
- **Tamaño de N2** fijo en 26px móvil / 36px escritorio (un solo par, sin overrides por sección).
- **Nada de animaciones que dependan del ancho**; `prefers-reduced-motion` respetado (ya existe).
- Medir el alto total de la home en 375px antes y después de cada cambio de spacing: tiene que bajar, no subir.

---

## 9. Agent Prompt Guide

### Referencia rápida de colores

- Fondo de página: `--paper` `#f1f2f0` · Superficie: `--white` `#ffffff` · Tinta/banda: `--ink` `#101213`
- Acento argentino/próximo: `--blue` `#75bee9` · Acento sobre claro y foco: `--blue-deep` `#16658f`
- Solo en vivo: `--red` `#dc3e25` (relleno, franja o punto; nunca texto sobre claro)
- Secundario: `--muted` `#666b6d` (sobre `--paper`/blanco) · `#abb0b1` (sobre `--ink`)
- Separadores: `--rule` `rgba(16,18,19,.09)` · `--rule-inverse` `rgba(255,255,255,.1)`
- Categoría: `style={{ "--cat": series.color }}` y `<CategoryCode series={...} />`

### Prompts listos

- "Armá una fila de sesión de Fierros: columna de hora de 90px en Archivo 20px/850 con `font-variant-numeric:tabular-nums`; nombre de sesión de 16px/650 con una segunda línea gris de 14px `--muted` (categoría · lugar); a la derecha el dato clave (estado o posición del argentino en 20px/850). Altura mínima 56px, separador `1px solid var(--rule)`, sin sombras. Si está en vivo: franja izquierda de 4px `--red`, fondo blanco, etiqueta 'En vivo'."
- "Armá una tarjeta de argentino para Fierros: fondo `#fff`, radio 2px, sin borde ni sombra, padding 16px, franja izquierda `inset 4px 0 0 var(--cat)`. Nombre en N3 (18px/750), estado en `.state`, hora tabular. Sin gradientes."
- "Diseñá el estado vacío de 'Clasificación' cuando la fuente no publica tiempos: una línea de 14px `--muted` peso 400 que diga 'Todavía sin tiempos', con `—` en el lugar de cada cifra. Sin chip de fondo, sin ícono, sin negrita."
- "Armá la sección 'Recién terminó' de la home: es la única banda oscura de la página (`--ink`, texto blanco, secundario `#abb0b1`, separador `--rule-inverse`). Máximo 4 ítems: carreras en tarjeta completa, clasificaciones en una línea, entrenamientos agrupados. Cierra con 'Ver todos los resultados'. Argentino: fila `--blue` con texto tinta."
- "Hacé la página de una categoría con `<h1>` (N1), secciones en `<h2>` (N2, 26/36px) y tarjetas en `<h3>` (N3, 17/18px). Fondo `--paper`, sin segunda banda oscura, espaciado 48/64 entre secciones y 16 dentro de ellas."

### Lista de verificación (antes de entregar una UI)

1. ¿Un solo `<h1>`, `<h2>` = sección, `<h3>` = tarjeta, sin más niveles?
2. ¿Hay una sola banda oscura? ¿El celeste es solo para lo argentino o lo próximo?
3. ¿El rojo aparece solo en "en vivo" y nunca como texto sobre claro?
4. ¿Toda hora, tiempo, gap y posición está en tabulares?
5. ¿Todo texto da ≥4.5:1 en su fondo (claro y banda oscura)?
6. ¿Los sellos de categoría usan color ajustado con texto blanco ≥4.5:1?
7. ¿"Sin datos" pesa menos que un dato? ¿Se muestra la edad o el motivo cuando corresponde?
8. ¿Cero sombras, cero degradados, cero halo y cero movimiento decorativo?
9. ¿Los espacios son 4/8/16/24/32/48/64?
10. ¿Se ve bien en 375px y 1440px, con objetivos táctiles de 44px?
11. ¿Texto en sentence case, sin exclamaciones ni clichés?

### Preguntas abiertas (para decidir antes de implementar)

- **F1 rojo vs. "en vivo" rojo**: ¿cambiar el color de F1 (p. ej. a una tinta distinta) o reforzar "en vivo" con el punto y la etiqueta y dejarlo?
- **Velos de foto**: ¿se eliminan los tres degradados (piloto, categoría, historia) o se aceptan como excepción de foto?
- **Sellos TN, F4I, F1**: confirmar los tres colores ajustados de la sección 2 o elegir otros que pasen 4.5:1.
- **`tnum` en Archivo**: confirmar que la fuente cargada por `next/font` con `axes:["wdth"]` expone la característica; si no, hay que pedirla explícitamente o cambiar la subfuente.
