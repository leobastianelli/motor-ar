// Índice de pilotos argentinos que aparecen en los resultados: identidad estable (dirección, nombre, categorías, número, equipo).
// Se guarda en el repo con cada sincronización y nunca borra a nadie, aunque una fuente deje de publicar a un piloto.

/** Categorías nacionales: todos sus pilotos entran al índice. En las internacionales, sólo los marcados como argentinos. */
export const NATIONAL_SERIES = new Set(["tc", "tc-pista", "tc-mouras", "tc-pista-mouras", "tc-pick-up", "tc-pista-pick-up", "tn", "tc2000"]);

const MAKES = ["chevrolet", "chev", "ford", "mustang", "toyota", "torino", "dodge", "camaro", "challenger", "mercedes", "benz", "bmw", "fiat", "ram", "volkswagen", "vw", "peugeot", "honda", "renault"];
const fold = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Nombre sin agregados de la fuente: penalizaciones "(+0.6s)", abreviaturas con punto ("Chev.", "F.mustang", "N.r.p.")
 * y marcas pegadas ("Ttoyota"). Las iniciales ("Juan B. De Benedictis") se conservan.
 */
export function cleanDriverName(name) {
  const words = String(name)
    .replace(/\([^)]*\)/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !(w.includes(".") && w.replace(/\./g, "").length >= 2))
    .filter((w) => {
      const f = fold(w).replace(/[^a-z]/g, "");
      return !MAKES.some((m) => f === m || (f.length <= m.length + 2 && f.length > m.length && f.endsWith(m)));
    });
  return words.join(" ").trim();
}

export const driverKey = (name) => fold(cleanDriverName(name)).replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean).sort().join(" ");
const letters = (key) => [...key.replace(/\s/g, "")].sort().join("");
const slugify = (name) => fold(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const hasAccent = (s) => /[^\x00-\x7f]/.test(s);

/** Cuál variante del nombre mostrar: con acentos, sin restos raros y la más usada. */
const score = (d) => (hasAccent(d.name) ? 1000 : 0) + (/\b[a-z]\b/i.test(d.name.replace(/\b[A-Z]\.?\s/g, "")) ? 0 : 100) + d.count;

export function buildDriverIndex(season, previous) {
  const byKey = new Map();
  for (const d of previous?.drivers ?? []) for (const key of d.keys ?? [d.key]) byKey.set(key, { ...d, key, keys: [key], count: 0, series: [...d.series], numbers: { ...d.numbers }, teams: { ...d.teams } });
  const abroad = new Map([
    ["f2", new Set((season.meta?.f2?.argentines ?? []).map(driverKey))],
    ["gt3", new Set((season.meta?.gt3?.argentines ?? []).map(driverKey))],
  ]);

  const seen = (rawName, seriesId, row, day) => {
    const name = cleanDriverName(rawName);
    const key = driverKey(name);
    if (key.split(" ").length < 2) return;
    let d = byKey.get(key);
    if (!d) {
      d = { key, keys: [key], slug: slugify(name), name, count: 0, series: [], numbers: {}, teams: {}, firstSeen: day, lastSeen: day };
      byKey.set(key, d);
    }
    d.count++;
    if (hasAccent(name) && !hasAccent(d.name)) d.name = name;
    if (!d.series.includes(seriesId)) d.series.push(seriesId);
    if (row.number) d.numbers[seriesId] = row.number;
    if (row.team) d.teams[seriesId] = row.team;
    if (day > d.lastSeen) d.lastSeen = day;
    if (day < d.firstSeen) d.firstSeen = day;
  };

  const events = [...season.events].sort((a, b) => a.sessions[0].start.localeCompare(b.sessions[0].start));
  for (const event of events) {
    const national = NATIONAL_SERIES.has(event.seriesId);
    const argentines = abroad.get(event.seriesId);
    if (!national && !argentines?.size) continue;
    for (const session of event.sessions) {
      const day = session.start.slice(0, 10);
      for (const row of session.results ?? []) {
        if (national && !row.driver.includes(" / ")) seen(row.driver, event.seriesId, row, day);
        else if (argentines) {
          for (const part of row.driver.split(" / ")) {
            if (argentines.has(driverKey(part))) seen(part, event.seriesId, { team: row.team, number: row.driver.includes(" / ") ? undefined : row.number }, day);
          }
        }
      }
    }
  }

  // Unificación de variantes del mismo piloto: mismas letras ("Pal Azzo" / "Palazzo"), o mismo número en la misma
  // categoría compartiendo una palabra del nombre ("Juan T Catalan Magni" / "Juan Tomás Catalán Magni").
  const entries = [...byKey.values()];
  const parent = new Map(entries.map((d) => [d.key, d.key]));
  const find = (k) => (parent.get(k) === k ? k : (parent.set(k, find(parent.get(k))), parent.get(k)));
  const union = (a, b) => parent.set(find(a), find(b));
  const byLetters = new Map();
  for (const d of entries) {
    const l = letters(d.key);
    if (byLetters.has(l)) union(d.key, byLetters.get(l));
    else byLetters.set(l, d.key);
  }
  const byNumber = new Map();
  for (const d of entries) for (const [sid, n] of Object.entries(d.numbers)) byNumber.set(`${sid}#${n}`, [...(byNumber.get(`${sid}#${n}`) ?? []), d]);
  for (const group of byNumber.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = new Set(group[i].key.split(" ").filter((t) => t.length >= 4));
        if (group[j].key.split(" ").some((t) => t.length >= 4 && a.has(t))) union(group[i].key, group[j].key);
      }
    }
  }

  const merged = new Map();
  for (const d of entries) {
    const root = find(d.key);
    const list = merged.get(root) ?? [];
    list.push(d);
    merged.set(root, list);
  }

  const drivers = [];
  const slugs = new Set();
  for (const list of merged.values()) {
    const best = [...list].sort((a, b) => score(b) - score(a))[0];
    let slug = slugify(best.name);
    for (let n = 2; slugs.has(slug); n++) slug = `${slugify(best.name)}-${n}`;
    slugs.add(slug);
    const byRecent = [...list].sort((a, b) => a.lastSeen.localeCompare(b.lastSeen));
    drivers.push({
      key: best.key,
      keys: [...new Set(list.flatMap((d) => d.keys ?? [d.key]))],
      slug,
      name: best.name,
      aliases: [...new Set(list.map((d) => d.name).filter((n) => n !== best.name))],
      series: [...new Set(list.flatMap((d) => d.series))],
      numbers: Object.assign({}, ...byRecent.map((d) => d.numbers)),
      teams: Object.assign({}, ...byRecent.map((d) => d.teams)),
      firstSeen: list.map((d) => d.firstSeen).sort()[0],
      lastSeen: list.map((d) => d.lastSeen).sort().at(-1),
    });
  }
  drivers.sort((a, b) => a.name.localeCompare(b.name, "es"));
  return { generatedAt: new Date().toISOString(), drivers };
}
