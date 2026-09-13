# Mapa de fuentes de datos

Relevado el 2026-09-13. "Verificado" = hicimos una consulta real y respondió con datos útiles.

## Resumen

| Categoría | Fuente principal | Tipo | Verificado | Automatizable | Costo |
|---|---|---|---|---|---|
| F1 – calendario, resultados, campeonato | [Jolpica-F1](https://api.jolpi.ca/ergast/f1/) (sucesor de Ergast) | API JSON | ✅ | Total | Gratis |
| F1 – en vivo (vueltas, posiciones, radio) | [OpenF1](https://openf1.org/docs/) | API JSON | ✅ histórico | Total | Histórico gratis; **vivo pago** |
| F2 / F3 | [fiaformula2.com](https://www.fiaformula2.com/livetiming/index.html) / fiaformula3.com | HTML (sin API pública) | ⚠️ parcial | Scraping | Gratis |
| MotoGP / Moto2 / Moto3 | [API de motogp.com](https://github.com/robschmitt/MotoGP-API) (`api.motogp.pulselive.com`) | API JSON no oficial | ✅ | Total | Gratis |
| IndyCar | [Blacktop API](https://ocblacktop.com/api/indycar) o scraping de indycar.com | API JSON | ❌ sin probar | Total | Free tier 7.500 req/mes |
| NASCAR | Feed no documentado `cf.nascar.com` ([cliente comunitario](https://pypi.org/project/nascar-api/)) | JSON | ❌ sin probar | Total | Gratis (sin garantías) |
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
