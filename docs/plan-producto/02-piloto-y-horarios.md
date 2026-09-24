# 02 — El piloto ve su fin de semana

Leer primero `docs/plan-producto/00-indice.md`. Supone terminada la 01: existen `src/lib/momento.mjs` y `<Momento>`.

## Objetivo

En `/pilotos/<slug>` y en `/horarios/<slug de piloto>`, un fin de semana, lo primero es **cómo le está yendo a ese piloto ahora**: su posición en cada sesión ya corrida, la próxima sesión (no la próxima carrera) con día y hora, y dónde verla.

Evidencia (24/09/2026, `/pilotos/franco-colapinto`): la portada decía "Próxima carrera: GP de Azerbaiyán, sáb 26 · 08:00", y sus resultados de la P1 (18.º) y la P2 (11.º) no aparecían en ninguna parte de su página. Su próxima sesión era la P3 del viernes a las 05:30.

## Qué hacer

1. **Lógica pura:** en `src/lib/momento.mjs`, agregar `momentoDePiloto(events, now, driverKeys)`, que reutiliza `momentoDeCategoria` sobre la categoría del piloto y a cada sesión le agrega **su** fila (posición, tiempo o diferencia, "no terminó"). Para reconocer al piloto en los resultados, usar la misma lógica que `getDriverSeason` en `src/lib/data.ts` (`keys` y `aliases`), sin duplicarla: si hace falta, moverla a un `.mjs`. Pruebas: un piloto con resultado en P1 y P2, un piloto que no corrió una sesión, un piloto de tripulación ("A / B / C", GT) y un piloto indexado sin ficha.
2. **Portada de `/pilotos/[slug]` (`next-race`):** reemplazar "Próxima carrera" por **"Próxima sesión"** (nombre, día y hora, actualizado en el navegador). Si está en pista, "EN VIVO ahora: Práctica 3". Si no hay nada en 10 días, "Próxima fecha: …".
3. **Bloque nuevo, primero después de la portada** en modo finde, en pista o resultados: "Este fin de semana en <ciudad>". Una fila por sesión con su posición destacada ("P2 · 11.º · +2.132"), el ganador en chico y el enlace a la fecha. Reusar `<Momento>` con una variante para piloto, sin un componente paralelo.
4. **`/horarios/[slug]` de piloto:** las sesiones terminadas muestran su posición en vez de sólo "Terminó".
5. **Pilotos sin ficha** (`/pilotos/<slug>` de `getIndexedDriver`): el mismo bloque, si corren esa fecha.
6. "Carrera a carrera", "Progreso" y el resto quedan después, sin cambios.

## Qué NO hacer

- No calcular posiciones en el cliente: vienen del servidor. El cliente sólo recalcula estados y horas.
- No cambiar la URL ni el `<h1>` de la ficha.

## Verificación

1. `npm test` y `npx next build` (misma tabla de rutas).
2. Con `FIERROS_NOW=2026-09-24T20:00:00-03:00`, `/pilotos/franco-colapinto` muestra primero P1 18.º y P2 11.º, y "Próxima sesión: Práctica 3, vie 25 · 05:30". Captura en 375 px y 1440 px.
3. Lo mismo para un piloto de TC con fecha el fin de semana, y para uno de F2.
4. En un martes sin fechas cercanas, la ficha se ve como antes, salvo "Próxima sesión".

## Terminado cuando

En la ficha de cualquier argentino, un fin de semana, su posición en cada sesión se ve en la primera pantalla del celular. Revisar con Opus antes de mergear.
