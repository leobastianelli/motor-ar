# Avisos por Telegram: guardián y vigilante

Dos procesos avisan cuando algo falta o falla. **Sólo envían mensajes**: no leen ni escriben datos del sitio.

| Proceso | Cuándo corre | Qué revisa |
|---|---|---|
| **Guardián** (`scripts/guardian.mjs`) | Al final de cada sincronización de datos (lun y jue 03:00, todos los días 06:00, jue 11:00 y 17:00, vie 12:00 y 19:00, sáb y dom 00:00, dom 16:00; hora argentina) | Horarios que faltan, fechas sin confirmar o en conflicto, fuentes que fallaron, campeonatos atrasados, resultados que no aparecen, cargas manuales viejas |
| **Vigilante** (`GET /api/vigilante`, orquestación en `src/lib/monitor/watchdog-run.mjs`) | Cada 30 min, llamado por cron-job.org (igual que `/api/pulso`; ver más abajo) | Que el sitio responda, que los datos se estén sincronizando (si el sincronizador deja de correr, este lo nota) y, leyendo `/api/salud` de producción, que el sitio sirva la última versión de los datos |

## Cómo funciona un aviso
- **Nuevo problema:** se avisa una vez, con lo necesario para pegárselo a Claude y resolverlo.
- **Sigue abierto:** se recuerda cada 3 h (crítico), 6 h (alto), 24 h (medio) o 72 h (info).
- **Empeora** (por ejemplo, un evento sin horario se acerca): se avisa en el acto, sin esperar.
- **Se resuelve:** se avisa una sola vez ("✅ Resuelto").
- **Una falla suelta de una fuente** puede ser un mal momento: se avisa desde la segunda corrida seguida. Si además se perdieron datos, se avisa enseguida.
- **Un origen caído es un solo aviso:** si varias fallas apuntan al mismo sitio (por el dominio de la URL, o "ACTC"), salen juntas en un hallazgo ("La ACTC no responde (N cosas no se pudieron actualizar)", clave `fuente:actc`) con la lista en el cuerpo. Las "Campeonato X: la fuente no trajo la tabla" se agrupan en otro (`fuente:tablas-sin-datos`) y las pérdidas de datos en `fuente:perdio-datos`. La clave es la del origen aunque falle una sola cosa (sólo cambia el título), para que una caída que crece o se achica no mande "resuelto" y un aviso nuevo. Los agrupados esperan a la segunda corrida seguida, salvo la pérdida de datos. Nunca hay dos hallazgos con la misma clave: si coinciden, se fusionan.
- **Campeonato atrasado:** si la tabla viene de la fuente automática, no se avisa hasta 24 h después del inicio de la última carrera (la fuente suele actualizarla horas más tarde). Si es una carga manual, se avisa en el acto.
- **Resumen diario** a las 06:00: qué está abierto y cómo están los próximos 5 días.

### Horarios pendientes
Sólo para eventos con **fecha confirmada** (si la fecha no es sólida, no sabemos qué está pendiente). Arranca 72 h antes del día del evento y sube de nivel a las 48 h, a las 24 h y el mismo día. Los horarios de muchas categorías se conocen el jueves o el viernes: por eso hay corridas esos días.

### Fecha confirmada, tentativa o en conflicto
- **Confirmada:** la publica una fuente oficial (ACTC, APAT, Jolpica, FIA, GT World) y tiene sede.
- **Tentativa:** viene sólo de Wikipedia o de una carga manual, o la fuente la marca "a confirmar".
- **En conflicto:** dos fuentes no coinciden (hoy se cruza el TN de APAT contra Speedhive).

### Avisos del vigilante sobre la versión de los datos
Salen de `https://www.somosfierros.ar/api/salud` (qué versión sirve el sitio, cuál es la última del almacén y qué sesiones esperan resultados).
- **`/api/salud` no responde:** no se puede saber qué versión sirve el sitio.
- **"El sitio está usando el respaldo":** `servedFrom` no es `store`. El sitio no pudo leer el almacén y muestra la última versión vista o la instantánea del repo (además se ve un aviso de "datos desactualizados" arriba de cada página).
- **"El sitio no toma la versión nueva":** el almacén tiene una versión más nueva (de hace más de 10 min) que la que sirve el sitio: falló la invalidación de las páginas. Una versión vieja **no** avisa mientras sea la última del almacén.
- **"La home muestra una versión vieja":** el `<meta name="fierros-datos">` de la home tiene una versión anterior a la última del almacén (de hace más de 10 min), en dos corridas seguidas. `/api/salud` puede estar al día y las páginas no: esto mira lo que ve la gente.
- **"Sin resultados: <sesión>":** una sesión de una categoría con fuente automática terminó hace más de 60 min y sigue sin resultados.
- **"Tabla incompleta: <sesión>":** la fuente publicó el documento oficial pero con filas sueltas (sin podio, p. ej. 3 filas). No es un error nuestro: no se muestra nada hasta que la ACTC lo corrija. Es de nivel info (se recuerda cada 72 h) y esa sesión no pide sincronizaciones al pulso.
- **"El sitio está lento: /":** la home tardó más de 3 s (desde la segunda corrida seguida). Tiene que salir del caché.

## Puesta en marcha (una sola vez)
Hasta que se carguen los secretos, todo corre igual pero el mensaje sólo se muestra en el log de Actions ("telegram simulado").

1. En Telegram buscá **@BotFather**, escribí `/newbot`, poné un nombre (por ejemplo "Fierros Avisos") y un usuario que termine en `bot`. Te da un **token**. Es una contraseña: no lo pegues en chats, capturas ni commits.
2. Abrí el chat con tu bot nuevo y mandale `/start` (si no le escribís primero, no puede escribirte).
3. Averiguá tu **chat id**: en una ventana privada abrí `https://api.telegram.org/bot<TOKEN>/getUpdates` (reemplazá `<TOKEN>`) y buscá `"chat":{"id":123456789`. Ese número es tu chat id. No compartas esa pantalla.
4. En GitHub: repositorio → **Settings → Secrets and variables → Actions → New repository secret**. Creá `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`. O desde tu terminal: `gh secret set TELEGRAM_BOT_TOKEN` (te pide el valor sin mostrarlo).
5. Probá: pestaña **Actions → "Sincronizar temporada" → Run workflow**. Al terminar tiene que llegarte el resumen diario. Después **Actions → "Vigilante" → Run workflow** (si todo está bien no manda nada; queda para correrlo a mano, ver "Límites conocidos").

## Probar en tu máquina
```bash
npm run guardian -- --dry
GUARDIAN_NOW="2026-09-24T12:00:00-03:00" npm run guardian -- --dry   # simular el jueves al mediodía
npm run watchdog -- --dry
```

## Límites conocidos
- **La comprobación de la tabla de TC2000 solo corre en local.** Su sitio responde 403 a los servidores de GitHub (no a una PC común) y no lo evadimos; en GitHub esa comprobación se saltea sin ruido. Para correrla: `npm run guardian -- --dry` en tu máquina.
- El estado de los avisos del guardián (qué ya se avisó) viaja en la caché de GitHub Actions: si se pierde, un aviso se puede repetir una vez. El del vigilante vive en la tabla `vigilante_estado` de Neon y el de los borradores para redes en `redes_enviados` (ver más abajo): ninguno de los dos depende de esa caché.
- **GitHub Actions descarta corridas programadas cuando hay muchos crons juntos** (medido el 24/09/2026: la sincronización horaria y el vigilante perdieron 4 corridas cada uno en un solo día). Por eso lo que depende de la hora al minuto — los borradores para redes, el disparo de la sincronización cuando hace falta y, desde ahora, el vigilante — pasó a llamarse por un cron externo (cron-job.org): `/api/pulso` cada 5 min de jueves a lunes y `/api/vigilante` cada 30 min, todos los días; ver `docs/plan-lanzamiento/01-borradores-para-redes.md`, sección "Disparo con cron-job.org". El workflow `.github/workflows/watchdog.yml` ya no tiene `schedule` (queda para correrlo a mano); no lo reactives con un cron a la vez que cron-job.org llama a `/api/vigilante`, porque mandarían avisos duplicados con estados distintos (uno en la caché de Actions, el otro en Neon). El resumen diario y el guardián siguen con los crons de GitHub Actions.
- Si `/api/pulso` deja de responder (o cron-job.org deja de llamarlo), no llega ningún borrador nuevo y la sincronización sólo corre por los crons de respaldo de GitHub; por eso conviene que el resumen de las 06:00 llegue todos los días: si un día no llega, algo pasa.
- No hay carga por Telegram todavía: el bot no recibe mensajes (eso viene después, con confirmación obligatoria antes de publicar cualquier dato).
