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

  await io.sleep(1000);
  let tcpEvents = [];
  try {
    tcpEvents = (await actcCalendar(io, "tcp")).map((c) => ({
      id: `tcp-2026-${c.round}`,
      seriesId: "tc-pista",
      round: c.round,
      name: `Fecha ${c.round} · ${c.name}`,
      circuit: { name: c.circuit, city: c.city, country: "Argentina", flag: "AR", province: c.province },
      sessions: [{ id: `tcp-2026-${c.round}-final`, kind: "final", name: "Final", start: dateOnly(2026, c.date.m, c.date.d), timeKnown: false, durationMin: 40 }],
      source: "ACTC (calendario)",
    }));
  } catch {
    tcpEvents = [];
  }

  const { playoff, regular } = wikiStandings(text);
  const standings = playoff.length ? playoff : regular;
  return {
    events: [...tcEvents, ...tcpEvents],
    standings: { tc: standings },
    meta: { tc: { standingsLabel: playoff.length ? "Copa de Oro" : "Etapa regular" } },
  };
}
