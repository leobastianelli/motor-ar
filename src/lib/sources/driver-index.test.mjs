import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDriverIndex } from "./driver-index.mjs";

const entry = (name, key, keys, slug, extra = {}) => ({ key, keys, slug, name, aliases: [], series: ["tn"], numbers: { tn: "79" }, teams: { tn: "Peugeot 208" }, firstSeen: "2026-02-07", lastSeen: "2026-08-30", ...extra });
const season = (...drivers) => ({
  events: [{ seriesId: "tn", sessions: [{ start: "2026-09-20T15:00:00-03:00", results: drivers.map(([driver, number], i) => ({ pos: i + 1, driver, number, team: "" })) }] }],
  meta: {},
});
const bySlug = (index) => new Map(index.drivers.map((d) => [d.slug, d]));

test("un nombre guardado con acentos rotos se repara y se une con el piloto que ya estaba bien", () => {
  const previous = {
    drivers: [
      entry("Andrã‰s Calderã“n", "andra caldera n s", ["andra caldera n s"], "andra-s-caldera-n"),
      entry("Andres Calderon", "andres calderon", ["andres calderon"], "andres-calderon", { lastSeen: "2026-09-20" }),
    ],
  };
  const index = buildDriverIndex(season(["Andres Calderon", "79"]), previous);
  assert.equal(index.drivers.length, 1, "no quedan dos fichas del mismo piloto");
  const [d] = index.drivers;
  assert.equal(d.name, "Andrés Calderón");
  assert.equal(d.slug, "andres-calderon");
  assert.deepEqual(d.formerSlugs, ["andra-s-caldera-n"]);
  assert.ok(d.keys.includes("andres calderon") && d.keys.includes("andra caldera n s"), "conserva todas las formas del nombre");
  assert.equal(d.firstSeen, "2026-02-07");
  assert.equal(d.lastSeen, "2026-09-20");
});

test("el orden del nombre es el de la temporada; la variante reparada sólo aporta los acentos", () => {
  const previous = { drivers: [entry("Donzino Mã\u0081ximo", "donzino maximo", ["donzino maximo", "donzino ma ximo"], "donzino-ma-ximo", { numbers: { tn: "71" } })] };
  const d = bySlug(buildDriverIndex(season(["Maximo Donzino", "71"]), previous)).get("maximo-donzino");
  assert.equal(d?.name, "Máximo Donzino");
  assert.deepEqual(d.formerSlugs, ["donzino-ma-ximo"]);
  assert.deepEqual(d.aliases, []);
});

test("una variante reparada que ya no aparece no le gana a la forma completa", () => {
  const previous = {
    drivers: [
      entry("Matã­as Muã‘oz M.", "as m mata mua oz", ["as m mata mua oz"], "mata-as-mua-oz-m", { numbers: { tn: "16" } }),
      entry("Matias Munoz Marchesi", "marchesi matias munoz", ["marchesi matias munoz"], "matias-munoz-marchesi", { numbers: { tn: "16" } }),
    ],
  };
  const index = buildDriverIndex(season(["Matias Munoz Marchesi", "16"]), previous);
  assert.equal(index.drivers.length, 1);
  assert.equal(index.drivers[0].name, "Matías Muñoz Marchesi");
  assert.equal(index.drivers[0].slug, "matias-munoz-marchesi");
  assert.deepEqual(index.drivers[0].formerSlugs, ["mata-as-mua-oz-m"]);
});

test("las direcciones viejas se conservan en las corridas siguientes y nadie se borra", () => {
  const previous = { drivers: [entry("Tomã\u0081s Vitar", "tomas vitar", ["tomas vitar", "s toma vitar"], "toma-s-vitar", { numbers: { tn: "177" } }), entry("Ana Pérez", "ana perez", ["ana perez"], "ana-perez")] };
  const first = buildDriverIndex(season(["Tomas Vitar", "177"]), previous);
  const second = buildDriverIndex(season(["Tomas Vitar", "177"]), first);
  assert.deepEqual(second.drivers.map((d) => d.slug).sort(), ["ana-perez", "tomas-vitar"]);
  assert.deepEqual(bySlug(second).get("tomas-vitar").formerSlugs, ["toma-s-vitar"]);
  assert.equal(bySlug(second).get("ana-perez").formerSlugs, undefined);
  assert.ok(!JSON.stringify(second).includes("ã"));
});
