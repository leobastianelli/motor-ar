# 03 — La página del evento arranca por lo que pasa ahora

Leer primero `docs/plan-producto/00-indice.md`. Supone terminadas la 01 y la 02.

## Objetivo

`/eventos/<id>` es la página a la que llegan casi todos los enlaces internos y las búsquedas de "GP de X horario" o "resultados TC Y". Un fin de semana tiene que abrir con:
- qué está en pista o qué viene, y a qué hora;
- el último resultado, con los argentinos destacados;
- dónde verlo.

El cronograma completo y los resultados de cada sesión van después.

Evidencia (24/09/2026, `/eventos/f1-2026-15`): el orden era portada, cronograma, dónde verlo, "Corren el mismo finde" y recién después los resultados, que arrancaban en el carácter 749 de 2559 del texto. Colapinto aparecía sólo dentro de "Clasificación completa" (11.º en la P2), sin destaque.

## Qué hacer

1. **Arriba, después de la portada:** una franja "Ahora" con `<Momento>` en su variante de evento, calculada con `momentoDeCategoria` limitado a esta fecha:
   - **en vivo:** la sesión y el enlace a los tiempos en vivo (el embed está en `src/components/live-timing-embed.tsx`);
   - **próxima:** nombre, día y hora;
   - **último resultado:** ganador y **argentinos con su posición**, en una línea bien visible.
2. **Orden nuevo:**
   1. Portada.
   2. Ahora.
   3. Resultados de la sesión más reciente, **abierta**.
   4. Dónde verlo.
   5. Cronograma.
   6. Resultados de las sesiones anteriores, plegados.
   7. "Corren el mismo finde".

   Antes de que empiece la primera sesión (fecha sin resultados), el cronograma y "Dónde verlo" van primero.
3. **Argentinos destacados en cada tabla:** fila marcada (clase existente o una nueva, sobria) y, arriba de cada tabla plegada, una línea "Argentinos: Colapinto 11.º". La lista de argentinos sale de `src/data/drivers.ts` (con `driverSlug` en las filas), sin listas nuevas.
4. **Resultado de la carrera en la portada** cuando la fecha terminó: "Ganó X · Colapinto 9.º", para que quien llegue desde Google vea la respuesta de inmediato.

## Qué NO hacer

- No sacar información: se reordena y se destaca.
- No volver dinámica la página.

## Verificación

1. `npm test` y `npx next build`.
2. `FIERROS_NOW` en los cuatro momentos del índice, con capturas de `/eventos/f1-2026-15` y de una fecha de TC en 375 px y 1440 px.
3. En 375 px, la franja "Ahora" y el último resultado con los argentinos se ven sin scroll.
4. Pasa la prueba de humo (`node scripts/humo.mjs` contra el preview con el secreto de bypass, o contra producción después del merge).

## Terminado cuando

Un fin de semana, la página del evento responde "qué pasa, a qué hora y cómo les fue a los nuestros" en la primera pantalla. Revisar con Opus antes de mergear.
