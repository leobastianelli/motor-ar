# 02c — Refresco caliente: resultados de F1 a los minutos, escritos al almacén

Leer primero `docs/plan-datos/00-indice.md`. Supone terminadas 01, 02a y 02b (existen `season_versions`, `writeVersion`, `mergeOnto` y `/api/refresh` invalida la etiqueta `season`).

## Objetivo

Sacar del render lo último que busca datos externos (`withHotSources` en `src/lib/season-data.ts`). En su lugar, un refresco que trae los resultados oficiales de F1 y los videos de YouTube, escribe una versión nueva (`origin = 'hot'`) e invalida el sitio. Con eso, el render sólo lee el almacén: no hay carreras de tiempo en ningún lado.

## Diseño

- **Endpoint** `src/app/api/caliente/route.ts` (GET, protegido con `CRON_SECRET` igual que `/api/refresh`, `export const maxDuration = 60`). Hace esto:
  1. Lee la última versión del almacén.
  2. Decide si hace falta trabajar, sin pedir nada afuera. Hace falta si hay alguna sesión de F1 que terminó hace entre 5 min y 6 h y no tiene resultados (`sessionResultsMissing` de `src/lib/monitor/checks.mjs`), o si alguna sesión de los últimos 3 días no tiene su video. Si no hace falta, responde `{ skipped: true }`.
  3. Corre `f1OfficialSessions` y después `f1Videos` (lo mismo que hoy hace `withHotSources`) con `nextIo`. Mantener las indicaciones de `revalidate` por URL: evitan golpear formula1.com y, sobre todo, la cuota de la API de YouTube (una búsqueda cuesta 100 unidades).
  4. Si algo cambió, llama a `writeVersion(sql, { raw, parentId, origin: "hot" })` y después invalida (`revalidateTag("season", { expire: 0 })` + `revalidatePath("/", "layout")`, que se pueden llamar directo porque es un route handler de Next).
  5. Responde con un resumen: qué sesiones se completaron, el id de la versión, `unchanged` o `skipped`.
- **Quién lo dispara, dos caminos:**
  1. **Principal, gratis y rápido: el propio sitio.** En `src/app/layout.tsx`, después de obtener la temporada, si hay sesiones de F1 pendientes (el mismo cálculo del paso 2, en memoria) llamar a `after()` de `next/server` para invocar el refresco **en el mismo proceso** (una función `runHotRefresh()` compartida con el endpoint, no un `fetch` al propio sitio).
     - Se dedupe entre instancias con una tabla de una fila: `hot_lock(id INT PRIMARY KEY, at TIMESTAMPTZ)`. Sólo corre quien logra `UPDATE hot_lock SET at = now() WHERE id = 1 AND at < now() - interval '3 minutes' RETURNING at`. Crear la tabla en `scripts/init-season-db.mjs`.
     - No llamar a `after()` en `next build` (`NEXT_PHASE === "phase-production-build"`): en páginas estáticas, `after()` corre en la compilación.
     - Leer `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md` antes de usarlo.
  2. **Respaldo, por si no hay visitas:** en `.github/workflows/sync-season.yml`, el job `gate` del reintento horario agrega un paso `curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://www.somosfierros.ar/api/caliente`. No cuesta minutos extra de Actions: el job ya corre cada hora.
- **Render:** `loadRawSeason()` deja de llamar a `withHotSources`. Borrar `withHotSources`, `waitHot`, `hot`, `HOT_WAIT_MS` y `HOT_TTL_MS`. El render sólo lee el almacén.

## Qué NO hacer

- No hacer un `fetch` del sitio a sí mismo para disparar el refresco: se usa la función compartida.
- No sacar las indicaciones de `revalidate` de `f1-official.mjs` ni de `f1-youtube.mjs`, ni pedir con `no-store`: la cuota de YouTube se agota.
- No sumar otras categorías al refresco caliente en esta etapa. Si se quiere, queda como tarea aparte, con una categoría por vez y su propia verificación.
- No escribir versiones si no cambió nada (`writeVersion` ya lo controla).

## Verificación

1. `npm test` pasa. Agregar pruebas puras para la decisión "¿hace falta?" (con una temporada con una sesión recién terminada sin resultados → sí; con resultados → no; terminada hace 7 h → no).
2. Local con `next build && next start`, una rama de Neon y `FIERROS_NOW` apuntando a un momento posterior a una sesión cuyo resultado ya está publicado en formula1.com. Antes, borrar ese resultado de la versión de prueba. Visitar `/` → en los segundos siguientes aparece una versión `hot` en la tabla, y en la visita siguiente el resultado se ve en `/`, en `/eventos/<id>` y, si hay crónica, en `/notas` y en el menú.
3. Dos pestañas o dos `curl` simultáneos a `/api/caliente` → sólo uno trabaja; el otro, `skipped` o `locked`.
4. **En producción, en el próximo fin de semana de F1:** anotar la hora de fin de cada sesión y la hora en que aparece en el sitio (`created_at` de la versión `hot` + visita). El objetivo es menos de 10 minutos desde que formula1.com lo publica. Dejar esa tabla en el PR o, si el PR ya se mergeó, en `docs/plan-datos/mediciones.md`.

## Terminado cuando

El render no busca datos externos (verificable: `season-data.ts` no importa nada de `sources/` salvo tipos), los resultados de F1 llegan por versiones `hot`, y hay una medición real de un fin de semana. Revisar el PR con Opus (`/code-review`) antes de mergear.
