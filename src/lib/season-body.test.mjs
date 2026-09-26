import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeBody, encodeBody } from "./season-body.mjs";

test("el cuerpo comprimido vuelve igual, con acentos, y pesa mucho menos", () => {
  const json = JSON.stringify({
    events: Array.from({ length: 200 }, (_, i) => ({ id: `tc-2026-${i}`, name: "Fecha · San Nicolás", sessions: [{ name: "Clasificación" }] })),
  });
  const br = encodeBody(json);
  assert.equal(decodeBody({ body_br: br }), json);
  assert.ok(br.length < json.length / 5);
});

test("una versión vieja sin comprimir se sigue leyendo", () => {
  assert.equal(decodeBody({ body_br: null, body: '{"events":[]}' }), '{"events":[]}');
});

test("sin cuerpo, error explícito", () => {
  assert.throws(() => decodeBody({ body_br: null, body: null }), /no tiene cuerpo/);
});
