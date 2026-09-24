# Auditoría pedida: frescura y consistencia de lo que sirve el sitio

> Para un modelo/revisor más potente que el que hizo estos cambios. Este documento describe cómo llegan los datos al usuario, qué fallas se vieron el **24/09/2026** (fin de semana del GP de Azerbaiyán), qué se arregló, qué **no** se pudo verificar, y qué se pide auditar. No asume que lo arreglado esté bien: varias correcciones se probaron sólo en local.

## 1. El requisito (no negociable)

Dicho por el dueño del proyecto (ver también `docs/` y la memoria del proyecto: confianza en la primera visita, "las fuentes nunca se achican", "la hora manda y los tiempos se actualizan sin recargar"):

- Cuando termina una sesión (práctica, clasificación, sprint, carrera) de cualquier categoría con fuente automática, **sus resultados tienen que estar en el sitio a los minutos**, en **todas** las superficies que los muestran (home, evento, piloto, categoría, notas, menú), y **de forma consistente**: nunca una superficie con el dato y otra sin él.
- Un dato que existe en una fuente **no puede** dejar de verse por un problema de caché, de orden de carga, de instancia, de timeout o de despliegue. Si no se puede tener el dato, hay que **decirlo** en pantalla, no mostrar una versión vieja como si fuera actual.
- Los errores que se describen abajo "no pueden ocurrir nunca". Que hayan ocurrido indica un problema de diseño, no de mala suerte.

## 2. Cómo llegan los datos hoy (mapa)

```
Fuentes externas ──► src/lib/sources/*.mjs ──► buildSeason() (season.mjs)
  Jolpica (F1 carrera/quali/sprint, campeonato)     │
  OpenF1 (F1 prácticas, sprint quali)  ← 401 con cualquier sesión en vivo
  formula1.com/en/results (F1 todas)   ← f1-official.mjs (HTML scrapeado)
  YouTube @Formula1 (RSS/API)          ← f1-youtube.mjs
  FIA (F2), ACTC, APAT, TC2000, GTWC, Speedhive, Wikipedia…
                                                    │
              ┌─────────────────────────────────────┴───────────────┐
              ▼                                                     ▼
  (A) INSTANTÁNEA COMMITEADA                               (B) RECONSTRUCCIÓN EN VIVO EN EL SITIO
  src/data/season-2026.json                                src/lib/season-data.ts (loadRawSeason)
  la escribe GitHub Actions                                 · loadBase(): buildSeason(nextIo, snapshot)
  (.github/workflows/sync-season.yml)                         memo 60 s, espera máx. 6 s (WAIT_MS),
  · crons: lun/jue 06:00, sáb/dom, jue 14/20,                 si no llega devuelve `lastGood`
    vie 15/22, diario 09:00 UTC                               (por defecto: la instantánea).
  · + reintento horario jue-dom con compuerta                · withHotSources(): f1-official + f1-youtube
    (scripts/pending-sessions.mjs)                              aplicados sobre la base, espera máx. 5 s
  · commit "datos: sincronización automática…"              · caché por URL: `fetch(..., {next:{revalidate}})`
    → push a main → Vercel despliega                          (src/lib/sources/io-next.ts)
              │                                                     │
              └──────────────► getSeason() (data.ts) ◄──────────────┘
                                     │  createSeason(raw): aplica manual-overrides.json, tablas, etc.
                                     ▼
   Páginas (Next 16, App Router): home revalidate=15; evento/piloto/categoría/calendario/notas/[slug] revalidate=60;
   /notas force-dynamic (desde el PR de esta rama); layout.tsx async (menú con getAllNotes()).
   Vercel cron diario 10:00 UTC → /api/refresh → revalidatePath("/", "layout").
```

Notas automáticas: `src/lib/notas-auto.ts` (puro) → `src/lib/notas.ts#getAllNotes()` (async, depende de `getSeason()`).
Guardián/vigilante (Telegram): `scripts/guardian.mjs`, `scripts/watchdog.mjs`, `src/lib/monitor/*`.

Estado por instancia (peligroso en serverless): `memo`, `lastGood`, `hot` en `season-data.ts`, y `cached` en `data.ts#getSeason`. **Cada instancia de Vercel tiene el suyo**, con TTL propios y arranque en frío.

## 3. Cronología de fallas observadas (24/09/2026)

| # | Síntoma que vio el usuario | Causa encontrada | Estado |
|---|---|---|---|
| 1 | Sin resultados de la P1 (terminó 09:30 UTC) ni de la P2 | OpenF1 rechaza (401) **todo** pedido sin clave mientras haya cualquier sesión en vivo, y era la única fuente de prácticas; además el 401 contaba como "falla de fuente" | Fuente de respaldo `f1-official.mjs`; el 401 ya no es falla |
| 2 | Home sin resultados de prácticas | `getRecentResults` sólo considera `carrera/final/sprint/serie` (`RECENT_KINDS`) | Nueva sección "Recién terminó" (`getJustFinished`) |
| 3 | Aun con la fuente arreglada, el sitio mostraba la instantánea vieja | La reconstrucción completa tarda minutos; el sitio espera 6 s y sirve `lastGood` (= instantánea sin Baku). La instantánea de `main` no tenía Baku | `withHotSources` (5 s, sólo F1 oficial + YouTube) |
| 4 | "La sincronización de datos falló" (run 36008708427) | La sync tarda ~6 min; un merge a `main` entró en el medio → `git push` rechazado → **se perdieron los datos generados** | Push con hasta 4 reintentos y `pull --rebase -X theirs` (PR #18) |
| 5 | La crónica de F1 estaba en el menú pero **no** en `/notas` | **Sin causa confirmada** (ver §5) | `/notas` pasó a `force-dynamic`; **no verificado en producción** |
| 6 | Nota de F1 ausente del desplegable del menú | El menú usaba sólo notas a mano (`getNotes`) | Layout async con `getAllNotes()` (PR #19) |

Además, en una corrida local de prueba, Jolpica falló de forma transitoria ("No se pudo descargar …/9/driverstandings.json"), lo que hizo que la F1 entera cayera a la instantánea anterior. Es esperable con la lógica actual y es otra forma de "dato viejo servido como actual".

## 4. Cosas que NO se verificaron (importante)

- **Nunca se probó contra producción.** El dominio de producción no pudo ubicarse desde la herramienta (el dominio público adivinado da `DEPLOYMENT_NOT_FOUND`; el de despliegue de Vercel redirige, 302, a inicio de sesión por la protección de despliegues). Todo se verificó con `next dev` en local y `next build`. El MCP de Vercel del entorno pide autorización y no estaba disponible.
- Los cambios fueron **mergeados a `main` (y por tanto desplegados) sin prueba posterior en el despliegue**. Eso fue un error de proceso.
- No hay ninguna prueba automática del camino de ejecución del sitio (`season-data.ts`, `data.ts`, páginas): `npm test` sólo corre `.mjs` en Node y `data.ts` usa alias `@/…` y JSON, por lo que no se puede importar. Sólo se cubren las fuentes, `notas-auto`, el guardián y los monitores.
- El comportamiento real de ISR/caché de Next 16 con `revalidate` + `fetch(next.revalidate)` + estado a nivel de módulo en Vercel (varias instancias, arranque en frío) se razonó, no se midió.

## 5. Hipótesis abiertas sobre la falla #5 (menú sí, `/notas` no)

`/notas` (entonces `revalidate = 60`) y el layout (menú) llaman a `getAllNotes()` → `getSeason()`. Que uno tenga la crónica y el otro no sugiere que **dos renders distintos vieron dos temporadas distintas**. Candidatas, sin ordenar por probabilidad:

1. La página se prerenderizó/regeneró en un momento en que `withHotSources` superó los 5 s (`HOT_WAIT_MS`) y devolvió la base sin Baku; el resultado quedó **cacheado como ISR** hasta la próxima revalidación, mientras el layout se evaluó en otro momento.
2. Instancias distintas de Vercel con `memo`/`hot`/`lastGood` distintos (uno caliente, otro en frío).
3. Semántica de ISR: el primer pedido tras vencer `revalidate` sirve la copia vieja y regenera en segundo plano; el usuario vio la vieja.
4. El layout y la página se cachean como entradas distintas del árbol RSC/segmentos y no comparten la misma "foto" de datos.
5. `getSeason()` compara `cached?.raw !== raw` por identidad; `withHotSources` devuelve un objeto nuevo cada 30 s, lo que reconstruye `createSeason` (costoso) y puede intercalar versiones.

**Se pide reproducir esto con evidencia** (ver §7), no confiar en la explicación.

## 6. Riesgos de diseño detectados (a confirmar o refutar)

1. **Carrera de tiempo en el render**: `Promise.race([build, timeout])` decide qué versión de los datos ve *cada render*. El resultado depende de la latencia del momento, no del estado del mundo. Es no determinista por diseño.
2. **Dos fuentes de verdad** (instantánea commiteada y reconstrucción en vivo) con reglas de fusión distintas. La reconstrucción en vivo parte de la instantánea (`previous`) y `protectSeason` decide qué se conserva; no hay una noción explícita de "este dato es más nuevo que aquel".
3. **Estado en memoria por instancia** para algo que debería ser compartido y durable (los resultados ya traídos). Una instancia en frío pierde lo que otra ya sabe.
4. **Las páginas ISR no saben que sus datos envejecieron**: `revalidate` es por tiempo, no por evento (fin de sesión). No hay invalidación dirigida (`revalidateTag`/`revalidatePath`) cuando entran resultados nuevos; sólo un cron diario de Vercel en `/api/refresh`.
5. **La sync es un proceso largo y no atómico** que compite con otros commits. Además el sitio se redespliega en cada commit de datos (costo y ventana de inconsistencia).
6. **Scraping de HTML de formula1.com** (`f1-official.mjs`): depende de clases utilitarias de Tailwind (`max-lg:hidden`, `max-md:hidden`, `md:hidden`) y del orden de la tabla de índice; si cambia el diseño, falla en silencio o (mejor caso) con error "índice no coincide". Términos de uso no revisados a fondo.
7. **Doble semántica del "no hay dato"**: una tabla vacía (sesión aún sin publicar) y una fuente caída se tratan distinto según el módulo; en la UI ambas terminan en "sin resultados cargados", que es indistinguible de "no hay".
8. **Frescura no expuesta**: no hay una página/endpoint que diga "datos de F1 de hace X min, fuente Y, sesiones pendientes Z". El usuario y el dueño no pueden ver si el sitio está viejo.
9. **Correcciones apiladas**: cada arreglo se agregó encima (OpenF1 → oficial → caliente → sección nueva → menú → `force-dynamic`) sin rediseñar el flujo; puede haber caminos redundantes o contradictorios.

## 7. Qué se pide auditar (entregables)

1. **Reproducir en producción** (o en un preview con protección desactivada) las fallas #1, #3 y #5 con evidencia: cabeceras `x-vercel-cache`, `age`, `x-nextjs-cache`, hora de generación de cada respuesta, y qué instancia respondió. Determinar la causa real de #5.
2. **Definir y hacer cumplir invariantes** (ideas):
   - *Consistencia*: para todo instante, todas las páginas derivan de **la misma versión** de la temporada (un `version`/`generatedAt` visible en un `<meta>` o cabecera).
   - *Frescura*: toda sesión terminada hace >X min de una fuente automática está en el sitio o **el sitio dice explícitamente que falta**.
   - *Monotonía*: un dato ya mostrado no desaparece (ya existe `guard.mjs` para la instantánea; extenderlo al camino en vivo).
3. **Rediseñar el camino de datos** para eliminar la carrera de tiempo y el estado por instancia. Opciones a evaluar: (a) escribir resultados "calientes" en un almacén compartido (Neon ya está en el proyecto para tareas; o Vercel Blob/Edge Config/Runtime Cache) y leer siempre de ahí; (b) que la sync no sea un commit sino una escritura en el almacén + `revalidateTag`; (c) páginas dinámicas con caché explícita por etiqueta en lugar de `revalidate` por tiempo; (d) que un fallo de fuente devuelva "dato viejo **marcado**" y no silencio.
4. **Invalidación por evento**: al detectar resultados nuevos (sync horaria, webhook, cron), invalidar las rutas afectadas (`/`, `/eventos/<id>`, `/notas`, `/pilotos/<slug>`, `/categorias/<id>`).
5. **Pruebas que hoy no existen**:
   - Prueba de contrato del camino de ejecución (poder importar `data.ts`/`season-data.ts` en el runner de tests, p. ej. con alias resueltos o moviendo la lógica pura a `.mjs`).
   - Prueba de humo **post-despliegue** en CI (GitHub Actions contra la URL de producción/preview): "para cada sesión terminada con resultados en la instantánea, la home/evento/notas la muestran".
   - Prueba de degradación: OpenF1 401, Jolpica caído, formula1.com con HTML cambiado, sync con push rechazado.
6. **Observabilidad**: endpoint (p. ej. `/api/salud`, protegido) con `generatedAt` de la instantánea, edad por fuente, sesiones pendientes, versión de datos por instancia; alertas del guardián si la edad supera un umbral **en producción**, no sólo en el repo.
7. **Proceso**: bloquear merges a `main` sin una verificación en preview; evitar que la sync y los PRs compitan por `main` (concurrencia de despliegues, o mover los datos fuera del repo).

## 8. Mapa de archivos

| Tema | Archivos |
|---|---|
| Reconstrucción y fusión | `src/lib/sources/season.mjs`, `guard.mjs`, `common.mjs`, `io-next.ts` |
| Fuentes F1 | `jolpica` en `f1.mjs`, `openf1.mjs`, `f1-official.mjs`, `f1-youtube.mjs` (+ `f1-official.test.mjs`) |
| Servido en ejecución | `src/lib/season-data.ts` (memo/lastGood/hot), `src/lib/data.ts` (`getSeason`, `createSeason`, `getJustFinished`, `getRecentResults`) |
| Páginas | `src/app/page.tsx` (home, `recien`), `src/app/notas/*`, `src/app/eventos/[id]`, `src/app/layout.tsx`, `src/lib/menu.ts` |
| Notas | `src/lib/notas-auto.ts`, `src/lib/notas.ts`, `src/data/notas.ts`, `src/components/notas*.tsx` |
| Sync y avisos | `.github/workflows/sync-season.yml`, `scripts/sync-season-2026.mjs`, `scripts/pending-sessions.mjs`, `scripts/guardian.mjs`, `scripts/watchdog.mjs`, `src/lib/monitor/*` |
| Cron de Vercel | `vercel.json`, `src/app/api/refresh/route.ts` |
| Fuentes documentadas | `docs/fuentes-de-datos.md`, `docs/avisos-telegram.md` |

## 9. Cómo correr lo que hay

```bash
npm test            # 70 pruebas (fuentes, notas automáticas, monitores); no cubre páginas ni caché
npx next build      # compila con la instantánea del repo (PISTA_LIVE / NEXT_PHASE => sin red)
npm run dev         # reconstruye en vivo; la primera carga en frío tarda (F2 espera 11 s por pedido)
node scripts/pending-sessions.mjs   # ¿la compuerta de la sync horaria diría que sí?
```

Detalles del entorno de desarrollo: en un worktree hay que hacer `npm ci` (un enlace simbólico a `node_modules` de otro directorio rompe Turbopack). En esta máquina la cuenta activa de `gh` no es la dueña del repo (usar el token de `leobastianelli` explícitamente).
