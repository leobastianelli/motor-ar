# 02b — La sincronización escribe al almacén e invalida el sitio

Leer primero `docs/plan-datos/00-indice.md`. Supone terminadas 01 y 02a (existe `season_versions` y el sitio lee de ahí).

## Objetivo

- La sync completa (GitHub Actions, `scripts/sync-season-2026.mjs`) parte de la última versión del almacén y escribe una versión nueva sin pisar lo que otro escritor haya guardado mientras corría. Después invalida el sitio.
- Los datos dejan de provocar un despliegue por commit.
- La compuerta de la sync horaria y el guardián leen el almacén, no el archivo del repo.

## Problemas que resuelve

- Falla #4 de la auditoría: la sync tarda unos 6 min, un merge entra en el medio, el push se rechaza y se pierden los datos. Hoy hay reintentos con `pull --rebase -X theirs`, pero el diseño sigue haciendo competir los datos y el código por `main`.
- Cada commit de datos redespliega el sitio: cuesta, y abre una ventana en la que conviven dos despliegues.

## Qué hacer

### 1. Fusión segura, pura y testeable: `src/lib/sources/season-merge.mjs`

`mergeOnto(next, latest)`: cuando la sync termina y descubre que ya hay una versión más nueva que su `parent` (porque la escribió el refresco caliente de 02c o una corrida manual), no puede perder lo que esa versión agregó.

- Por cada evento de `next`, aplicar `keepSessionData(evento, eventoEnLatest)` de `guard.mjs`: los resultados que `latest` tenga y `next` no se conservan.
- Los eventos que estén en `latest` y no en `next` se suman, con la misma regla que `missingEvents`.
- `standings` y `meta` salen de `next` (la sync completa es la autoridad para tablas y metadatos), salvo que `next` tenga una categoría sin tabla y `latest` sí.
- Pruebas: la sync no borra un resultado caliente; la sync agrega resultados nuevos; la fusión de algo consigo mismo no cambia nada.

### 2. Escritura con verificación de versión: `src/lib/season-store-write.mjs`

La van a usar la sync (Node puro) y 02c (dentro de Next), así que no importa nada de Next ni usa alias `@/`. Recibe la función `sql` como parámetro.

```
writeVersion(sql, { raw, parentId, origin }) →
  INSERT INTO season_versions (parent_id, origin, generated_at, summary, body)
  SELECT $parentId, $origin, $generatedAt, $summary, $body
  WHERE (SELECT max(id) FROM season_versions) = $parentId
  RETURNING id
```

- Si devuelve una fila: listo.
- Si no devuelve nada: otro escritor entró en el medio. Leer la última versión, aplicar `mergeOnto(raw, latest.raw)`, reintentar con `parentId = latest.id`. Hasta 3 intentos; si se agotan, error explícito.
- Si la versión resultante es idéntica a la última (comparar el JSON de `events`, `standings` y `meta`), **no** escribir: devolver `{ unchanged: true, id: latest.id }`. Así no se generan versiones vacías.
- Poda: después de escribir, borrar versiones con `created_at` de más de 30 días, conservando siempre las últimas 50.
- Pruebas con un `sql` falso que simule la carrera (la primera inserción no devuelve nada).

### 3. `scripts/sync-season-2026.mjs`

- `previous` = la última versión del almacén si hay `DATABASE_URL`. Si no hay (uso local), el archivo, como hoy. Mostrar por consola cuál se usó.
- `buildSeason` ya aplica `protectSeason` y `protectStandings` (`season.mjs` ~línea 231). No duplicarlo.
- Escribir con `writeVersion(..., origin: "sync")`.
- Si escribió o si no hubo cambios, llamar a la invalidación: `GET ${SITE_URL}/api/refresh` con `Authorization: Bearer ${CRON_SECRET}`. `SITE_URL` por defecto: `https://www.somosfierros.ar`. Si la invalidación falla, que la corrida falle (el guardián lo avisa); no dejarla pasar en silencio.
- Sigue escribiendo `src/data/season-2026.json` y `drivers-2026.json` en disco (respaldo, compilación, y el guardián local).

### 4. Workflow `.github/workflows/sync-season.yml`

- Variables del paso "Sincronizar": `DATABASE_URL: ${{ secrets.DATABASE_URL }}` y `CRON_SECRET: ${{ secrets.CRON_SECRET }}`. **Los secretos los carga el dueño** en GitHub → Settings → Secrets → Actions. Pedir exactamente esos dos nombres, y aclarar que el valor de `CRON_SECRET` tiene que ser el mismo que está en Vercel.
- Paso "Subir cambios":
  - `drivers-2026.json` se commitea cuando cambia, como hoy: lo importa el código, así que necesita despliegue.
  - `season-2026.json` se commitea **sólo en la corrida diaria de las 09:00 UTC** (`github.event.schedule == '0 9 * * *'`) o en `workflow_dispatch`. Es el respaldo, no la fuente de verdad.
  - Mantener el bucle de reintentos del push.
- Compuerta (`gate`): `scripts/pending-sessions.mjs` pasa a leer la última versión del almacén cuando hay `DATABASE_URL` (necesita `npm ci` o, mejor, sólo `npm install @neondatabase/serverless` en ese job). Si falla, cae al archivo y lo dice. Si el archivo ya no se actualiza cada hora, la compuerta con el archivo decide mal. Por eso se lee el almacén.

### 5. No redesplegar por datos: `vercel.json`

```json
"ignoreCommand": "git diff --quiet HEAD^ HEAD -- . ':(exclude)src/data/season-2026.json'"
```

En Vercel, `ignoreCommand` con salida 0 **omite** el despliegue. El comando da 0 cuando lo único que cambió es la instantánea. Verificar en la documentación de Vercel (`search_vercel_documentation`, o la skill `vercel:deployments-cicd`) que el comportamiento sigue siendo ese antes de mergear. Si `vercel.ts` reemplazó a `vercel.json` en el proyecto, usar ese archivo.

### 6. Guardián (`scripts/guardian.mjs`)

Hoy lee `src/data/season-2026.json`. Pasa a leer la última versión del almacén cuando hay `DATABASE_URL`, con el archivo como respaldo, y el mensaje de Telegram dice cuál usó. El job del guardián está en el mismo workflow y hereda las variables.

## Qué NO hacer

- No borrar ni reescribir versiones existentes, salvo la poda.
- No hacer `UPDATE` sobre `season_versions`.
- No sacar el commit de la instantánea del todo: sigue siendo el respaldo si Neon falla.
- No tocar `withHotSources` (eso es 02c).

## Verificación

1. `npm test` pasa, con las pruebas nuevas de fusión y escritura.
2. En una **rama de Neon**, correr la sync local con `DATABASE_URL` de la rama y `TIMING_DAYS=10`: se crea una versión `sync` con `parent_id` = la siembra. Correrla otra vez sin cambios en las fuentes: `unchanged`, sin fila nueva.
3. Simular la carrera: insertar a mano una versión `hot` después de que la sync leyó `previous` (por ejemplo, con una pausa temporal en el script o desde la prueba unitaria). La sync tiene que fusionar y conservar el dato caliente.
4. Después del merge, disparar el workflow a mano (`workflow_dispatch`) y comprobar:
   - hay una versión nueva en `season_versions`;
   - `/api/refresh` respondió 200 en el log;
   - la home muestra el dato nuevo en menos de un minuto;
   - **no** hubo despliegue nuevo en Vercel si sólo cambió la instantánea.

## Terminado cuando

Una corrida real de la sync en GitHub Actions escribe al almacén, invalida el sitio, no redespliega y no pierde datos ante una escritura concurrente. Revisar el PR con Opus (`/code-review`) antes de mergear.
