import assert from "node:assert/strict";
import { test } from "node:test";
import { borradores, freshLeader, sessionDraft, X_LIMIT, xIntentUrl, xLength } from "./redes-core.mjs";

const series = [
  { id: "f1", name: "Fórmula 1", short: "F1", scope: "internacional" },
  { id: "f2", name: "Fórmula 2", short: "F2", scope: "internacional" },
  { id: "tc", name: "Turismo Carretera", short: "TC", scope: "nacional" },
  { id: "tn", name: "TN APAT", short: "TN", scope: "nacional" },
  { id: "wec", name: "WEC", short: "WEC", scope: "internacional" },
];
const drivers = [
  { slug: "franco-colapinto", name: "Franco Colapinto", seriesId: "f1", team: "Alpine" },
  { slug: "nicolas-varrone", name: "Nicolás Varrone", seriesId: "f2", team: "" },
];
const broadcasts = { f1: { items: [{ name: "Fox Sports", kind: "tv" }, { name: "Disney+ Premium", kind: "streaming" }] }, tc: { items: [{ name: "Canal 9", kind: "tv" }] } };
const catalog = { drivers, series, broadcasts };

const row = (pos, driver, extra = {}) => ({ pos, driver, team: "X", gap: "", ...extra });
const podium = [row(1, "George Russell"), row(2, "Andrea Kimi Antonelli"), row(3, "Isack Hadjar")];
const session = (over = {}) => ({ id: "f1-16-q", kind: "clasificacion", name: "Clasificación", start: "2026-10-03T08:00:00Z", timeKnown: true, durationMin: 60, ...over });
const event = (over = {}) => ({
  id: "f1-2026-16",
  seriesId: "f1",
  round: 16,
  name: "GP de Malasia",
  circuit: { name: "Sepang", city: "Sepang", country: "Malasia" },
  source: "Jolpica",
  sessions: [session()],
  ...over,
});
const season = (events, extra = {}) => ({ events, standings: {}, meta: {}, ...extra });

// Sábado 3/10 a las 06:30 hora argentina: la clasificación (05:00 argentina) terminó hace 30 min.
const AFTER_QUALI = "2026-10-03T09:30:00Z";
const run = (events, now, opts = {}) => borradores(season(events, opts.season), now, { catalog, ...opts });

test("el largo se cuenta como X: enlaces por 23 y emojis por 2", () => {
  assert.equal(xLength("hola"), 4);
  assert.equal(xLength("https://www.somosfierros.ar/eventos/f1-2026-16"), 23);
  assert.equal(xLength("🏁 hola"), 2 + 1 + 4);
  assert.equal(xLength("Clasificación"), 13, "los acentos pesan 1");
});

test("terminó la clasificación: pole, 2.º y 3.º, argentino con su posición y enlace al evento", () => {
  const q = session({ results: [...podium, ...Array.from({ length: 8 }, (_, i) => row(4 + i, `Piloto ${i}`)), row(12, "Franco Colapinto")].filter((r, i, a) => a.findIndex((x) => x.pos === r.pos) === i) });
  const [d] = run([event({ sessions: [q] })], AFTER_QUALI);
  assert.equal(d.key, "sesion:f1-2026-16:clasificacion:clasificacion");
  assert.match(d.text, /^🏁 F1 · GP de Malasia · Clasificación\n\n1\. 🥇 George Russell\n2\. 🥈 Andrea Kimi Antonelli\n3\. 🥉 Isack Hadjar\n\n🇦🇷 Colapinto largará 12\.º\n\nhttps:/);
  assert.ok(d.text.endsWith("\nhttps://www.somosfierros.ar/eventos/f1-2026-16"));
  assert.ok(xLength(d.text) <= X_LIMIT);
  assert.ok(!/EN VIVO/i.test(d.text));
});

test("más de una sesión del mismo tipo (F2 Baku): el borrador usa el nombre de la sesión, no el genérico", () => {
  const q1 = session({ id: "f2-16-q1", name: "Clasificación 1", results: podium });
  const q2 = session({ id: "f2-16-q2", name: "Clasificación 2", results: podium });
  const [d1, d2] = run([event({ seriesId: "f2", sessions: [q1, q2] })], AFTER_QUALI);
  assert.match(d1.text, /^🏁 F2 · GP de Malasia · Clasificación 1\n\n1\. 🥇 George Russell\n/);
  assert.match(d2.text, /^🏁 F2 · GP de Malasia · Clasificación 2\n\n1\. 🥇 George Russell\n/);
});

test("una sola sesión de ese tipo: el borrador sigue usando el rótulo genérico", () => {
  const q = session({ results: podium });
  const [d] = run([event({ sessions: [q] })], AFTER_QUALI);
  assert.match(d.text, /^🏁 F1 · GP de Malasia · Clasificación\n\n1\. 🥇 George Russell\n/);
});

test("carrera repetida en la misma fecha (Carrera principal y Carrera principal 2): la primera se distingue como 'Carrera principal 1', sin tocar el name guardado", () => {
  const r1 = session({ id: "f2-16-r1", kind: "carrera", name: "Carrera principal", results: podium });
  const r2 = session({ id: "f2-16-r2", kind: "carrera", name: "Carrera principal 2", results: podium });
  const [d1, d2] = run([event({ seriesId: "f2", sessions: [r1, r2] })], AFTER_QUALI);
  assert.match(d1.text, /^🏁 F2 · GP de Malasia · Carrera principal 1\n\n1\. 🥇 George Russell\n/);
  assert.match(d2.text, /^🏁 F2 · GP de Malasia · Carrera principal 2\n\n1\. 🥇 George Russell\n/);
  assert.equal(r1.name, "Carrera principal");
});

test("un argentino que no terminó la carrera se cuenta como abandono, no como posición", () => {
  const race = session({
    id: "f1-16-r",
    kind: "carrera",
    name: "Carrera",
    start: "2026-10-04T07:00:00Z",
    durationMin: 120,
    results: [...podium, row(19, "Franco Colapinto", { positionText: "R", status: "Abandonó" })],
  });
  const [d] = run([event({ sessions: [race] })], "2026-10-04T10:00:00Z");
  assert.match(d.text, /1\. 🥇 George Russell\n2\. 🥈 Andrea Kimi Antonelli\n3\. 🥉 Isack Hadjar\n\n🇦🇷 Colapinto abandonó\n/);
  assert.doesNotMatch(d.text, /19/);
});

test("si el argentino está en el podio no se repite; si no corrió afuera, no se menciona a nadie", () => {
  const withColapinto = session({ results: [row(1, "Franco Colapinto"), row(2, "A B"), row(3, "C D")] });
  const [d1] = run([event({ sessions: [withColapinto] })], AFTER_QUALI);
  assert.equal(d1.text.match(/Colapinto/g).length, 1);
  const [d2] = run([event({ sessions: [session({ results: podium })] })], AFTER_QUALI);
  assert.doesNotMatch(d2.text, /largará|terminó/);
});

test("carrera de una categoría argentina: lidera el campeonato sólo si la tabla está al día", () => {
  const race = {
    id: "tc-8-f", kind: "final", name: "Final", start: "2026-10-04T15:00:00-03:00", timeKnown: true, durationMin: 40,
    results: [row(1, "Mariano Werner"), row(2, "Otto Fritzler"), row(3, "Agustín Canapino")],
  };
  const tc = { id: "tc-2026-8", seriesId: "tc", round: 8, name: "Fecha 8 · San Nicolás", circuit: { city: "San Nicolás" }, source: "ACTC (calendario)", sessions: [race] };
  const now = "2026-10-04T19:00:00Z";
  const fresh = { standings: { tc: [row(1, "Mariano Werner", { points: 53 })] }, meta: { tc: { standingsAsOfRound: 1 } } };
  const [ok] = run([tc], now, { season: fresh });
  assert.match(ok.text, /1\. 🥇 Mariano Werner/);
  assert.match(ok.text, /🏆 Campeonato: lidera Mariano Werner \(53 pts\)\n/);
  const stale = { standings: fresh.standings, meta: { tc: { standingsAsOfRound: 0 } } };
  const [no] = run([tc], now, { season: stale });
  assert.doesNotMatch(no.text, /campeonato/i, "tabla atrasada: no se menciona");
  // Tabla manual más nueva que la automática.
  assert.equal(freshLeader({ standings: fresh.standings, meta: { tc: { standingsAsOfRound: 0 } } }, { standings: { tc: { asOfRound: 1, rows: [{ pos: 1, driver: "Otto Fritzler", points: 50.5 }] } } }, [tc], "tc").driver, "Otto Fritzler");
});

test("series del TC: un borrador por serie, con su nombre, sin el campeonato", () => {
  const heat = (n, start, winner) => ({
    id: `tc-12-s${n}`, kind: "serie", name: `Serie ${n}`, start, timeKnown: true, durationMin: 15,
    results: [row(1, winner), row(2, `Segundo ${n}`), row(3, `Tercero ${n}`)],
  });
  const tc = {
    id: "tc-2026-12", seriesId: "tc", round: 12, name: "Fecha 12 · San Nicolás", circuit: { city: "San Nicolás" }, source: "ACTC (calendario)",
    sessions: [heat(1, "2026-10-04T10:55:00-03:00", "Mariano Werner"), heat(2, "2026-10-04T11:20:00-03:00", "Julián Santero"), heat(3, "2026-10-04T11:45:00-03:00", "Agustín Canapino")],
  };
  const fresh = { standings: { tc: [row(1, "Mariano Werner", { points: 53 })] }, meta: { tc: { standingsAsOfRound: 11 } } };
  const drafts = run([tc], "2026-10-04T15:20:00Z", { season: fresh });
  assert.deepEqual(drafts.map((d) => d.key), ["sesion:tc-2026-12:serie:serie-1", "sesion:tc-2026-12:serie:serie-2", "sesion:tc-2026-12:serie:serie-3"]);
  assert.match(drafts[0].text, /^🏁 TC · Fecha 12 · San Nicolás · Serie 1\n\n1\. 🥇 Mariano Werner\n2\. 🥈 Segundo 1\n3\. 🥉 Tercero 1\n/);
  assert.match(drafts[2].text, /Serie 3\n\n1\. 🥇 Agustín Canapino/);
  assert.ok(drafts.every((d) => !/campeonato/i.test(d.text)), "una serie no cambia el campeonato");
});

test("sin podio completo no hay borrador", () => {
  const sinTercero = session({ results: podium.slice(0, 2) });
  assert.equal(run([event({ sessions: [sinTercero] })], AFTER_QUALI).length, 0);
  assert.equal(sessionDraft({ event: event(), session: session({ results: [row(1, "A"), row(2, "B"), row(3, "")] }), series: series[0], argentines: [] }), null);
});

test("no repite lo ya enviado, ni sesiones viejas (>24 h), ni sesiones que no terminaron, ni prácticas", () => {
  const q = session({ results: podium });
  assert.equal(run([event({ sessions: [q] })], AFTER_QUALI, { enviados: { "sesion:f1-16-q": "x" } }).length, 0);
  assert.equal(run([event({ sessions: [q] })], "2026-10-05T09:30:00Z").length, 0, "pasaron más de 24 h");
  assert.equal(run([event({ sessions: [q] })], "2026-10-03T08:30:00Z").length, 0, "todavía no terminó");
  assert.equal(run([event({ sessions: [session({ kind: "practica", results: podium })] })], AFTER_QUALI).length, 0);
});

test("una categoría sin argentinos ni argentina (WEC) no genera borradores", () => {
  const e = event({ id: "wec-1", seriesId: "wec", sessions: [session({ id: "wec-q", results: podium })] });
  assert.equal(run([e], AFTER_QUALI).length, 0);
});

test("un texto largo se resume (apellidos, sin campeonato) y siempre entra en 280", () => {
  const long = "Nombre Larguísimo De Un Piloto Con Muchos Apellidos Compuestos";
  const race = { id: "tc-9-f", kind: "final", name: "Final", start: "2026-10-04T15:00:00-03:00", timeKnown: true, durationMin: 40, results: [row(1, long), row(2, `${long} Dos`), row(3, `${long} Tres`)] };
  const tc = { id: "tc-2026-9", seriesId: "tc", round: 9, name: "Fecha 9 · Un circuito con nombre muy largo de verdad", circuit: { city: "X" }, sessions: [race] };
  const fresh = { standings: { tc: [row(1, long, { points: 60 })] }, meta: { tc: { standingsAsOfRound: 1 } } };
  const [d] = run([tc], "2026-10-04T19:00:00Z", { season: fresh });
  assert.ok(xLength(d.text) <= X_LIMIT, `${xLength(d.text)} caracteres`);
  assert.match(d.text, /Tres/);
});

test("a qué hora corre: el día de la sesión, sólo pilotos argentinos que corren afuera y con hora confirmada", () => {
  const e = event({ sessions: [session({ start: "2026-10-03T08:00:00Z" }), session({ id: "f1-16-r", kind: "carrera", start: "2026-10-04T07:00:00Z" })] });
  // La clasificación es a las 05:00: sale la víspera desde las 20:00 (23:00 UTC del viernes 2/10), como "Mañana".
  const [d] = run([e], "2026-10-03T00:00:00Z").filter((x) => x.kind === "horario");
  assert.equal(d.key, "horario:f1-2026-16:2026-10-03");
  assert.equal(d.text, "⏰ Mañana a las 05:00 (hora argentina) Colapinto clasifica en Sepang. Dónde verlo: Fox Sports y Disney+ Premium.\nhttps://www.somosfierros.ar/horarios/franco-colapinto");
  assert.ok(xLength(d.text) <= X_LIMIT);
  assert.equal(run([e], "2026-10-02T22:00:00Z").filter((x) => x.kind === "horario").length, 0, "19:00 argentina de la víspera: todavía no");
  // Una sesión de la tarde sale ese día desde las 08:00, como "Hoy".
  const tarde = event({ sessions: [session({ start: "2026-10-03T18:00:00Z" })] });
  assert.match(run([tarde], "2026-10-03T11:00:00Z")[0].text, /^⏰ Hoy a las 15:00/);
  assert.equal(run([tarde], "2026-10-03T10:59:00Z").length, 0, "antes de las 08:00 argentinas no sale");
  // Sin hora confirmada, no hay borrador.
  assert.equal(run([event({ sessions: [session({ timeKnown: false })] })], "2026-10-03T00:00:00Z").filter((x) => x.kind === "horario").length, 0);
  // Ya empezó: no sirve.
  assert.equal(run([e], "2026-10-03T08:10:00Z").filter((x) => x.kind === "horario").length, 0);
  // Ya enviado.
  assert.equal(run([e], "2026-10-03T00:00:00Z", { enviados: { "horario:f1-2026-16:2026-10-03": "x" } }).filter((x) => x.kind === "horario").length, 0);
});

test("a qué hora corre: sin pilotos afuera con equipo (Varrone se desvinculó) o sin sesión competitiva ese día, no hay borrador", () => {
  const f2 = event({ id: "f2-1", seriesId: "f2", sessions: [session({ id: "f2-q" })] });
  assert.equal(run([f2], "2026-10-03T11:00:00Z").length, 0);
  const soloPracticas = event({ sessions: [session({ kind: "practica", start: "2026-10-02T04:30:00Z" })] });
  assert.equal(run([soloPracticas], "2026-10-02T11:00:00Z").length, 0);
});

test("agenda: sólo los viernes desde las 09:00, una línea por categoría con día y hora, hora confirmada y enlace a la home", () => {
  const f1 = event({ sessions: [session(), session({ id: "r", kind: "carrera", start: "2026-10-04T07:00:00Z" })] });
  const tc = { id: "tc-8", seriesId: "tc", round: 8, name: "Fecha 8 · San Nicolás", circuit: { city: "San Nicolás" }, source: "ACTC (calendario)", sessions: [{ id: "tc-f", kind: "final", name: "Final", start: "2026-10-04T15:00:00-03:00", timeKnown: false, durationMin: 40 }] };
  const lejano = { ...tc, id: "tc-9", sessions: [{ ...tc.sessions[0], id: "tc-g", start: "2026-10-18T15:00:00-03:00" }] };
  const viernes9 = "2026-10-02T12:00:00Z"; // 09:00 argentina
  const [a] = run([f1, tc, lejano], viernes9);
  assert.equal(a.key, "agenda:2026-10-02");
  assert.equal(a.text, "🗓️ El finde en el automovilismo argentino (hora argentina):\nDom 04:00 · F1 (Sepang)\nDom hora a confirmar · TC (San Nicolás)\nhttps://www.somosfierros.ar/");
  assert.equal(a.image, "https://www.somosfierros.ar/placa/imagen");
  // Antes de las 09:00, otro día o ya enviada: nada.
  assert.equal(run([f1, tc], "2026-10-02T11:59:00Z").length, 0);
  assert.equal(run([f1, tc], "2026-10-03T12:00:00Z").filter((x) => x.kind === "agenda").length, 0);
  assert.equal(run([f1, tc], viernes9, { enviados: { "agenda:2026-10-02": "x" } }).length, 0);
});

test("agenda: fecha sin confirmar no entra, y si no cabe en 280 se corta por el final y cierra con «Y más en»", () => {
  const tentativa = { id: "tn-1", seriesId: "tn", round: 1, name: "Fecha 1", circuit: { city: "" }, source: "Wikipedia", sessions: [{ id: "tn-f", kind: "final", name: "Final", start: "2026-10-04T15:00:00-03:00", durationMin: 30 }] };
  assert.equal(run([tentativa], "2026-10-02T12:00:00Z").length, 0);
  const muchos = Array.from({ length: 30 }, (_, i) => ({
    id: `tc-${i}`, seriesId: "tc", round: i, name: `Fecha ${i}`, circuit: { city: `Ciudad número ${i}` }, source: "ACTC (calendario)",
    sessions: [{ id: `tc-f${i}`, kind: "final", name: "Final", start: `2026-10-04T${String(10 + (i % 12)).padStart(2, "0")}:00:00-03:00`, timeKnown: true, durationMin: 30 }],
  }));
  const [a] = run(muchos, "2026-10-02T12:00:00Z");
  assert.ok(xLength(a.text) <= X_LIMIT);
  assert.match(a.text, /\nY más en https:\/\/www\.somosfierros\.ar\/$/);
  const horas = [...a.text.matchAll(/Dom (\d\d):/g)].map((m) => Number(m[1]));
  assert.deepEqual(horas, [...horas].sort((x, y) => x - y), "queda en orden de hora");
});

test("así quedó el finde: domingo desde las 20:00, una línea por categoría con fuente automática, en orden de hora (argentinos desempatan) y con la posición del argentino que corrió afuera", () => {
  const f1Race = { id: "f1-16-r", kind: "carrera", name: "Carrera", start: "2026-10-04T18:00:00Z", timeKnown: true, durationMin: 120, results: [row(1, "Max Verstappen"), row(2, "George Russell"), row(5, "Franco Colapinto")] };
  const f1 = event({ seriesId: "f1", sessions: [f1Race] });
  const tcFinal = { id: "tc-f", kind: "final", name: "Final", start: "2026-10-03T15:00:00-03:00", timeKnown: true, durationMin: 40, results: [row(1, "Mariano Werner"), row(2, "Otto Fritzler")] };
  const tc = { id: "tc-2026-8", seriesId: "tc", round: 8, name: "Fecha 8 · San Nicolás", circuit: { city: "San Nicolás" }, source: "ACTC (calendario)", sessions: [tcFinal] };
  const wecRace = { id: "wec-r", kind: "carrera", name: "Carrera", start: "2026-10-02T10:00:00Z", timeKnown: true, durationMin: 180, results: [row(1, "Kevin Estre")] };
  const wec = { id: "wec-1", seriesId: "wec", sessions: [wecRace] };
  // Sólo hizo la clasificación: sin carrera todavía, no se menciona.
  const f2q = event({ id: "f2-16", seriesId: "f2", sessions: [session({ id: "f2-16-q", start: "2026-10-03T08:00:00Z", results: podium })] });
  // Carga manual: no es fuente automática, no entra aunque tenga resultado.
  const tnManual = { id: "tn-1", seriesId: "tn", round: 1, name: "Fecha 1", source: "Carga manual · calendario", sessions: [{ id: "tn-f", kind: "final", name: "Final", start: "2026-10-03T15:00:00-03:00", timeKnown: true, durationMin: 30, results: [row(1, "Un piloto")] }] };

  const domingo2000 = "2026-10-04T23:00:00Z"; // 20:00 hora argentina
  const [d] = run([f1, tc, wec, f2q, tnManual], domingo2000);
  assert.equal(d.kind, "resumen");
  assert.equal(d.key, "resumen:2026-10-04");
  assert.equal(
    d.text,
    "🏁 Así quedó el finde (hora argentina):\nWEC: ganó Kevin Estre\nTC: ganó Mariano Werner\nF1: ganó Max Verstappen; Colapinto terminó 5.º\nhttps://www.somosfierros.ar/",
  );
  assert.ok(xLength(d.text) <= X_LIMIT);
  assert.doesNotMatch(d.text, /F2/, "sin carrera todavía: no se menciona");
  assert.doesNotMatch(d.text, /Un piloto|TN/, "carga manual: no entra");

  // Antes de las 20:00 del domingo, nada.
  assert.equal(run([f1], "2026-10-04T22:00:00Z").filter((x) => x.kind === "resumen").length, 0);
  // El lunes antes del mediodía todavía sale (carrera nocturna); después del mediodía, no.
  assert.equal(run([f1], "2026-10-05T14:00:00Z").filter((x) => x.kind === "resumen").length, 1, "lunes 11:00 ARG: todavía");
  assert.equal(run([f1], "2026-10-05T16:00:00Z").filter((x) => x.kind === "resumen").length, 0, "lunes 13:00 ARG: ya no");
  // Ya enviado.
  assert.equal(run([f1], domingo2000, { enviados: { "resumen:2026-10-04": "x" } }).filter((x) => x.kind === "resumen").length, 0);
});

test("así quedó el finde: si no entra en 280, se corta por el final (menos prioritario) y cierra con «y más en»", () => {
  const muchos = Array.from({ length: 30 }, (_, i) => ({
    id: `tc-${i}`, seriesId: "tc", round: i, name: `Fecha ${i}`, circuit: { city: `Ciudad número ${i}` }, source: "ACTC (calendario)",
    sessions: [{ id: `tc-f${i}`, kind: "final", name: "Final", start: `2026-10-04T${String(10 + (i % 12)).padStart(2, "0")}:00:00-03:00`, timeKnown: true, durationMin: 30, results: [row(1, `Piloto Con Nombre Largo Número ${i}`)] }],
  }));
  const [d] = run(muchos, "2026-10-04T23:00:00Z");
  assert.ok(xLength(d.text) <= X_LIMIT);
  assert.match(d.text, /\ny más en https:\/\/www\.somosfierros\.ar\/$/);
});

test("así quedó el finde: sin nada que contar (sin carreras, sin resultados), no hay borrador", () => {
  const soloQuali = event({ sessions: [session({ results: podium })] });
  assert.equal(run([soloQuali], "2026-10-04T23:00:00Z").filter((x) => x.kind === "resumen").length, 0);
  assert.equal(run([], "2026-10-04T23:00:00Z").filter((x) => x.kind === "resumen").length, 0);
});

test("el enlace de intención de X codifica el texto", () => {
  const url = xIntentUrl("Ganó Peña & Cía\nhttps://www.somosfierros.ar/");
  assert.ok(url.startsWith("https://x.com/intent/post?text="));
  assert.equal(new URL(url).searchParams.get("text"), "Ganó Peña & Cía\nhttps://www.somosfierros.ar/");
});
