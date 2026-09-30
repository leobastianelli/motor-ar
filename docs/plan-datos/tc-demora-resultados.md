# Diagnóstico: por qué los resultados del TC tardan en aparecer

Fin de semana medido: sábado 26 y domingo 27/09/2026. Las cuatro categorías fueron **TC Pick Up y TC Pista Pick Up en Balcarce (fecha 8)** y **TC Mouras y TC Pista Mouras en Rosario (fecha 9)**, no en Balcarce: el autódromo de La Plata estaba clausurado y la ACTC movió esa fecha. Horas argentinas (AR) salvo que se diga otra cosa. Sólo lectura: no se tocó código.

## Resumen

- **Nuestra demora real es de 26 a 29 minutos por final; la de la ACTC, de unas 2 horas.** De las 2 h 25 a 2 h 45 que pasaron entre la bandera y el sitio, la ACTC se llevó cerca del 80 %.
- La demora nuestra tiene una causa principal: `/api/pulso` no puede disparar la sincronización completa más seguido que cada **50 minutos** (candado de 45 min más el pulso de 5 min), y cada corrida tarda 4 o 5 minutos. Con esa cadencia, en promedio se espera unos 25 minutos por publicación nueva. Es lo que se observó.
- Para las series y las finales de Pick Up, `/api/pulso` sí dispara, pero sólo porque hay **horarios cargados a mano**. Para TC Mouras y TC Pista Mouras nadie cargó horarios y **no existe ningún disparo propio**: sus resultados entraron porque viajaron en la sincronización que pedían los Pick Up.
- Los horarios del finde estaban publicados: SoloTC sacó el cronograma de Balcarce el 22/09 a las 20:41 y **no lo leemos porque usa las siglas TCPU y TCPPU**, que nuestro lector no reconoce. La ACTC no publicó cronograma en su propio sitio para esas dos fechas. Para Rosario no encontramos cronograma en ninguna de las dos fuentes.
- La ACTC sí deja fecha y hora de publicación, pero no donde uno mira primero (ver pregunta 2). Con eso se puede medir cada fin de semana.

## Línea de tiempo por final (domingo 27/09)

"Bandera estimada" sale del horario programado (Carburando y SoloTC, cargado a mano el 24/09): es el fin previsto de la tanda, no una hora medida. "Publicación ACTC" es la hora de subida del archivo oficial (ver pregunta 2). "Entrada al sitio" es la hora de la versión del almacén (`season_versions`) que trajo el resultado por primera vez.

| Final | Bandera estimada | Planilla "parciales" de la ACTC | Final oficial en el portal | Entra al sitio | ACTC (bandera a publicación) | Nuestra (publicación a sitio) | Total |
|---|---|---|---|---|---|---|---|
| TC Pista Pick Up | 13:40 (13:10 a 13:40) | 13:47:25 | **15:58:37** (doc 962) | **16:24:58** (v38) | 2 h 19 min | 26 min | 2 h 45 min |
| TC Pick Up | 14:50 (14:10 a 14:50). SoloTC ya publicó al ganador a las 15:06 | 15:56:24 (doc 961) | **16:45:57** (doc 963) | **17:14:56** (v39) | 1 h 56 min | 29 min | 2 h 25 min |
| TC Mouras | sin horario | sin planilla | entre **16:46** y ~17:12 (doc 967) | **17:14:56** (v39) | no medible | hasta 29 min | no medible |
| TC Pista Mouras | sin horario | sin planilla | entre **16:46** y ~17:12 (doc 966) | **17:14:56** (v39) | no medible | hasta 29 min | no medible |

Cómo se acota lo de Mouras: los documentos del portal tienen número correlativo por orden de carga. El 963 (final de TC Pick Up) es de las 16:45:57. Los cuatro siguientes (964 a 967) son las series y finales de Mouras, y el 968 es del lunes 28/09. Las versiones anteriores (v38, 16:24) no los tenían y la v39 (17:14) sí. Además las páginas de Mouras no traen hora ni archivo descargable (vienen de otro sistema de cronometraje, rotulado "TCM Y TCPM - F3 METRO - BORA - 4000 ARG"), así que no hay marca exacta.

Las series, para ver el mismo patrón en una sesión corta:

| Sesión | Fin programado | Publicación ACTC (planilla) | Entra al sitio | Nuestra demora |
|---|---|---|---|---|
| TCPPK Serie 1 | 11:05 | 11:02:40 (doc 949) | 11:19:16 (v31) | 17 min |
| TCPPK Serie 2 | 11:30 | 11:26:24 (doc 950) | 11:29:43 (v32) | 3 min (llegó una corrida programada justo antes) |
| TCPK Serie 1 | 11:55 | 11:51:19 (doc 951) | 12:09:16 (v33) | 18 min |
| TCPK Serie 2 | 12:20 | 12:15:10 (doc 955) | 13:55:16 (v34) | **100 min** (ver causa 4) |
| Series de Mouras | sin horario | después de las 16:45:57 (docs 964, 965) | 17:14:56 (v39) | hasta 29 min |

La clasificación de Mouras del sábado siguió el mismo camino: los documentos 947 y 948 vienen después del 946 (grilla de TC Pick Up, subida a las 17:39 del sábado) y entraron al sitio a las 18:18 (v29).

## 1. Cómo decide /api/pulso pedir la sincronización

Código: `src/app/api/pulso/route.ts`, función `pasoSincronizacion` (línea 54).

1. Toma las sesiones de la temporada en memoria con las cargas manuales ya aplicadas (`visibleEvents`) y llama a `pendingForDispatch` (`src/lib/pulso-core.mjs:16`).
2. `pendingForDispatch` usa `sessionResultsMissing` (`src/lib/monitor/checks.mjs:139`) con la ventana propia del pulso: sesiones de categorías automáticas que **terminaron hace entre 10 min y 6 h y siguen sin resultados** (`DISPATCH_AFTER_MIN = 10`, `DISPATCH_BEFORE_HOURS = 6`).
3. Si hay alguna, reserva el candado `claimDispatch` (tabla `pulso_estado`, `src/lib/pulso-dispatch.mjs`). El candado dura **45 minutos** (`DISPATCH_LOCK_MINUTES`, `src/lib/pulso-core.mjs:6`).
4. Si el candado se obtuvo, dispara el workflow `sync-season.yml` por la API de GitHub con `timing_days: "21"`.

**Sesiones sin hora conocida:** `sessionResultsMissing` descarta las que tienen `timeKnown === false` (línea 145 de `checks.mjs`). El refresco caliente hace lo mismo (`hot-refresh-core.mjs:25`) y además sólo mira F1 (línea 23). Las sesiones que crea el portal de tiempos nacen así: `actc-timing.mjs:282-283` les pone `start` a las 12:00 del día del documento y `timeKnown: false`. Por eso en el almacén todo figura a las 12:00. Una fecha sin horarios reales nunca tiene "sesión terminada hace más de 10 minutos" para el pulso.

**Lo que hizo el domingo.** Con la temporada guardada en cada versión y las cargas manuales que existían ese día (sólo Pick Up, `manual-overrides.json`, cargadas el 24/09 a mano desde Carburando), la simulación de `pendingForDispatch` cada 5 minutos coincide con los disparos reales:

| Disparo (workflow_dispatch) | Qué estaba pendiente | Versión que produjo | Duración del workflow |
|---|---|---|---|
| 11:15 | TCPPK Serie 1 (terminó hace 10 min) | v31, 11:19 | 4 min |
| 12:05 | TCPK Serie 1 | v33, 12:09 | 4 min |
| 13:50 | TCPPK Final | v34, 13:55 | 5 min |
| 14:40 | TCPPK Final | v36, 14:45 | 5 min |
| 15:30 | TCPPK Final y TCPK Final | v37, 15:34 | 4 min |
| 16:20 | TCPPK Final y TCPK Final | v38, 16:24 | 5 min |
| 17:10 | TCPK Final | v39, 17:14 | 8 min (la versión se escribe a los 4 min) |

- Siete disparos en el día, **cada 50 minutos** cuando hubo algo pendiente (45 del candado más hasta 5 del pulso). Entre 12:05 y 13:50 no hubo disparo porque no quedó nada pendiente (ver causa 4).
- `pulso_estado.last_dispatch_at` vale 17:10:33 y el workflow del último disparo empezó a las 17:10:35: el disparo es inmediato, el problema no es la API de GitHub.
- Tres de los siete disparos (13:50, 14:40, 15:30) no pudieron traer las finales porque la ACTC todavía no las había publicado.
- **Duración de una corrida** (run 36337822876, típica): compuerta 51 s (45 s se van en `npm install` del driver de Neon, que para un disparo manual no hace falta) más sincronización 4 min (`npm ci` 9 s, `Sincronizar` 215 s, donde pesan la pausa de 0,7 s entre páginas de la ACTC y las pausas de las otras fuentes). La versión se escribe al terminar esa etapa. Datos del día: entre 3,5 y 4,8 minutos desde el disparo hasta la versión.
- **Corridas programadas:** además de los disparos hubo corridas `schedule` a las 11:24, 13:59 y 17:09. GitHub entrega una fracción de las horarias: en el día llegaron seis entre las 09:00 y las 20:30, contra doce ticks horarios programados más el de las 16:00. No se puede contar con ellas (la de las 11:24 fue la que trajo TCPPK Serie 2 a los 3 minutos, por suerte).

## 2. De dónde salen los resultados de la ACTC y cuándo los publica

**Fuente:** portal `tiempos.actc.org.ar`. `actcTiming` (`src/lib/sources/actc-timing.mjs:231`) baja el listado `/resultados` y, por cada fecha reciente, la página `/resultados/{id}/ver` de cada sesión (HTML con la tabla). Se queda con la última versión publicada de cada sesión (id más alto, o "RECTIFICADA"). Se ignora todo lo que diga PARCIAL, GRILLA o LARGADA (`classify`, línea 58). La sincronización lo llama desde `buildSeason` (`src/lib/sources/season.mjs`), sin caché: el script `scripts/sync-season-2026.mjs` usa `fetch` directo.

**Fecha de publicación:** el portal no la expone en los encabezados de la página, pero sí hay tres marcas útiles.

- El **nombre del archivo descargable** lleva la hora de subida: `20260927_164557_FINAL_TC_PICK_UP.pdf` es el 27/09 a las 16:45:57. El enlace está en cada página (`/descargar/...`). Sirve para páginas con PDF o Excel.
- El encabezado HTTP `Last-Modified` de esa descarga lo confirma: `last-modified: Sun, 27 Sep 2026 19:45:57 GMT`, que es 16:45:57 AR. Medí tres archivos (963, 962 y la planilla 960) y los tres coinciden con el nombre. Las páginas `/ver` y el listado llevan `Cache-Control: no-store` y no traen `Last-Modified`.
- Algunas páginas `/ver` muestran "HORA hh:mm" (por ejemplo 963: 16:44, 962: 15:58), aproximada. Las de Excel y las de Mouras no la traen. El listado sólo muestra la fecha (dd/mm/aaaa). En el PDF no encontré metadatos de creación.

**Qué publica la ACTC por cada sesión (Pick Up, domingo):** primero una planilla Excel "PARCIALES" con el orden de llegada y los parciales de sector (13:47 para TCPPK, 15:56 para TCPK), y mucho después la clasificación oficial en PDF (15:58 y 16:45). Las series salen más rápido: la planilla de la serie ya es el resultado (11:02, 11:26, 11:51, 12:15) y el PDF viene entre unos minutos y una hora después (12:05 a 12:47), con el mismo contenido.

**Ojo con usar las planillas "parciales" como resultado provisorio.** El orden difiere del oficial: en TC Pick Up el segundo de la planilla es Ciantini D. y el oficial pone segundo a Fritzler; en TC Pista Pick Up el tercero de la planilla es Alberti y el oficial pone tercero a Goya N. (penalizaciones y verificación técnica). El ganador coincidió en las dos, pero el podio no.

**Mouras:** viene de otro sistema de cronometraje. Las páginas no traen hora, archivo ni PDF, y se cargan en tandas, después de los Pick Up.

**Estimación para el resto del dato:** con un solo fin de semana medido, la demora de la ACTC entre bandera y final oficial fue de 1 h 56 min a 2 h 19 min en las finales de Pick Up, mientras que en las series la planilla salió a los pocos minutos del fin de la tanda. No sé si es lo habitual. Para medirlo hace falta guardar la hora de subida en cada sincronización (ver propuesta A).

## 3. Por qué no se cargaron los horarios reales

- **Los horarios de Pick Up estaban publicados y no los leemos.** SoloTC sacó "TC Pick Up en Balcarce: horarios de TV y cronograma" el 22/09 a las 20:41 (sábado y domingo completos). El lector (`parseSchedule`, `src/lib/sources/schedule-notes.mjs:62`) sólo reconoce `TC Pista Pick Up`, `TCPPK`, `TC Pick Up` y `TCPK` (tabla `SERIES_TOKENS`, línea 11). La nota escribe **TCPPU** y **TCPU**. Sin categoría, la fila se descarta. Es un arreglo de pocas líneas (ver propuesta C). Corrí el lector sobre las cuatro notas de SoloTC que traen el cronograma de Balcarce (22/09 y tres del 26/09): devolvió una lista vacía en las cuatro.
- **La ACTC no publicó cronograma propio para esas fechas.** `actcNotes` (`src/lib/sources/actc-site.mjs:94`) sólo toma notas con "cronograma" u "horario" en la dirección. Las notas de la semana en `actc.org.ar/tcpk`, `/tcppk`, `/tcm` y `/tcpm` se llaman "Todo listo para...", "Así se largan las series en Balcarce", "Se presentó el evento del fin de semana": traen inscriptos y grillas, sin tabla de horarios. Además `actcOfficialSchedules` (`actc-official.mjs:6`) sólo mira TC y TC Pista.
- **Rosario (TC Mouras y TC Pista Mouras): no hay horario en ninguna fuente que leamos.** SoloTC no sacó nota de cronograma para esa fecha y la ACTC tampoco. Hay que buscarlo en otro lado (organizador del autódromo, Carburando) y cargarlo a mano o agregar esa fuente.
- **Lo que hicimos el jueves 24/09 fue carga manual de Pick Up** (commit 041a9dc, desde Carburando, horarios "tentativos"). Por eso Pick Up tuvo disparos y Mouras no.
- **Fallo silencioso en la carga manual (`overrides.mjs:31-37`):** cuando una sesión manual no coincide con ninguna de las de la fuente y la fuente ya trae resultados de otra sesión del mismo tipo ese día, la carga se descarta (está pensado para no crear filas fantasma). El domingo a las 12:10 TCPK Serie 1 ya tenía resultados, así que la "Serie 2" manual de TC Pick Up (12:00) se tiró. Las versiones v33 muestran TCPK sin Serie 2 hasta que apareció el documento 958.
- **El sitio mismo muestra sesiones "sin horario" como 12:00:** `sessionStatus` (`src/lib/session-status.mjs`) da por "próxima" toda sesión sin hora hasta que tenga resultados o termine el día. Para Mouras el visitante ve el placeholder todo el domingo.

## 4. Cuánto es nuestro y cuánto de la ACTC

| Parte | Finales Pick Up (tiempo entre bandera y sitio) | Peso |
|---|---|---|
| ACTC publica el resultado oficial | 1 h 56 min y 2 h 19 min | 80 a 85 % |
| Cadencia de disparo del pulso (espera al próximo disparo) | 22 y 25 min | 13 a 17 % |
| Duración de la corrida (hasta que la versión está escrita) | 4,4 min | 3 % |

En las series la cuenta es otra: la ACTC publica a los pocos minutos y **la demora es casi toda nuestra** (3, 17, 18 y 100 minutos). El dato de esas series estaba disponible en el portal desde las 11:02. Y si un fin de semana sólo corrieran categorías sin horario cargado (como Mouras), el pulso y la compuerta horaria no dispararían nada hasta el próximo cron fijo (ver causa 3).

## Causas ordenadas por peso

1. **La ACTC publica el oficial de las finales unas 2 horas después de la bandera** (Pick Up: 1 h 56 a 2 h 19). Pesa 80 a 85 % de la demora total de las finales. No se puede arreglar desde acá; sí se puede no esperar de más ni mostrar una hora de "pendiente" engañosa.
2. **El pulso dispara la sincronización completa como máximo cada 50 minutos** (`DISPATCH_LOCK_MINUTES = 45` en `pulso-core.mjs:6` más el pulso de 5 min) **y sin mirar si la ACTC ya publicó algo**. Las finales de Pick Up aprovecharon recién el cuarto y el quinto disparo; tres corridas en el medio fueron en vano, y se perdieron 22 y 25 minutos por final y 100 minutos en una serie.
3. **No hay refresco caliente para la ACTC.** El de F1 (`hot-refresh.ts`, candado de 3 min, 5 min después del fin de la sesión) sólo cubre F1. Para el TC todo pasa por una corrida de GitHub Actions de 4 a 5 minutos, que instala dependencias y pide toda la temporada. Y sin horario (Mouras) el pulso ni siquiera sabe que hay algo que esperar.
4. **Horarios no cargados o mal leídos:** el cronograma de Pick Up de SoloTC quedó sin leer por TCPU/TCPPU, el de Rosario no existe en nuestras fuentes y la carga manual descarta sesiones (TCPK Serie 2). Sin hora, la sesión no dispara sincronización y aparece a las 12:00.
5. **Corridas programadas poco confiables:** GitHub entrega una fracción de los ticks horarios y con mucho retraso; no sirven de red de seguridad.
6. **Costos fijos de la corrida:** 45 s de `npm install` del driver de Neon en la compuerta aun cuando la corrida es un disparo manual (`sync-season.yml:52`), y las pausas de la sincronización.

## Propuestas

### A. Refresco caliente de la ACTC, igual al de F1 (esfuerzo: medio, 1 a 1,5 días)

Extender `hotNeeds` (`hot-refresh-core.mjs`) y `runHotRefresh` (`hot-refresh.ts`) para las seis categorías del portal de tiempos:

- **Cuándo:** en una fecha de la ACTC en curso (hoy o ayer, entre las 09:00 y las 21:00), si hay una sesión con horario terminada hace más de 5 minutos sin resultados, **o** si la fecha no tiene horarios (Mouras) y estamos en día de carrera. Una consulta por pulso.
- **Qué:** bajar `/resultados` (un pedido, sin caché), comparar los ids del listado con los que ya tenemos guardados (`resultsSource.url`) y pedir **sólo las páginas nuevas** (0 a 6 por vez, en vez de las 50 de una sincronización). Reusar `parseListing`, `classify`, `parseResult` y `mergeTiming` de `actc-timing.mjs`. Escribir una versión `hot` y revalidar, igual que F1. Candado propio de 3 minutos.
- **Extra casi gratis:** guardar en cada sesión la hora de subida del archivo (`Last-Modified` de `/descargar/...`, o el nombre del archivo) como `publishedAt`. Sirve para medir la demora de la ACTC cada fin de semana y para mostrar "publicado por la ACTC a las 15:58".
- **Ganancia esperada:** de 26 a 29 minutos de demora nuestra a menos de 6 (cadencia del pulso de 5 min más segundos de trabajo); en las series, de hasta 100 minutos a menos de 6. La ACTC sigue poniendo sus dos horas en las finales.
- **Riesgos:** el tope de 60 s de la función (con sólo páginas nuevas sobra), no achicar nada que ya teníamos (pasa por `writeVersion`/`mergeOnto`, que fusiona) y la regla "las fuentes nunca se achican" de `guard.mjs`. Tests en `hot-refresh-core.test.mjs` y `actc-timing.test.mjs`.

### B. Disparar la sincronización por evidencia y no por reloj (esfuerzo: bajo a medio, 0,5 día) — alternativa barata a A

Que el pulso pida `/resultados` (un pedido liviano) y, sólo si aparece un documento nuevo que no está en el almacén, dispare la sincronización completa **sin esperar el candado de 45 minutos** (bajarlo a unos 10 minutos cuando hay evidencia). Cuando no hay documentos nuevos se mantiene el candado largo. Mejora: la demora nuestra pasa de 26 a 29 minutos a unos 10 (5 del pulso más 4 a 5 de la corrida). Costo en Actions bajo, porque sólo corre cuando hay algo nuevo. Toca `pulso-core.mjs` y `route.ts`. No resuelve Mouras sin hora de por sí, pero la evidencia (documentos nuevos) sí lo cubre porque no depende del horario. Conviene hacerla si A se demora.

### C. Cargar el cronograma bien (esfuerzo: bajo, 2 a 4 horas en total)

1. Agregar `TCPPU` y `TCPU` a `SERIES_TOKENS` en `schedule-notes.mjs` (TCPPU antes que TCPU, para que uno no se lea como el otro). Dejar la nota de SoloTC del 22/09 de fixture en un test. Con esto, Pick Up habría tenido horarios automáticos cuatro días antes.
2. Arreglar la fusión manual de `overrides.mjs` para que no se descarte una sesión (Serie 2) cuando ya hay otra serie con resultados ese día: sólo descartar si el nombre manual coincide con alguna sesión de la fuente por tipo y número.
3. Hacer que el guardián avise el viernes si una fecha de la ACTC que corre el fin de semana no tiene ningún horario (`timeKnown`). Hoy el guardián ve el hueco recién después, cuando ya hay sesiones terminadas. Para Rosario el aviso habría servido para cargar los horarios a mano el viernes (medio día de trabajo para incluir otra fuente; no hay ninguna que conozcamos).
4. Opcional y barato: sacar 45 s de la compuerta (`sync-season.yml:52`) cuando la corrida es un disparo manual, instalando el driver sólo si `github.event.schedule` lo necesita.

### No recomendado

Usar las planillas "PARCIALES" como resultado provisorio: el podio difirió del oficial en las dos finales de Pick Up (segundo en TC Pick Up, tercero en TC Pista Pick Up). Si algún día se quiere anticipar, tendría que ir con una marca visible de "provisorio", y eso cambia el criterio de "nunca mostrar datos viejos o equivocados como vigentes".

## Orden sugerido

1. **C.1 y C.2** hoy (tocan poco y dejan el cronograma en su lugar para el próximo fin de semana, que es San Nicolás, TC y TC Pista).
2. **B** si se quiere un resultado rápido sin construir nada nuevo; **A** como solución de fondo (incluye la medición de la ACTC).
3. **C.3** junto con A.

## Cómo se midió

- Versiones de `season_versions` del 26 y 27/09 (v14 a v40); sólo se pudieron leer v23 en adelante (las anteriores no tienen cuerpo comprimido). De cada una se obtuvo la primera versión en que cada sesión de las cuatro categorías trae resultados.
- Simulación de `pendingForDispatch` y `visibleEvents` (con las cargas manuales vigentes el domingo) cada 5 minutos, contra los siete disparos reales de `gh run list` (workflow `sync-season.yml`, duración del run y de sus pasos con `gh run view`).
- Portal de la ACTC: páginas `/resultados/920` a `972/ver`, `Last-Modified` de tres descargas, y las notas de `actc.org.ar` de cada categoría. SoloTC: API de WordPress con las mismas consultas que `solotcNotes`.
- Una sola fecha del calendario; con los nombres de archivo de la ACTC se puede repetir la medición para cualquier fin de semana pasado (por ejemplo, el TC de Rafaela del 13/09: docs 920 a 922).
