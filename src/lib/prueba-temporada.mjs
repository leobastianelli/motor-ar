// La temporada de las pruebas de recorte (snapshot*.test.mjs): la real, src/data/season-2026.json, con las categorías y los pilotos con
// ficha tal como están en el repo (se leen del texto de series.ts y drivers.ts: son TypeScript y `node --test` no los carga).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const season = JSON.parse(readFileSync(new URL("../data/season-2026.json", import.meta.url), "utf8"));
const seriesSrc = readFileSync(new URL("../data/series.ts", import.meta.url), "utf8");
const driversSrc = readFileSync(new URL("../data/drivers.ts", import.meta.url), "utf8");

export const seriesById = Object.fromEntries([...seriesSrc.matchAll(/\{ id: "([^"]+)",[^}]*?name: "([^"]+)"[^}]*?scope: "(\w+)"/g)].map(([, id, name, scope]) => [id, { id, name, scope, short: id, code: id, color: "#000", org: "" }]));
export const drivers = [...driversSrc.matchAll(/slug: "([^"]+)",\s*name: "([^"]+)",[\s\S]*?seriesId: "([^"]+)",[\s\S]*?team: "([^"]*)"/g)].map(([, slug, name, seriesId, team]) => ({ slug, name, seriesId, team }));
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const slugByName = new Map(drivers.map((d) => [norm(d.name), d.slug]));
const withArgentines = new Set(drivers.map((d) => d.seriesId));
export const tierOf = (s) => (s.scope !== "internacional" ? 1 : withArgentines.has(s.id) ? 2 : 3);
export const driversAbroad = drivers.filter((d) => seriesById[d.seriesId]?.scope === "internacional");

export const events = season.events
  .filter((e) => seriesById[e.seriesId])
  .map((e) => ({
    ...e,
    broadcasts: [{ name: "TV", kind: "tv" }],
    sessions: e.sessions.map((s) => ({ ...s, results: s.results?.map((r) => ({ ...r, gap: r.gap ?? "", driverSlug: slugByName.get(norm(r.driver)) })) })),
  }));
export const deps = { seriesById, tierOf, driversAbroad };

/** El primer lugar donde dos estructuras difieren (para que un fallo diga dónde, no vuelque 3000 líneas). */
export function primeraDiferencia(a, b, path = "") {
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return Object.is(a, b) ? null : `${path}: ${JSON.stringify(a)?.slice(0, 200)} != ${JSON.stringify(b)?.slice(0, 200)}`;
  if (Array.isArray(a) !== Array.isArray(b)) return `${path}: array vs objeto`;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const d = primeraDiferencia(a[k], b[k], `${path}.${k}`);
    if (d) return d;
  }
  return null;
}
export const igual = (recortada, entera, mensaje) => {
  const d = primeraDiferencia(recortada, entera);
  assert.equal(d, null, `${mensaje}: ${d}`);
};
