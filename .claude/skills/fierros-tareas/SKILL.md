---
name: fierros-tareas
description: >-
  Agrega, lista, cierra o borra tareas del panel interno de pendientes de Fierros
  (/sistema/tareas), la base Postgres (Neon) donde se anotan huecos de datos y
  cosas por hacer del proyecto. Usar esta skill siempre que Leonel diga cosas como
  "anotalo en pendientes", "agregalo a la lista de tareas", "esto lo dejamos
  pendiente", "cuando tengas tiempo hacé X" en el contexto del proyecto Fierros/
  motor-ar, o pida ver qué hay pendiente, marcar algo como hecho, o borrar una
  tarea cargada por error. No confundir con las tareas automáticas (huecos de
  datos detectados solos en cada sync): esta skill sirve para las manuales, las
  que se cargan porque alguien lo pidió.
---

# Tareas de Fierros

`/sistema/tareas` es el panel interno (protegido por contraseña, bloqueado en robots.txt) donde
Fierros lleva lo que falta: tareas automáticas (se abren y cierran solas comparando los datos de
cada sincronización) y manuales (lo que alguien pide anotar, como "conseguir la fuente de video de
TC Mouras" o "agregar un botón de pedidos de la comunidad"). Ver `docs/fuentes-de-datos.md` →
"Panel de tareas" y `src/lib/tasks.ts` para el detalle completo del mecanismo.

Cuando el usuario pida anotar, ver, cerrar o borrar algo de esta lista, no hace falta loguearse en
el panel ni armar SQL a mano: usar `scripts/task-cli.mjs`, que ya habla con la base.

## Antes de usarlo

Necesita `DATABASE_URL` en el entorno. Si `npm run db:task -- list` tira "Falta DATABASE_URL", correr
primero (una sola vez por checkout):

```bash
npx vercel env pull .env.local --yes
```

## Comandos

Todos van con `npm run db:task -- <comando> ...` (el `--` es necesario para que los flags lleguen al
script y no a npm). Alternativa equivalente: `npx dotenv -e .env.local -- node scripts/task-cli.mjs <comando> ...`.

```bash
# Agregar una tarea manual. El título va sin comillas de más si no tiene espacios raros;
# si tiene espacios, entre comillas. category es el id de una categoría (tc, tc-pista, f1, etc.)
# o se omite para "General". note es opcional, para contexto extra.
npm run db:task -- add "Conseguir fuente de video para TC Mouras" --category=tc-mouras --note="pidió Leonel, ver canal de YouTube de la categoría"

# Ver qué hay pendiente (default) o filtrar por estado.
npm run db:task -- list
npm run db:task -- list --status=done
npm run db:task -- list --status=all

# Marcar como hecha / volver a abrir.
npm run db:task -- done 12
npm run db:task -- reopen 12

# Borrar (irreversible; sólo para algo cargado por error, no para "ya no importa" — eso es done).
npm run db:task -- delete 12
```

## Cómo redactar el título y la nota

Escribí el título como lo diría alguien mirando la lista, no como un mensaje de commit: concreto y
accionable ("Agregar botón de pedidos de la comunidad en /categorias"), no vago ("Mejorar
categorías"). Si el pedido original tiene contexto que se perdería (quién lo pidió, por qué, algún
detalle de implementación que ya se charló), va en `--note`, no en el título — el título tiene que
poder leerse solo en la lista.

## Qué NO hacer

- No usar esta skill para las tareas automáticas (`computeAutoGaps` en `src/lib/tasks.ts`): esas se
  generan solas en cada `/api/refresh` comparando los datos de la temporada contra la base. Si falta
  un chequeo automático nuevo, eso es un cambio de código en `computeAutoGaps`, no una tarea manual.
- No editar la tabla `tasks` con SQL suelto por fuera de este script salvo que el script realmente no
  alcance para lo que hace falta (por ejemplo, una migración de esquema) — así el historial de
  `created_at`/`done_at` y el formato quedan consistentes con lo que ya hay.
