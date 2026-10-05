import assert from "node:assert/strict";
import { test } from "node:test";
import { needsBuild } from "./deploy-ignore.mjs";

const driver = (extra = {}) => ({ key: "a b", keys: ["a b"], slug: "a-b", name: "A B", aliases: [], series: ["tn"], numbers: { tn: "7" }, teams: { tn: "Ford" }, firstSeen: "2026-03-01", lastSeen: "2026-09-01", ...extra });
const index = (drivers, generatedAt = "2026-10-01T00:00:00Z") => JSON.stringify({ generatedAt, drivers }, null, 2);
const changes = (before, after) => needsBuild(["src/data/drivers-2026.json"], (side) => (side === "before" ? before : after));

test("sólo fechas del índice (generatedAt, firstSeen, lastSeen): no construye", () => {
  assert.equal(changes(index([driver()]), index([driver({ lastSeen: "2026-10-04", firstSeen: "2026-02-01" })], "2026-10-05T00:00:00Z")), false);
});

test("piloto nuevo, slug, nombre, alias, serie, número, equipo o formerSlugs: construye", () => {
  const base = index([driver()]);
  for (const extra of [{ slug: "a-b-2" }, { name: "A Bé" }, { aliases: ["Ab"] }, { series: ["tn", "tcr-sa"] }, { numbers: { tn: "8" } }, { teams: { tn: "Chevrolet" } }, { formerSlugs: ["a-b-x"] }, { keys: ["a b", "ab"] }, { campoNuevo: 1 }]) {
    assert.equal(changes(base, index([driver(extra)])), true, JSON.stringify(extra));
  }
  assert.equal(changes(base, index([driver(), driver({ key: "c d", slug: "c-d", name: "C D" })])), true);
  assert.equal(changes(base, index([])), true);
});

test("la instantánea de la temporada no construye, cualquier otro archivo sí", () => {
  const read = () => "";
  assert.equal(needsBuild(["src/data/season-2026.json"], read), false);
  assert.equal(needsBuild(["src/data/season-2026.json", "src/lib/data.ts"], read), true);
  assert.equal(needsBuild(["package.json"], read), true);
  assert.equal(needsBuild([], read), false);
});

test("ante un índice ilegible, construye", () => {
  assert.equal(changes("{roto", index([driver()])), true);
  assert.equal(needsBuild(["src/data/drivers-2026.json"], () => { throw new Error("sin git"); }), true);
});
