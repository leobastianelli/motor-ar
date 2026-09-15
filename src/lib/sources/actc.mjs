// Turismo Carretera y TC Pista 2026: calendario oficial de la ACTC (actc.org.ar) + podios y Copa de Oro de Wikipedia (es).
import { dateOnly, dayMonth } from "./common.mjs";
import { intOf, section, tables } from "./wikitext.mjs";

const decode = (s) =>
  s
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();

/** Categorías de la ACTC con calendario propio, además del TC. */
export const SUPPORT = [
  { path: "tcp", seriesId: "tc-pista", prefix: "tcp", duration: 40 },
  { path: "tcm", seriesId: "tc-mouras", prefix: "tcm", duration: 35 },
  { path: "tcpm", seriesId: "tc-pista-mouras", prefix: "tcpm", duration: 30 },
  { path: "tcpk", seriesId: "tc-pick-up", prefix: "tcpk", duration: 35 },
  { path: "tcppk", seriesId: "tc-pista-pick-up", prefix: "tcppk", duration: 30 },
];

const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])([a-záéíóúñü])/g, (m, p, c) => p + c.toUpperCase());

/** Fechas del calendario oficial de una categoría de la ACTC ("tc", "tcp", ...). */
async function actcCalendar(io, category) {
  const html = await io.text(`https://actc.org.ar/${category}/calendario`, { revalidate: 6 * 3600 });
  const byRound = new Map();
  // TC titula "Fecha 1 — CALAFATE"; TC Pista sólo "El Calafate". Sin número, la fecha sale del orden del calendario.
  for (const [index, block] of html.split(/<article\b/).slice(1).entries()) {
    const title = decode(block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1] ?? "");
    const numbered = /^Fecha\s+\d+/i.test(title);
    const round = numbered ? intOf(title.replace(/^Fecha\s+/i, "")) : index + 1;
    const dateText = decode(block.match(/calendar-date-pill[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? "");
    const year = Number(dateText.match(/(\d{4})/)?.[1]);
    const dm = dayMonth(dateText);
    if (round === null || year !== 2026 || !dm || byRound.has(round)) continue;
    const place = decode(block.match(/lucide-map-pin[\s\S]*?<\/svg>\s*<span[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? "");
    const [circuit, location = ""] = place.split(/\s+[—–-]\s+/);
    const name = numbered ? (title.split(/\s+[—–-]\s+/)[1] ?? "") : title;
    byRound.set(round, {
      round,
      name: titleCase(name),
      circuit: circuit || titleCase(name),
      city: location.split(",")[0]?.trim() || titleCase(name),
      province: location.split(",")[1]?.trim() ?? "",
      date: dm,
    });
  }
  return [...byRound.values()].sort((a, b) => a.round - b.round);
}

function wikiPodiums(text) {
  const table = tables(section(text, "Calendario y resultados"))[0];
  const byRound = new Map();
  for (const r of table.rows) {
    const round = intOf(r.cells[0]?.text);
    const podium = r.cells[3]?.text?.match(/^(\d)\.º\)\s*(.+)$/);
    if (round === null || !podium) continue;
    const entry = byRound.get(round) ?? { date: r.cells[1]?.text, circuit: r.cells[2]?.text, results: [] };
    entry.results.push({ pos: Number(podium[1]), driver: podium[2].trim(), team: r.cells[4]?.text ?? "" });
    byRound.set(round, entry);
  }
  return byRound;
}

function wikiStandings(text) {
  const all = tables(section(text, "Campeonato 2026"));
  const parse = (t) =>
    t.rows
      .filter((r) => intOf(r.cells[0]?.text) !== null && r.cells[1]?.text)
      .map((r) => ({
        pos: intOf(r.cells[0].text),
        driver: r.cells[1].text,
        team: r.cells[3]?.text.replace(/\s*\(\*\)\s*$/, "") ?? "",
        points: Number.parseFloat(r.cells[4]?.text) || 0,
        wins: intOf(r.cells[5]?.text) ?? 0,
      }));
  const playoff = all.find((t) => /play-off/i.test(t.caption));
  const regular = all.find((t) => /regular/i.test(t.caption));
  return { playoff: playoff ? parse(playoff) : [], regular: regular ? parse(regular) : [] };
}

export async function actcSeason(io) {
  const text = await io.wiki("es-tc-2026");
  const podiums = wikiPodiums(text);

  let calendar = [];
  try {
    calendar = await actcCalendar(io, "tc");
  } catch {
    calendar = [];
  }
  if (calendar.length === 0) {
    calendar = [...podiums.entries()].map(([round, e]) => {
      const [, m, d] = e.date.split("-").map(Number);
      return { round, name: e.circuit, circuit: e.circuit, city: e.circuit, province: "", date: { m, d } };
    });
  }

  const tcEvents = calendar.map((c) => {
    const results = podiums.get(c.round)?.results;
    return {
      id: `tc-2026-${c.round}`,
      seriesId: "tc",
      round: c.round,
      name: `Fecha ${c.round} · ${c.name}`,
      circuit: { name: c.circuit, city: c.city, country: "Argentina", flag: "AR", province: c.province },
      sessions: [
        {
          id: `tc-2026-${c.round}-final`,
          kind: "final",
          name: "Final",
          start: dateOnly(2026, c.date.m, c.date.d),
          timeKnown: false,
          durationMin: 45,
          ...(results ? { results: [...results].sort((a, b) => a.pos - b.pos) } : {}),
        },
      ],
      source: "ACTC (calendario) · Wikipedia (podios)",
    };
  });

  // Las categorías que acompañan al TC: mismo formato de calendario en actc.org.ar.
  const others = [];
  for (const { path, seriesId, prefix, duration } of SUPPORT) {
    await io.sleep(800);
    try {
      others.push(
        ...(await actcCalendar(io, path)).map((c) => ({
          id: `${prefix}-2026-${c.round}`,
          seriesId,
          round: c.round,
          name: `Fecha ${c.round} · ${c.name}`,
          circuit: { name: c.circuit, city: c.city, country: "Argentina", flag: "AR", province: c.province },
          sessions: [{ id: `${prefix}-2026-${c.round}-final`, kind: "final", name: "Final", start: dateOnly(2026, c.date.m, c.date.d), timeKnown: false, durationMin: duration }],
          source: "ACTC (calendario)",
        })),
      );
    } catch {
      // Si un calendario no responde, esa categoría conserva sus datos anteriores (ver season.mjs).
    }
  }

  // Si un calendario dice "A confirmar", se toma la sede de otra categoría de la ACTC que corra ese mismo día.
  const byDay = new Map();
  for (const e of [...tcEvents, ...others]) {
    if (!/a\s+confirmar/i.test(`${e.name} ${e.circuit.city} ${e.circuit.name}`)) byDay.set(e.sessions[0].start.slice(0, 10), byDay.get(e.sessions[0].start.slice(0, 10)) ?? e);
  }
  for (const e of others) {
    const host = byDay.get(e.sessions[0].start.slice(0, 10));
    if (host && host !== e && /a\s+confirmar/i.test(`${e.name} ${e.circuit.city} ${e.circuit.name}`)) {
      e.circuit = { ...host.circuit };
      e.name = `Fecha ${e.round} · ${host.name.split(" · ").slice(1).join(" · ") || host.circuit.city}`;
    }
  }

  const { playoff, regular } = wikiStandings(text);
  const standings = playoff.length ? playoff : regular;
  // Última fecha con podio cargado en la misma página de Wikipedia: se actualiza junto con el campeonato, así que
  // sirve de referencia para saber hasta dónde llega la Copa de Oro una vez que ya no son sólo puntos de largada.
  const lastPodiumRound = podiums.size ? Math.max(...podiums.keys()) : undefined;
  // Hasta qué fecha llega la tabla, para no mostrarla como actual si quedó atrás (ver createSeason en data.ts):
  // - Etapa regular: una victoria por fecha, así que la suma de victorias es la cantidad de fechas incluidas.
  // - Copa de Oro con sólo los puntos de largada (bonus de la etapa regular, 15 como máximo): llega hasta la fecha 10.
  // - Copa de Oro ya con puntos de carrera: se estima con la última fecha que tiene podio cargado.
  const asOfRound = playoff.length
    ? Math.max(...playoff.map((r) => r.points)) <= 15
      ? 10
      : lastPodiumRound
    : regular.reduce((sum, r) => sum + (r.wins ?? 0), 0) || undefined;
  return {
    events: [...tcEvents, ...others],
    standings: { tc: standings },
    meta: { tc: { standingsLabel: playoff.length ? "Copa de Oro" : "Etapa regular", ...(asOfRound ? { standingsAsOfRound: asOfRound } : {}) } },
  };
}
