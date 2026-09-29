// Fórmula 2 2026: horarios oficiales (fiaformula2.com) + calendario, resultados por carrera y campeonato de Wikipedia.
import { FLAGICON_ISO, dateOnly, dayMonth, resultsFromStandings } from "./common.mjs";
import { biggest, flagOf, intOf, section, tables } from "./wikitext.mjs";

const OFFICIAL = "https://www.fiaformula2.com/en/racing/2026";
/** Sesión oficial → [tipo, nombre, sufijo del id]. Baku 2026 tuvo dos clasificaciones y dos carreras principales. */
const OFFICIAL_SESSIONS = {
  Practice: ["practica", "Práctica", "practica"],
  Qualifying: ["clasificacion", "Clasificación", "clasificacion"],
  "Qualifying 1": ["clasificacion", "Clasificación 1", "clasificacion-1"],
  "Qualifying 2": ["clasificacion", "Clasificación 2", "clasificacion-2"],
  "Sprint Race": ["sprint", "Carrera sprint", "sprint"],
  "Feature Race": ["carrera", "Carrera principal", "carrera"],
  "Feature Race 2": ["carrera", "Carrera principal 2", "carrera-2"],
};
const titleCase = (slug) => slug.replace(/-/g, " ").replace(/(^|\s)\S/g, (m) => m.toUpperCase());

/**
 * Sesiones de una fecha desde los datos estructurados (JSON-LD) de su página oficial, en orden: Map nombre → { start, end }.
 * Los datos nombran "Qualifying" a toda clasificación y "Race" a toda carrera: si hay dos clasificaciones con tres carreras se numeran, y de las carreras
 * la primera es la sprint y las siguientes, las principales ("Feature Race", "Feature Race 2").
 */
export function parseOfficialSchedule(html) {
  const ordered = [];
  for (const m of html.matchAll(/"@id":"https:\/\/www\.fiaformula2\.com\/en\/racing\/2026\/[a-z-]+#[^"]*","name":"([^"]+?) - [^"]*"/g)) {
    const found = html.slice(m.index, m.index + 900).match(/"startDate":"([^"]+T[^"]+)","endDate":"([^"]+)"/);
    if (found) ordered.push({ name: m[1], start: found[1], end: found[2] });
  }
  const qualis = ordered.filter((s) => s.name === "Qualifying");
  // Dos clasificaciones con clasificación propia sólo si alimentan grillas distintas (Baku 2026: tres carreras). Con dos carreras son grupos de
  // una misma clasificación (Mónaco: grupos A y B, una sola clasificación combinada) y se muestran como una sola sesión.
  const split = qualis.length > 1 && ordered.filter((s) => s.name === "Race").length >= 3;
  const sessions = new Map();
  let races = 0;
  let quali = 0;
  for (const s of ordered) {
    let key = s.name;
    let slot = { start: s.start, end: s.end };
    if (s.name === "Race") key = races++ === 0 ? "Sprint Race" : races === 2 ? "Feature Race" : `Feature Race ${races - 1}`;
    else if (s.name === "Qualifying" && split) key = `Qualifying ${++quali}`;
    else if (s.name === "Qualifying" && qualis.length > 1) slot = { start: qualis[0].start, end: qualis.at(-1).end };
    if (OFFICIAL_SESSIONS[key] && !sessions.has(key)) sessions.set(key, slot);
  }
  return sessions;
}

/** Horarios por fecha desde la página oficial de cada una. */
export async function officialSchedule(io) {
  const list = await io.text(OFFICIAL, { revalidate: 86400 });
  const slugs = [...new Set([...list.matchAll(/href="\/en\/racing\/2026\/([a-z-]+)"/g)].map((m) => m[1]))];
  const rounds = [];
  for (const slug of slugs) {
    const sessions = parseOfficialSchedule(await io.text(`${OFFICIAL}/${slug}`, { revalidate: 6 * 3600 }));
    // Fechas futuras sin cronograma publicado traen horarios de relleno (práctica y clasificación a la misma hora).
    const firstQuali = sessions.get("Qualifying") ?? sessions.get("Qualifying 1");
    const placeholder = sessions.get("Practice")?.start && sessions.get("Practice").start === firstQuali?.start;
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
  // Wikipedia fecha la ronda por la carrera principal; si hubo dos (Baku 2026), puede ser el día de cualquiera de ellas.
  const matchOf = (c) =>
    official.find((o) => ["Feature Race", "Feature Race 2"].some((key) => o.sessions.get(key) && c.feature && sameDay(o.sessions.get(key).start, c.feature)));

  // La tabla de campeonato tiene una columna por carrera, en orden. Una fecha con dos carreras principales (Baku 2026) ocupa tres columnas, no dos:
  // si se contaran dos por fecha, las columnas de todas las fechas siguientes quedarían corridas y los resultados de una carrera ya corrida
  // aparecerían en una que todavía no se corrió.
  const columns = new Map();
  let nextColumn = 0;
  for (const c of [...calendar].sort((a, b) => a.round - b.round)) {
    const extra = matchOf(c)?.sessions.has("Feature Race 2") ? 1 : 0;
    columns.set(c.round, { first: nextColumn });
    nextColumn += 2 + extra;
  }
  const perRace = resultsFromStandings(rows, nextColumn, (d) => teamOf.get(d)?.team ?? "");
  // Hasta qué fecha llega la tabla de campeonato: cuántas fechas (sprint + principal) tienen algún resultado
  // cargado. Sirve para no mostrarla como actual si el campeonato de Wikipedia quedó atrás
  // de los resultados oficiales de cada sesión (ver createSeason en data.ts).
  const standingsAsOfRound = [...columns.values()].filter(({ first }) => perRace[first]?.length && perRace[first + 1]?.length).length;

  const events = calendar.map((c) => {
    const i = columns.get(c.round).first;
    // La tercera columna de una fecha con dos principales (carrera-2) no se asigna: sus resultados oficiales los trae fia-f2.mjs.
    const results = { sprint: perRace[i], carrera: perRace[i + 1] };
    const match = matchOf(c);
    const withResults = (kind) => (results[kind]?.length ? { results: results[kind] } : {});

    const sessions = match
      ? [...match.sessions].map(([key, s]) => {
          const [kind, name, suffix] = OFFICIAL_SESSIONS[key];
          return {
            id: `f2-2026-${c.round}-${suffix}`,
            kind,
            name,
            start: s.start,
            timeKnown: true,
            durationMin: Math.max(1, Math.round((new Date(s.end) - new Date(s.start)) / 60000)),
            // Wikipedia trae una sprint y una principal por ronda: sus resultados van a la primera de cada tipo.
            ...(suffix === kind ? withResults(kind) : {}),
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
