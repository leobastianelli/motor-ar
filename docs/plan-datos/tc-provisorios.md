# Resultados provisorios de la ACTC

Pedido: mostrar el resultado de la ACTC apenas termina la tanda, con la marca de que es provisorio, y reemplazarlo por el oficial cuando salga. Este documento es la fase 1 (verificar) y deja anotada la decisión de la fase 2 (implementar). Medido el 30/09/2026 sobre el portal `tiempos.actc.org.ar`: las 740 páginas de resultado del año (ids 2 a 969), comparadas de a pares. Horas argentinas. La hora de cada documento sale del nombre del archivo descargable (`AAAAMMDD_HHMMSS_...`), que coincide con su `Last-Modified`.

## Conclusión

**Hay una regla confiable, pero sólo para un tipo de documento y con chequeos que rechazan la mitad de las planillas viejas.** Una planilla "parcial" puede ser (a) la clasificación al final de la tanda, (b) una foto intermedia, o (c) un archivo ordenado por mejor vuelta y no por orden de llegada. Las tres existen en el portal. Se distinguen, y la regla de abajo deja afuera (b) y (c). Con la regla, en 41 pares planilla/oficial de las categorías del portal de tiempos (TC, TC Pista, TC Pick Up, TC Pista Pick Up; mayo a septiembre) el ganador coincidió en 39 y el podio en 35, y en los 35 pares donde se pudieron leer las vueltas del oficial el líder de la planilla había completado las mismas vueltas (ver más abajo). De los 6 podios distintos, 5 se explican con una sanción escrita en las observaciones del oficial y 1 (TC Pista, serie 1 del 12/07) no, porque esa página no trae observaciones.

**No es "el mismo resultado con demora".** El oficial se mueve respecto de la planilla por sanciones (recargos, exclusiones, exclusión por técnica), y hasta el oficial se rectifica al día siguiente (serie 1 de TC Pick Up: el PDF del domingo, marcado "verificado por deportiva", lo reemplazó otro el lunes). Por eso el estado tiene tres niveles: provisorio, oficial y oficial rectificado. Los dos últimos ya los maneja el código (gana el documento "RECTIFICADA", o el de id más alto).

Hallazgo aparte, que cambia el alcance: **hoy el sitio ya muestra planillas como si fueran oficiales.** Las planillas de serie vienen con el mismo título que el oficial (sin "PARCIALES"), así que `classify` las toma y las muestra sin marca hasta que sale el PDF. El 27/09 la serie 1 de TC Pista Pick Up mostró a Cifre ganador desde las 11:02 hasta las 12:05, cuando el PDF lo bajó al cuarto puesto por un recargo. Sólo las planillas de las finales (título con "PARCIALES") se ignoraban. La fase 2 corrige las dos cosas: las marca y las toma con la misma regla.

## Qué es cada documento

| | Planilla (Excel del cronometraje) | Oficial (PDF de los comisarios) |
|---|---|---|
| Página | "Descargar Excel", "Análisis de parciales" | "Descargar PDF" |
| Columnas | Mejor vuelta, Dif. (de mejor vuelta), sectores S1 a S5, todas las vueltas de cada auto | Marca, Tiempo total, Dif. (de carrera), Vtas |
| Título | Finales: "... PARCIALES". Series: igual que el oficial | "FINAL ...", "1ERA SERIE ..." (o "RECTIFICADA") |
| Observaciones, récord, promedio | no | sí (recargos, exclusiones, pase y siga) |
| "Verificado por deportiva" | no | en algunos (962, 957, 958 y 922 sí; 963 no): no sirve de marca |
| Orden | orden de llegada, o por mejor vuelta (ver abajo) | orden de llegada con sanciones aplicadas |
| Autos que no dieron vueltas | no figuran (la final del 27/09 tiene 10 filas contra 12) | figuran, con sus vueltas |

Los PDF de los primeros meses (enero a abril) eran otra cosa: impresiones del cronometraje, con varias versiones subidas con segundos de diferencia y de contenido irregular. Desde mayo son planillas Excel. **La regla sólo reconoce el formato Excel.** Mouras (TC Mouras y TC Pista Mouras) viene de otro sistema de cronometraje y **no publica planilla parcial**: cada sesión tiene un único documento, con tiempo total. Por eso en Rosario (27/09) no hay nada que comparar ni que marcar.

## ¿Es la clasificación al final de la tanda?

Señales que se miraron, en las planillas de formato Excel:

- **Vueltas del líder contra vueltas de la carrera.** Finales del 27/09: TC Pista Pick Up 19 y 19, TC Pick Up 20 y 20. TC 13/09: 25 y 25. En los 35 pares en que se pudieron leer las vueltas del oficial, el líder de la planilla completó las mismas vueltas, sin excepciones (en 6 pares el PDF de TC tiene un diseño que el análisis automático no leía, y en 5 el oficial del portal está mal cargado, ver más abajo).
- **Hora de publicación contra fin de la tanda.** Final TC Pista Pick Up: fin previsto 13:40, planilla 13:47:24. La planilla sale después de la bandera. (Final TC Pick Up: fin previsto 14:50, planilla 15:56:24; la carrera se corrió más tarde que lo cargado, SoloTC dio el ganador a las 15:06.)
- **Versiones intermedias.** En el formato Excel no se vio ninguna planilla con menos vueltas que el oficial. **Sí se vio en el formato viejo:** la final de TC Pick Up del 26/04 (La Plata) tiene una impresión con el líder en 19 vueltas contra 20 del oficial y 9 filas contra 15, subida a las 14:01 (el oficial a las 14:08). Ese tipo de archivo no se acepta.
- **Archivos mal armados.** La planilla de la final de TC del 10/05 (Termas) pone primero a un auto con 20 vueltas delante de otros con 25 y sin tiempos por sector: el ganador de la planilla (Arduso) no era el ganador (Werner). Otra del 02/08 mezcla vueltas de 60 y 65. Se detectan porque las vueltas no decrecen al bajar por la lista.
- **Orden por mejor vuelta.** 18 de las 70 planillas de series y finales en formato Excel vienen ordenadas por mejor vuelta y no por llegada (14 de mayo y 4 de julio y agosto). Se ve en la columna "Dif." de la mejor vuelta: va creciendo sin saltos hacia abajo. En una planilla por orden de llegada esa columna salta (en la final de TC Pista Pick Up del 27/09 hay diferencias de -0,878 y -0,014 entre otras positivas).

## Regla para reconocer una planilla parcial completa

Una página de resultado de la ACTC vale como **provisoria** si cumple todo:

1. La sesión es **serie, final o clasificación** (la clasificación se agregó el 03/10/2026, a pedido: la ACTC tarda en subir el PDF y la planilla "CLASIFICACION PARCIALES" ya está). Las prácticas quedan afuera. Entre varias planillas de clasificación vale la de id más alto (la última ronda publicada); si fuera una ronda intermedia, el rótulo dice "Provisorio" y el PDF la reemplaza. Para la clasificación las reglas 4 y 5 cambian: no se miran vueltas ni sectores, el orden por mejor vuelta es lo normal (se rechaza si está desordenada), el líder tiene que traer mejor vuelta, y la fila lleva la mejor vuelta del líder y la diferencia de los demás, como el PDF.
2. El formato es **planilla Excel**: encabezado "Mejor vuelta", sin columna "Tiempo total".
3. Al menos **3 filas**.
4. **Las vueltas no crecen al bajar por la lista** (el líder tiene el máximo) y el líder tiene tiempos por sector (filas bien formadas).
5. **No está ordenada por mejor vuelta**: con 4 filas o más, si la mejor vuelta crece en todas las filas, se descarta.

Y estas reglas de convivencia entre versiones:

- Entre varias planillas de la misma sesión vale la de id más alto que pase la regla.
- Un documento oficial (PDF, con "Tiempo total") **siempre** reemplaza a la planilla, sea cual sea el orden de los ids. Una planilla nunca pisa a un oficial.
- Una rectificación reemplaza al oficial anterior (como hoy).

Resultado de aplicar la regla a las 70 planillas de series y finales de las cuatro categorías del portal de tiempos: 52 aceptadas y 18 rechazadas, todas por orden de mejor vuelta; 7 de ellas también por vueltas que no decrecen y 1 por líder sin sectores (entre ellas las dos de ganador equivocado). **Falsos rechazos posibles:** una serie de 4 autos con la mejor vuelta casualmente en orden (la serie 1 de TC Pista Pick Up del 16/08, 4 filas); el costo es no mostrar el provisorio. **Falso aceptado que no se puede descartar:** una foto intermedia en formato Excel con las vueltas parejas. No se vio ninguna en 41 casos, pero el formato es reciente (desde mayo) y la regla no la detecta por construcción.

## Tablas por sesión

Planilla = planilla de la ACTC. Oficial = PDF. Las observaciones son las del PDF. "Posición" es la de cada documento.

### Balcarce, domingo 27/09 (fecha 8)

**TC Pista Pick Up, final.** Planilla 13:47:24 (doc 960), oficial 15:58:37 (doc 962, "verificado por deportiva").

| Piloto | Planilla | Oficial | Por qué |
|---|---|---|---|
| Sganga (107) | 1 | 1 | |
| Cifre (144) | 2 | 2 | |
| Alberti (133) | 3 | excluido | "Excluido ... por maniobra peligrosa al auto 123 (Santilli Pazos)" |
| Goya N. (14) | 4 | 3 | sube por la exclusión de Alberti |
| Goya J. (15) | 5 | 4 | sube por Alberti; tiene 20" por exceso de velocidad en boxes y "pase y siga" |
| Suárez (76) | 10 | excluido | "Excluido ... por maniobra peligrosa a Biagi" |
| Catelli (10), Pellandino (132) | no figuran | 9 y 10 | el oficial lista a los que dieron 1 y 0 vueltas |

Podio distinto: sí (tercero). Ganador: igual. Todo explicado.

**TC Pick Up, final.** Planilla 15:56:24 (doc 961), oficial 16:45:57 (doc 963).

| Piloto | Planilla | Oficial | Por qué |
|---|---|---|---|
| Palazzo (119) | 1 | 1 | |
| Ciantini D. (115) | 2 | 5 | recargo de 5" por sobrepaso indebido a Mangoni (214) |
| Fritzler (256) | 3 | 2 | sube por Ciantini D. |
| Valle (112) | 4 | 3 | sube |
| Martínez O. (121) | 5 | 4 | sube |
| Canapino (1) | 7 | 7 | recargo de 10" por no hacer la chicana para entrar a boxes, no le cambia el puesto |
| Werner (3) | 11 | excluido | "Excluido por técnica ... compresión" |

Podio distinto: sí (segundo y tercero, como anticipaba el diagnóstico). Ganador: igual. Todo explicado.

**TC Pista Pick Up, serie 1.** Planilla 11:02:40 (doc 949), oficial 12:05:16 (doc 952).

| Piloto | Planilla | Oficial | Por qué |
|---|---|---|---|
| Cifre (144) | 1 | 4 | recargo "por no realizar chicana" |
| Sganga (107) | 2 | 1 | |
| Santilli Pazos (123) | 3 | 2 | |
| Catelli (10) | 4 | 3 | |

Ganador distinto. Explicado.

**TC Pista Pick Up, serie 2.** Planilla 11:26:24 (doc 950, el título dice "TC PICK UP" pero está en la pestaña de Pista Pick Up), oficial 12:05:46 (doc 953).

| Piloto | Planilla | Oficial | Por qué |
|---|---|---|---|
| Cordone (127) | 1 | 1 | |
| Alberti (133) | 2 | excluido | "Excluido parcial ... por reiteraciones de maniobra peligrosa" a Biagi |
| Suárez (76), Biagi (67), Oroza (88) | 3, 4, 5 | 2, 3, 4 | suben por Alberti |

Podio distinto. Explicado.

**TC Pick Up, serie 1.** Planilla 11:51:19 (doc 951), oficial 12:46:46 (doc 957), oficial rectificado el lunes 28/09 11:05:10 (doc 968).

| Piloto | Planilla y oficial del domingo | Rectificado del lunes | Por qué |
|---|---|---|---|
| Werner (3) | 1 | penalizado (fuera del podio) | "Recargo por técnica ... compresión" |
| Canapino (1) | 2 | 1 | |
| Dianda (147) | 3 | 2 | |

La planilla y el PDF del domingo son iguales. El ganador cambió recién con la rectificación, un día después.

**TC Pick Up, serie 2.** Planilla 12:15:10 (doc 955), oficial 12:47:26 (doc 958): sin diferencias.

**TC Mouras y TC Pista Mouras (Rosario): sin planilla parcial.** Series (964, 965) y finales (966, 967) son un único documento por sesión, sin versión anterior. No aplica.

### Fechas anteriores

**TC, final de Rafaela, 13/09.** Planilla 14:46:29 (doc 921), oficial 15:49:44 (doc 922, "verificado por deportiva"). Ganador y podio iguales. Los movimientos de la mitad de abajo de la grilla se explican con las observaciones: recargo de 20" a Candela (116) por largar en lugar indebido (pasa del 32 al 42), recargo a Barrio (141) por maniobra peligrosa a Fontana, y exclusión de Mangoni (7) por maniobra peligrosa a Canapino M.

**TC Pista, final de Rafaela, 13/09 (docs 919 y 920).** No comparable: la página 920, rotulada "FINAL TC PISTA", trae tres filas con pilotos de TC Mouras. Es un error de carga del portal (también pasa con las series de TC Pista del mismo día y del 23/08). En esos casos el sitio hoy toma el oficial mal cargado, y eso es un problema aparte.

**Resto de mayo a septiembre.** De los 41 pares comparables (series y finales, 13 fechas): ganador igual en 39, podio igual en 35. Los dos ganadores distintos son las dos series del 27/09 de arriba. Los 6 podios distintos son 5 del 27/09 y la serie 1 de TC Pista del 12/07 (tercero y cuarto intercambiados: Santilli Pazos y Biagi), cuyo PDF no trae observaciones. En otros 10 pares hay puestos distintos abajo del podio (por ejemplo la serie 2 de TC del 31/05, 9 puestos) y los PDF de esas fechas tampoco traen observaciones: no se puede decir por qué.

### Sesiones que nunca tuvieron oficial en el portal

Cinco planillas aceptadas no tienen PDF en el portal (final de TC del 31/05, final de TC del 12/07, serie 1 de TC Pick Up del 26/07, final de TC del 02/08, serie 3 de TC del 23/08). Con la regla quedarían "provisorias" para siempre. La fase 2 lo dice con otro texto cuando pasaron más de 7 días ("La ACTC no publicó la clasificación oficial").

## Cómo distinguir la final si hay varias versiones

- Dos o tres planillas de la misma sesión subidas con segundos de diferencia son copias iguales (TC, 29/03; TC Pista, 10/05). Se toma la de id más alto que pase la regla.
- Una planilla posterior a un oficial no cuenta.
- La rectificación se reconoce por "RECTIFICAD" en el título, como hoy.
- Los títulos tienen errores de tipeo (`TCPPPCK`, `PSITA PUCK UP`, `PICK IUP`) y a veces el título dice otra categoría que la pestaña (doc 950). La categoría se toma de la pestaña del listado, no del título, como hoy.

## Demora real

Con la planilla como provisoria, lo que se ve en el sitio después de la bandera se adelanta: final de TC Pista Pick Up, de las 15:58 (oficial) a las 13:47 (planilla), 2 h 11 min antes; final de TC Pick Up, de las 16:45 a las 15:56, 49 min antes; series, de 39 a 63 minutos antes. Siempre sujeto a que la sincronización corra (ver el PR de disparo por evidencia).

## Fase 2: lo que se implementó

### Modelo

- `resultsSource.status === "provisional"` marca una sesión cuyos resultados salen de la planilla. **Oficial es la ausencia del campo**: ninguna otra fuente (F1, F2, GT, TN) cambia. Tipos en `src/lib/types.ts`.
- Cuando el oficial reemplaza a un provisorio, `resultsSource.provisional` guarda el podio que se había mostrado y `resultsSource.note` la línea "Oficial: ..." ya armada ("Oficial: Diego Ciantini pasó del 2.º al 5.º por un recargo de 5 s", "Oficial: Juan Pablo Alberti (3.º en el provisorio) fue excluido"; "Oficial" si el podio no cambió; "Oficial: cambió el podio" si cambió y las observaciones del PDF no lo explican). Se arma al sincronizar, con las observaciones del PDF (`penaltiesFrom`), y no se recalcula al mostrar. Helpers puros y testeados en `src/lib/provisorio.mjs`.
- Lo guardado antes de este cambio no tiene `status`: se sigue mostrando como hasta ahora (sin rótulo). Las fechas de más de 10 días no se vuelven a leer, así que las planillas de series viejas que hoy figuran como oficiales quedan sin rótulo hasta que se las vuelva a bajar.

### Sincronización (`src/lib/sources/actc-timing.mjs`)

- `parseListing` lee el botón de descarga (`format`: `xlsx`, `pdf` o nada).
- `chooseDocs(docs, { provisional })`: sin la opción, igual que antes (lo usa el pulso en el PR de disparo por evidencia). Con ella, las planillas de series y finales entran como última opción de cada sesión y un documento oficial gana siempre, sea cual sea el orden de los ids. Devuelve además la lista ordenada de candidatos.
- `actcTiming` lee los candidatos de cada sesión en ese orden (hasta 4 páginas): el primero oficial que se lee gana; si no hay, la primera planilla que pasa la regla de `provisionalProblems` queda como provisoria. Una planilla que no pasa la regla no se muestra (antes se mostraba como oficial). Una página caída ahora deja probar el siguiente documento.
- Contra lo guardado (`reconcileSession`, también dentro de `keepSessionData` de `guard.mjs`, que usan la sincronización y el refresco caliente): un provisorio nunca pisa un oficial; un provisorio con menos filas no achica al provisorio guardado; un oficial reemplaza al provisorio y arrastra su podio. Las sesiones guardadas que hoy no se leyeron se conservan.
- Las filas de una planilla no traen marca de auto ni tiempo total: la marca se toma del mismo número en otra sesión de la fecha, y la diferencia sólo dice las vueltas de atraso. No se inventa una diferencia de carrera.
- Arreglo al pasar: "Vuelta" (singular) quedaba pegado al nombre del piloto ("Alvaro Oroza Vuelta") en los PDF; ahora se descarta como "Vueltas".

### Pulso (`src/lib/pulso-sync.mjs`)

`newDocuments` llama a `chooseDocs(docs, { provisional: true })`: una planilla nueva (título "PARCIALES" o botón Excel) cuenta como documento nuevo y dispara por evidencia; el PDF que llega después también. Si una planilla se rechaza por la regla no queda guardada y volvería a contar como nueva, pero el tope de 2 intentos del pulso (`EVIDENCE_MAX_TRIES`) corta el bucle: como mucho 2 corridas de más por planilla rechazada. Tests en `src/lib/pulso-sync-provisorio.test.mjs`.

### Dónde se ve

Componente `src/components/results-status.tsx`: texto plano de 13 px, en tono secundario, con la primera palabra en negrita ("Provisorio · sujeto a revisión de los comisarios"; "Oficial: ..."). Sobre la banda oscura, `--on-ink-muted` (#aeb3b4, 8,86:1 contra tinta); sobre claro, `--muted` (4,81:1 sobre papel y 5,40:1 sobre blanco). Sin chip.

- Página de la fecha: debajo del ganador de la banda oscura, y en cada sesión anterior; "Ganador (provisorio)"; "1.º X (provisorio)" en el resumen; "ganó X (provisorio)" en las fechas del mismo finde y en la descripción.
- Portada: la tarjeta de resultados (claro) y los podios de "Recién terminó" (oscuro) llevan el rótulo; "ganó X (provisorio)" en el momento y en la línea del último resultado. También el momento de la categoría, la ficha del piloto (cada sesión dice "provisorio"), el horario del piloto, la imagen para compartir y los calendarios (.ics: "Ganador (provisorio)").
- Crónicas automáticas: "Final (provisorio): ..." y el titular "ganó la final (provisorio)". Se regeneran solas cuando llega el oficial.
- Capturas a 375 px en `docs/plan-datos/capturas/tc-provisorios/` (la planilla real del 27/09 leída con el lector de la sincronización, cargada en una copia local de la temporada).

### Borradores para X (`src/lib/redes-core.mjs`)

Un resultado provisorio sale con "(provisorio)" al lado del ganador, con una clave propia (`sesion:<id>:provisorio`). Así el borrador del oficial no queda tapado por el del provisorio: si el oficial cambia el podio hay un segundo borrador, sin la marca; si no cambió nada (`note === "Oficial"`) no se repite la noticia. El resumen del finde también lo marca.

### Campeonato

**No se suma ningún punto con provisorios, por construcción:** las tablas de campeonato son las que publica la ACTC (`actc.mjs`), no una suma de nuestros resultados. Lo que sí se calcula con resultados es el conteo de carreras, victorias, podios y mejor resultado de la ficha de cada piloto (`data.ts`): ahí las sesiones provisorias se listan pero no cuentan hasta que llega el oficial. Una consecuencia que ya existía con los resultados oficiales: apenas hay una final cargada, la tabla de campeonato de la categoría (que trae la ACTC con la fecha anterior) se oculta como atrasada hasta que la ACTC la actualice.

### Riesgos que quedan

1. **Foto intermedia en formato Excel con las vueltas parejas.** La regla no la detecta. No se vio ninguna en 41 pares, pero el formato es de mayo. Si aparece, el rótulo dice "Provisorio" y el oficial la reemplaza.
2. **Planillas "provisorias para siempre".** Cinco sesiones del año nunca tuvieron PDF en el portal; después de 7 días el rótulo dice que la ACTC no publicó el oficial.
3. **Páginas oficiales mal cargadas por el portal** (TC Pista 13/09 y 23/08 traen filas de Mouras): ya existía, no lo resuelve esto.
4. **Falsos rechazos**: una serie corta de 4 autos con la mejor vuelta casualmente en orden no muestra provisorio.
5. **La carga manual** (`manual-overrides.json`) que reemplaza los resultados de una sesión conserva el `resultsSource` de la fuente: si la fuente tenía una planilla y la carga trae el resultado oficial, hay que cargar también su `resultsSource`.
6. Un oficial rectificado después del domingo (como la serie 1 de TC Pick Up) ya se toma (gana "RECTIFICAD"), pero su nota compara contra el podio provisorio original, no contra el primer oficial.
