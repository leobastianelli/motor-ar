# Plan de lanzamiento: domingo 4 de octubre de 2026

Fecha fijada en `SPECS.md`. Punto de partida (24/09): el sitio aparece en Google desde el 15/09 (12 clics, 249 impresiones), hay una cuenta de X creada y ninguna otra red, y no hay contactos en el ambiente.

## Por qué el 4 de octubre

Ese fin de semana coinciden la **F1** (del 2 al 4), el **TC y el TC Pista en San Nicolás** (domingo 4) y el **GT3** en Barcelona. Es un fin de semana en el que la gente busca "a qué hora corre…", y es justo lo que el sitio resuelve mejor.

## La idea que ordena el lanzamiento

Sin contactos y sin presupuesto, se crece con lo que el sitio tiene y los demás no:
1. **Datos al minuto de todas las categorías**, no sólo de la F1: horarios en hora argentina, resultados y dónde verlo.
2. **Una ficha para cada piloto argentino** (más de 200, de la F1 al TN). A los pilotos y a sus seguidores les interesa que alguien siga su campeonato. **Es el canal de difusión que no necesita contactos**: se arma solo, piloto por piloto.

Mensaje, en una línea: **"Todo el automovilismo argentino en hora argentina: qué corre, cuándo, dónde verlo y cómo salió. Sin buscar en diez lados."**

## Día por día

| Día | Producto (sesiones de Claude) | Difusión (Leonel) |
|---|---|---|
| **Vie 25 – Dom 27** (GP de Azerbaiyán) | Etapas 01 y 02 del plan de producto (momento, categoría y piloto) | Armar el perfil de X (ver "Perfil"). **Ensayo:** publicar la agenda del sábado, la clasificación y el resultado con Colapinto, usando los datos del sitio. Sirve para practicar el formato antes de que importe. |
| **Lun 28 – Mar 29** | Etapa 04 del plan de producto (títulos y sitemap, como mínimo pilotos, horarios y categorías nacionales). `01-borradores-para-redes.md` (abajo) | Crear la cuenta de Instagram con el mismo nombre y perfil. Juntar las cuentas de X de los pilotos de TC y TC Pista que corren en San Nicolás (ver "Pilotos"). |
| **Mié 30** | Etapa 03 (evento), si llega. Si no, queda para después del lanzamiento: no es bloqueante | Escribir el hilo de presentación (ver "Hilo") y dejarlo como borrador. |
| **Jue 1/10** | **Revisión previa** (ver lista abajo) | Fijar la bio y el tuit fijado. |
| **Vie 2/10** | Nada nuevo: sólo arreglos de la revisión previa | Publicar la **agenda del fin de semana** (placa de `/placa` + texto). Empezar a escribirles a los pilotos (5 por día). |
| **Sáb 3/10** | — | Publicar al terminar cada sesión importante: clasificación de F1 (con Colapinto) y clasificación de TC. Responder, en las conversaciones del momento, a quien pregunta horarios o resultados, con el dato y el enlace, sin insistir. |
| **Dom 4/10 · LANZAMIENTO** | — | A la mañana, el **hilo de presentación**. Durante el día: resultados de F1 y de TC con enlace a la fecha. A la noche: "Así quedó el fin de semana", con enlaces al campeonato de cada categoría. |
| **Lun 5 – Dom 11/10** (GP de Singapur, TN en San Martín) | Arreglar lo que haya salido mal. Etapa 03 si quedó pendiente | Seguir con los pilotos (TN de San Martín). Repetir el formato del fin de semana. |
| **1/11** | Revisión de métricas (ver "Cómo medimos") | Decidir qué canal sigue y cuál no. |

## Perfil de X (y después Instagram)

- **Nombre:** Fierros. **Usuario:** el que ya existe.
- **Bio (hasta 160 caracteres):** "Todo el automovilismo argentino en hora argentina: horarios, dónde verlo y resultados. De la F1 al TN. Datos con fuente, sin vueltas." + enlace a www.somosfierros.ar
- **Imagen:** el logo del sitio (`src/app/icon.svg` / `apple-icon.png`). **Portada:** la placa del fin de semana, que se renueva cada semana.
- **Tuit fijado:** el hilo de presentación, a partir del domingo 4.

## Qué publicar (formatos que se repiten todas las semanas)

| Formato | Cuándo | Contenido |
|---|---|---|
| **Agenda del fin de semana** | Viernes a la mañana | La placa de `/placa/imagen` + una línea por categoría con día y hora + enlace a la home |
| **Terminó la sesión** | Al terminar clasificaciones y carreras | "TC en San Nicolás: ganó X. Y 2.º, Z 3.º. Campeonato: …" + enlace a la fecha. Si corre un argentino afuera, su posición en la primera línea. |
| **A qué hora corre** | El día de la sesión | "Hoy a las 09:00 (hora argentina) clasifica Colapinto en Malasia. Dónde verlo: …" + enlace a `/horarios/franco-colapinto` |
| **Así quedó** | Domingo a la noche | Ganadores de todas las categorías del fin de semana, con enlaces |

**Regla:** cada publicación lleva **un dato concreto y un enlace**, nunca sólo el enlace. Y se publica sólo lo que el sitio ya muestra: si el sitio no tiene el dato, no se publica. Es la misma confianza del sitio.

Para no escribir todo a mano, la tarea `01-borradores-para-redes.md` hace que el sitio arme los textos solo y los mande por Telegram, listos para copiar.

## Pilotos: el canal que no necesita contactos

1. Cada semana, anotar las cuentas de X (e Instagram) de los pilotos que corren. Empezar por el TC y el TC Pista de San Nicolás, y seguir por el TN.
2. **Cinco mensajes por día como máximo**, personalizados, siempre con **su** ficha:

   > Hola [nombre], armamos una página con todos tus resultados de 2026, fecha por fecha, y tu posición en el campeonato: www.somosfierros.ar/pilotos/[su-ficha]. Es gratis y se actualiza sola después de cada carrera. Si ves algo mal, avisanos y lo corregimos.

3. Antes de mandar, **revisar que su ficha esté bien** (nombre, número, equipo, resultados). Una ficha con errores es peor que no mandar nada.
4. Si responden con un error, se corrige con el protocolo de carga manual. Y el piloto ve que el sitio escucha.

No hacer: mensajes masivos iguales, etiquetar pilotos en publicaciones sin relación, ni pedir que compartan. Si la ficha sirve, la comparten solos.

## Hilo de presentación (domingo 4)

1. "Hoy arrancamos: Fierros, todo el automovilismo argentino en un solo lugar. Horarios en hora argentina, dónde verlo y resultados, de la F1 al TN." + captura de la home.
2. "¿A qué hora corre Colapinto? ¿Y el TC? Cada categoría y cada piloto argentino tiene su página, que se actualiza sola." + captura de una ficha.
3. "Los resultados llegan a los minutos de terminar cada sesión, con la fuente de cada dato. Si algo no está confirmado, lo decimos." + captura de una fecha.
4. "Es gratis y sin vueltas: www.somosfierros.ar. Si ves un error, avisanos."

## Revisión previa (jueves 1/10)

Probar como si fuera la primera visita, en el celular:
- [ ] **F1 Malasia:** hoy la fecha se llama **"Bahrain Grand Prix in Malaysia"**, en inglés, mientras las demás dicen "GP de Singapur". Corregir el nombre y revisar horarios y dónde verlo.
- [ ] **TC y TC Pista en San Nicolás:** horarios confirmados (la ACTC los publica el viernes: ver el cron del viernes en `sync-season.yml`), dónde verlo y ficha del circuito.
- [ ] **GT3 Barcelona:** horarios y argentinos.
- [ ] Home, categorías F1 y TC, y las fichas de Colapinto y de 3 pilotos de TC: ninguna con datos viejos, vacíos o mal escritos.
- [ ] `/api/salud` sin pendientes viejos; la prueba de humo pasa; el vigilante, sin alertas abiertas.
- [ ] `/placa/imagen` muestra el fin de semana correcto.
- [ ] Velocidad en el celular: la home carga en menos de 2 s con 4G.

## Cómo medimos (revisión el 1/11)

| Qué | Dónde | Hoy (24/09) | Mirar |
|---|---|---|---|
| Clics desde Google | Search Console | 12 en 10 días | Tendencia semanal. Consultas de horarios y pilotos |
| Visitas y páginas más vistas | Vercel Analytics | — | Visitas del fin de semana y visitantes que vuelven |
| Seguidores y clics desde X | X Analytics | 0 | Qué formato trae más clics |
| Pilotos contactados / que respondieron / que compartieron | Planilla simple | 0 | La tasa de respuesta dice si el canal sirve |

No hay metas numéricas inventadas: la primera revisión fija las metas del mes siguiente con datos reales.
