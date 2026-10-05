import { test } from "node:test";
import assert from "node:assert/strict";
import { carryRally, inActions, mergeRally, rallyOf, RALLY, RALLY_LABEL } from "./rally-refresh-core.mjs";
import { buildSeason } from "./sources/season.mjs";
import { mergeOnto } from "./sources/season-merge.mjs";
import { decodeBody } from "./season-body.mjs";
import { writeVersion } from "./season-store-write.mjs";

const AT = "2026-10-05T12:00:00Z";
const T = "2026-04-18T15:00:00Z";
const res = [{ pos: 1, driver: "A" }];
const session = (id, results) => ({ id, kind: "final", name: id, start: T, ...(results ? { results } : {}) });
const rally = (round, results) => ({ id: `${RALLY}-2026-${round}`, seriesId: RALLY, round, name: `R${round}`, sessions: [session(`${RALLY}-2026-${round}-general`, results)] });
const f1 = { id: "f1-1", seriesId: "f1", name: "GP", sessions: [session("f1-1-r", res)] };
const part = (events, errors = [], clases = { rc2: [{ pos: 1 }] }) => ({ events, standings: {}, meta: { [RALLY]: { clases }, rallyArgentino: { events: events.length, errors } } });
const base = (over = {}) => ({
  generatedAt: "g",
  events: [f1, rally(1), rally(2)],
  standings: { f1: [{ driver: "X" }] },
  meta: { f1: { v: 1 }, [RALLY]: { clases: { rc2: [{ pos: 1 }] } }, rallyArgentino: { events: 2, errors: [] } },
  failures: ["F1: algo"],
  ...over,
});

test("sin cambios y sin cambio de estado no se escribe", () => {
  const first = mergeRally(base(), part([rally(1), rally(2)]), { at: AT });
  assert.equal(first.write, true); // la primera vez no había `vercel`: es un cambio de estado
  const second = mergeRally(first.raw, part([rally(1), rally(2)]), { at: "2026-10-05T12:30:00Z" });
  assert.deepEqual([second.changed, second.flipped, second.write], [false, false, false]);
  assert.equal(second.raw, first.raw);
});

test("datos nuevos: se escribe y sólo se toca el Rally", () => {
  const b = base();
  const out = mergeRally(b, part([rally(1, res), rally(2)]), { at: AT });
  assert.deepEqual([out.changed, out.write], [true, true]);
  assert.deepEqual(out.raw.events.find((e) => e.id === "rally-argentino-2026-1").sessions[0].results, res);
  assert.deepEqual(out.raw.events.find((e) => e.seriesId === "f1"), f1);
  assert.deepEqual(out.raw.standings, b.standings);
  assert.deepEqual(out.raw.meta.f1, { v: 1 });
  assert.deepEqual(out.raw.failures, ["F1: algo"]);
  assert.deepEqual(out.raw.meta.rallyArgentino.vercel, { at: AT, ok: true, errors: [] });
});

test("nunca achica: fechas, resultados y campeonato anteriores se conservan", () => {
  const b = base({ events: [f1, rally(1, res), rally(2)] });
  const out = mergeRally(b, part([rally(1)], ["calendario: 403"], {}), { at: AT });
  const ids = out.raw.events.filter((e) => e.seriesId === RALLY).map((e) => e.id);
  assert.deepEqual(ids, ["rally-argentino-2026-1", "rally-argentino-2026-2"]);
  assert.deepEqual(out.raw.events.find((e) => e.id === "rally-argentino-2026-1").sessions[0].results, res);
  assert.ok(out.raw.failures.some((f) => f.startsWith("Rally Argentino: Se conservaron")));
});

test("estado bloqueado: se escribe una vez y no cada 30 minutos; al destrabarse vuelve a escribir", () => {
  const blocked = (b, at) => mergeRally(b, part([rally(1), rally(2)], ["calendario: 403 al pedir https://www.rallyargentino.com/"]), { at });
  const first = blocked(base(), AT);
  assert.deepEqual([first.write, first.raw.meta.rallyArgentino.vercel.ok], [true, false]);
  assert.ok(first.raw.failures.includes("Rally Argentino: calendario: 403 al pedir https://www.rallyargentino.com/"));
  const again = blocked(first.raw, "2026-10-05T12:30:00Z");
  assert.equal(again.write, false);
  const ok = mergeRally(first.raw, part([rally(1), rally(2)]), { at: "2026-10-05T13:00:00Z" });
  assert.deepEqual([ok.flipped, ok.write, ok.raw.meta.rallyArgentino.vercel.ok], [true, true, true]);
  assert.deepEqual(rallyOf(ok.raw).failures, []);
});

test("no modifica los argumentos", () => {
  const b = base();
  const copy = structuredClone(b);
  mergeRally(b, part([rally(1, res), rally(2)]), { at: AT });
  assert.deepEqual(b, copy);
});

test("carryRally copia todo el Rally de otra versión y deja el resto", () => {
  const from = base({ events: [f1, rally(1, res)], failures: ["Rally Argentino: viejo"] });
  const season = { generatedAt: "g", events: [{ ...f1, name: "nuevo" }, rally(1)], standings: { f1: [] }, meta: { f1: { v: 2 } }, failures: ["Rally Argentino: de esta corrida", "ACTC: x"] };
  const out = carryRally(season, from);
  assert.equal(out.events.find((e) => e.seriesId === "f1").name, "nuevo");
  assert.deepEqual(out.events.find((e) => e.seriesId === RALLY).sessions[0].results, res);
  assert.deepEqual(out.meta[RALLY], from.meta[RALLY]);
  assert.deepEqual(out.meta.rallyArgentino, from.meta.rallyArgentino);
  assert.deepEqual(out.failures, ["ACTC: x", "Rally Argentino: viejo"]);
});

test("inActions sólo con GITHUB_ACTIONS=true", () => {
  assert.equal(inActions({ GITHUB_ACTIONS: "true" }), true);
  assert.equal(inActions({}), false);
});

test("buildSeason con el Rally salteado no lo consulta ni anota fallas, y conserva lo de Vercel", async () => {
  const vercel = { at: AT, ok: false, errors: ["calendario: 403"] };
  const previous = base({
    events: [rally(1, res)],
    meta: { [RALLY]: { clases: { rc2: [{ pos: 1 }] } }, rallyArgentino: { events: 1, errors: ["calendario: 403"], vercel } },
    failures: ["Rally Argentino: calendario: 403"],
  });
  const urls = [];
  const fail = async (url) => {
    urls.push(url);
    throw new Error("sin red");
  };
  const io = { text: fail, bytes: fail, json: fail, wiki: fail, sleep: async () => {} };
  const out = await buildSeason(io, previous, () => {}, { skip: [RALLY_LABEL] });
  assert.ok(!urls.some((u) => /rallyargentino/.test(u)));
  assert.deepEqual(out.events.filter((e) => e.seriesId === RALLY), previous.events);
  assert.deepEqual(out.meta[RALLY], previous.meta[RALLY]);
  assert.deepEqual(out.meta.rallyArgentino, previous.meta.rallyArgentino);
  assert.deepEqual(out.failures.filter((f) => /^Rally Argentino/.test(f)), ["Rally Argentino: calendario: 403"]);
});

// `sql` falso mínimo (tabla en memoria), igual que en season-store-write.test.mjs.
const row = (id, r, origin) => ({ id, origin, body: JSON.stringify(r) });
function fakeSql(rows, before = () => {}) {
  let inserts = 0;
  return async (strings, ...values) => {
    const q = strings.join("?");
    if (q.includes("SELECT id, origin")) {
      const last = rows.at(-1);
      return last ? [{ id: last.id, origin: last.origin, createdAt: "c", body: last.body, body_br: last.body_br }] : [];
    }
    if (q.includes("INSERT INTO season_versions")) {
      before(inserts++);
      const [parent, origin, , , body_br, body] = values;
      if ((rows.at(-1)?.id ?? null) !== parent) return [];
      const id = (rows.at(-1)?.id ?? 0) + 1;
      rows.push({ id, origin, body_br, body });
      return [{ id }];
    }
    return [];
  };
}

test("carrera con la sincronización de Actions: lo que escribió Vercel sobrevive", async () => {
  const start = base();
  const rows = [row(1, start, "sync")];
  // Mientras la sincronización (que saltea el Rally) trabaja, Vercel publica la versión 2 con resultados del Rally.
  const vercel = mergeRally(start, part([rally(1, res), rally(2)]), { at: AT }).raw;
  const sql = fakeSql(rows, (n) => {
    if (n === 0) rows.push(row(2, vercel, "hot"));
  });
  const sync = { ...start, events: [{ ...f1, name: "F1 de la sync" }, rally(1), rally(2)] }; // el Rally que la sync leyó al empezar
  const reconcile = (candidate, latest) => carryRally(mergeOnto(candidate, latest), latest);
  const out = await writeVersion(sql, { raw: sync, parentId: 1, origin: "sync", reconcile });
  assert.equal(out.id, 3);
  const saved = JSON.parse(decodeBody(rows.at(-1)));
  assert.equal(saved.events.find((e) => e.seriesId === "f1").name, "F1 de la sync");
  assert.deepEqual(saved.events.find((e) => e.id === "rally-argentino-2026-1").sessions[0].results, res);
  assert.deepEqual(saved.meta.rallyArgentino.vercel, vercel.meta.rallyArgentino.vercel);
});

test("carrera inversa: Vercel escribe sobre una versión más nueva de la sincronización y no la pisa", async () => {
  const start = base();
  const rows = [row(1, start, "sync")];
  const newer = { ...start, events: [{ ...f1, name: "F1 nueva" }, rally(1), rally(2)] };
  const sql = fakeSql(rows, (n) => {
    if (n === 0) rows.push(row(2, newer, "sync"));
  });
  const mine = mergeRally(start, part([rally(1, res), rally(2)]), { at: AT }).raw;
  const reconcile = (candidate, latest) =>
    mergeRally(latest, { events: candidate.events.filter((e) => e.seriesId === RALLY), standings: {}, meta: { [RALLY]: candidate.meta[RALLY], rallyArgentino: candidate.meta.rallyArgentino } }, { at: AT }).raw;
  await writeVersion(sql, { raw: mine, parentId: 1, origin: "hot", reconcile });
  const saved = JSON.parse(decodeBody(rows.at(-1)));
  assert.equal(saved.events.find((e) => e.seriesId === "f1").name, "F1 nueva");
  assert.deepEqual(saved.events.find((e) => e.id === "rally-argentino-2026-1").sessions[0].results, res);
});
