# 01 — Sacar la reconstrucción de la temporada del render

Leer primero `docs/plan-datos/00-indice.md` (reglas generales).

## Objetivo

Que ningún pedido espere la reconstrucción completa de la temporada, y que un mismo render use una sola versión de los datos. Es un arreglo inmediato: el rediseño de fondo viene en las etapas 02.

## Evidencia

- `src/lib/season-data.ts`: `loadBase()` arranca `buildSeason()` completo con un memo de 60 s (`TTL_MS`) y lo espera 6 s (`WAIT_MS`). Si no llega, devuelve `lastGood`.
- Reconstruir tarda minutos, así que el memo vence antes de que termine. Cada minuto arranca una reconstrucción nueva, y cada pedido espera 6 s y recibe `lastGood`, que casi siempre es la instantánea (`src/data/season-2026.json`).
- Además, en Vercel no está garantizado que una promesa siga corriendo después de mandar la respuesta sin `after()`/`waitUntil`, así que es probable que la reconstrucción en segundo plano ni siquiera termine.
- Medido el 24/09/2026 contra `https://www.somosfierros.ar/notas` (en ese momento `force-dynamic`): 6,47 s, 6,44 s y 6,42 s. Las páginas ISR pagan lo mismo en cada regeneración.
- `getSeason()` (`src/lib/data.ts`, al final) no está envuelta en `cache()` de React. El layout (menú, vía `getAllNotes()`), la página y `generateMetadata` la llaman por separado, y cada llamada corre su propia carrera de tiempos. Por eso un mismo render puede mezclar temporadas.

## Qué hacer

1. **`src/lib/season-data.ts`**
   - Eliminar `loadBase`, `waitOrLast`, `memo`, `lastGood`, `TTL_MS` y `WAIT_MS`, y dejar de importar `buildSeason`.
   - La base pasa a ser siempre la instantánea importada (`fallback`).
   - Mantener `withHotSources` (resultados oficiales de F1 + YouTube) sobre esa base, con su condición de compilación: en `phase-production-build` o con `PISTA_LIVE=0`, devolver la base sola.
   - Actualizar el comentario de `loadRawSeason` para que describa lo que hace ahora.
   - `hot.base === base` pasa a ser siempre la misma referencia. Está bien, no cambiar esa lógica.
2. **`src/lib/data.ts`**: envolver `getSeason` con `cache` de `react`, para que cada pedido resuelva la temporada una sola vez y el layout y la página vean la misma.

   ```ts
   import { cache } from "react";
   export const getSeason = cache(async (): Promise<Season> => { ... });
   ```

   Mantener el `cached` por identidad de `raw` que ya existe (evita reconstruir `createSeason` si `raw` no cambió).

   Revisar que `getSeason` no se use desde scripts de Node fuera de Next. `src/lib/tasks.ts` la usa desde `/api/refresh`, que corre dentro de Next, así que no hay problema.
3. **`src/lib/sources/f1-official.mjs:120`**: el índice de resultados se pide con `revalidate: 3600`. Una sesión que termina recién aparece en el índice cuando se refresca, así que hoy puede tardar hasta una hora en verse. Usar la misma regla que las páginas de sesión (línea ~144): 120 s si alguna sesión de F1 de la ventana terminó hace menos de 6 h, y 6 h en otro caso. Si calcular eso antes de pedir el índice complica la función, usar 300 s fijo y dejarlo explicado en el comentario. Actualizar `f1-official.test.mjs` si hace falta.
4. **`src/app/notas/page.tsx`**: si tiene `export const dynamic = "force-dynamic"`, volver a `export const revalidate = 60`. Se había puesto por la falla del menú, pero no la resuelve (la resuelve el punto 2 de esta lista) y cuesta 6 s por visita. Mantener el buscador.
5. **Compuerta de la sync horaria (`scripts/pending-sessions.mjs`)**: hoy sólo mira F1 (`seriesIds: new Set(["f1"])`). Al sacar la reconstrucción en vivo, las demás categorías con fuente automática dependen sólo de la sync, así que la compuerta tiene que considerarlas.
   - Armar la lista a partir de las categorías con fuente automática (ver `docs/fuentes-de-datos.md` y `src/lib/sources/season.mjs`).
   - No incluir las que se cargan a mano.
   - El cron de reintento del workflow ya cubre jueves a domingo. Si alguna categoría con fuente automática corre en otro día, sumarlo al cron `20 6-23 * * 0,4,5,6` en `.github/workflows/sync-season.yml` y **al mismo texto en la comparación de la compuerta** (el `if [ "$SCHEDULE" = ... ]`). Si no coinciden, la compuerta deja de filtrar.

## Qué NO hacer

- No agregar otro timeout, otro memo ni otra caché para "compensar".
- No tocar `buildSeason`, `guard.mjs` ni la sync. Eso es 02b.
- No sacar `withHotSources` todavía. Eso es 02c: hasta entonces es lo único que trae resultados de F1 a los minutos.

## Verificación

1. `npm test` y `npx next build` pasan.
2. En local (`npm run dev`), `/notas` y `/` responden en menos de 1,5 s en la segunda carga, y la primera carga no espera 6 s.
3. **En producción, después del merge**, medir cinco pedidos seguidos:

   ```bash
   for i in 1 2 3 4 5; do curl -s -o /dev/null -w "%{time_total}s " -D - https://www.somosfierros.ar/notas | grep -i x-vercel-cache; done
   ```

   Se espera `HIT` o `STALE` con tiempos menores a 1 s. Un `MISS` ocasional está bien si tarda menos de 2 s.
4. En producción, la última sesión de F1 con resultados publicados en formula1.com aparece en la home ("Recién terminó" o resultados), en `/eventos/<id del GP>` y en `/notas`, si hay crónica. Anotar en el PR qué sesión se usó para comprobarlo.

## Terminado cuando

Pasan las cuatro verificaciones y el PR incluye los tiempos medidos antes y después.
