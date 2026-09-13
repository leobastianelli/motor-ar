import { wikiRawUrl } from "./wiki-pages.mjs";

// Entrada/salida de las fuentes dentro de Next: cada URL queda en la caché de datos con su propio tiempo de revalidación,
// así el sitio sólo vuelve a pedir a cada fuente cuando corresponde.
const UA = { "User-Agent": "fierros-motor-ar/0.1 (leonelbastianelli@gmail.com)" };

async function text(url: string, options: { revalidate?: number; headers?: Record<string, string> } = {}) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { ...UA, ...options.headers }, next: { revalidate: options.revalidate ?? 3600 } });
      if (res.ok) return await res.text();
      lastError = new Error(`${res.status} al pedir ${url}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, 800 * attempt));
  }
  throw lastError;
}

async function bytes(url: string, options: { revalidate?: number } = {}) {
  const res = await fetch(url, { headers: UA, next: { revalidate: options.revalidate ?? 3600 } });
  if (!res.ok) throw new Error(`${res.status} al pedir ${url}`);
  return res.arrayBuffer();
}

export const nextIo = {
  text,
  bytes,
  json: async (url: string, options?: { revalidate?: number; headers?: Record<string, string> }) => JSON.parse(await text(url, options)),
  wiki: (key: string) => text(wikiRawUrl(key), { revalidate: 3600 }),
  sleep: (ms: number) => new Promise((r) => setTimeout(r, ms)),
};
