# 05 — Medición (ya) y URL descriptivas (después, con datos)

## Parte A — Medición (Search Console ya está verificado y en uso; el punto de partida del 24/09 está en `00-indice.md`)

Sin esto no hay forma de saber si los cambios de producto y de SEO sirven.

1. **Google Search Console:** https://search.google.com/search-console
   - Agregar la propiedad **de dominio** `somosfierros.ar` (cubre `www` y sin `www`). Se verifica con un registro TXT en el DNS, donde esté administrado el dominio (en Vercel: Domains → somosfierros.ar → DNS Records).
   - En "Sitemaps", enviar `https://www.somosfierros.ar/sitemap.xml`.
   - Si ya estaba hecho, sólo confirmar que el sitemap figure como "Correcto" y cuántas páginas están indexadas.
2. **Punto de partida:** a las 2 semanas, exportar de "Rendimiento" las consultas y páginas (clics, impresiones, posición) y guardarlas en `docs/plan-producto/mediciones.md`. Contra ese punto se miden las etapas 01 a 04.
3. **Bing Webmaster Tools** (opcional, 5 minutos): importa la propiedad desde Search Console.

## Parte B — URL descriptivas (hallazgo S7). Recién después de 4 semanas de datos

Hoy: `/eventos/f1-2026-15`. Propuesta: `/f1/2026/gp-de-azerbaiyan`, o `/eventos/f1-2026-gp-de-azerbaiyan` si se quiere tocar menos.

**Por qué esperar:** cambiar URL mueve todo lo que Google ya indexó. Bien hecho (con 301) se recupera, pero primero hay que tener el punto de partida, para ver que no se pierda tráfico.

Qué implica (para una sesión con Sonnet y revisión de Opus):
- Un slug estable por evento, generado del nombre, sin depender del número de fecha (que cambia si se reordena el calendario). Si dos fechas dan el mismo slug, desempatar de forma determinística.
- Redirecciones 301 de todas las URL viejas a las nuevas (`redirects` en `next.config.ts`, o un `proxy` de Next 16: leer la guía en `node_modules/next/dist/docs/` antes de elegir).
- Actualizar enlaces internos, `canonical`, sitemap, datos estructurados, crónicas automáticas y el vigilante y la prueba de humo, que usan rutas.
- Verificar después del despliegue: cada URL vieja del sitemap anterior responde 301 a la nueva, y la nueva 200.

## Terminado cuando

- Parte A: Search Console verificado, el sitemap aceptado y el punto de partida guardado.
- Parte B: se decide con los datos. Si se hace, cero 404 en Search Console dos semanas después.
