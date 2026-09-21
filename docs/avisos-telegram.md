# Avisos por Telegram: guardián y vigilante

Dos procesos avisan cuando algo falta o falla. **Sólo envían mensajes**: no leen ni escriben datos del sitio.

| Proceso | Cuándo corre | Qué revisa |
|---|---|---|
| **Guardián** (`scripts/guardian.mjs`) | Al final de cada sincronización de datos (lun y jue 03:00, todos los días 06:00, jue 11:00 y 17:00, vie 12:00 y 19:00, sáb y dom 00:00, dom 16:00; hora argentina) | Horarios que faltan, fechas sin confirmar o en conflicto, fuentes que fallaron, campeonatos atrasados, resultados que no aparecen, cargas manuales viejas |
| **Vigilante** (`scripts/watchdog.mjs`) | Cada hora, aparte del sincronizador | Que el sitio responda y que los datos se estén sincronizando (si el sincronizador deja de correr, este lo nota) |

## Cómo funciona un aviso
- **Nuevo problema:** se avisa una vez, con lo necesario para pegárselo a Claude y resolverlo.
- **Sigue abierto:** se recuerda cada 3 h (crítico), 6 h (alto), 24 h (medio) o 72 h (info).
- **Empeora** (por ejemplo, un evento sin horario se acerca): se avisa en el acto, sin esperar.
- **Se resuelve:** se avisa una sola vez ("✅ Resuelto").
- **Una falla suelta de una fuente** puede ser un mal momento: se avisa desde la segunda corrida seguida. Si además se perdieron datos, se avisa enseguida.
- **Resumen diario** a las 06:00: qué está abierto y cómo están los próximos 5 días.

### Horarios pendientes
Sólo para eventos con **fecha confirmada** (si la fecha no es sólida, no sabemos qué está pendiente). Arranca 72 h antes del día del evento y sube de nivel a las 48 h, a las 24 h y el mismo día. Los horarios de muchas categorías se conocen el jueves o el viernes: por eso hay corridas esos días.

### Fecha confirmada, tentativa o en conflicto
- **Confirmada:** la publica una fuente oficial (ACTC, APAT, Jolpica, FIA, GT World) y tiene sede.
- **Tentativa:** viene sólo de Wikipedia o de una carga manual, o la fuente la marca "a confirmar".
- **En conflicto:** dos fuentes no coinciden (hoy se cruza el TN de APAT contra Speedhive).

## Puesta en marcha (una sola vez)
Hasta que se carguen los secretos, todo corre igual pero el mensaje sólo se muestra en el log de Actions ("telegram simulado").

1. En Telegram buscá **@BotFather**, escribí `/newbot`, poné un nombre (por ejemplo "Fierros Avisos") y un usuario que termine en `bot`. Te da un **token**. Es una contraseña: no lo pegues en chats, capturas ni commits.
2. Abrí el chat con tu bot nuevo y mandale `/start` (si no le escribís primero, no puede escribirte).
3. Averiguá tu **chat id**: en una ventana privada abrí `https://api.telegram.org/bot<TOKEN>/getUpdates` (reemplazá `<TOKEN>`) y buscá `"chat":{"id":123456789`. Ese número es tu chat id. No compartas esa pantalla.
4. En GitHub: repositorio → **Settings → Secrets and variables → Actions → New repository secret**. Creá `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`. O desde tu terminal: `gh secret set TELEGRAM_BOT_TOKEN` (te pide el valor sin mostrarlo).
5. Probá: pestaña **Actions → "Sincronizar temporada" → Run workflow**. Al terminar tiene que llegarte el resumen diario. Después **Actions → "Vigilante" → Run workflow** (si todo está bien no manda nada).

## Probar en tu máquina
```bash
npm run guardian -- --dry
GUARDIAN_NOW="2026-09-24T12:00:00-03:00" npm run guardian -- --dry   # simular el jueves al mediodía
npm run watchdog -- --dry
```

## Límites conocidos
- El estado de los avisos (qué ya se avisó) viaja en la caché de GitHub Actions: si se pierde, un aviso se puede repetir una vez.
- El vigilante corre cada hora, así que una caída se detecta en menos de ~1 h. El repositorio es privado y GitHub da 2.000 minutos de Actions por mes: el vigilante usa ~720.
- Si GitHub Actions deja de ejecutar los procesos programados, no llega ningún aviso; por eso conviene que el resumen de las 06:00 llegue todos los días: si un día no llega, algo pasa.
- No hay carga por Telegram todavía: el bot no recibe mensajes (eso viene después, con confirmación obligatoria antes de publicar cualquier dato).
