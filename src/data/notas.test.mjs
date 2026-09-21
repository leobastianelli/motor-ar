import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { notas } from "./notas.ts";
import { drivers } from "./drivers.ts";
import { series } from "./series.ts";

const indexed = JSON.parse(fs.readFileSync(new URL("./drivers-2026.json", import.meta.url), "utf8")).drivers;
const overrides = JSON.parse(fs.readFileSync(new URL("./manual-overrides.json", import.meta.url), "utf8"));
const season = JSON.parse(fs.readFileSync(new URL("./season-2026.json", import.meta.url), "utf8"));
const words = (s) => s.trim().split(/\s+/).length;

test("slugs únicos y con formato de dirección", () => {
  const slugs = notas.map((n) => n.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const s of slugs) assert.match(s, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test("toda nota lleva medio, titular original, fecha y enlace https", () => {
  for (const n of notas) {
    assert.ok(n.source.medio && n.source.headline, n.slug);
    assert.match(n.source.url, /^https:\/\//, n.slug);
    assert.match(n.publishedAt, /^\d{4}-\d{2}-\d{2}$/, n.slug);
    assert.notEqual(n.title, n.source.headline, `${n.slug}: el titular de Fierros tiene que ser propio`);
  }
});

test("el resumen es corto y la cita, de a lo sumo 25 palabras", () => {
  for (const n of notas) {
    assert.ok(words(n.summary) <= 70, `${n.slug}: resumen de ${words(n.summary)} palabras`);
    if (n.quote) assert.ok(words(n.quote) <= 25, `${n.slug}: cita de ${words(n.quote)} palabras`);
  }
});

test("los enlaces a pilotos, categorías y fechas apuntan a algo que existe", () => {
  const driverSlugs = new Set([...drivers.map((d) => d.slug), ...indexed.map((d) => d.slug)]);
  const seriesIds = new Set(series.map((s) => s.id));
  const eventIds = new Set([...season.events.map((e) => e.id), ...(overrides.newEvents ?? []).map((e) => e.id)]);
  for (const n of notas) {
    for (const d of n.drivers ?? []) assert.ok(driverSlugs.has(d), `${n.slug}: piloto ${d}`);
    for (const s of n.series ?? []) assert.ok(seriesIds.has(s), `${n.slug}: categoría ${s}`);
    for (const e of n.events ?? []) assert.ok(eventIds.has(e), `${n.slug}: fecha ${e}`);
  }
});
