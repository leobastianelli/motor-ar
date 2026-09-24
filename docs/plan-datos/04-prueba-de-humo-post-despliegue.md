# 04 — Prueba de humo después de cada despliegue, y pruebas de degradación

Leer primero `docs/plan-datos/00-indice.md`. Supone terminada la etapa 03 (el `<meta name="fierros-datos">` y `/api/salud` existen).

## Objetivo

Que un despliegue roto o que sirve datos inconsistentes se detecte solo, antes o apenas después de llegar a producción. Y cubrir con pruebas las fallas de fuentes que ya pasaron.

## Qué hacer

### 1. Script `scripts/humo.mjs <url-base>`

Node puro, sin dependencias nuevas. Si existe la variable `VERCEL_AUTOMATION_BYPASS_SECRET`, agrega la cabecera `x-vercel-protection-bypass` para poder entrar a los previews. Verifica:

1. `/api/salud` responde 200 y `servedFrom === "store"`.
2. `/`, `/notas`, `/calendario` y la página del evento más reciente con resultados responden 200 en menos de 3 s.
3. **Consistencia:** el `v=` del `<meta name="fierros-datos">` es el mismo en las cuatro páginas y coincide con `almacen.ultimaVersion` de `/api/salud`. Si no coincide, reintentar una vez a los 30 s (puede ser una revalidación en curso) y recién ahí fallar.
4. **Frescura:** por cada sesión con resultados en la última versión, de una categoría con fuente automática, que terminó en los últimos 3 días, la página de su evento contiene el nombre del ganador (normalizado sin tildes).
5. **Notas:** cada crónica automática de los últimos 3 días (la lógica pura está en `src/lib/notas-auto.ts`; si no se puede importar desde Node, comparar contra los títulos que devuelva `/api/salud`, agregándolos ahí) aparece en `/notas` **y** en el menú del HTML de `/`.

La salida es legible y termina con código distinto de 0 si algo falla. Las funciones de comparación van en un `.mjs` con pruebas (`humo-checks.test.mjs`).

### 2. Workflow `.github/workflows/humo.yml`

- Disparador: `deployment_status`, cuando `github.event.deployment_status.state == 'success'`. Vercel publica estados de despliegue en GitHub; `target_url` es la URL del despliegue.
- Corre `node scripts/humo.mjs "$TARGET_URL"` con `VERCEL_AUTOMATION_BYPASS_SECRET` de los secretos. **El dueño** tiene que activar "Protection Bypass for Automation" en Vercel y cargar el secreto en GitHub: pedirlo con esos nombres exactos.
- Si falla en producción (`environment == 'Production'`), avisar por Telegram con el mismo módulo que usa el vigilante (`src/lib/monitor/telegram.mjs`).
- Proponerle al dueño (no hacerlo sin su OK) que el check `humo` del preview sea obligatorio para mergear a `main` (reglas de protección de rama en GitHub).

### 3. Pruebas de degradación (`npm test`)

Con un `io` falso, sobre `buildSeason` o las fuentes individuales:

- OpenF1 responde 401 a todo → no cuenta como falla y los resultados de F1 salen de la fuente oficial.
- Jolpica caído → la F1 conserva lo de `previous`, queda en `failures` y no se pierde ningún resultado.
- formula1.com con HTML cambiado (una tabla sin las clases esperadas) → error explícito "índice no coincide" o equivalente, y se conserva lo previo. Nunca una tabla vacía tomada como válida.
- Una fuente que devuelve menos eventos que antes → `protectSeason` los recupera (ya hay pruebas en `guard.test.mjs`: sumar sólo lo que falte).
- `writeVersion` con escritura concurrente (si no quedó cubierto en 02b).

## Qué NO hacer

- No correr la prueba de humo contra `localhost` en CI; el objetivo es probar el despliegue real.
- No hacer reintentos infinitos para que "pase": un reintento, y si falla, falla.
- No activar reglas de protección de rama sin el OK del dueño.

## Verificación

1. `npm test` pasa con las pruebas nuevas.
2. `node scripts/humo.mjs https://www.somosfierros.ar` pasa contra producción.
3. Romper algo a propósito en un preview (por ejemplo, forzar `servedFrom: "snapshot"` con una variable de entorno de prueba) → el workflow falla con un mensaje claro. Deshacer el cambio.
4. Un despliegue de producción real dispara el workflow y pasa.

## Terminado cuando

Cada despliegue queda verificado automáticamente y las cinco degradaciones tienen su prueba.
