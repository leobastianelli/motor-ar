# Córdoba Pista: investigación y plan de datos

Investigación hecha el 30/09/2026. No se tocó código. Todo lo que figura como "confirmado" se leyó ese día en la fuente citada; lo que no pude confirmar está marcado como tal en la sección de preguntas abiertas.

## Resumen

1. **Córdoba Pista** es el campeonato zonal de pista de la provincia. Lo **organiza APICER** (Asociación de Pilotos del Centro de la República) y lo **fiscaliza la FRAD** (Federación Regional de Automovilismo Deportivo de Córdoba). En 2025 la FRAD le había quitado la organización a APICER y a CAPICOR (nota de Poleman del 3/7/2025, y la FRAD lo rebautizó "Pista Cordobés" el 8/7/2025); el 12/11/2025 la FRAD anunció que **APICER vuelve a organizar en 2026**. Hoy la marca vigente es "Córdoba Pista".
2. **2026: 9 fechas, 7 categorías** en el mismo fin de semana: TC 4000, TC Pista 4000, Turismo Fiat, Turismo Fiat 128, Turismo Cordobés Histórico, Clase 3 y Fórmula Renault Plus. Las corren en Oscar Cabalén (Villa Parque Santa Ana) y Parque Ciudad de Río Cuarto. Hoy, 30/09, **ya se corrieron 6 fechas**; faltan 3 (24-25/10, 21-22/11, 19-20/12).
3. **La web oficial (cordobapista.com) está desactualizada en casi todo**, y eso es lo más importante para el plan:
   - el calendario dice "A confirmar" en 8 de las 9 fechas;
   - el archivo de resultados **termina en la fecha 3** (7/6/2026); las fechas 4, 5 y 6 no están, aunque las notas de prensa de la misma web sí linkean los PDF;
   - los campeonatos muestran "Fecha 5/9" (TC 4000, TC Pista 4000) y "Fecha 3/9" (Turismo Fiat y Fiat 128) cuando ya se corrió la 6;
   - Turismo Cordobés Histórico, Clase 3 y Fórmula Plus **no tienen página de campeonato ni filtro de resultados** en la web.
4. **Hay una fuente estructurada que sí está al día: MyLaps Speedhive**, por la organización de la FRAD (id 345223). Tiene las 6 fechas con las 7 categorías, cada sesión (entrenamientos, clasificación, serie, final) con hora real de inicio y clasificación completa, en JSON, **sin clave**. Es la misma API y el mismo patrón que ya usa `src/lib/sources/speedhive-tn.mjs`. Fecha 6 (26-27/9) estaba cargada el 30/09.
5. **Recomendación:** fuente principal Speedhive (calendario real, horarios reales y resultados por sesión), complementada con la web oficial sólo para campeonato (tabla HTML, pero vieja), horarios previos (PDF "Programa General" que viene adjunto a las notas) y marca/localidad de los pilotos (PDF). Campeonato: **carga manual o cálculo propio** con puntaje verificado; no mostrar la tabla oficial como actual. Se puede tener calendario + resultados por sesión de las 6 fechas en pocos días.

## Categorías

Los nombres y el orden salen del listado de 7 divisionales de la FRAD (nota del 30/6/2026) y de Puntal (27/9/2026). La abreviatura oficial **no existe** como tal en la web: usan "TC 4000", "TCP 4000", "T. Fiat", "T. Fiat 128", "TCH" y "FR Plus". Los códigos de sello y colores son propuesta mía, al estilo de `src/data/series.ts`.

| id propuesto | Nombre | Corto | Código de sello | Color (texto blanco) | Contraste | Nota |
|---|---|---|---|---|---|---|
| `cp-tc4000` | TC 4000 | TC 4000 | `T4K` | `#1e6f4f` | 6,10:1 | Dodge, Ford, Chevrolet, Torino; 14 vueltas de final |
| `cp-tcp4000` | TC Pista 4000 | TCP 4000 | `TP4K` | `#4b5d16` | 7,30:1 | Escalón de ascenso del TC 4000 |
| `cp-fiat` | Turismo Fiat | T. Fiat | `TFI` | `#0f766e` | 5,47:1 | |
| `cp-fiat128` | Turismo Fiat 128 | T. Fiat 128 | `TF128` | `#a13d63` | 6,24:1 | La FRAD lo nombraba "Turismo Promocional 128" en 2025 |
| `cp-tch` | Turismo Cordobés Histórico | T. Histórico | `TCH` | `#6d4c1f` | 7,77:1 | Sigla usada en los resultados ("T.C.H."). La web de APICER lo etiqueta "TN Histórico" en las notas |
| `cp-clase3` | Clase 3 | Clase 3 | `CL3` | `#8a4b00` | 6,80:1 | Hay una "Clase 3" del TN (APAT, `tn`); el nombre en pantalla debe decir Córdoba Pista |
| `cp-frplus` | Fórmula Renault Plus | FR Plus | `FRP` | `#a1343c` | 6,84:1 | Campeonato propio con sitio propio (frplus.com.ar) pero corre en los mismos fines de semana; confirmar con el dueño si entra |

Contraste medido con la fórmula WCAG contra `#ffffff`. Todos pasan 4,5:1. Advertencias visuales (no de contraste): `cp-clase3` y el ocre del TN (`#b47805`) son primos, y `cp-fiat128` se parece al rosa de Ligier JFC (`#b3285a`). Antes de mergear hay que mirarlos juntos en la grilla de categorías. `series.ts` pinta los zonales en verde (`#287e58`); con 7 categorías en el mismo evento no alcanza un solo color, por eso propongo una familia de tonos tierra y verdes en vez de los 7 idénticos. Todos con `scope: "zonal"`, `org: "APICER"`, `orgUrl: "https://cordobapista.com"`. No usar logos.

## Calendario 2026

Cruce de tres fuentes. Las fechas 1 a 6 coinciden entre Speedhive (fecha de inicio del evento) y la prensa; las 7 a 9 son del comunicado de la FRAD del 28/8/2026.

| Fecha | Días | Autódromo | Estado | Fuente |
|---|---|---|---|---|
| 1 | 4-5/4 | Oscar Cabalén (circuito 3, 3.850 m según PDF) | corrida | Speedhive evento 3450052; web oficial (única con sede confirmada) |
| 2 | 9-10/5 (prensa dice 8-9) | Parque Ciudad, Río Cuarto | corrida | Speedhive 3500349; Alto que Deportes |
| 3 | 6-7/6 | Oscar Cabalén | corrida | Speedhive 3545860; PDF de resultados fecha 3 |
| 4 | 4-5/7 | Parque Ciudad, Río Cuarto | corrida | Speedhive 3593715; FRAD 30/6 |
| 5 | 21-23/8 (con TCR South America) | Oscar Cabalén | corrida | Speedhive 3669552; FRAD |
| 6 | 26-27/9 | Parque Ciudad, Río Cuarto | corrida | Speedhive 3727601; Puntal 27/9 |
| 7 | 24-25/10 | Oscar Cabalén | **por correr** | FRAD 28/8/2026 |
| 8 | 21-22/11 | Oscar Cabalén | **por correr** | FRAD 28/8/2026 |
| 9 | 19-20/12 | Parque Ciudad, Río Cuarto | **por correr** | FRAD 28/8/2026 |

Importante: **el calendario original cambió**. La nota inicial de Solo Motores (abril) daba 4-5/4, 9-10/5, 6-7/6, 4-5/7, 22-23/8, 19-20/9, 10-11/10, 30/10-1/11 y 28-29/11, y la web oficial conserva las fechas de domingo de esa versión (5/4, 10/5, 7/6, 5/7, 23/8, 20/9, 11/10, 1/11, 29/11) con sede "A confirmar". Las fechas 6 a 9 se movieron (la 6 del 19-20/9 al 26-27/9; 7 a 9 reubicadas el 28/8 por los Turismo Nacional y Turismo Carretera en Río Cuarto). **Si se toma el calendario de la web oficial, tres de las cuatro fechas futuras salen mal.** La fecha 5 tiene dos horarios distintos en las fuentes (22-23/8 en la nota inicial y 21-23/8 en el programa); el programa del Cabalén incluye la actividad del jueves y viernes.

**Horarios (cronogramas):** sí se publican, como PDF "Programa General de la Competencia", adjunto a la nota de adelanto de cada fecha en cordobapista.com (ejemplo: `https://cordobapista.com/wp-content/uploads/2026/08/final-horarios-fecha-4-cabalen-con-tcr.pdf`, que es de la fecha 5 pese al nombre del archivo). Son texto extraíble, por día y categoría. Además la FRAD y la prensa publican versiones resumidas (p. ej. Alto que Deportes el 8/5: series a las 9:15 del domingo, finales desde 13:05). Speedhive trae la hora real de cada sesión una vez cargada.

## Fuentes, con URL

| # | Fuente | URL | Qué trae |
|---|---|---|---|
| 1 | Web oficial APICER | https://cordobapista.com/ | Calendario, campeonatos, resultados (PDF), noticias |
| 2 | Calendario oficial | https://cordobapista.com/calendario-2026/ | 9 fechas, 8 en "A confirmar" (vieja) |
| 3 | Resultados oficiales | https://cordobapista.com/?sfid=1697&_sft_categorias=tc-4000 (y `tc-pista-4000`, `turismo-fiat`, `turismo-fiat-128`) | Un ítem por sesión; cada uno incrusta un PDF |
| 4 | Campeonatos oficiales | https://cordobapista.com/campeonato-tc-4000-2026/ , `-tc-pista-4000-2026/`, `-turismo-fiat-2026/`, `-turismo-fiat128-2026/` | Tabla HTML: Pos, N°, Piloto, Auto, Localidad, Total, Dif |
| 5 | Noticias (WordPress) | https://cordobapista.com/noticias/ y API `https://cordobapista.com/wp-json/wp/v2/posts?per_page=8&_fields=date,slug,link` | Crónicas, adelantos, PDF de horarios y de final por categoría. Al día (última nota 28/9/2026) |
| 6 | Sitemaps | https://cordobapista.com/resultados-sitemap3.xml | Sirve para detectar resultados nuevos; su última entrada es del 8/6/2026 |
| 7 | **MyLaps Speedhive, organización FRAD (id 345223)** | `https://eventresults-api.speedhive.com/api/v0.2.3/eventresults/organizations/345223/events?count=100&sort=date&sortDirection=desc`, luego `/events/{id}/sessions` y `/sessions/{id}/classification` | Fechas, sesiones con hora y clasificación. Eventos 2026: 3450052, 3500349, 3545860, 3593715, 3669552, 3727601. Sitio visible: https://speedhive.mylaps.com/Events/3727601 |
| 8 | Tiempos en vivo APICER | http://apicer.realtime.com.ar/ | RealTime Group: tabla que se arma por JavaScript sólo durante la actividad; la página "Cronograma" (`/Home/Index?Length=4`) vino vacía. No sirve para histórico |
| 9 | FRAD | https://fradcba.com.ar/category/cordoba-pista/ | Comunicados de calendario (28/8/2026), cambios de organización; la categoría no tiene resultados ni campeonato; última nota del archivo 7/7/2026 |
| 10 | Prensa | https://www.puntal.com.ar/cordoba-pista/rasetto-martinbianco-pacciaroni-pavon-ronga-gutierrez-y-della-santina-los-ganadores-rio-cuarto-n265560 ; https://solomotores.com.ar/cordoba-pista-y-la-formula-plus-tienen-calendario-2026/ ; https://altoquedeportes.com.ar/el-cordoba-pista-inaugura-el-2026-del-autodromo-de-rio-cuarto/ | Ganadores por categoría, calendario original, horarios |
| 11 | Fórmula Renault Plus | https://frplus.com.ar/campeonato/ | Campeonato propio; decía "4/10 fechas" (vieja, y 10 no coincide con las 9 fechas de los otros) |
| 12 | Instagram oficial | https://www.instagram.com/cordobapista/ | No lo leí (requiere sesión); no se automatiza |

Las PDF de resultados son exportaciones de MyLaps Orbits ("Licenciado a: Federación de Automovilismo Deportivo de Córdoba"): `https://cordobapista.com/wp-content/uploads/2026/09/final-tc-4000.pdf` es la final de la fecha 6. `robots.txt` de cordobapista.com permite todo (`Disallow:` vacío).

## Estado de cada sección de la web oficial (frescura)

| Sección | Última fecha que figura | Última fecha corrida | Formato | Veredicto |
|---|---|---|---|---|
| Calendario | 1 de 9 con sede; 8 "A confirmar" | 6 | HTML, una tarjeta por fecha | **Vieja.** Fechas del calendario original |
| Resultados | Fecha 3 (subidos el 8/6/2026; último cambio del sitemap) | 6 | Un ítem por sesión con PDF incrustado | **Atrasada 3 fechas.** Los PDF de las fechas 4-6 existen pero sólo viven dentro de las notas |
| Campeonato TC 4000 y TC Pista 4000 | "Fecha 5/9" | 6 | Tabla HTML | **Atrasada 1 fecha** |
| Campeonato Turismo Fiat y Fiat 128 | "Fecha 3/9" | 6 | Tabla HTML | **Atrasada 3 fechas** |
| Campeonato TCH, Clase 3, FR Plus | no existe | 6 | no existe | **No se publica** en cordobapista.com |
| Pilotos | no hay sección | - | La tabla del campeonato trae N°, nombre, marca y localidad | Sólo quienes puntuaron |
| Noticias | 28/9/2026 | 6 | WordPress, con API | **Al día** |
| Horarios | en las notas de adelanto | 6 | PDF con texto | Al día, pero sin URL estable |
| Speedhive (FRAD) | 26/9/2026 (fecha 6) | 6 | JSON | **Al día** (no pude ver si la final 2 de FR Plus del 27/9 ya estaba; sí está la sesión) |

Ejemplo verificado de atraso: la final del TC 4000 de la fecha 6 (Rasetto, Longo, Vidal) sólo está en la nota del 28/9 y en Speedhive, no en el archivo de resultados de la web.

## Estructura de los resultados

- **Speedhive (recomendada):** `classification` devuelve `rows[]` con `position`, `startNumber`, `name` ("APELLIDO Nombre"), `numberOfLaps`, `totalTime`, `difference.timeDifference`/`lapsBehind`, `bestTime`, `bestLap`, `bestSpeed`, `status`, `resultClass`, y `bestLap` de la sesión. **No trae marca ni localidad.** Cada grupo de sesiones es una categoría ("TC 4000", "TCH", "CLASE 3", "T FIAT 128", "FORMULA R PLUS"...). Tipos: `practice`, `qualify`, `race`. Hay sesiones "ENTRENAMIENTO GRAL" con hora 1970-01-01 (sin hora real): hay que descartar esa fecha.
- **PDF oficial:** una página A4 por sesión, texto real (no imagen). Columnas: Pos, N°, Nombre, Vueltas, Total Tiempo, Dif., Procedencia, Equipo (marca), más notificaciones ("+5 seg por no respetar procedimiento de largada", "desclasificado por informe técnico"). Extraído con `pdftotext -layout` las filas salen desalineadas (los nombres, tiempos y localidades se intercalan entre líneas), así que se necesita leer por coordenadas, no por líneas. Tiene algo que Speedhive no tiene: **penalizaciones y desclasificaciones** en el texto, y marca y localidad. El PDF de la final 3 del TC 4000 dice "SUJETA A VERIFICACION TECNICA Y ADMINISTRATIVA".
- **Campeonato:** tabla HTML simple (`<table>`), parseable como `apat.mjs` parsea el ranking de APAT.

## Pilotos e inscriptos

- No encontré lista de inscriptos publicada en la web ni en Speedhive. Sí hay: números y nombres en cada clasificación (Speedhive), marca y localidad en los PDF y en la tabla del campeonato (sólo quienes puntúan), y notas de la web anunciando regresos o debuts ("Hugo Styl debuta en el TC 4000", 22/9). Puntal mencionó 58 autos en 7 categorías en la fecha 6 y baja de participación; el programa de la fecha 5 hablaba de más de 120 pilotos y 8 categorías porque se sumó el TCR South America.
- Los números de auto son **por categoría** (el 3 es Terrier en el TC 4000 y Gutiérrez en el TCH): la clave de piloto debe ser categoría + número + nombre, no sólo el número.

## Confiabilidad

- **Actualización:** la web publica notas durante el fin de semana (8 notas entre el 22 y el 28/9). Los PDF de final se suben a la nota de crónica del domingo a la noche o el lunes. Speedhive ya tenía, el 30/9, todas las sesiones de la fecha 6 (sábado y domingo); no sé a qué hora se cargó cada una. No medí la latencia exacta; hay que medirla con un sondeo de dos fines de semana antes de prometerla en el sitio.
- **Huecos:** (1) el archivo de resultados no se actualiza desde junio; (2) sólo 4 de 7 categorías tienen campeonato web; (3) los nombres en Speedhive son "APELLIDO Nombre", y en las tablas del campeonato "Apellido Nombre"; "Vanini Ricardo (h)" vs "VANINI Ricardo" necesita normalización como la de `properName`; (4) el número de fecha del título no siempre es confiable ("5ta Y 6ta FECHAS" en un evento de otro campeonato del mismo organizador; hay que filtrar por nombre).
- **Redes:** Facebook/Instagram de APICER existen pero **no hacen falta**: el sitio y Speedhive cubren lo necesario. Lo que sólo sale en redes (si sale) queda fuera de la automatización.
- **Riesgo de organización:** la FRAD le retiró la organización a APICER en 2025 y se la devolvió en noviembre. Si cambia de nuevo, el nombre de la marca, el sitio y el organizador cambian. La organización FRAD en Speedhive sobrevive a eso porque es la que sube todo el cronometraje provincial (también karting y categorías regionales: hay que filtrar).
- **Regla de "fuente que devuelve menos":** Speedhive puede cambiar el nombre de un evento ("FORMULA R PLUS - CORDOBA PISTA", "APICER PARQUE CIUDAD DE RIO IV", "2DA FECHA CORDOBA PISTA - FR PLUS": tres estilos distintos en seis eventos) o borrar una sesión; se resuelve con la protección de `guard.mjs` y guardando en la temporada lo ya leído, igual que hace `keepPreviousSpeedhive`.

## Cómo encaja en la arquitectura

Lo que ya hay (leído en `src/lib/sources/season.mjs`, `speedhive-tn.mjs`, `apat.mjs`, `overrides.mjs`, `src/data/series.ts`, `docs/fuentes-de-datos.md`):

- Cada fuente es un adaptador (`apatSeason` para TN) registrado en una lista `[nombre, ids de serie, función]`; el resultado pasa por `protectSeason`/`protectStandings` (`guard.mjs`) para que nada se achique, y por la carga manual (`manual-overrides.json`, con `resultsSource` obligatorio).
- `speedhive-tn.mjs` ya lee la API pública de Speedhive de otra organización (381036) para horarios y clasificaciones, sólo completa lo que falta y marca el estado "provisorio". Es la plantilla para esta fuente.
- No existe ninguna categoría zonal real hoy: `zonal-bsas` (Procar4000) quedó "sin datos" y la doc dice que sus resultados son PDF sin texto fiable. Córdoba Pista sería el primer zonal con datos.
- Los PDF de Córdoba Pista **sí tienen texto**, a diferencia de los de Procar.

### Propuesta por categoría

| Categoría | Modo | Esfuerzo | Riesgos |
|---|---|---|---|
| Calendario (las 7) | **Automático desde Speedhive** + sedes y fechas 7-9 por carga manual, citando la nota de la FRAD | Bajo, 1 día | El nombre del evento no es estable; las fechas 7-9 no están en Speedhive hasta el fin de semana: sin carga manual, el sitio diría "sin calendario" para fechas que existen |
| Horarios previos | **Semiautomático**: detectar nota nueva por la API de WordPress y cargar el PDF a mano (o parsearlo) | Medio; manual es 10 min por fecha | El PDF cambia de formato; no hay URL estable; que quede marcado "a confirmar" si no está |
| Horario real y resultados por sesión (TC 4000, TC Pista 4000, T. Fiat, T. Fiat 128, TCH, Clase 3, FR Plus) | **Automático desde Speedhive** | Medio, 2-3 días con pruebas | Sin marca ni localidad; nombres en mayúscula; "Entrenamiento general" con hora 1970; sin penalizaciones |
| Marca y penalizaciones | **Semiautomático**: leer PDF por coordenadas o tomar la marca de la tabla del campeonato | Alto para el parser; bajo si se omite | Depender del diseño del PDF de MyLaps Orbits (que cambia de versión) |
| Campeonato TC 4000, TC Pista 4000, T. Fiat, T. Fiat 128 | **Manual con fuente**, hasta tener el puntaje verificado; nunca mostrar la tabla oficial como actual | Bajo si sólo se copia; medio para reconstruir el puntaje | La tabla oficial lleva 1 a 3 fechas de atraso; la regla del proyecto exige no mostrarla como vigente. Si se usa, rotularla "Fecha 5/9: actualizada hasta la fecha N" |
| Campeonato TCH, Clase 3, FR Plus | **Manual o ninguno**: no hay tabla publicada; se puede calcular sólo si se conoce el puntaje del reglamento | Alto | No hay reglamento parseado; sin tabla, mejor "sin campeonato" que inventar |
| Pilotos | **Derivado**: lista de los que aparecen en clasificaciones | Bajo | Números por categoría; nombres con variantes |

## Plan por etapas

**Etapa 1, en días (2 a 4):** sólo lectura de lo que ya está al día.
1. Sumar las 7 series a `series.ts` con los códigos y colores de arriba (`scope: "zonal"`). Verificar contraste y vista en la grilla de categorías.
2. Adaptador `cordoba-pista.mjs` con Speedhive (copiando la estructura de `speedhive-tn.mjs`): calendario de las fechas 1-6 (evento, sede, hora real de cada sesión) y resultados de todas las sesiones de todas las categorías. Con `keepPrevious...` y prueba de "no se achica" (fixture con los eventos de la fecha 6).
3. Fechas 7, 8 y 9 por `newEvents` en `manual-overrides.json`, con `timeSources` apuntando a https://fradcba.com.ar/se-modifico-el-calendario-del-cordoba-pista-y-la-ultima-del-provincial-de-karting-en-asfalto/ y sin horarios (sólo día y sede).
4. Corrida de prueba contra la fecha 6 y contraste contra las notas de Puntal y de la web: ganadores TC 4000 Rasetto, TC Pista 4000 Martinbianco, TCH Gutiérrez, Clase 3 Pacciaroni, T. Fiat Pavón, T. Fiat 128 Ronga, FR Plus Della Santina (Puntal 27/9).

**Etapa 2, una a dos semanas:** horarios previos y enriquecimiento.
1. Detector de notas nuevas (API de WordPress `posts`) que avisa en `/sistema/tareas` cuando aparece el "Programa General" de la próxima fecha (24-25/10) para cargar los horarios a mano con `timeSources` de la nota.
2. Marca y localidad: cruzar con la tabla del campeonato por número y categoría (sin PDF).
3. Medir la latencia real de Speedhive contra las notas en las fechas 7 y 8 (24-25/10 y 21-22/11).

**Etapa 3, sólo si el dueño lo pide y hay tiempo:** PDF por coordenadas para penalizaciones y marca; campeonato calculado por reglamento (`https://cordobapista.com/reglamentos/`, que no pude leer: devolvió página vacía); fusionar FR Plus con su sitio. Nada de esto se puede prometer en días.

**Qué no se puede tener en días:** campeonato de TCH, Clase 3 y FR Plus; campeonato al día de los otros cuatro sin depender de tabla vieja o de cálculo propio; penalizaciones por sesión; lista oficial de inscriptos.

## Preguntas abiertas para el dueño

1. **FR Plus:** ¿entra como categoría de Córdoba Pista? Tiene organización y sitio propios (`frplus.com.ar`) pero comparte eventos y cronometraje. Mi suposición es que sí, como la séptima.
2. **Campeonato:** ¿preferís mostrar "sin campeonato" para TCH, Clase 3 y FR Plus hasta tener puntaje verificado, o cargarlo a mano tras cada fecha? Y para las cuatro con tabla, ¿aceptás mostrar la oficial con un rótulo "actualizada hasta la fecha N" o sólo la calculada?
3. **Córdoba Pista y TN:** ¿"Clase 3" va como categoría separada del TN Clase 3? Propongo sí, con el nombre completo en pantalla.
4. **Acceso:** ¿querés escribirle a APICER/FRAD para pedir (a) que actualicen el archivo de resultados y los campeonatos, (b) una lista de inscriptos, (c) el reglamento de puntaje? No lo hicimos: sería un mensaje en tu nombre.
5. **Fecha de la carga manual:** las fechas 7-9 tienen día y sede confirmados por la FRAD (comunicado del 28/8) y por el posteo oficial de Córdoba Pista del 29/8; se cargaron con `dateConfirmed` y los horarios a confirmar hasta que aparezcan en Speedhive.
6. **Organización:** la situación de 2025 (FRAD vs APICER) se cerró en noviembre. ¿Conocés algo más reciente? No encontré notas posteriores al 12/11/2025 que la reabran.
7. **Correr algún día:** el Turismo Fiat 128 y el Turismo Fiat son los escalones de entrada. Si sirve, se puede hacer una ficha de "cómo ingresar" con reglamento y costos, pero no hay costo ni inscripción publicados que yo haya podido leer.

## No confirmado

- El horario real de cada final de la fecha 6 en Speedhive contra el PDF (sólo validé la final del TC 4000: 14 vueltas, 17:34.329, Rasetto, mismos datos en ambos).
- Reglamento y sistema de puntaje (la página `/reglamentos/` no mostró PDF).
- Frecuencia de carga de Speedhive entre fechas.
- Que los eventos 2026 de Speedhive incluyan todas las sesiones de la fecha 5 y la final 2 de FR Plus del 27/9.
- Si la web de APICER pretende volver a actualizar el archivo de resultados.
