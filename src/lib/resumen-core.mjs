// Resumen del finde para el carrusel de redes (hasta 4 placas de 1080 × 1350, ver src/app/placa/resumen/[n]/route.tsx): a partir de la temporada arma,
// como datos planos (sin JSX), qué se cuenta: el evento más importante, el mejor argentino que corrió afuera y el resto de las categorías.
// Lógica pura, sin red ni disco. Reutiliza las reglas de redes-core.mjs (categorías, ventana del domingo, líder sólo si la tabla está al día).
// Regla de contenido: sólo datos que están en la temporada; si falta algo no se inventa ni se rellena.
// Nota: redes-core.mjs importa `resumenFinde` (para saber cuántas placas lleva el borrador) y este módulo importa helpers de redes-core: el ciclo es
// inocuo porque nada se usa al evaluar los módulos, sólo al llamar.
import { dayKey } from "./monitor/checks.mjs";
import { isProvisional } from "./provisorio.mjs";
import { classified, driverIndex, freshLeader, isAutoSource, mainRace, normalize, outcome, summaryDays, summarySunday, surname, tiers } from "./redes-core.mjs";

/** Cuántas filas de «Y además» entran en la placa. */
export const MAX_RESTO = 4;

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DAY_MS = 24 * 60 * 60_000;

/** «Faín», o «Vermeulen y Green» si es una tripulación («A / B»). */
export const shortName = (name) => String(name).split(" / ").map(surname).join(" y ");

/** «4 de octubre», «3 y 4 de octubre», «2, 3 y 4 de octubre», «30 de octubre y 1 de noviembre». */
export function fechaLabel(keys) {
  const parts = [...new Set(keys)].sort().map((k) => ({ day: Number(k.slice(8, 10)), month: Number(k.slice(5, 7)) - 1 }));
  if (!parts.length) return "";
  if (parts.every((p) => p.month === parts[0].month)) {
    const days = parts.map((p) => p.day);
    const list = days.length > 1 ? `${days.slice(0, -1).join(", ")} y ${days.at(-1)}` : String(days[0]);
    return `${list} de ${MONTHS[parts[0].month]}`;
  }
  return parts.map((p) => `${p.day} de ${MONTHS[p.month]}`).join(" y ");
}

/** Último domingo (hora argentina) que no es posterior a `now`, en formato dayKey. */
export function ultimoDomingo(now) {
  let t = Date.parse(`${dayKey(now)}T12:00:00-03:00`);
  while (new Date(t).getUTCDay() !== 0) t -= DAY_MS;
  return dayKey(new Date(t).toISOString());
}

const podiumOf = (rows) =>
  [1, 2, 3].flatMap((p) => {
    const r = rows.find((x) => x.pos === p && classified(x));
    return r ? [{ pos: p, name: r.driver, team: r.team ?? "", gap: r.gap ?? "" }] : [];
  });

/**
 * Qué cuenta el resumen del fin de semana que terminó un domingo.
 * - `when`: un instante ISO (se aplica la misma ventana que el borrador: domingo desde las 20:00 o lunes antes del mediodía; fuera de eso, null)
 *   o `{ sunday: "YYYY-MM-DD" }` para pedir un fin de semana puntual (vista previa, sin ventana).
 * - `season`: temporada cruda; `catalog`: { drivers, series }; `manual`: manual-overrides.json; `events`: las fechas visibles (por defecto season.events).
 * → null si no hay nada que contar; si no, { sunday, fecha, slides, hero, argentinos, resto }.
 *   `slides` lista las placas que existen, en orden: "portada", "hero" y, según haya datos, "argentinos" y "resto".
 */
export function resumenFinde(season, when, { catalog, manual = {}, events } = {}) {
  const sunday = typeof when === "string" ? summarySunday(when) : when?.sunday;
  if (!sunday) return null;
  const evs = events ?? season.events;
  const days = summaryDays(sunday);
  const { byId, tierOf } = tiers(catalog.series, catalog.drivers);
  const order = new Map(catalog.series.map((s, i) => [s.id, i]));
  const find = driverIndex(catalog.drivers);

  const items = evs
    .filter((e) => byId[e.seriesId] && isAutoSource(e))
    .map((e) => ({ e, main: mainRace(e) }))
    .filter(({ main }) => main && days.includes(dayKey(main.start)) && main.results?.length)
    .map(({ e, main }) => ({ e, main, winner: main.results.find((r) => r.pos === 1 && classified(r)) }))
    .filter(({ winner }) => winner)
    // Argentinas primero, después las internacionales con argentinos, después el resto; dentro de cada grupo, el orden de series.ts (TC antes que TC Pista).
    .sort((a, b) => tierOf(a.e.seriesId) - tierOf(b.e.seriesId) || order.get(a.e.seriesId) - order.get(b.e.seriesId) || Date.parse(a.main.start) - Date.parse(b.main.start));
  if (!items.length) return null;

  const base = ({ e, main, winner }) => {
    const s = byId[e.seriesId];
    return {
      series: { id: s.id, code: s.code ?? s.short, color: s.color, name: s.name },
      evento: e.name,
      ciudad: e.circuit?.city ?? "",
      winner: { name: winner.driver, team: winner.team ?? "" },
      provisional: isProvisional(main),
    };
  };

  const [first, ...others] = items;
  const quali = first.e.sessions.filter((s) => s.kind === "clasificacion" && s.results?.length).at(-1);
  const pole = quali?.results.find((r) => r.pos === 1)?.driver ?? null;
  const hero = {
    ...base(first),
    pole,
    poleYVictoria: Boolean(pole) && normalize(pole) === normalize(first.winner.driver),
    podium: podiumOf(first.main.results),
    lider: freshLeader(season, manual, evs, first.e.seriesId),
  };

  // Mejor argentino de las categorías internacionales con argentinos: los que terminaron, por posición; si ninguno terminó, el mejor ubicado que abandonó.
  let argentinos = null;
  let argentinosEvent = null;
  for (const it of items.filter(({ e }) => tierOf(e.seriesId) === 2)) {
    const mine = it.main.results
      .map((row) => ({ row, driver: find(row.driver) }))
      .filter(({ driver }) => driver && driver.seriesId === it.e.seriesId)
      .sort((a, b) => Number(classified(b.row)) - Number(classified(a.row)) || a.row.pos - b.row.pos);
    if (!mine.length) continue;
    const { row, driver } = mine[0];
    argentinosEvent = it.e.id;
    argentinos = {
      ...base(it),
      driver: driver.name,
      team: row.team ?? driver.team ?? "",
      pos: row.pos,
      grid: Number.isInteger(row.grid) && row.grid > 0 ? row.grid : null,
      terminó: classified(row),
      texto: outcome(row, it.main.kind),
      podium: podiumOf(it.main.results),
    };
    break;
  }

  const resto = others
    .filter(({ e }) => e.id !== argentinosEvent)
    .slice(0, MAX_RESTO)
    .map((it) => ({ ...base(it), second: it.main.results.find((r) => r.pos === 2 && classified(r))?.driver ?? null }));

  return {
    sunday,
    fecha: fechaLabel(items.map(({ main }) => dayKey(main.start))),
    slides: ["portada", "hero", ...(argentinos ? ["argentinos"] : []), ...(resto.length ? ["resto"] : [])],
    hero,
    argentinos,
    resto,
  };
}

/** Para la vista previa: el resumen del último domingo (≤ now) que tenga resultados, mirando hasta 6 semanas atrás. null si no hay ninguno. */
export function resumenReciente(season, now, opts) {
  let t = Date.parse(`${ultimoDomingo(now)}T12:00:00-03:00`);
  for (let i = 0; i < 6; i++, t -= 7 * DAY_MS) {
    const r = resumenFinde(season, { sunday: dayKey(new Date(t).toISOString()) }, opts);
    if (r) return r;
  }
  return null;
}
