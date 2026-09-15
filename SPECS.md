# Fierros — objetivos y visión

> Este documento describe qué es Fierros y qué principios debería cumplir, a nivel de código, contenido y SEO.
> Sirve como referencia para auditar el estado del proyecto contra su propia intención.

## Qué es

Fierros es el sitio de automovilismo argentino que hoy no existe: un lugar único donde encontrar, en hora
argentina y sin buscar en diez sitios distintos, qué corre esta semana, cuándo, dónde verlo y cómo salió. Cubre
desde F1 hasta las categorías más nacionales — TC, TC Pista, TC2000, TN, sus clases y categorías acompañantes —
tratando a cada una con el mismo nivel de detalle, no como una ocurrencia tardía al lado de la Fórmula 1.

## Por qué existe

El automovilismo argentino tiene fanáticos pero no tiene una fuente central: los datos están repartidos entre
sitios oficiales lentos o incompletos, redes sociales, y coberturas que priorizan una sola categoría. Fierros no
compite por ser el sitio con más opinión o el que llega primero con la primicia — compite por ser el que **nunca
te miente y nunca te hace perder tiempo buscando**.

## El principio que ordena todo

La primera impresión sobre los datos lo es todo: si alguien entra por primera vez y ve algo desactualizado o
incorrecto presentado como verdad, no vuelve. Por eso cada dato en el sitio lleva su fuente, y cuando una fuente
no está al día, el sitio lo dice en vez de mostrar algo viejo disfrazado de actual. Esto no es un detalle de
implementación — es la diferencia entre un sitio en el que se puede confiar y uno más del montón.

## Cómo se construye

Automatizado hasta donde se puede, honesto donde no. La mayoría de los datos se leen solos, de fuentes
oficiales, varias veces por semana — incluidos los fines de semana, que es cuando más importan. Lo que ninguna
fuente pública todavía (como algunos campeonatos que solo se publican como imagen) se carga a mano, sin
pretender que es automático, y se reemplaza por la fuente real en cuanto existe.

## Para quién

Para el fanático que sigue más de una categoría y hoy tiene que saltar entre apps y cuentas de Twitter para
armarse el panorama del finde. Para el que quiere saber en qué anda tal piloto argentino corriendo afuera. Para
el que simplemente quiere saber "¿hoy corre algo?" sin pensarlo.

## Hacia dónde va

- **Corto plazo:** lanzamiento público el 4 de octubre, con la mayor cantidad de categorías con datos completos
  y confiables.
- **Mediano plazo:** profundizar lo que ya hay (más historia, más pilotos, horarios confirmados en más
  categorías) antes que sumar cosas nuevas.
- **Más adelante:** si el proyecto sostiene tráfico real, sponsors de nicho del mundo del automovilismo y la
  mecánica — no publicidad genérica que rompa la confianza que se construyó.

---

## Principios verificables

Traducción de lo anterior a criterios que se pueden chequear contra el código, el contenido y el SEO.

### Confiabilidad de los datos (el principio central)

- Ningún dato se muestra como "actual" si la fuente que lo publica quedó atrás de la realidad (ver
  `standingsHidden`/`standingsAsOfRound` en `src/lib/data.ts`). Verificar que esta regla se aplique de forma
  consistente en **todas** las categorías, no solo en las que motivaron el fix.
- Todo dato mostrado declara su fuente (`source`, `resultsSource`, `timeSources`, `meta.standingsSource`).
  Verificar que no haya vistas con datos sin atribución.
- Cuando una fuente falla o no está disponible, el sitio lo dice ("sin datos todavía", "horario a confirmar")
  en vez de omitirlo silenciosamente o inventar un valor.
- La carga manual (`src/data/manual-overrides.json`) está claramente separada de los datos automáticos y se
  documenta como tal (ver `docs/fuentes-de-datos.md`).

### Cobertura pareja entre categorías

- F1 no tiene más profundidad de datos, diseño o visibilidad que las categorías nacionales por el solo hecho de
  ser más conocida. Verificar: fotos de portada, resultados por sesión, campeonatos y horarios existen (o su
  ausencia está igual de bien señalizada) en TC, TC Pista, TC2000, TN Clase 2 y 3, GT3, categorías acompañantes.
- La home no jerarquiza una categoría sobre otra más allá de lo que dicta el calendario real de la semana.

### Actualización automática

- Los datos se refrescan solos, sin intervención manual, varias veces por semana incluyendo el fin de semana
  (ver `.github/workflows/sync-season.yml` y el cron `/api/refresh`).
- Si la sincronización automática falla (fuente caída, deploy bloqueado, etc.), el sitio sigue funcionando con
  los últimos datos buenos conocidos — nunca se rompe ni queda vacío.
- Lo cargado a mano se reemplaza solo por la fuente automática apenas esta se pone al día (ver la lógica de
  `MANUAL_STANDINGS` en `src/lib/data.ts`).

### Hora argentina, siempre

- Todo horario mostrado está convertido a hora argentina — nunca UTC ni hora del país de origen del evento sin
  convertir.

### SEO y descubribilidad

- Cada página relevante (categorías, eventos, pilotos, historias) tiene metadata, JSON-LD y OG image propios,
  no genéricos.
- El sitemap incluye todas las rutas dinámicas relevantes (eventos, pilotos, categorías, horarios, historias) y
  se mantiene actualizado a medida que se generan nuevas fechas.
- `robots.txt` no bloquea contenido que debería indexarse, y sí bloquea lo que no debe indexarse (`/sistema`,
  `/api/`).
- Canonical URLs correctas, sin duplicados accesibles por dos rutas distintas.

### Confianza más allá de los datos

- La página de privacidad describe con precisión qué mide el sitio (Vercel Analytics, PostHog) y bajo qué
  condiciones (banner de cookies, sin activar PostHog hasta aceptar).
- No hay publicidad ni tracking que no esté declarado en `/privacidad`.
- El diseño no imita ni se confunde con ninguna fuente oficial (ACTC, APAT, FIA, etc.) — Fierros es
  explícitamente un agregador independiente.

### Rendimiento y estabilidad

- Las páginas se sirven estáticas/ISR y no dependen de que una fuente externa responda rápido para cargar (ver
  `WAIT_MS` en `src/lib/season-data.ts`).
- Un error en una fuente no puede tumbar una página completa ni dejarla en blanco.
