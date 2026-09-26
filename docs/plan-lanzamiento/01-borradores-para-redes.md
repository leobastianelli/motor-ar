# 01 — El sitio arma los textos para redes y los manda por Telegram

Leer primero `docs/plan-lanzamiento/00-plan.md` (formatos) y `docs/plan-datos/00-indice.md` (reglas de trabajo).

## Objetivo

Que Leonel no escriba a mano cada publicación. Cuando pasa algo publicable, le llega por Telegram (el mismo bot del guardián) el texto armado, con un dato concreto y el enlace, y un botón **"Publicar en X"**. El botón abre la app de X con el texto ya escrito, mediante un enlace de intención: `https://x.com/intent/post?text=<texto codificado>`. Leonel lo revisa y toca Publicar. **Tocar el botón es la confirmación: nada sale sin que él lo apruebe.**

Por qué así y no con la API de X (decidido el 24/09/2026): desde febrero de 2026 la API no tiene plan gratis y cobra USD 0,20 por publicación con enlace, además de pedir una cuenta de desarrollador y claves. El enlace de intención es gratis, no necesita claves ni webhook, y publica la cuenta de Leonel desde su app, como una persona. Si el volumen lo justifica, se cambia a la API más adelante, y sólo cambia qué hace el botón.

## Qué construir

1. **Lógica pura** en `src/lib/redes-core.mjs`, con pruebas en `redes-core.test.mjs`. A partir de la temporada (la última versión del almacén), `borradores(season, now, { enviados })` devuelve los borradores nuevos. Los formatos del plan:
   - **Agenda del fin de semana** (viernes 09:00, hora argentina): una línea por categoría con fecha ese fin de semana, con día y hora de la carrera principal, y enlace a la home. Si no entra en 280 caracteres, priorizar según la regla de la home (la hora manda; entre dos a la misma hora, desempatan los argentinos) y cerrar con "y más en…".
   - **Terminó la sesión:** cuando una clasificación, sprint, carrera o final tiene resultados por primera vez. Ganador, 2.º y 3.º, argentinos con su posición si corren afuera, y enlace a `/eventos/<id>`. Si la carrera es de una categoría argentina, el líder del campeonato después de la fecha, si la tabla ya está actualizada: si no lo está, no se menciona.
   - **A qué hora corre** (el día de la sesión, a las 08:00): para las sesiones de ese día de pilotos argentinos que corren afuera (`getDriversAbroad`), con la hora, dónde verlo y enlace a `/horarios/<piloto>`.
   - Cada borrador tiene una clave estable (por ejemplo `sesion:<id>`), para no mandarlo dos veces.
2. **Envío:** un paso nuevo en el job `gate` del workflow `sync-season.yml`, que ya corre cada hora de jueves a domingo, y también después del paso de la sincronización. Llama a `scripts/borradores-redes.mjs`, que lee la última versión del almacén (`scripts/season-source.mjs`), calcula los borradores y los manda con `sendTelegram` de `src/lib/monitor/telegram.mjs`. Qué se mandó se guarda como el estado de avisos del guardián (`actions/cache` con una clave propia, por ejemplo `.redes-state.json`). **Validar el YAML** (actionlint corre en el PR).
3. **Mensaje de Telegram:** el texto del borrador y un teclado en línea (`reply_markup.inline_keyboard`) con un botón de tipo `url`, "Publicar en X", que apunta al enlace de intención con el texto codificado (`encodeURIComponent`). Es un botón de enlace: no necesita webhook ni manejar respuestas. `sendTelegram` hoy manda sólo texto: agregarle un parámetro opcional para el teclado, sin romper los avisos del guardián. Para la agenda, además, el enlace a `/placa/imagen`, para bajarla y adjuntarla a mano si se quiere.

## Reglas de contenido (las mismas del sitio)

- Sólo datos que el sitio ya muestra, con su hora argentina.
- Nada de "EN VIVO" en un borrador: cuando llega a Telegram, puede haber terminado.
- Un enlace por borrador, siempre a `https://www.somosfierros.ar/...`.
- Sin emojis de más: como mucho uno por borrador, al principio (🏁 resultados, 🗓️ agenda, ⏰ horario).

## Qué NO hacer

- No publicar en X automáticamente ni usar la API de X (paga y con claves): el botón abre X y la persona publica.
- No mandar un borrador si faltan datos (por ejemplo, sin el 3.º puesto o sin la hora confirmada).

## Verificación

1. `npm test` con pruebas de cada formato: largo máximo de 280 caracteres contando el enlace como 23 (así lo cuenta X), sin repetir con el estado, sesiones sin hora confirmada, y una carrera con un argentino que no terminó.
2. `node scripts/borradores-redes.mjs --dry` con `FIERROS_NOW` en el viernes 2/10 a las 09:00 y en el domingo 4/10 a las 18:00: mostrar los borradores en el PR.
3. Después del merge, un borrador real llega por Telegram el viernes 2/10 a la mañana.

## Terminado cuando

El viernes 2/10 a la mañana llega la agenda del fin de semana por Telegram, y el sábado y el domingo llega un borrador por cada clasificación y carrera con resultados.

## Disparo con cron-job.org (24/09/2026)

GitHub Actions descarta la mayoría de sus corridas programadas: el 24/09 la sincronización (cron horario de jueves a domingo) corrió 4 veces de las que tenía que correr, y el vigilante (también horario) otras 4. Todo lo que depende de la hora sufre: los borradores para redes (que dependían del job `gate` de `sync-season.yml`, disparado por esos mismos crons), el respaldo del refresco caliente y la sincronización de un fin de semana. El repo es privado (2.000 minutos de Actions por mes), así que no se puede pasar la sync completa (~7 min) a cada 30 min a ciegas.

**Solución:** un cron externo, [cron-job.org](https://cron-job.org), pega cada 5 min (jueves a lunes) a `GET https://www.somosfierros.ar/api/pulso` (route handler de Next, no depende de GitHub Actions). El endpoint, protegido con su propio secreto (`PULSO_SECRET`, header `Authorization: Bearer <PULSO_SECRET>`; sin la variable responde 503 y no hace nada), hace tres cosas en orden, cada una con su propio try/catch (si una falla, las otras corren igual) y devuelve un JSON con lo que hizo en cada paso:

1. **Refresco caliente:** con la temporada que el sitio ya tiene en memoria (`loadRawSeason()`, con caché) decide si hace falta algo (`hotPending`/`hotNeeds`) antes de tocar la base; si hace falta, llama a `runHotRefresh()` (`src/lib/hot-refresh.ts`), que repite la misma comprobación antes de tomar el candado y leer el cuerpo de 3 MB (así tampoco lo hacen de más el layout ni `/api/caliente`).
2. **Borradores para redes:** `src/lib/redes-envio.mjs` (`enviarBorradores`) calcula los borradores candidatos con `borradores()` (`redes-core.mjs`) y, por cada uno, se reserva en la tabla `redes_enviados` de Neon (`clave TEXT PRIMARY KEY, enviado_at TIMESTAMPTZ`) con `INSERT ... ON CONFLICT DO NOTHING RETURNING` **antes** de mandarlo por Telegram: si el cron externo se solapa con otra corrida, sólo una gana la reserva. El estado ya no viaja en la caché de GitHub Actions (`.redes-state.json`, sacada de `sync-season.yml`): vive en esa tabla, así que sobrevive entre corridas de cron-job.org y de Actions por igual. Sin `TELEGRAM_BOT_TOKEN` o `TELEGRAM_CHAT_ID` se simula (no se reserva ni se manda nada) y la respuesta lo dice. `scripts/borradores-redes.mjs` sigue existiendo como herramienta local (usa la misma función; `--dry` no toca la base ni Telegram).
3. **Sincronización completa a demanda:** si hay sesiones de categorías con fuente automática que terminaron hace más de 10 min y menos de 6 h sin resultados (`pendingForDispatch`, `src/lib/pulso-core.mjs`, sobre la temporada en memoria con `visibleEvents` + manual-overrides, igual que `/api/salud`), y no se disparó ninguna sincronización en los últimos 45 min (candado de una fila, `pulso_estado`, tomado con un `UPDATE` condicional igual que `hot_lock`; `src/lib/pulso-dispatch.mjs`), se dispara el workflow `sync-season.yml` con la API de GitHub (`POST .../actions/workflows/sync-season.yml/dispatches`, `{"ref":"main","inputs":{"timing_days":"21"}}`, con `GITHUB_DISPATCH_TOKEN`). Sin ese token, o sin `DATABASE_URL`, se saltea y lo dice. La tabla `pulso_estado` (y `redes_enviados`) sólo se consulta cuando hay algo pendiente o candidatos: una llamada sin nada que hacer no toca Neon.

Los crons de GitHub Actions **no se sacaron** del todo: la compuerta horaria de `sync-season.yml` sigue igual. Sólo se sacaron de ahí los pasos de borradores (y la caché `.redes-state.json`, que ahora manda `/api/pulso`) y, más tarde, el `schedule` del vigilante (ver abajo).

### El vigilante también pasó a cron-job.org (26/09/2026)

El mismo problema (GitHub Actions descarta corridas programadas) afectaba al vigilante (`scripts/watchdog.mjs`, antes con cron horario propio): si el sitio se caía de noche, el aviso por Telegram podía llegar horas tarde o nunca. Se resolvió igual que los borradores: `GET https://www.somosfierros.ar/api/vigilante` (mismo `PULSO_SECRET`, mismo patrón de respuesta), llamado por un segundo job de cron-job.org cada 30 min, **todos los días** (a diferencia de `/api/pulso`, esto no depende de que haya carreras esa semana). Hace lo mismo que `scripts/watchdog.mjs` (misma orquestación, `src/lib/monitor/watchdog-run.mjs`: prueba las páginas clave por HTTP, lee `/api/salud`, revisa las corridas del sincronizador con `GITHUB_DISPATCH_TOKEN` y evalúa con `evaluate`), pero guarda qué ya se avisó en la tabla `vigilante_estado` de Neon en vez de la caché de GitHub Actions. El workflow `.github/workflows/watchdog.yml` perdió su `schedule` (queda sólo `workflow_dispatch`, para correrlo a mano): si se reactivara un cron ahí a la vez que cron-job.org llama al endpoint, mandarían avisos duplicados con estados distintos.

### Variables que hay que cargar

- **En Vercel** (Project Settings → Environment Variables): `PULSO_SECRET` (uno nuevo, elegido por el dueño, compartido entre `/api/pulso` y `/api/vigilante`), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (los mismos del guardián, si ya existen) y `GITHUB_DISPATCH_TOKEN` (un fine-grained personal access token de GitHub con permiso `Actions: write` — que incluye lectura — sobre `leobastianelli/motor-ar`; `/api/vigilante` lo reutiliza para leer las corridas del sincronizador).
- **En Neon:** correr `npm run db:season:init` (crea, si no existen, `redes_enviados`, `pulso_estado` y `vigilante_estado`; es idempotente).
- **En cron-job.org:** dos jobs →
  - **Borradores/sincronización:**
    - URL: `https://www.somosfierros.ar/api/pulso`
    - Método: `GET`
    - Header: `Authorization: Bearer <el mismo valor de PULSO_SECRET>`
    - Frecuencia: cada 5 minutos
    - Días: jueves a lunes (el resto de la semana no corre nada que dependa de la hora)
    - Timeout: al menos 60 s (coincide con `maxDuration` del endpoint)
  - **Vigilante:**
    - URL: `https://www.somosfierros.ar/api/vigilante`
    - Método: `GET`
    - Header: `Authorization: Bearer <el mismo valor de PULSO_SECRET>`
    - Frecuencia: cada 30 minutos (`*/30 * * * *`)
    - Días: todos
    - Timeout: al menos 60 s (coincide con `maxDuration` del endpoint)
