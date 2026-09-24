# 03 — Versión visible, `/api/salud` y alertas desde producción

Leer primero `docs/plan-datos/00-indice.md`. Supone terminadas 01 y 02 (a, b, c): `season.source` existe y trae `versionId`, `origin`, `generatedAt`, `createdAt` y `servedFrom`.

## Objetivo

Que se pueda saber, sin adivinar, qué versión de los datos sirve el sitio y qué tan vieja es, y que el sitio **diga** cuándo puede estar desactualizado. Es el requisito de "confianza en la primera visita": nunca mostrar datos viejos como si fueran actuales.

## Qué hacer

### 1. Versión en cada página

En `src/app/layout.tsx`, con `generateMetadata` o `metadata.other`, agregar:

```html
<meta name="fierros-datos" content="v=<versionId>;origen=<origin>;generado=<generatedAt ISO>;servido=<servedFrom>">
```

- Es para depurar y para la prueba de humo de la etapa 04; no se muestra.
- Como el layout y la página comparten la temporada gracias al `cache()` de la etapa 01, basta con ponerlo en el layout.
- Comprobar que el `<meta>` sale en el HTML de páginas ISR, no sólo en las dinámicas.

### 2. Avisos visibles

- **Datos de respaldo:** si `servedFrom !== "store"`, mostrar un aviso discreto arriba de la página: "Los datos pueden estar desactualizados (última actualización: <fecha y hora argentina>)". Nada de texto técnico. Reusar los estilos existentes.
- **"Sin resultados" diferenciado:** en las sesiones terminadas hace más de 30 min sin resultados, distinguir tres casos:
  - la fuente de esa categoría está en `failures` de la versión: "No pudimos consultar la fuente";
  - la categoría no tiene fuente automática: "Resultados sin cargar todavía";
  - la fuente respondió, pero no hay datos: "La fuente todavía no los publicó".

  Buscar dónde se genera hoy el texto "sin resultados" (grep en `src/components` y `src/app`) y cambiarlo en un solo lugar.
- **Pie de página:** "Datos actualizados hace X min", con tiempo relativo calculado **en el navegador** a partir de `createdAt` (así no queda congelado en el HTML cacheado). Seguir el patrón de los componentes que ya actualizan horarios sin recargar.

### 3. `src/app/api/salud/route.ts`

Público y dinámico (`export const dynamic = "force-dynamic"`), sin datos sensibles. Devuelve:

```json
{
  "sirviendo": { "versionId": 0, "origin": "", "generatedAt": "", "createdAt": "", "servedFrom": "" },
  "almacen":   { "ultimaVersion": 0, "createdAt": "", "origin": "" },
  "edadMin": 0,
  "fallas": [],
  "pendientes": [ { "categoria": "", "sesion": "", "terminoHaceMin": 0 } ]
}
```

- `sirviendo` sale de lo que lee el render. `almacen` sale de una consulta directa y sin caché a la última fila. Si difieren, es la señal de que la invalidación no funcionó.
- `pendientes`: sesiones de categorías con fuente automática que terminaron hace más de 15 min y no tienen resultados (`sessionResultsMissing`).

### 4. Alertas desde producción: vigilante (`scripts/watchdog.mjs`, `src/lib/monitor/watchdog-checks.mjs`)

El vigilante ya corre cada hora (`.github/workflows/watchdog.yml`) contra `https://www.somosfierros.ar`. Agregar hallazgos en `watchdog-checks.mjs`, cubiertos por pruebas, como los que ya hay:

- `/api/salud` no responde → alerta.
- `servedFrom !== "store"` → alerta ("el sitio está usando el respaldo").
- `almacen.ultimaVersion` distinto de `sirviendo.versionId` por más de 10 min → alerta ("el sitio no toma la versión nueva").
- Cualquier pendiente de más de 60 min → alerta (con el nombre de la sesión).
- La home tarda más de 3 s → alerta. Hoy `probe` mide `ms`: usarlo.

Respetar el sistema de estado de avisos que ya existe (`alerts.mjs`) para no repetir el mismo aviso cada hora. Documentar los avisos nuevos en `docs/avisos-telegram.md`.

## Qué NO hacer

- No poner la versión en una cabecera HTTP desde middleware: complica el caché y el `<meta>` alcanza.
- No hacer `/api/salud` con caché.
- No mostrar el aviso de desactualización cuando `servedFrom === "store"` aunque la versión sea vieja: que la versión sea vieja no es error si no hay nada pendiente. Para eso están los avisos de "pendientes".

## Verificación

1. `npm test` pasa (con las pruebas de los hallazgos nuevos).
2. Local sin `DATABASE_URL`: se ve el aviso de respaldo y `/api/salud` dice `servedFrom: "snapshot"`.
3. En producción: `curl -s https://www.somosfierros.ar/api/salud` da `servedFrom: "store"`, y `curl -s https://www.somosfierros.ar/ | grep fierros-datos` y lo mismo con `/notas` dan el mismo `v=`.
4. `npm run watchdog -- --dry` contra producción no da falsos positivos.

## Terminado cuando

La versión es visible en producción en todas las páginas, `/api/salud` responde y el vigilante avisa por Telegram de los cuatro casos nuevos.
