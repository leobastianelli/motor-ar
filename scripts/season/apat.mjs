// TN APAT 2026 desde el sitio oficial (apat.org.ar): calendario, finales de Clase 2 y 3, y campeonatos.
// Las páginas de resultados se guardan en research/html para no volver a pedirlas.
import fs from "node:fs";
import { dateOnly, getText, properName, sleep } from "./common.mjs";

const BASE = "https://apat.org.ar";
const CACHE = "research/html";

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

async function cached(file, url, maxAgeDays) {
  const path = `${CACHE}/${file}`;
  if (fs.existsSync(path) && maxAgeDays !== null) {
    const ageDays = (Date.now() - fs.statSync(path).mtimeMs) / 86400000;
    if (ageDays < maxAgeDays) return fs.readFileSync(path, "utf8");
  }
  await sleep(1500);
  const html = await getText(url);
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(path, html);
  return html;
}

async function ranking(klass) {
  const html = await cached(`apat-ranking-${klass}.html`, `${BASE}/campeonato/ranking/${klass}`, 0.5);
  return rowsOf(firstTbody(html))
    .map((row) => {
      const c = cells(row);
      const pos = Number(text(c[0] ?? ""));
      // Desde el 4.º puesto la posición también va en <strong>: el nombre se toma sólo de la celda del piloto.
      const raw = text((c[2] ?? "").match(/<strong>([\s\S]*?)<\/strong>/)?.[1] ?? "");
      return { pos, driver: properName(raw), number: Number(text(c[1] ?? "")) || null, team: text(c[3] ?? ""), car: text(c[4] ?? ""), points: Number.parseFloat(text(c[5] ?? "")) || 0 };
    })
    .filter((r) => r.pos && r.driver);
}

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

async function finalResults(klass, isoDay, knownNames, isRecent) {
  const html = await cached(`apat-${klass}-${isoDay}.html`, `${BASE}/resultados/${klass}/${isoDay}`, isRecent ? 0.5 : null);
  const heading = html.search(new RegExp(`<h2[^>]*>\\s*FINAL\\s+${klass}\\s*</h2>`, "i"));
  if (heading === -1) return [];
  return rowsOf(firstTbody(html, heading))
    .map((row) => {
      const c = cells(row);
      const raw = text((c[2] ?? "").match(/<strong>([\s\S]*?)<\/strong>/)?.[1] ?? "");
      const pos = Number(text(c[0] ?? ""));
      return {
        pos,
        driver: resolveName(raw, knownNames),
        team: text(c[3] ?? ""),
        gap: pos === 1 ? text(c[5] ?? "") : text(c[6] ?? ""),
      };
    })
    .filter((r) => r.pos && r.driver);
}

export async function apatSeason({ today = new Date() } = {}) {
  const calendarHtml = await cached("apat-calendario.html", `${BASE}/carreras/calendario`, 0.5);
  const [c2, c3] = [await ranking("c2"), await ranking("c3")];
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
    const slugCity = (c[2].match(/href="\/circuitos\/[^"]*\/([^"/]+)"/)?.[1] ?? "").replace(/-/g, " ").replace(/(^|\s)\S/g, (m) => m.toUpperCase());
    const city = circuit.match(/Ciudad de\s+(.+)$/i)?.[1]?.trim() ?? slugCity;
    const isoDay = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const raceDay = new Date(`${isoDay}T23:59:00-03:00`);
    const played = raceDay < today;
    const isRecent = played && today - raceDay < 3 * 86400000;

    const sessions = [];
    for (const [klass, label] of [["c2", "Final Clase 2"], ["c3", "Final Clase 3"]]) {
      const results = played ? await finalResults(klass, isoDay, known, isRecent) : [];
      sessions.push({
        id: `tn-2026-${round}-${klass}`,
        kind: "final",
        name: label,
        start: dateOnly(y, m, d),
        timeKnown: false,
        durationMin: 35,
        ...(results.length ? { results } : {}),
      });
    }

    events.push({
      id: `tn-2026-${round}`,
      seriesId: "tn",
      round,
      name: `Fecha ${round} · ${city.split(",")[0] || circuit}`,
      circuit: { name: circuit, city: city.split(",")[0]?.trim() || circuit, country: "Argentina", flag: "AR", province: city.split(",")[1]?.trim() ?? "" },
      sessions,
      source: "APAT (apat.org.ar)",
    });
  }

  return {
    events,
    standings: { tn: c3.map(({ pos, driver, team, points }) => ({ pos, driver, team, points })) },
    meta: { tn: { standingsLabel: "Clase 3", clase2: c2.map(({ pos, driver, team, points }) => ({ pos, driver, team, points })) } },
  };
}
