// Lo que la portada (la home) decide según la hora: el modo, qué está en vivo, la agenda, "Los nuestros", "Recién terminó", los
// resultados y "Lo que viene". JavaScript puro, sin Next ni alias `@/`: el navegador lo corre con la hora real (src/components/home-view.tsx)
// sobre el recorte de `snapshot.mjs`, y `npm test` verifica que el recorte da lo mismo que la temporada entera.
import { eventStart, ms } from "./tiempo.mjs";

/** @typedef {import("./types").Series} Series */

/**
 * @template {{ slug: string, seriesId: string }} D
 * @param {ReturnType<typeof import("./tiempo.mjs").createTimeViews>} views
 * @param {string} now
 * @param {{ driversAbroad: D[], seriesById: Record<string, Series>, tierOf: (s: Series) => 1 | 2 | 3 }} deps
 */
export function datosPortada(views, now, { driversAbroad, seriesById, tierOf }) {
  const mode = views.getHomeMode(now);
  const { items, days, to } = views.getAgenda(now);
  const liveNow = views.getLiveItems(now);
  const nextArg = views.getNextArgentineSession(now);

  // Por orden de aparición: primero el que está en pista, después el próximo que corre y así hasta el último; los que no tienen nada cargado, al final.
  const runners = driversAbroad
    .map((driver) => ({ driver, series: seriesById[driver.seriesId], status: views.getRunnerStatus(driver, now) }))
    .sort(
      (a, b) =>
        Number(a.status.state === "no-data") - Number(b.status.state === "no-data") ||
        (a.status.at < b.status.at ? -1 : a.status.at > b.status.at ? 1 : 0) ||
        tierOf(a.series) - tierOf(b.series),
    );

  const [highlight, ...notes] = views.getArgentineHighlights(now);
  return {
    mode,
    items,
    days,
    to,
    liveNow,
    nextArg,
    runners,
    // Como máximo 4: "Recién terminó" tiene que caber en la primera pantalla, no listar todo lo del día.
    justFinished: views.getJustFinished(now).slice(0, 4),
    latest: views.getRecentResults(now)[0],
    podium: views.getRecentResults(now, "nacional")[0],
    highlight,
    notes,
    nextEvents: views.getUpcomingEvents(now).filter((e) => ms(eventStart(e)) >= ms(to)).slice(0, 3),
  };
}
