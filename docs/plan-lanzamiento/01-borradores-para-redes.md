# 01 — El sitio arma los textos para redes y los manda por Telegram

Leer primero `docs/plan-lanzamiento/00-plan.md` (formatos) y `docs/plan-datos/00-indice.md` (reglas de trabajo).

## Objetivo

Que Leonel no escriba a mano cada publicación. Cuando pasa algo publicable, le llega por Telegram (el mismo bot del guardián) un **borrador listo para copiar y pegar en X**: texto de hasta 280 caracteres con un dato concreto y el enlace. Nada se publica solo: la publicación la hace una persona.

## Qué construir

1. **Lógica pura** en `src/lib/redes-core.mjs`, con pruebas en `redes-core.test.mjs`. A partir de la temporada (la última versión del almacén), `borradores(season, now, { enviados })` devuelve los borradores nuevos. Los formatos del plan:
   - **Agenda del fin de semana** (viernes 09:00, hora argentina): una línea por categoría con fecha ese fin de semana, con día y hora de la carrera principal, y enlace a la home. Si no entra en 280 caracteres, priorizar según la regla de la home (la hora manda; entre dos a la misma hora, desempatan los argentinos) y cerrar con "y más en…".
   - **Terminó la sesión:** cuando una clasificación, sprint, carrera o final tiene resultados por primera vez. Ganador, 2.º y 3.º, argentinos con su posición si corren afuera, y enlace a `/eventos/<id>`. Si la carrera es de una categoría argentina, el líder del campeonato después de la fecha, si la tabla ya está actualizada: si no lo está, no se menciona.
   - **A qué hora corre** (el día de la sesión, a las 08:00): para las sesiones de ese día de pilotos argentinos que corren afuera (`getDriversAbroad`), con la hora, dónde verlo y enlace a `/horarios/<piloto>`.
   - Cada borrador tiene una clave estable (por ejemplo `sesion:<id>`), para no mandarlo dos veces.
2. **Envío:** un paso nuevo en el job `gate` del workflow `sync-season.yml`, que ya corre cada hora de jueves a domingo, y también después del paso de la sincronización. Llama a `scripts/borradores-redes.mjs`, que lee la última versión del almacén (`scripts/season-source.mjs`), calcula los borradores y los manda con `sendTelegram` de `src/lib/monitor/telegram.mjs`. Qué se mandó se guarda como el estado de avisos del guardián (`actions/cache` con una clave propia, por ejemplo `.redes-state.json`). **Validar el YAML** (actionlint corre en el PR).
3. **Formato del mensaje de Telegram:** el borrador en un bloque fácil de copiar, y abajo, en otra línea, "Para X" / "Para Instagram (con la placa)". Si hay imagen (la agenda), el enlace a `/placa/imagen`.

## Reglas de contenido (las mismas del sitio)

- Sólo datos que el sitio ya muestra, con su hora argentina.
- Nada de "EN VIVO" en un borrador: cuando llega a Telegram, puede haber terminado.
- Un enlace por borrador, siempre a `https://www.somosfierros.ar/...`.
- Sin emojis de más: como mucho uno por borrador, al principio (🏁 resultados, 🗓️ agenda, ⏰ horario).

## Qué NO hacer

- No publicar en X automáticamente. La API de X de pago queda fuera de alcance, y una cuenta nueva que publica sola puede quedar limitada.
- No mandar un borrador si faltan datos (por ejemplo, sin el 3.º puesto o sin la hora confirmada).

## Verificación

1. `npm test` con pruebas de cada formato: largo máximo de 280 caracteres contando el enlace como 23 (así lo cuenta X), sin repetir con el estado, sesiones sin hora confirmada, y una carrera con un argentino que no terminó.
2. `node scripts/borradores-redes.mjs --dry` con `FIERROS_NOW` en el viernes 2/10 a las 09:00 y en el domingo 4/10 a las 18:00: mostrar los borradores en el PR.
3. Después del merge, un borrador real llega por Telegram el viernes 2/10 a la mañana.

## Terminado cuando

El viernes 2/10 a la mañana llega la agenda del fin de semana por Telegram, y el sábado y el domingo llega un borrador por cada clasificación y carrera con resultados.
