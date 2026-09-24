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
