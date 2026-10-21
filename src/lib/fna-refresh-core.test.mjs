import { test } from "node:test";
import assert from "node:assert/strict";
import { carryFna, fnaOf, fnaRefresh, FNA, FNA_LABEL, mergeFna } from "./fna-refresh-core.mjs";
import { carryPcSeries, PC_LABELS } from "./pc-series.mjs";
import { RALLY } from "./rally-refresh-core.mjs";
import { AUTOMATIC_SERIES, fnaLocalSyncDue, healthReport, noResultsReason, pendingSessions, recentWinners, sourceFailed } from "./salud-core.mjs";
import { buildSeason } from "./sources/season.mjs";
import { mergeOnto } from "./sources/season-merge.mjs";
import { decodeBody } from "./season-body.mjs";
import { writeVersion } from "./season-store-write.mjs";

const AT = "2026-11-02T12:00:00Z";
const T = "2026-10-11T15:00:00Z";
const res = [{ pos: 1, driver: "A" }];
const session = (id, results, extra = {}) => ({ id, kind: "carrera", name: id, start: T, durationMin: 25, ...(results ? { results } : {}), ...extra });
const fna = (round, results, extra = {}) => ({ id: `${FNA}-2026-${round}`, seriesId: FNA, round, name: `Fecha ${round}`, sessions: [session(`${FNA}-2026-${round}-r`, results, extra)] });
const f1 = { id: "f1-1", seriesId: "f1", name: "GP", sessions: [session("f1-1-r", res)] };
const part = (events, errors = [], standings = { [FNA]: [{ pos: 1, driver: "A", points: 10 }] }) => ({
  events,
  standings,
  meta: { [FNA]: { standingsLabel: "Pilotos", standingsAsOfRound: 7 }, formulaNacional: { events: events.length, errors } },
});
const base = (over = {}) => ({
  generatedAt: "g",
  events: [f1, fna(1), fna(2)],
  standings: { f1: [{ driver: "X" }] },
  meta: { f1: { v: 1 }, [FNA]: { standingsLabel: "Pilotos" }, formulaNacional: { events: 2, errors: [] } },
  failures: ["F1: algo"],
  ...over,
});

test("sin cambios y sin cambio de estado no se escribe", () => {
  const first = mergeFna(base(), part([fna(1), fna(2)]), { at: AT });
  assert.equal(first.write, true); // la primera vez no había `pc`: es un cambio de estado
  const second = mergeFna(first.raw, part([fna(1), fna(2)]), { at: "2026-11-02T12:30:00Z" });
  assert.deepEqual([second.changed, second.flipped, second.write], [false, false, false]);
  assert.equal(second.raw, first.raw);
});

test("datos nuevos: se escribe y sólo se toca la Fórmula Nacional (eventos, campeonato y meta)", () => {
  const b = base();
  const out = mergeFna(b, part([fna(1, res), fna(2)]), { at: AT });
  assert.deepEqual([out.changed, out.write], [true, true]);
  assert.deepEqual(out.raw.events.find((e) => e.id === "formula-nacional-2026-1").sessions[0].results, res);
  assert.deepEqual(out.raw.events.find((e) => e.seriesId === "f1"), f1);
  assert.deepEqual(out.raw.standings.f1, b.standings.f1);
  assert.equal(out.raw.standings[FNA][0].driver, "A");
  assert.equal(out.raw.meta[FNA].standingsAsOfRound, 7);
  assert.deepEqual(out.raw.meta.f1, { v: 1 });
  assert.deepEqual(out.raw.failures, ["F1: algo"]);
  assert.deepEqual(out.raw.meta.formulaNacional.pc, { at: AT, ok: true, errors: [] });
});

test("nunca achica: fechas, resultados y campeonato anteriores se conservan", () => {
  const b = base({ events: [f1, fna(1, res), fna(2)], standings: { f1: [], [FNA]: [{ pos: 1, driver: "A", points: 10 }, { pos: 2, driver: "B", points: 5 }] } });
  const out = mergeFna(b, part([fna(1)], ["campeonato: HTTP 500"], {}), { at: AT });
  assert.deepEqual(out.raw.events.filter((e) => e.seriesId === FNA).map((e) => e.id), ["formula-nacional-2026-1", "formula-nacional-2026-2"]);
  assert.deepEqual(out.raw.events.find((e) => e.id === "formula-nacional-2026-1").sessions[0].results, res);
  assert.equal(out.raw.standings[FNA].length, 2);
  assert.ok(out.raw.failures.some((f) => f.startsWith("Fórmula Nacional: Se conservaron")));
  assert.ok(out.raw.failures.includes("Fórmula Nacional: campeonato: HTTP 500"));
});

test("estado bloqueado: se escribe una vez y no cada corrida; al destrabarse vuelve a escribir y limpia las fallas", () => {
  const blocked = (b, at) => mergeFna(b, part([fna(1), fna(2)], ["calendario: HTTP 403"]), { at });
  const first = blocked(base(), AT);
  assert.deepEqual([first.write, first.raw.meta.formulaNacional.pc.ok], [true, false]);
  assert.ok(first.raw.failures.includes("Fórmula Nacional: calendario: HTTP 403"));
  assert.equal(blocked(first.raw, "2026-11-02T12:30:00Z").write, false);
  const ok = mergeFna(first.raw, part([fna(1), fna(2)]), { at: "2026-11-02T13:00:00Z" });
  assert.deepEqual([ok.flipped, ok.write, ok.raw.meta.formulaNacional.pc.ok], [true, true, true]);
  assert.deepEqual(fnaOf(ok.raw).failures, []);
});

test("no modifica los argumentos y no toca el Rally ni sus fallas", () => {
  const rally = { id: "rally-argentino-2026-1", seriesId: RALLY, round: 1, name: "R1", sessions: [session("rally-argentino-2026-1-general", res)] };
  const b = base({ events: [f1, rally, fna(1)], meta: { ...base().meta, [RALLY]: { clases: {} }, rallyArgentino: { events: 1, errors: [] } }, failures: ["Rally Argentino: viejo"] });
  const copy = structuredClone(b);
  const out = mergeFna(b, part([fna(1, res)]), { at: AT });
  assert.deepEqual(b, copy);
  assert.deepEqual(out.raw.events.find((e) => e.seriesId === RALLY), rally);
  assert.deepEqual(out.raw.meta.rallyArgentino, { events: 1, errors: [] });
  assert.deepEqual(out.raw.failures, ["Rally Argentino: viejo"]);
});

test("carryFna copia toda la Fórmula Nacional de otra versión y deja el resto; carryPcSeries hace lo mismo con las dos categorías", () => {
  const from = base({ events: [f1, fna(1, res)], failures: ["Fórmula Nacional: viejo", "Rally Argentino: viejo del rally"] });
  const season = { generatedAt: "g", events: [{ ...f1, name: "nuevo" }, fna(1)], standings: { f1: [] }, meta: { f1: { v: 2 } }, failures: ["Fórmula Nacional: de esta corrida", "ACTC: x"] };
  const out = carryFna(season, from);
  assert.equal(out.events.find((e) => e.seriesId === "f1").name, "nuevo");
  assert.deepEqual(out.events.find((e) => e.seriesId === FNA).sessions[0].results, res);
  assert.deepEqual(out.meta[FNA], from.meta[FNA]);
  assert.deepEqual(out.meta.formulaNacional, from.meta.formulaNacional);
  assert.deepEqual(out.failures, ["ACTC: x", "Fórmula Nacional: viejo"]);
  const both = carryPcSeries(season, from);
  assert.deepEqual(both.failures, ["ACTC: x", "Rally Argentino: viejo del rally", "Fórmula Nacional: viejo"]);
});

test("buildSeason en Actions (Rally y Fórmula Nacional salteados) no pide esos sitios ni anota fallas, y conserva lo de la PC", async () => {
  const pc = { at: AT, ok: false, errors: ["calendario: HTTP 403"] };
  const previous = base({
    events: [fna(1, res)],
    meta: { [FNA]: { standingsLabel: "Pilotos", standingsAsOfRound: 6 }, formulaNacional: { events: 1, errors: ["calendario: HTTP 403"], pc } },
    failures: ["Fórmula Nacional: calendario: HTTP 403"],
  });
  const urls = [];
  const fail = async (url) => {
    urls.push(url);
    throw new Error("sin red");
  };
  const io = { text: fail, bytes: fail, json: fail, wiki: fail, sleep: async () => {} };
  const out = await buildSeason(io, previous, () => {}, { skip: PC_LABELS });
  assert.ok(!urls.some((u) => /formulanacional|rallyargentino/.test(u)));
  assert.deepEqual(out.events.filter((e) => e.seriesId === FNA), previous.events);
  assert.deepEqual(out.meta[FNA], previous.meta[FNA]);
  assert.deepEqual(out.meta.formulaNacional, previous.meta.formulaNacional);
  assert.deepEqual(out.failures.filter((f) => /^Fórmula Nacional/.test(f)), ["Fórmula Nacional: calendario: HTTP 403"]);
  // Sin saltearla (corrida local) sí se pide, y una falla de la fuente queda anotada.
  const local = await buildSeason(io, base({ events: [fna(1, res)] }), () => {}, { skip: [] });
  assert.ok(urls.some((u) => /formulanacional/.test(u)));
  assert.ok(local.failures.some((f) => /^Fórmula Nacional: /.test(f)));
});

// `sql` falso mínimo (tabla en memoria), igual que en rally-refresh-core.test.mjs.
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

test("publicar desde la PC: arma la versión sobre el almacén y toca sólo la Fórmula Nacional", async () => {
  const start = base();
  const rows = [row(1, start, "sync")];
  const result = fnaRefresh.merge(start, part([fna(1, res), fna(2)]), { at: AT });
  const out = await writeVersion(fakeSql(rows), { raw: result.raw, parentId: 1, origin: "sync", reconcile: fnaRefresh.reconcile(AT) });
  assert.equal(out.id, 2);
  const saved = JSON.parse(decodeBody(rows.at(-1)));
  assert.deepEqual(saved.events.find((e) => e.id === "formula-nacional-2026-1").sessions[0].results, res);
  assert.deepEqual(saved.events.find((e) => e.seriesId === "f1"), f1);
  assert.equal(saved.meta.formulaNacional.pc.ok, true);
  // Una segunda corrida idéntica no escribe nada.
  const again = fnaRefresh.merge(saved, part([fna(1, res), fna(2)]), { at: "2026-11-02T12:30:00Z" });
  assert.equal(again.write, false);
});

test("carrera con la sincronización de Actions: lo que escribió la PC sobrevive", async () => {
  const start = base();
  const rows = [row(1, start, "sync")];
  // Mientras la sincronización (que saltea la Fórmula Nacional) trabaja, la PC publica la versión 2 con resultados.
  const pc = mergeFna(start, part([fna(1, res), fna(2)]), { at: AT }).raw;
  const sql = fakeSql(rows, (n) => {
    if (n === 0) rows.push(row(2, pc, "sync"));
  });
  const sync = { ...start, events: [{ ...f1, name: "F1 de la sync" }, fna(1), fna(2)] }; // lo que la sync leyó al empezar
  const reconcile = (candidate, latest) => carryPcSeries(mergeOnto(candidate, latest), latest);
  const out = await writeVersion(sql, { raw: sync, parentId: 1, origin: "sync", reconcile });
  assert.equal(out.id, 3);
  const saved = JSON.parse(decodeBody(rows.at(-1)));
  assert.equal(saved.events.find((e) => e.seriesId === "f1").name, "F1 de la sync");
  assert.deepEqual(saved.events.find((e) => e.id === "formula-nacional-2026-1").sessions[0].results, res);
  assert.deepEqual(saved.meta.formulaNacional.pc, pc.meta.formulaNacional.pc);
});

test("carrera inversa: la PC escribe sobre una versión más nueva de la sincronización y no la pisa", async () => {
  const start = base();
  const rows = [row(1, start, "sync")];
  const newer = { ...start, events: [{ ...f1, name: "F1 nueva" }, fna(1), fna(2)] };
  const sql = fakeSql(rows, (n) => {
    if (n === 0) rows.push(row(2, newer, "sync"));
  });
  const mine = mergeFna(start, part([fna(1, res), fna(2)]), { at: AT }).raw;
  await writeVersion(sql, { raw: mine, parentId: 1, origin: "sync", reconcile: fnaRefresh.reconcile(AT) });
  const saved = JSON.parse(decodeBody(rows.at(-1)));
  assert.equal(saved.events.find((e) => e.seriesId === "f1").name, "F1 nueva");
  assert.deepEqual(saved.events.find((e) => e.id === "formula-nacional-2026-1").sessions[0].results, res);
  assert.equal(saved.meta.formulaNacional.pc.ok, true);
});

// ----------------------------------------------------------------------------------------------------- salud
const ses = (kind, start, extra = {}) => ({ id: `${kind}-${start}`, kind, name: kind, start, durationMin: 25, ...extra });
const ev = (round, sessions) => ({ id: `formula-nacional-2026-${round}`, seriesId: FNA, round, name: `Fecha ${round}`, sessions });
const now = "2026-11-02T12:00:00-03:00";

test("Fórmula Nacional pendiente: avisa la fecha terminada sin resultados; no la reciente, la cargada ni la de otra categoría", () => {
  const sin = ev(8, [ses("carrera", "2026-10-31T17:00:00-03:00"), ses("carrera", "2026-11-01T11:00:00-03:00")]);
  const cargada = ev(7, [ses("carrera", "2026-10-31T17:00:00-03:00", { results: [{ pos: 1 }] })]);
  const reciente = ev(9, [ses("carrera", "2026-11-02T10:00:00-03:00")]);
  const sinHora = ev(6, [ses("carrera", "2026-10-31T12:00:00-03:00", { timeKnown: false })]);
  const ilegible = ev(5, [ses("carrera", "2026-10-31T17:00:00-03:00", { resultsUnread: true })]);
  const out = fnaLocalSyncDue([sin, cargada, reciente, sinHora, ilegible, { ...sin, id: "tc-1", seriesId: "tc" }], now);
  assert.deepEqual(out.map((r) => [r.fecha, r.motivo]), [[8, "sin-resultados"], [6, "sin-resultados"]]);
  assert.equal(fnaLocalSyncDue([sin], "2026-12-01T12:00:00-03:00").length, 0); // pasadas las 3 semanas ya no se insiste
  assert.deepEqual(healthReport({ source: {}, stored: null, events: [sin], now }).fnaPendiente.map((r) => r.fecha), [8]);
});

test("la Fórmula Nacional ya no cuenta como automática: no hay 'pendiente' en falso ni falla de fuente que la mire", () => {
  assert.ok(!AUTOMATIC_SERIES.has(FNA));
  const sin = ev(8, [ses("carrera", "2026-11-02T08:00:00-03:00")]);
  assert.deepEqual(pendingSessions([sin], now), []);
  assert.deepEqual(recentWinners([ev(8, [ses("carrera", "2026-11-02T08:00:00-03:00", { results: [{ pos: 1, driver: "A" }] })])], now), []);
  assert.equal(noResultsReason(sin.sessions[0], FNA, [], now), "Resultados sin cargar todavía");
  assert.equal(sourceFailed(FNA, [`${FNA_LABEL}: calendario: HTTP 403`]), false);
});
