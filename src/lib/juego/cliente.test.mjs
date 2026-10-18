import assert from "node:assert/strict";
import test from "node:test";
import { buscar, normalizar, rachaVigente, registrarResultado, textoCompartir } from "./cliente.mjs";

const pilotos = [
  { slug: "nino-falso", nombre: "Niño Falso" },
  { slug: "pepe-pruebas", nombre: "Pepe Pruebas" },
  { slug: "ana-nino", nombre: "Ana Niño" },
];

test("buscar ignora tildes y mayúsculas, deja primero los que empiezan igual y salta los usados", () => {
  assert.equal(normalizar("  ÑOÑO  "), "nono");
  assert.deepEqual(buscar(pilotos, "NINO").map((p) => p.slug), ["nino-falso", "ana-nino"]);
  assert.deepEqual(buscar(pilotos, "nino", ["nino-falso"]).map((p) => p.slug), ["ana-nino"]);
  assert.deepEqual(buscar(pilotos, "ruebas").map((p) => p.slug), ["pepe-pruebas"]);
  assert.deepEqual(buscar(pilotos, ""), []);
});

const comp = (...e) => ({ nacio: { estado: e[0] }, provincia: { estado: e[1] }, categorias: { estado: e[2] }, titulos: { estado: e[3] }, corre2026: { estado: e[4] } });

test("el texto compartido lleva cuadraditos y nunca el nombre", () => {
  const t = textoCompartir({ numero: 3, acerto: true, comparaciones: [comp("gris", "gris", "gris", "gris", "verde"), comp("verde", "verde", "verde", "verde", "verde")] });
  assert.equal(t, "Fierros · Juego #3  2/8\n⬛⬛⬛⬛🟩\n🟩🟩🟩🟩🟩\nsomosfierros.ar/juego");
  const perdio = textoCompartir({ numero: 4, acerto: false, comparaciones: [comp("amarillo", "gris", "amarillo", "gris", "gris")] });
  assert.ok(perdio.startsWith("Fierros · Juego #4  X/8\n🟨⬛🟨⬛⬛"));
});

test("la racha suma días seguidos, se corta si se pierde o se saltea un día y no cuenta dos veces", () => {
  let s = registrarResultado(null, { fecha: "2026-10-20", acerto: true, intentos: 3, ayer: "2026-10-19" });
  assert.equal(s.racha, 1);
  s = registrarResultado(s, { fecha: "2026-10-21", acerto: true, intentos: 5, ayer: "2026-10-20" });
  assert.equal(s.racha, 2);
  assert.equal(registrarResultado(s, { fecha: "2026-10-21", acerto: true, intentos: 5, ayer: "2026-10-20" }).jugadas, 2);
  s = registrarResultado(s, { fecha: "2026-10-23", acerto: true, intentos: 5, ayer: "2026-10-22" });
  assert.equal(s.racha, 1);
  assert.equal(s.maxima, 2);
  s = registrarResultado(s, { fecha: "2026-10-24", acerto: false, intentos: 8, ayer: "2026-10-23" });
  assert.equal(s.racha, 0);
  assert.equal(s.maxima, 2);
});

test("rachaVigente muestra 0 si pasó más de un día", () => {
  const s = { racha: 4, ultimaGanada: "2026-10-20" };
  assert.equal(rachaVigente(s, "2026-10-20", "2026-10-19"), 4);
  assert.equal(rachaVigente(s, "2026-10-21", "2026-10-20"), 4);
  assert.equal(rachaVigente(s, "2026-10-22", "2026-10-21"), 0);
  assert.equal(rachaVigente(null, "2026-10-22", "2026-10-21"), 0);
});
