import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { buildDriverIndex, driverKey } from "./driver-index.mjs";

const entry = (name, key, keys, slug, extra = {}) => ({ key, keys, slug, name, aliases: [], series: ["tn"], numbers: { tn: "79" }, teams: { tn: "Peugeot 208" }, firstSeen: "2026-02-07", lastSeen: "2026-08-30", ...extra });
const season = (...drivers) => ({
  events: [{ seriesId: "tn", sessions: [{ start: "2026-09-20T15:00:00-03:00", results: drivers.map(([driver, number], i) => ({ pos: i + 1, driver, number, team: "" })) }] }],
  meta: {},
});
const bySlug = (index) => new Map(index.drivers.map((d) => [d.slug, d]));

test("Rally Argentino: de cada tripulación 'Piloto / Navegante' se indexa el piloto, con su auto como equipo", () => {
  const rally = {
    events: [{ seriesId: "rally-argentino", sessions: [{ start: "2026-09-06T12:00:00-03:00", results: [{ pos: 1, driver: "Federico Villagra / Diego Curletto", number: "3", team: "Skoda Fabia RS Rally2" }] }] }],
    meta: {},
  };
  const index = buildDriverIndex(rally, undefined);
  assert.deepEqual(index.drivers.map((d) => d.name), ["Federico Villagra"]);
  assert.deepEqual(index.drivers[0].series, ["rally-argentino"]);
  assert.equal(index.drivers[0].numbers["rally-argentino"], "3");
  assert.equal(index.drivers[0].teams["rally-argentino"], "Skoda Fabia RS Rally2");
});

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

const cordoba = (...rows) => ({ events: [{ seriesId: "cordoba-pista", sessions: [{ start: "2026-09-27T15:50:00-03:00", results: rows.map(([driver, number], i) => ({ pos: i + 1, driver, number, team: "" })) }] }], meta: {} });

test("homónimos: Ricardo Vanini (h) y (p), los dos con el 17, son dos pilotos con su propia dirección", () => {
  const index = buildDriverIndex(cordoba(["Ricardo Vanini (h)", "17"], ["Ricardo Vanini (p)", "17"], ["Ana Pérez", "5"]), undefined);
  const m = bySlug(index);
  assert.equal(m.get("ricardo-vanini-h")?.name, "Ricardo Vanini (h)");
  assert.equal(m.get("ricardo-vanini-p")?.name, "Ricardo Vanini (p)");
  assert.equal(index.drivers.length, 3);
  assert.notDeepEqual(m.get("ricardo-vanini-h").keys, m.get("ricardo-vanini-p").keys);
  assert.equal(driverKey("Ricardo Vanini (h)"), "ricardo vanini (h)");
  assert.equal(driverKey("VANINI Ricardo (P) 1:23"), driverKey("Vanini Ricardo (p)"));
  // Una segunda corrida no los vuelve a juntar.
  assert.equal(buildDriverIndex(cordoba(["Ricardo Vanini (h)", "17"], ["Ricardo Vanini (p)", "17"]), index).drivers.length, 3);
});

test("homónimos: la dirección vieja 'ricardo-vanini' (que mezclaba a los dos) redirige con 301 al hijo vía formerSlugs", () => {
  const previous = { drivers: [entry("Ricardo Vanini (h)", "ricardo vanini (h)", ["ricardo vanini (h)"], "ricardo-vanini", { series: ["cordoba-pista"], numbers: { "cordoba-pista": "17" } })] };
  const m = bySlug(buildDriverIndex(cordoba(["Ricardo Vanini (h)", "17"], ["Ricardo Vanini (p)", "17"]), previous));
  assert.deepEqual(m.get("ricardo-vanini-h").formerSlugs, ["ricardo-vanini"]);
  assert.equal(m.get("ricardo-vanini-p").formerSlugs, undefined);
  assert.equal(m.has("ricardo-vanini"), false);
});

test("homónimos: el piloto viejo sin marca (que mezclaba a los dos) no vuelve; su dirección pasa al hijo aunque la temporada guardada todavía lo nombre", () => {
  const previous = { drivers: [
    entry("Ricardo Vanini", "ricardo vanini", ["ricardo vanini"], "ricardo-vanini", { series: ["cordoba-pista"], numbers: { "cordoba-pista": "17" } }),
    entry("Ricardo Vanini (h)", "ricardo vanini (h)", ["ricardo vanini (h)"], "ricardo-vanini-h", { series: ["cordoba-pista"], numbers: { "cordoba-pista": "17" } }),
  ] };
  const m = bySlug(buildDriverIndex(cordoba(["Ricardo Vanini", "17"], ["Ricardo Vanini (h)", "17"], ["Ricardo Vanini (p)", "17"]), previous));
  assert.equal(m.has("ricardo-vanini"), false);
  assert.deepEqual(m.get("ricardo-vanini-h").formerSlugs, ["ricardo-vanini"]);
  assert.ok(m.has("ricardo-vanini-p"));
});

test("el (h) de otros pilotos sigue siendo un agregado: 'Gustavo Tadei (h)' y 'Gustavo Tadei' son el mismo", () => {
  assert.equal(driverKey("Gustavo Tadei (h)"), driverKey("Gustavo Tadei"));
  assert.equal(buildDriverIndex(cordoba(["Gustavo Tadei (h)", "8"], ["Gustavo Tadei", "8"]), undefined).drivers.length, 1);
});

test("el índice publicado tiene a los dos Vanini y la dirección vieja redirige al hijo", () => {
  const { drivers } = JSON.parse(fs.readFileSync(new URL("../../data/drivers-2026.json", import.meta.url), "utf8"));
  const m = bySlug({ drivers });
  assert.deepEqual(m.get("ricardo-vanini-h").formerSlugs, ["ricardo-vanini"]);
  assert.equal(m.get("ricardo-vanini-p").name, "Ricardo Vanini (p)");
  assert.equal(m.has("ricardo-vanini"), false);
});
