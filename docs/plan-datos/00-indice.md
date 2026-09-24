# Plan: datos consistentes y frescos en todo el sitio

Contexto completo del problema: `docs/auditoria-frescura-de-datos.md`. Este plan lo reemplaza como guía de trabajo: la auditoría describe los síntomas, y estos archivos dicen qué hacer, en qué orden y cómo verificar.

## El diagnóstico en tres líneas

1. **La reconstrucción de la temporada durante el render no sirve y demora cada pedido.** El memo dura 60 s y reconstruir tarda minutos, así que cada pedido dinámico espera 6 s (`WAIT_MS`) y recibe la instantánea del repo. Medido en producción el 24/09/2026: `/notas` tardó 6,47 s, 6,44 s y 6,42 s, siempre con `X-Vercel-Cache: MISS`.
2. **Hay tres cachés por tiempo apiladas y ninguna sabe qué versión de los datos tiene:** el `fetch` con `revalidate`, el estado en memoria de cada instancia y el ISR de cada página. Encima, un `Promise.race` decide qué datos ve cada render según la latencia. Que dos pantallas muestren cosas distintas es lo esperable con este diseño, no mala suerte.
3. **La falla "el menú tiene la nota y `/notas` no"** se explica porque el layout no se vuelve a renderizar al navegar dentro del sitio (el menú queda de la primera carga), y porque dentro de un mismo render el layout y la página llaman a `getSeason()` por separado, sin `cache()` de React.

## El objetivo final

Una sola versión de la temporada, guardada en Neon con número de versión. Todas las páginas leen esa versión. Los escritores (la sincronización completa y un refresco "caliente" liviano) escriben versiones nuevas y después invalidan las páginas. El render no busca datos en las fuentes externas ni compite contra un temporizador. La versión servida es visible, así que se puede comprobar.

## Orden y modelo sugerido

| Archivo | Qué | Modelo | Tamaño |
|---|---|---|---|
| `01-sacar-reconstruccion-del-render.md` | Arreglo inmediato: sacar los 6 s y dejar una sola temporada por render | Sonnet | Chico |
| `02a-almacen-de-temporada.md` | Tabla en Neon y un lector único con versión; el sitio lee de ahí | Sonnet | Mediano |
| `02b-sync-escribe-al-almacen.md` | La sync de GitHub Actions escribe al almacén e invalida las páginas; se dejan de redesplegar por datos | Sonnet | Mediano |
| `02c-refresco-caliente.md` | Resultados de F1 a los minutos, escritos al almacén; se saca lo caliente del render | Sonnet | Mediano |
| `03-version-visible-y-salud.md` | Versión en `<meta>` y cabecera, `/api/salud`, el guardián mira producción | Sonnet | Chico |
| `04-prueba-de-humo-post-despliegue.md` | CI que verifica el sitio desplegado, no el repo | Sonnet | Chico |

Van en ese orden: cada uno supone terminado el anterior. Al final de 02b y de 02c conviene una revisión con Opus (`/code-review` sobre el PR) antes de mergear: son los cambios con más riesgo de concurrencia.

## Reglas para todas las etapas (leer antes de empezar cualquiera)

- **Una rama y un PR por archivo.** No mergear a `main` sin verificar en producción o en un preview (ver "Verificación" de cada archivo). En la ronda anterior se mergeó sin probar en el despliegue, y eso fue parte del problema.
- **Dominio de producción: `https://www.somosfierros.ar`** (`somosfierros.ar` redirige con 308). Los previews de Vercel tienen protección de despliegue: para medirlos hace falta el secreto de "Protection Bypass for Automation", que carga el dueño del proyecto. Si no está, se verifica en producción después del merge y se dice así en el PR.
- **Next 16.3 no es el Next que conocés.** Antes de tocar caché o revalidación, leer `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md` y `.../03-api-reference/04-functions/revalidatePath.md`. El proyecto **no** usa `cacheComponents`. `revalidateTag` pide dos argumentos en esta versión (`revalidateTag(tag, "max")`).
- **Prohibido agregar otra capa de caché, otro timeout o otro estado a nivel de módulo** para tapar un síntoma. Si algo no llega a tiempo, se muestra marcado como viejo; no se sirve en silencio otra versión.
- **Las fuentes nunca se achican:** toda escritura de una temporada nueva pasa por la protección de `src/lib/sources/guard.mjs`.
- En un worktree nuevo, correr `npm ci` (un enlace a `node_modules` de otro directorio rompe Turbopack).
- `git push` y `gh` pueden fallar con "repository not found" si la cuenta activa de `gh` no es `leobastianelli`. En ese caso, pedírselo al dueño; no intentar cambiar credenciales.
- Los secretos (variables de entorno en Vercel y secretos de GitHub Actions) **los carga el dueño**. La sesión dice exactamente qué nombre y qué valor hacen falta, y espera.

## Antes de la etapa 01: confirmar qué está desplegado

Producción tiene el buscador de `/notas` (commit `e5c6a51`, rama `claude/notas-buscador-auditoria`), pero el 24/09 ese commit no estaba en el `main` local. Antes de empezar, averiguar si ya se mergeó. Si producción se desplegó desde una rama, la próxima sincronización automática de `main` lo va a pisar, y eso hay que resolverlo primero (mergear esa rama o volver atrás).
