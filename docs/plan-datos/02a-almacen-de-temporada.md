# 02a — Almacén único de la temporada (Neon) y lector con versión

Leer primero `docs/plan-datos/00-indice.md`. Supone terminada la etapa 01.

> **No mergear esta etapa sola.** Con 02a el sitio lee del almacén, pero hasta 02b nadie escribe ahí: la sync sigue actualizando sólo el archivo del repo, y el sitio quedaría congelado en la siembra (salvo lo caliente de F1). 02b se arma sobre la rama de 02a y se mergean juntas: primero 02a, enseguida 02b.

## Objetivo

Que exista **una** temporada vigente, guardada en Neon con un número de versión, y que todo el sitio la lea de ahí. En esta etapa sólo se construye el almacén y el lector. Los escritores vienen en 02b (sync) y 02c (refresco caliente). Hasta entonces, el almacén tiene la instantánea sembrada y `withHotSources` sigue aplicándose encima, como en la etapa 01.

## Decisiones ya tomadas (no reabrir sin un motivo concreto)

- **Neon, no Blob ni Edge Config.** Ya está conectado (`DATABASE_URL`, `src/lib/db.ts`, tabla `tasks`). Da escritura atómica con verificación de versión, que 02b y 02c necesitan, y permite guardar el historial. Edge Config no sirve: la temporada pesa unos 3 MB.
- **Versiones inmutables.** Cada escritura inserta una fila nueva y nunca se modifica una existente. Así un memo en memoria **indexado por id de versión** es correcto por construcción: dos instancias con el mismo id tienen los mismos datos. Es la diferencia con el estado actual, indexado por tiempo.
- **Nada de `Promise.race` ni de "si no llega, mostrá otra cosa en silencio".** Si Neon falla, se usa la instantánea del repo **y queda marcado** (`servedFrom: "snapshot"`). La etapa 03 lo muestra en pantalla.
- `manual-overrides.json`, `createSeason` y `drivers-2026.json` no cambian. El almacén guarda sólo lo que hoy es `RawSeason`.

## Qué hacer

### 1. Tabla y siembra

Crear `scripts/init-season-db.mjs` siguiendo el estilo de `scripts/init-tareas-db.mjs`, con este npm script: `"db:season:init": "dotenv -e .env.local -- node scripts/init-season-db.mjs"`.

```sql
CREATE TABLE IF NOT EXISTS season_versions (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,   -- INTEGER, no BIGINT: ver el comentario en init-tareas-db.mjs
  parent_id INTEGER REFERENCES season_versions(id),      -- versión sobre la que se construyó (para detectar escrituras concurrentes)
  origin TEXT NOT NULL CHECK (origin IN ('seed', 'sync', 'hot')),
  generated_at TIMESTAMPTZ NOT NULL,                     -- RawSeason.generatedAt
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  summary JSONB NOT NULL,                                -- por categoría: eventos, sesiones con resultados; y `failures`
  body TEXT NOT NULL                                     -- JSON de RawSeason tal cual
);
```

- Si la tabla está vacía, el script inserta `src/data/season-2026.json` con `origin = 'seed'`.
- Tiene que poder correrse más de una vez sin duplicar la siembra.
- La tabla la crea el dueño con el script (pedírselo, con el comando exacto). También puede correrla la sesión si `.env.local` tiene `DATABASE_URL` (`vercel env pull .env.local`).

### 2. Lógica pura, testeable: `src/lib/season-store-core.mjs`

Todo lo que no toca Next ni Neon va en `.mjs`, para que `npm test` lo cubra. Funciones:

- `summarize(raw)`: arma `summary` (conteos por `seriesId` y `failures`). La usan los escritores y `/api/salud`.
- `createReader({ latest, body, fallback })`: devuelve `read()`, que:
  1. Pide `latest()` (id, origin, generatedAt, createdAt).
  2. Si el id es el mismo que el del memo, devuelve el memo.
  3. Si no, pide `body(id)`, lo parsea, lo guarda en el memo **por id** y lo devuelve.
  4. Si `latest` o `body` fallan, devuelve `{ raw: fallback, version: null, servedFrom: "snapshot", error }`.
  5. Si el memo tiene una versión válida y Neon falla, devuelve el memo marcado `servedFrom: "memo"` con el error. Es la última versión vista, no una adivinada.
- Pruebas en `season-store-core.test.mjs` con `latest`/`body` falsos: mismo id no vuelve a pedir el cuerpo; id nuevo sí; falla sin memo da la instantánea marcada; falla con memo da el memo marcado; dos lectores con el mismo id devuelven los mismos datos.

### 3. Adaptador de Next: reemplazar `src/lib/season-data.ts`

- `loadRawSeason()` usa `createReader` con `latest` y `body` implementados con `sql()` de `src/lib/db.ts`.
- Devuelve `RawSeason` más un campo nuevo `source: { versionId, origin, generatedAt, createdAt, servedFrom, error? }`. Agregarlo a la interfaz `RawSeason` y exponerlo en el objeto de `createSeason` (`season.source`) para la etapa 03.
- En `next build`: si hay `DATABASE_URL`, leer del almacén igual que en ejecución (así lo recién desplegado no sale con datos más viejos que los del almacén). Si no hay, usar la instantánea con `servedFrom: "snapshot"`. Quitar la condición `PISTA_LIVE=0` / `NEXT_PHASE` para la base; mantenerla sólo para `withHotSources`.
- `withHotSources` sigue igual, aplicado sobre lo que devuelve el lector. Cuando aplica cambios, `source.origin` queda como `"<origen>+hot"`.

### 4. El punto delicado: cómo se comporta la consulta a Neon dentro de páginas ISR

El driver HTTP de Neon usa `fetch`. En Next 16.3 sin `cacheComponents`, un `fetch` dentro de una página con `revalidate = 60` puede quedar en la caché de datos, y un `fetch` con `cache: "no-store"` vuelve dinámica la ruta. Además, en Vercel la caché de datos no guarda elementos de más de 2 MB, y el cuerpo pesa unos 3 MB. **Antes de escribir el resto, hacer una prueba chica** con dos configuraciones y quedarse con la primera que cumpla los criterios:

- **A (preferida):** `latest()` envuelto en `unstable_cache(fn, ["season-latest"], { tags: ["season"] })` (resultado chico, se invalida con `revalidateTag("season", ...)`). `body(id)` directo con `sql()`, sin envolver, protegido por el memo por id.
- **B:** `neon(url, { fetchOptions: { next: { tags: ["season"] } } })` para la consulta de `latest`, y una conexión separada sin etiquetas para el cuerpo.

Criterios, todos obligatorios:
1. `npx next build` sigue marcando como estáticas o ISR (● / ○, **no** ƒ) las rutas que hoy lo son. Comparar la tabla de rutas antes y después.
2. Después de insertar una versión nueva a mano y llamar a `/api/refresh` (ver abajo), la próxima visita a `/` y a `/notas` muestra el id nuevo. En local, se verifica con `next build && next start`, no con `next dev` (en dev no hay caché).
3. Sin versión nueva, las visitas no consultan el cuerpo otra vez. Comprobarlo con un `console.log` temporal en `body()`.

Si ninguna de las dos cumple, **parar** y dejar anotado en el PR qué se probó y qué pasó. No inventar una tercera capa.

### 5. Invalidación

En `src/app/api/refresh/route.ts`, agregar `revalidateTag("season", { expire: 0 })` antes del `revalidatePath("/", "layout")` que ya existe. Ese endpoint (protegido con `CRON_SECRET`) va a ser el que llamen los escritores en 02b y 02c.

## Qué NO hacer

- No cambiar la sync ni el workflow (eso es 02b), ni sacar `withHotSources` (eso es 02c).
- No guardar la temporada en `unstable_cache` ni en otra caché de Next: el cuerpo excede el límite, y la versión ya resuelve la consistencia.
- No agregar memo por tiempo. El único memo permitido es el indexado por id de versión.

## Verificación

1. `npm test` (incluye las pruebas nuevas) y `npx next build` pasan, con la tabla de rutas igual a la de antes.
2. Local con `next build && next start` y `.env.local`: `/` muestra datos; insertar a mano una versión con un cambio visible (por ejemplo, un `generatedAt` distinto, o un resultado de prueba **en una rama de Neon, no en la principal**) + `/api/refresh` → se ve en `/`, `/notas` y en el menú.
3. Local sin `DATABASE_URL`: el sitio funciona con la instantánea y `season.source.servedFrom === "snapshot"`.
4. En producción, después del merge: los mismos tiempos de la etapa 01 (sin regresión) y el sitio muestra los mismos datos que antes (la siembra es la instantánea).

Para no ensuciar la base principal, usar una rama de Neon en las pruebas con datos inventados (ver la skill `neon-postgres`, "branching").

## Terminado cuando

El sitio lee del almacén en producción, la tabla de rutas no cambió, y el PR describe qué configuración (A o B) se eligió y con qué evidencia.
