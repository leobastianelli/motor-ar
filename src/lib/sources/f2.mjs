// Fórmula 2 2026: horarios oficiales (fiaformula2.com) + calendario, resultados por carrera y campeonato de Wikipedia.
import { FLAGICON_ISO, dateOnly, dayMonth, resultsFromStandings } from "./common.mjs";
import { biggest, flagOf, intOf, section, tables } from "./wikitext.mjs";

const OFFICIAL = "https://www.fiaformula2.com/en/racing/2026";
const OFFICIAL_SESSIONS = [
  ["Practice", "practica", "Práctica"],
  ["Qualifying", "clasificacion", "Clasificación"],
  ["Sprint Race", "sprint", "Carrera sprint"],
  ["Feature Race", "carrera", "Carrera principal"],
];
const titleCase = (slug) => slug.replace(/-/g, " ").replace(/(^|\s)\S/g, (m) => m.toUpperCase());

/** Horarios por fecha desde los datos estructurados (JSON-LD) de cada página oficial. */
export async function officialSchedule(io) {
  const list = await io.text(OFFICIAL, { revalidate: 86400 });
  const slugs = [...new Set([...list.matchAll(/href="\/en\/racing\/2026\/([a-z-]+)"/g)].map((m) => m[1]))];
  const rounds = [];
  for (const slug of slugs) {
    const html = await io.text(`${OFFICIAL}/${slug}`, { revalidate: 6 * 3600 });
    // Los datos estructurados nombran "Race" a las dos carreras: la primera es la sprint y la segunda la principal.
    const ordered = [];
    for (const m of html.matchAll(/"@id":"https:\/\/www\.fiaformula2\.com\/en\/racing\/2026\/[a-z-]+#[^"]*","name":"([^"]+?) - [^"]*"/g)) {
      const found = html.slice(m.index, m.index + 900).match(/"startDate":"([^"]+T[^"]+)","endDate":"([^"]+)"/);
      if (found) ordered.push({ name: m[1], start: found[1], end: found[2] });
    }
    const sessions = new Map();
    let races = 0;
    for (const s of ordered) {
      const key = s.name === "Race" ? (races++ === 0 ? "Sprint Race" : "Feature Race") : s.name;
      if (!sessions.has(key)) sessions.set(key, { start: s.start, end: s.end });
    }
    // Fechas futuras sin cronograma publicado traen horarios de relleno (práctica y clasificación a la misma hora).
    const placeholder = sessions.get("Practice")?.start && sessions.get("Practice").start === sessions.get("Qualifying")?.start;
    if (sessions.has("Feature Race") && !placeholder) rounds.push({ slug, city: titleCase(slug), sessions });
    await io.sleep(250);
  }
  return rounds;
}

export async function f2Season(io) {
  const text = await io.wiki("en-f2-2026");

  const teamOf = new Map();
  const argentines = new Set();
  for (const r of tables(section(text, "Entries"))[0].rows) {
    const cells = r.cells.map((c) => c.text);
    if (cells.length >= 4 && intOf(cells[1]) !== null && cells[2]) teamOf.set(cells[2], { team: cells[0], number: intOf(cells[1]) });
    if (cells[2] && flagOf(r.cells[2]?.raw ?? "") === "ARG") argentines.add(cells[2]);
  }

  const calendar = tables(section(text, "Race calendar"))[0]
    .rows.filter((r) => intOf(r.cells[0]?.text) !== null && r.cells.length >= 4)
    .map((r) => {
      const cell = r.cells[1].text;
      const comma = cell.indexOf(",");
      return {
        round: intOf(r.cells[0].text),
        circuitName: comma === -1 ? cell : cell.slice(0, comma).trim(),
        city: comma === -1 ? cell : cell.slice(comma + 1).split(",")[0].trim(),
        flag: FLAGICON_ISO[flagOf(r.cells[1].raw)] ?? "",
        sprint: dayMonth(r.cells[2].text),
        feature: dayMonth(r.cells[3].text),
      };
    });

  const table = biggest(tables(section(text, "Drivers' Championship standings")));
  const rows = table.rows
    .filter((r) => intOf(r.cells[0]?.text) !== null && r.cells[1]?.text)
    .map((r) => ({ pos: intOf(r.cells[0].text), driver: r.cells[1].text, results: r.cells.slice(2, -1).map((c) => c.text), points: Number.parseFloat(r.cells.at(-1).text) || 0 }));
  const perRace = resultsFromStandings(rows, calendar.length * 2, (d) => teamOf.get(d)?.team ?? "");
  // Hasta qué fecha llega la tabla de campeonato: cuántas columnas (sprint + principal) tienen algún resultado
  // cargado, cada dos una fecha. Sirve para no mostrarla como actual si el campeonato de Wikipedia quedó atrás
  // de los resultados oficiales de cada sesión (ver createSeason en data.ts).
  const standingsAsOfRound = Math.floor(perRace.filter((list) => list.length > 0).length / 2);

  let official = [];
  try {
    official = await officialSchedule(io);
  } catch {
    official = [];
  }
  const sameDay = (iso, dm) => {
    const d = new Date(iso);
    return d.getUTCDate() === dm.d && d.getUTCMonth() + 1 === dm.m;
  };

  const events = calendar.map((c) => {
    const i = (c.round - 1) * 2;
    const results = { sprint: perRace[i], carrera: perRace[i + 1] };
    const match = official.find((o) => o.sessions.get("Feature Race") && c.feature && sameDay(o.sessions.get("Feature Race").start, c.feature));
    const withResults = (kind) => (results[kind]?.length ? { results: results[kind] } : {});

    const sessions = match
      ? OFFICIAL_SESSIONS.filter(([key]) => match.sessions.has(key)).map(([key, kind, name]) => {
          const s = match.sessions.get(key);
          return {
            id: `f2-2026-${c.round}-${kind}`,
            kind,
            name,
            start: s.start,
            timeKnown: true,
            durationMin: Math.max(1, Math.round((new Date(s.end) - new Date(s.start)) / 60000)),
            ...withResults(kind),
          };
        })
      : [
          { id: `f2-2026-${c.round}-sprint`, kind: "sprint", name: "Carrera sprint", start: dateOnly(2026, c.sprint.m, c.sprint.d), timeKnown: false, durationMin: 45, ...withResults("sprint") },
          { id: `f2-2026-${c.round}-carrera`, kind: "carrera", name: "Carrera principal", start: dateOnly(2026, c.feature.m, c.feature.d), timeKnown: false, durationMin: 65, ...withResults("carrera") },
        ];

    const city = match?.city ?? c.city;
    return {
      id: `f2-2026-${c.round}`,
      seriesId: "f2",
      round: c.round,
      name: city,
      circuit: { name: c.circuitName, city, country: "", flag: c.flag },
      // Nombre corto de la sede en los sitios oficiales (fiaformula2.com y fia.com usan el mismo).
      ...(match ? { venueSlug: match.slug } : {}),
      sessions,
      source: match ? "FIA Formula 2 (horarios) · FIA y Wikipedia (resultados)" : "Wikipedia · 2026 Formula 2 Championship",
    };
  });

  const standings = rows.map((r) => ({ pos: r.pos, driver: r.driver, team: teamOf.get(r.driver)?.team ?? "", points: r.points }));
  return {
    events,
    standings: { f2: standings },
    meta: { f2: { officialTimes: official.length, argentines: [...argentines], ...(standingsAsOfRound ? { standingsAsOfRound } : {}) } },
  };
}
