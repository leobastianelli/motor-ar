# Mapa de fuentes de datos

Relevado el 2026-09-13. "Verificado" = hicimos una consulta real y respondió con datos útiles.

## Resumen

| Categoría | Fuente principal | Tipo | Verificado | Automatizable | Costo |
|---|---|---|---|---|---|
| F1 – calendario, resultados, campeonato | [Jolpica-F1](https://api.jolpi.ca/ergast/f1/) (sucesor de Ergast) | API JSON | ✅ | Total | Gratis |
| F1 – en vivo (vueltas, posiciones, radio) | [OpenF1](https://openf1.org/docs/) | API JSON | ✅ histórico | Total | Histórico gratis; **vivo pago** |
| F2 / F3 | [fiaformula2.com](https://www.fiaformula2.com/livetiming/index.html) / fiaformula3.com | HTML (sin API pública) | ⚠️ parcial | Scraping | Gratis |
| MotoGP / Moto2 / Moto3 | [API de motogp.com](https://github.com/robschmitt/MotoGP-API) (`api.motogp.pulselive.com`) | API JSON no oficial | ✅ | Total | Gratis |
| GT World Challenge (GT3) | [gt-world-challenge-europe.com](https://www.gt-world-challenge-europe.com/) | HTML + PDF | ❌ sin API | Semi-manual | Gratis |
| ACTC (TC, TCP, TCM, TCPM, TCPK, TCPPK) | [tiempos.actc.org.ar](https://tiempos.actc.org.ar/resultados) | HTML + PDF + Excel | ✅ | Scraping | Gratis |
| TC2000 (CDA del ACA) | [tc2000.com.ar](https://tc2000.com.ar/institucional.php?accion=resultados) | HTML | ❌ bloquea bots (403) | Manual / acuerdo | — |
| TN APAT (ex Turismo Nacional) | [apat.org.ar](https://apat.org.ar/resultados/c3) | HTML + PDF | ✅ | Scraping | Gratis |
| Zonales | Redes y sitios de cada categoría | Variado | — | **Manual / colaborativo** | — |
| Dónde verlo | Anuncios de canales y categorías | Editorial | — | Manual | — |
| Vivos de YouTube | YouTube RSS + Data API v3 | XML / JSON | ⚠️ documentado | Total | Gratis (cuota) |
| Históricos por categoría | Wikipedia ES/EN (anexos de campeones, temporadas) | Wikitext | ✅ | Semi-automático | Gratis, **CC BY-SA** |

## Detalle por fuente

### Fórmula 1 — Jolpica-F1 ✅
- Endpoints usados: `/{año}/drivers/{id}/results.json`, `/qualifying.json`, `/sprint.json`, `/{año}/{fecha}/driverstandings.json`.
- Descargamos las 40 carreras de Colapinto (2024–2026), con sprints y clasificaciones, y su progresión en el campeonato 2026.
- Tiene límite de uso: hubo un timeout aislado, que se resolvió reintentando. **Hay que cachear siempre** (los datos históricos no cambian) y consultar solo después de cada sesión.
- Actualiza unas horas después de cada carrera; no sirve para el vivo.

### Fórmula 1 en vivo — OpenF1 ✅
- Históricos desde 2023 gratis sin autenticación: `sessions`, `laps`, `position`, `race_control`, `team_radio`, `weather`, etc.
- **Los datos en vivo (de 30 min antes a 30 min después de la sesión) requieren suscripción paga.** Para el MVP alcanza con mostrar el cronograma y el link al stream; el vivo detallado queda para más adelante.

### F2 / F3 ⚠️
- No hay API pública. La web oficial tiene páginas de resultados y un live timing en JavaScript.
- Plan: scraper de las páginas de resultados después de cada sesión y Wikipedia como respaldo y validación.
- Riesgo: cambios en el HTML rompen el scraper. Hay que armar alertas si falla.

### MotoGP ✅
- `https://api.motogp.pulselive.com/motogp/v1/results/seasons` respondió 78 temporadas (1949–2026).
- Flujo: seasons → categories (MotoGP/Moto2/Moto3) → events → sessions → classification.
- No oficial: puede cambiar sin aviso.

### ACTC ✅
- Portal `tiempos.actc.org.ar/resultados`: cada sesión en `/resultados/{id}/ver`, con descargas en PDF y Excel en `/descargar/...`.
- Columnas: posición, número, piloto, marca, mejor vuelta, diferencia con el 1°, diferencia con el anterior, vueltas.
- También tiene análisis de parciales en `/parciales/{id}` (PDF/CSV).
- Plan: scraper del HTML (o del Excel, más estable) después de cada sesión.

### TC2000 ❌
- El sitio devuelve 403 a clientes automatizados. **No vamos a evadir ese bloqueo.**
- Opciones: (1) contactar a la categoría para pedir un feed o permiso, (2) carga manual desde el panel de administración, (3) Wikipedia para históricos.

### TN APAT ✅
- `apat.org.ar/resultados/{clase}/{fecha}`, por ejemplo `/resultados/c3/2026-08-02`.
- Sesiones: entrenamientos, clasificación, series y final, en tablas HTML y PDF.

### YouTube (vivos)
- **No usar `search.list`** (100 unidades por llamada; la cuota diaria es de 10.000).
- Plan de bajo costo:
  1. Lista curada de canales oficiales (ACTC, TC2000, APAT, categorías zonales, etc.).
  2. El feed RSS público de cada canal (`https://www.youtube.com/feeds/videos.xml?channel_id=...`, sin cuota) para detectar videos nuevos.
  3. `videos.list` con `part=liveStreamingDetails,snippet` (1 unidad) para saber si el video está programado, en vivo o terminado.
  4. Asociar el video a la sesión por horario y categoría, con confirmación manual en el panel si hay dudas.

### Históricos
- Wikipedia en español tiene anexos de campeones y pilotos ganadores (TC, TC2000, etc.) y una página por temporada.
- Licencia **CC BY-SA**: se puede usar citando la fuente y compartiendo con la misma licencia. Conviene reescribir los textos y usar los datos (campeones, estadísticas), que son hechos.

### Noticias y declaraciones
- No encontramos RSS confiables de los medios deportivos argentinos.
- Plan: curaduría editorial con título, fecha, medio, link y citas breves con atribución. **Nunca republicar notas completas.**
- Las declaraciones oficiales también salen de las notas de prensa de los equipos y de formula1.com.

## Decisiones propuestas

1. **Una base propia (Postgres) como fuente de verdad.** Las integraciones escriben ahí y el sitio lee siempre de nuestra base, nunca directo de terceros.
2. **Una integración por fuente**, cada una con su tarea programada, reintentos y alerta si falla.
3. **Panel de administración desde el día 1** para corregir, completar TC2000, zonales y dónde verlo, y confirmar vivos.
4. **Guardar la fuente y la fecha de cada dato**, para poder auditar y corregir.
5. **Contactar a ACTC, CDA/TC2000 y APAT** para pedir acceso formal a los datos. Si nos lo dan, reduce el riesgo del scraping.

## Colapinto: estado de la investigación

| Dataset | Archivo | Fuente | Estado |
|---|---|---|---|
| F1 carrera a carrera 2024–2026 (clasificación, largada, llegada, puntos, sprint, compañero) | `src/data/colapinto/f1-races.json` | Jolpica | ✅ completo hasta Monza 2026 |
| Evolución en el campeonato 2026 (vs. Gasly) | `src/data/colapinto/f1-races.json` | Jolpica | ✅ fechas 1–14 |
| Formativas carrera a carrera (F4, Eurocup, TRS, FRECA, ELMS, Asian LMS, F3, F2) | `src/data/colapinto/junior-results.json` | Wikipedia (wikitext) | ✅ |
| Resumen por temporada | `src/data/colapinto/career.ts` | Wikipedia | ✅ |
| Hitos con fuente primaria y citas | `src/data/colapinto/career.ts` | Varias (enlazadas) | ✅ primera versión |
| Karting detallado | — | Wikipedia | ⏳ pendiente |
| Declaraciones recientes | — | Curaduría | ⏳ pendiente de definir el flujo |

Pendiente de revisar: Jolpica muestra el campeonato 2026 tras la fecha 14 (Madrid), pero todavía no publicó el resultado de carrera de Colapinto en esa fecha.

## Sincronización implementada (2026-09-13)

`npm run sync` baja Wikipedia, arma el archivo histórico y la temporada 2026. El sitio lee dos instantáneas versionadas:

| Archivo | Script | Contenido |
|---|---|---|
| `src/data/history.json` | `scripts/sync-history.mjs` | Campeones por año y récords de TC, TC2000, TN, F1 y F2 |
| `src/data/season-2026.json` | `scripts/sync-season-2026.mjs` | Calendario, resultados y campeonato 2026 de 6 categorías |

| Categoría | Calendario | Horarios | Resultados | Campeonato |
|---|---|---|---|---|
| F1 | Jolpica | ✅ por sesión | ✅ carrera, clasificación y sprint | ✅ |
| F2 | Wikipedia | ❌ sólo fecha | ✅ posición de todos (desde la tabla de campeonato) | ✅ |
| TC | ACTC oficial | ❌ sólo fecha | Podio (Wikipedia) | ✅ Copa de Oro (Wikipedia) |
| TC Pista | ACTC oficial | ❌ sólo fecha | ❌ | ❌ |
| TN APAT | APAT oficial | ❌ sólo fecha | ✅ finales Clase 2 y 3 completas | ✅ Clase 3 (Clase 2 en `meta`) |
| TC2000 | Wikipedia (incompleto) | ❌ | Sólo ganador | ✅ parcial |

- Sesiones sin horario (`timeKnown: false`) nunca se muestran "en vivo": pasan de "Hoy" a "Terminó" o "Sin datos".
- Si una fuente falla, el sincronizador conserva los datos anteriores de esa categoría.
- Las páginas de APAT se cachean en `research/html/` y se piden con pausas de 1,5 s.
- Dónde ver: `src/data/broadcasts.ts`, sólo con fuente. GT3 y zonales quedan "sin datos". IndyCar y NASCAR se quitaron del sitio el 2026-09-13.
- Pendiente: horarios de categorías nacionales, resultados de TC Pista y TC2000, GT3 y zonales.

## Actualización automática en producción

Las fuentes viven en `src/lib/sources/` y las usan tanto los scripts como el sitio:

- **Compilación:** usa la instantánea `src/data/season-2026.json` (no sale a la red).
- **Producción:** `getSeason()` reconstruye la temporada desde las fuentes. Cada URL tiene su propia caché de datos: Jolpica 15 min, Wikipedia y calendarios 1 h, páginas de F2 6 h, resultados viejos de APAT 30 días. Las páginas se regeneran cada 60 s y, si una fuente falla, se usa la instantánea.
- **Cron diario** (`vercel.json` → `/api/refresh`): regenera las páginas aunque no haya visitas. En el plan Hobby Vercel permite un cron por día; el resto lo cubre la revalidación por visitas. Si se define `CRON_SECRET`, la ruta lo exige.
- `npm run sync` sigue sirviendo para actualizar la instantánea del repo.

Otros cambios de esta etapa:

- **F2:** horarios oficiales por sesión desde los datos estructurados de fiaformula2.com (las fechas futuras sin cronograma publicado quedan "horario a confirmar").
- **Colapinto 2026:** se calcula en vivo desde la F1 (carrera, clasificación, sprint, duelo con Gasly y campeonato oficial tras cada fecha). 2024–2025 siguen en `src/data/colapinto/f1-races.json`.
- **ACTC:** el portal de tiempos tiene una API que exige autorización y la vista pública carga sólo parte de cada clasificación, así que no se usa.
- **TC2000:** su sitio bloquea clientes automatizados; no se evade.

## Horarios de categorías nacionales (notas de cronograma)

Las categorías nacionales no publican horarios en formato de datos, pero sí notas de cronograma antes de cada fecha.
`src/lib/sources/schedule-notes.mjs` las convierte en sesiones con horario y las verifica con más de una fuente.

1. **Adaptadores de fuentes** (una función por fuente que devuelve el texto de las notas):
   - `solotcNotes`: API de WordPress de SoloTC (robots.txt permite todo), categorías TC, TC Pista, TC Mouras, TC Pista Mouras y Pick Up.
   - `actcOfficialSchedules` (`actc-official.mjs`): notas de horarios de actc.org.ar → PDF oficial → horarios por día y tipo de sesión. El PDF no trae la categoría en cada fila, por eso se usa para verificar.
2. **Lector común** (`parseSchedule`): reconoce encabezados de día ("Sábado 12 de septiembre", "Sábado 27/06:") y líneas "9.25 a 9.55 – 1° Entrenamiento TCP (Grupo A)". Detecta categoría y tipo de sesión, ignora la grilla de TV y une tandas partidas (grupos, tercios, cuartos).
3. **Consenso** (`buildConsensus`): una sesión es **confirmada** si la publica una fuente oficial, si coincide con el PDF de la ACTC o si dos fuentes coinciden; si no, se muestra "según <fuente>". Se registran conflictos.
4. **Aplicación** (`applySchedules`): reemplaza la sesión sin horario de cada fecha por entrenamientos, clasificación, series y final con horario, y conserva los resultados.

Corre en cada actualización de la temporada (producción y `npm run sync:season`). Si las notas no se pueden leer, se mantienen los horarios ya publicados.

**Para sumar una fuente:** escribir un adaptador que devuelva `{ source: { id, name, official }, url, published, text }` y agregarlo en `withSchedules` (`season.mjs`). El lector y el consenso no cambian.

Fuentes evaluadas y descartadas por ahora: Carburando (sin feed, sitemap ni buscador para descubrir notas), Campeones (el cronograma de TC2000 viene como imagen; robots.txt pide 60 s entre pedidos). TN APAT y TC2000 siguen sin una fuente de horarios en texto.

## Resultados oficiales de la ACTC (tiempos.actc.org.ar)

`src/lib/sources/actc-timing.mjs` lee el portal de tiempos de la ACTC. Su robots.txt no restringe el acceso.

- **Listado** (`/resultados`, caché 15 min): toda la temporada de TC, TC Pista, TC Mouras, TC Pista Mouras, TC Pick Up y TC Pista Pick Up, agrupada por categoría y fecha.
- **Cada sesión** (`/resultados/{id}/ver`): tabla completa con posición, número, piloto, marca, tiempo y vueltas. Las diferencias se calculan acá, porque las columnas del portal no siempre coinciden con su encabezado.
- **Qué se toma:** entrenamientos, clasificación, series y final. Se ignoran los parciales y las grillas. Si hay versión rectificada, vale esa.
- **Cómo se asigna a una fecha:** misma categoría y documentos publicados hasta 3 días antes del último día de la fecha.
- **Nombres:** se buscan en el campeonato y en otras fuentes. Si no aparecen, se da vuelta "APELLIDO NOMBRE" cuando hay solo dos palabras.
- **Volumen de pedidos:** en producción solo se consultan las fechas de los últimos 10 días; las anteriores salen de la instantánea. `npm run sync:season` recorre la temporada completa, con 0,7 s entre páginas.

Las categorías que acompañan al TC salen del calendario de actc.org.ar (`/tcm`, `/tcpm`, `/tcpk`, `/tcppk`). Sus horarios salen de las mismas notas de cronograma que TC y TC Pista. La página de cada fecha muestra "Corren el mismo finde", con las otras categorías del mismo lugar y fin de semana.

## Carga manual

`src/data/manual-overrides.json` completa o corrige cualquier fecha sin tocar las fuentes:

```json
{
  "events": {
    "tc-2026-12": {
      "broadcasts": [{ "name": "Canal 9", "kind": "tv" }],
      "sessions": [
        { "kind": "practica", "name": "1° Entrenamiento", "start": "2026-10-03T10:00:00-03:00", "timeKnown": true },
        { "kind": "final", "name": "Final", "results": [{ "pos": 1, "driver": "Nombre Apellido", "team": "Marca", "gap": "" }] }
      ]
    }
  }
}
```

- El id de la fecha es el de la URL (`/eventos/tc-2026-12`).
- Cada sesión se reconoce por `kind` + `name`. Si existe, se actualizan solo los campos cargados; si no, se agrega.
- `broadcasts` reemplaza la lista de dónde verlo.
- Se aplica en cada carga, tanto con datos en vivo como con la instantánea. Hay que hacer commit y push para que llegue a producción.

## Fotos

`npm run sync:photos` descarga desde Wikimedia Commons sólo imágenes CC BY, CC BY-SA, CC0 o dominio público y guarda autor, licencia y enlace en `src/data/photos.json`. Cada foto muestra su crédito en el sitio. Las ilustraciones generadas del mockup se quitaron.
