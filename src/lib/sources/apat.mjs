// TN APAT 2026 desde el sitio oficial (apat.org.ar): calendario, todas las sesiones de Clase 2 y 3 (entrenamientos,
// clasificación, series y final) y campeonatos.
import { dateOnly, properName } from "./common.mjs";

const BASE = "https://apat.org.ar";

const text = (html) =>
  html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();

const cells = (row) => [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
const firstTbody = (html, from = 0) => {
  const start = html.indexOf("<tbody", from);
  return start === -1 ? "" : html.slice(start, html.indexOf("</tbody>", start));
};
const rowsOf = (tbody) => tbody.split(/<tr\b/).slice(1);
const nameKey = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean).sort().join(" ");
// Desde el 4.º puesto la posición también va en <strong>: el nombre se toma sólo de la celda del piloto.
const driverCell = (c) => text((c[2] ?? "").match(/<strong>([\s\S]*?)<\/strong>/)?.[1] ?? "");

/** Los resultados vienen como "APELLIDO NOMBRE"; se busca el nombre del campeonato con los mismos tokens. */
function resolveName(raw, knownNames) {
  const key = nameKey(raw);
  if (knownNames.has(key)) return knownNames.get(key);
  const tokens = new Set(key.split(" "));
  for (const [known, proper] of knownNames) {
    const knownTokens = known.split(" ");
    const shared = knownTokens.filter((t) => tokens.has(t)).length;
    if (shared >= 2 && shared >= Math.min(knownTokens.length, tokens.size) - 1) return proper;
  }
  return properName(raw);
}

async function ranking(io, klass) {
  const html = await io.text(`${BASE}/campeonato/ranking/${klass}`, { revalidate: 3600 });
  return rowsOf(firstTbody(html))
    .map((row) => {
      const c = cells(row);
      return { pos: Number(text(c[0] ?? "")), driver: properName(driverCell(c)), team: text(c[3] ?? ""), points: Number.parseFloat(text(c[5] ?? "")) || 0 };
    })
    .filter((r) => r.pos && r.driver);
}

/** Encabezados de la página de resultados → sesión. "General entrenamiento" repite los dos entrenamientos y se omite. */
const HEADINGS = [
  [/^GENERAL\s+ENTRENAMIENTO/i, null],
  [/^FINAL\b/i, "final", "Final"],
  [/^PRIMERA\s+SERIE/i, "serie", "Serie 1"],
  [/^SEGUNDA\s+SERIE/i, "serie", "Serie 2"],
  [/^TERCERA\s+SERIE/i, "serie", "Serie 3"],
  [/^CUARTA\s+SERIE/i, "serie", "Serie 4"],
  [/CLASIFICACI/i, "clasificacion", "Clasificación"],
  [/^(?:1|PRIMER)\s*[º°O]?\s*ENTRENAMIENTO/i, "practica", "1° Entrenamiento"],
  [/^(?:2|SEGUNDO)\s*[º°O]?\s*ENTRENAMIENTO/i, "practica", "2° Entrenamiento"],
  [/^(?:3|TERCER)\s*[º°O]?\s*ENTRENAMIENTO/i, "practica", "3° Entrenamiento"],
];
const ORDER = { practica: 0, clasificacion: 1, serie: 2, final: 3 };

/** Todas las sesiones de una clase en una fecha: entrenamientos, clasificación, series y final, con la tabla completa. */
async function sessionResults(io, klass, isoDay, knownNames, revalidate) {
  const url = `${BASE}/resultados/${klass}/${isoDay}`;
  const html = await io.text(url, { revalidate });
  const label = klass === "c2" ? "Clase 2" : "Clase 3";
  const found = new Map();
  for (const m of html.matchAll(/<h[23][^>]*>\s*([^<]{3,80}?)\s*<\/h[23]>/g)) {
    const title = text(m[1]);
    if (!new RegExp(`\\b${klass}\\b`, "i").test(title)) continue;
    const rule = HEADINGS.find(([re]) => re.test(title));
    if (!rule?.[1] || found.has(rule[2])) continue;
    const tbodyAt = html.indexOf("<tbody", m.index);
    const nextHeading = html.slice(m.index + m[0].length).search(/<h[23][^>]*>/);
    if (tbodyAt === -1 || (nextHeading !== -1 && tbodyAt > m.index + m[0].length + nextHeading)) continue;
    const results = rowsOf(firstTbody(html, m.index))
      .map((row) => {
        const c = cells(row);
        const pos = Number(text(c[0] ?? ""));
        const time = text(c[5] ?? "");
        const diff = text(c[6] ?? "");
        return { pos, number: text(c[1] ?? "") || undefined, driver: resolveName(driverCell(c), knownNames), team: text(c[3] ?? ""), gap: pos === 1 ? time : diff || time };
      })
      .filter((r) => r.pos && r.driver);
    // El documento de cada sesión trae su fecha de publicación: ubica entrenamientos y clasificación en su día.
    const tableEnd = html.indexOf("</tbody>", tbodyAt);
    const after = html.slice(tableEnd, tableEnd + 4000).match(/(\d{2})\/(\d{2})\/(\d{4})\s+\d{2}:\d{2}/);
    const day = after ? `${after[3]}-${after[2]}-${after[1]}` : isoDay;
    if (results.length) found.set(rule[2], { kind: rule[1], name: `${rule[2]} ${label}`, day: day > isoDay ? isoDay : day, results, url });
  }
  return [...found.values()];
}

export async function apatSeason(io) {
  const today = new Date();
  const calendarHtml = await io.text(`${BASE}/carreras/calendario`, { revalidate: 3600 });
  const c2 = await ranking(io, "c2");
  const c3 = await ranking(io, "c3");
  const known = new Map([...c2, ...c3].map((r) => [nameKey(r.driver), r.driver]));

  const events = [];
  for (const row of rowsOf(firstTbody(calendarHtml))) {
    const c = cells(row);
    if (c.length < 5) continue;
    const round = Number(text(c[0]));
    const [d, m, y] = (text(c[1]).match(/(\d{2})\/(\d{2})\/(\d{4})/) ?? []).slice(1).map(Number);
    if (!round || !y) continue;
    const circuit = text(c[2].match(/<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? c[2]);
    // APAT no publica la ciudad: sale del nombre del circuito ("Autódromo Ciudad de Oberá") o del enlace (/circuitos/tecnica/obera).
    const slugCity = (c[2].match(/href="\/circuitos\/[^"]*\/([^"/]+)"/)?.[1] ?? "").replace(/-/g, " ").replace(/(^|\s)\S/g, (s) => s.toUpperCase());
    const city = circuit.match(/Ciudad de\s+(.+)$/i)?.[1]?.trim() ?? slugCity;
    const isoDay = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const raceDay = new Date(`${isoDay}T23:59:00-03:00`);
    const played = raceDay < today;
    // Resultados viejos casi no cambian: se piden de nuevo una vez por mes.
    const revalidate = today - raceDay < 3 * 86400000 ? 3600 : 30 * 86400;

    const sessions = [];
    for (const [klass, label] of [["c2", "Final Clase 2"], ["c3", "Final Clase 3"]]) {
      const found = played ? await sessionResults(io, klass, isoDay, known, revalidate) : [];
      if (!found.some((s) => s.kind === "final")) {
        sessions.push({ id: `tn-2026-${round}-${klass}`, kind: "final", name: label, start: dateOnly(y, m, d), timeKnown: false, durationMin: 35 });
      }
      for (const s of found) {
        const [sy, sm, sd] = s.day.split("-").map(Number);
        sessions.push({
          id: s.kind === "final" ? `tn-2026-${round}-${klass}` : `tn-2026-${round}-${klass}-${s.name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
          kind: s.kind,
          name: s.name,
          start: dateOnly(sy, sm, sd),
          timeKnown: false,
          durationMin: s.kind === "final" ? 35 : 25,
          results: s.results,
          resultsSource: { name: "APAT · resultados oficiales", url: s.url },
        });
      }
      if (played) await io.sleep(300);
    }
    sessions.sort((a, b) => a.start.localeCompare(b.start) || ORDER[a.kind] - ORDER[b.kind] || a.name.localeCompare(b.name));

    events.push({
      id: `tn-2026-${round}`,
      seriesId: "tn",
      round,
      name: `Fecha ${round} · ${city || circuit}`,
      circuit: { name: circuit, city: city || circuit, country: "Argentina", flag: "AR", province: "" },
      sessions,
      source: "APAT (apat.org.ar)",
    });
  }

  // Un calendario sin ninguna fecha es una página rota o distinta, no un TN sin temporada: que falle y se conserve lo anterior.
  if (!events.length) throw new Error("el calendario de APAT no trajo ninguna fecha");
  return { events, standings: { tn: c3 }, meta: { tn: { standingsLabel: "Clase 3", clase2: c2 } } };
}
