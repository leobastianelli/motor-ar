// io falso con datos reales de Speedhive (organización 345223) de las fechas 1 a 6, recortados a lo que lee el adaptador. No se toca la red.
import fs from "node:fs";
import { ORG } from "../../cordoba-pista.mjs";

export const FIXTURE = JSON.parse(fs.readFileSync(new URL("./speedhive-fechas-1-a-6.json", import.meta.url), "utf8"));
export const NOW = new Date("2026-09-30T15:00:00Z");

/** io falso que responde lo de la fixture; `failing`: ids de sesión que fallan; `without`: ids de evento que no figuran en la lista. */
export function fakeIo({ failing = new Set(), without = new Set(), fail = false, emptyResults = false } = {}) {
  const get = async (url) => {
    if (fail) throw new Error("503 al pedir " + url);
    let m;
    if (url.includes(`/organizations/${ORG}/events`)) return FIXTURE.list.filter((e) => !without.has(e.id));
    if ((m = url.match(/\/events\/(\d+)\?sessions=true/))) {
      const e = FIXTURE.events[m[1]];
      if (!e) throw new Error("404 " + url);
      return e;
    }
    if ((m = url.match(/\/sessions\/(\d+)\/classification/))) {
      if (failing.has(Number(m[1]))) throw new Error("503 " + url);
      const c = FIXTURE.classifications[m[1]];
      if (!c) throw new Error("404 " + url);
      return emptyResults ? { rows: [] } : c;
    }
    throw new Error("URL inesperada " + url);
  };
  return { json: get, text: get, sleep: async () => {} };
}

