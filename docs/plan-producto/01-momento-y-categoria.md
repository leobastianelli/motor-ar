# 01 — "El momento" y la página de categoría

Leer primero `docs/plan-producto/00-indice.md` (diagnóstico y reglas) y `docs/plan-datos/00-indice.md` (reglas de trabajo).

## Objetivo

Que al entrar a `/categorias/f1` un fin de semana de carrera, lo primero que se vea (también en el celular, sin scroll) sea **qué está pasando en esa categoría**: la fecha en curso, qué sesiones ya se corrieron y quién ganó cada una, dónde terminaron los argentinos, qué viene y a qué hora, y dónde verlo. El campeonato y la historia van después.

## Pieza 1: la lógica del momento, pura y con pruebas

Crear `src/lib/momento.mjs` (JavaScript puro, sin alias `@/`, para que `npm test` la cubra; ver cómo lo hacen `src/lib/salud-core.mjs` y `src/lib/hot-refresh-core.mjs`).

```
momentoDeCategoria(events, now, { argentineSlugs }) → {
  modo: "en-pista" | "finde" | "resultados" | "entre-semana",
  fecha,          // el evento del momento: el que está en curso, o el último terminado (modo resultados), o el próximo
  sesiones: [{ id, name, kind, start, timeKnown, estado: "terminada" | "en-vivo" | "proxima",
               ganador?, argentinos: [{ slug, name, pos }] }],
  proximaSesion,  // la primera sesión no terminada de `fecha`, si hay
  ultimaFecha,    // en modo entre-semana: el último evento con resultados (podio + argentinos)
  proximaFecha,   // en modo entre-semana o resultados: el próximo evento
}
```

Reglas (pensadas para que coincidan con `getHomeMode` de `src/lib/data.ts`, pero para **una** categoría):
- **en-pista:** alguna sesión de la categoría está en curso.
- **finde:** hay un evento de la categoría que empieza en los próximos 3 días o que ya empezó y no terminó (cubre jueves a domingo y las fechas que arrancan el jueves, como Baku).
- **resultados:** el último evento terminó hace menos de 72 h.
- **entre-semana:** todo lo demás.

Para el estado de cada sesión, reutilizar los mismos criterios que `sessionStatus` de `src/lib/format.ts`. Si no se puede importar desde `.mjs`, mover la parte pura a un `.mjs` y hacer que `format.ts` la reexporte, sin duplicarla.

Pruebas en `momento.test.mjs` para los cuatro modos, con eventos de ejemplo:
- una fecha de jueves a sábado (Baku);
- una fecha con sesiones sin hora confirmada (`timeKnown: false`): nunca "en vivo";
- una categoría sin fechas próximas;
- un argentino que no terminó la sesión.

En `src/lib/data.ts`, exponer `season.getMomentoCategoria(seriesId, now)`, que arma los datos y llama a la función pura.

## Pieza 2: el bloque `<Momento>` (componente de cliente)

`src/components/momento.tsx`, con `"use client"`. Recibe el resultado de `momentoDeCategoria` calculado en el servidor, y **recalcula los estados en el navegador** con `useNow()` de `src/components/live-clock.tsx` (el mismo patrón que `src/components/agenda.tsx`). Así "Próxima" pasa a "En vivo" y a "Terminó" sin recargar, aunque el HTML sea de hace un minuto.

Qué muestra según el modo:
- **en-pista / finde:** título "Este fin de semana: <nombre de la fecha> · <ciudad>". Una fila por sesión: día y hora argentina, nombre, estado, y:
  - terminada: el ganador y la posición de cada argentino ("Colapinto 11.º");
  - en vivo: marca "EN VIVO" y, si la categoría la tiene, enlace a los tiempos en vivo;
  - próxima: la hora.

  Después, "Dónde verlo" (reusar el dato de `broadcastsBySeries` que usa la página de evento) y un botón "Ver la fecha completa" a `/eventos/<id>`.
- **resultados:** "Última fecha: <nombre>". Podio de la carrera principal, argentinos con su posición, enlace a la fecha. Abajo, "Próxima fecha: <nombre>, <día>".
- **entre-semana:** "Próxima fecha: <nombre> · <ciudad>, <días>", con la hora de la primera sesión si se conoce. Además, "Última fecha" en una línea (ganador y mejor argentino).
- **Sin datos** (una sesión terminada sin resultados): decir por qué, con `noResultsReason` de `src/lib/salud-core.mjs`. Nunca dejar el hueco vacío.

Estilo: reutilizar las clases y tipografías existentes (`section-block`, `SectionTitle`, `StateTag` de `src/components/pista.tsx`). Nada de un sistema visual nuevo.

## Pieza 3: la página de categoría reordenada (`src/app/categorias/[slug]/page.tsx`)

Orden nuevo:
1. Portada (`category-hero`), **más baja en el celular**. Hoy mide 650 px con la foto abajo (`.category-hero{min-height:650px;…padding:…340px}` dentro de `@media(max-width:800px)` en `globals.css`). Reducirla para que el bloque del momento entre en la primera pantalla de 375 × 812. Por ejemplo, la foto como fondo de menos altura, o sacarla del flujo en el celular.
2. **`<Momento>`**.
3. Franja de temporada (`season-ribbon`). Corregir "Próxima": hoy muestra la fecha de la **última** sesión de la próxima fecha (`next.sessions.at(-1)`). Tiene que mostrar el día de la carrera principal, o el rango de días de la fecha, dicho de forma que no confunda.
4. Campeonato, con el calendario al costado. En el celular, el calendario se puede plegar ("Calendario completo · 23 fechas"), porque ya no es la única forma de llegar a la fecha actual.
5. Argentinos de la categoría: si hay pilotos de `src/data/drivers.ts` en esta categoría, una fila con cada uno (posición en el campeonato y último resultado) enlazada a su ficha. Esto vale sobre todo para las internacionales (Colapinto en F1, los argentinos de F2, GT3…).
6. Notas y, al final, historia.

## Qué NO hacer

- No tocar la home.
- No duplicar la lógica de estados de sesión: una sola fuente (`format.ts` o su `.mjs`).
- No hacer la página dinámica: tiene que seguir siendo ISR (`revalidate = 60`), con los estados corregidos en el navegador.
- No sacar el campeonato ni la historia: se mueven, no se borran.

## Verificación

1. `npm test` (con las pruebas nuevas) y `npx next build`, con la tabla de rutas igual a la de antes.
2. Con `FIERROS_NOW` en cuatro momentos (martes 22/09, viernes 25/09 a las 04:00 -03:00, sábado 26/09 a las 08:30 -03:00 con la carrera en curso, lunes 28/09), `next build && next start`, y capturas de `/categorias/f1` y `/categorias/tc` en 375 px y en 1440 px. Las capturas van en el PR.
3. En el celular, el título del bloque del momento se ve sin hacer scroll en los cuatro momentos.
4. Un estado cambia sin recargar: con `FIERROS_NOW` un minuto antes del comienzo de una sesión, esperar y ver que pasa a "En vivo". Si `FIERROS_NOW` congela la hora del navegador (ver `isSimulatedNow`), documentar cómo se probó.
5. Después del merge, en producción y en una categoría con fecha ese fin de semana: el bloque aparece primero y coincide con la página del evento.

## Terminado cuando

`/categorias/<id>` muestra el momento primero en las 16 categorías, sin errores en las que no tienen fechas cargadas. Revisar el PR con Opus antes de mergear.
