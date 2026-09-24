import assert from "node:assert/strict";
import { test } from "node:test";
import { checkConsistency, checkFreshness, checkNotes, checkPages, checkSalud, metaVersion, visibleText } from "./humo-checks.mjs";

const meta = (v) => `<html><head><meta name="fierros-datos" content="v=${v};origen=sync;generado=2026-09-24T11:00:00Z;servido=store"/></head></html>`;
const salud = (over = {}) => ({ sirviendo: { servedFrom: "store" }, almacen: { ultimaVersion: 12 }, ...over });

test("metaVersion lee el v= aunque el contenido venga con entidades o el orden de atributos cambie", () => {
  assert.equal(metaVersion(meta(12)), "12");
  assert.equal(metaVersion('<meta content="v=7;origen=hot" name="fierros-datos">'), "7");
  assert.equal(metaVersion('<meta name="fierros-datos" content="v=snapshot;origen=snapshot;generado=x&amp;y">'), "snapshot");
  assert.equal(metaVersion("<html></html>"), null);
});

test("salud: sólo pasa si se sirve desde el almacén", () => {
  assert.deepEqual(checkSalud(salud()), []);
  assert.match(checkSalud(salud({ sirviendo: { servedFrom: "snapshot" } }))[0], /snapshot/);
  assert.equal(checkSalud(null).length, 1);
});

test("páginas: 200 y menos de 3 s", () => {
  assert.deepEqual(checkPages([{ path: "/", status: 200, ms: 800 }, { path: "/x", status: 200 }]), []);
  assert.match(checkPages([{ path: "/notas", status: 302, ms: 50 }])[0], /302/);
  assert.match(checkPages([{ path: "/", status: 200, ms: 3000 }])[0], /3000 ms/);
  assert.match(checkPages([{ path: "/", status: null }])[0], /sin respuesta/);
});

test("consistencia: mismas versiones en todas las páginas y iguales a la del almacén", () => {
  const pages = { "/": meta(12), "/notas": meta(12), "/calendario": meta(12), "/eventos/a": meta(12) };
  assert.deepEqual(checkConsistency(salud(), pages), []);
  assert.match(checkConsistency(salud(), { ...pages, "/notas": meta(11) }).join("\n"), /distintas/);
  assert.match(checkConsistency(salud({ almacen: { ultimaVersion: 13 } }), pages).join("\n"), /almacén tiene la 13/);
  assert.match(checkConsistency(salud(), { ...pages, "/": "<html></html>" }).join("\n"), /no tiene <meta/);
  assert.match(checkConsistency(salud({ almacen: { ultimaVersion: null } }), pages).join("\n"), /no informa/);
});

test("frescura: el ganador aparece en la página del evento, sin importar tildes, entidades ni el marcado", () => {
  const g = [{ evento: "f1-2026-15", categoria: "f1", sesion: "Carrera", ganador: "Sergio Pérez" }];
  assert.deepEqual(checkFreshness(g, { "f1-2026-15": "<b>Sergio</b> <span>Perez</span>" }), []);
  assert.deepEqual(checkFreshness([{ ...g[0], ganador: "Kimi O'Brien" }], { "f1-2026-15": "<i>Kimi O&#x27;Brien</i>" }), []);
  assert.match(checkFreshness(g, { "f1-2026-15": "<p>Max Verstappen</p>" })[0], /no nombra a Sergio Pérez/);
  assert.match(checkFreshness(g, {})[0], /no se pudo leer/);
  assert.equal(visibleText('<script>Sergio</script><p>Otro</p>'), "otro");
});

test("notas: la crónica está en /notas y, si toca, en el menú de la home", () => {
  const c = [{ slug: "f1-2026-15-cronica", title: "GP de Azerbaiyán", enMenu: true }, { slug: "tc-9-cronica", title: "TC en Rafaela", enMenu: false }];
  const link = (s) => `<a href="/notas/${s}">x</a>`;
  assert.deepEqual(checkNotes(c, link(c[0].slug) + link(c[1].slug), link(c[0].slug)), []);
  assert.match(checkNotes(c, link(c[1].slug), link(c[0].slug)).join("\n"), /GP de Azerbaiyán" no está en \/notas/);
  assert.match(checkNotes(c, link(c[0].slug) + link(c[1].slug), "<html></html>").join("\n"), /no está en el menú/);
  assert.deepEqual(checkNotes([], "", ""), []);
});
