import { repairMojibake } from "./common.mjs";
import { wikiRawUrl } from "./wiki-pages.mjs";

// Entrada/salida de las fuentes dentro de Next: cada URL queda en la caché de datos con su propio tiempo de revalidación,
// así el sitio sólo vuelve a pedir a cada fuente cuando corresponde.
const UA = { "User-Agent": "fierros-motor-ar/0.1 (leonelbastianelli@gmail.com)" };

export type IoOptions = {
  revalidate?: number;
  headers?: Record<string, string>;
  /** Sin caché de datos: siempre sale a la red (el refresco del Rally necesita ver la respuesta de verdad, incluido un 403). */
  noStore?: boolean;
  /** Intentos por pedido (por omisión 3). */
  attempts?: number;
  /** Tope por pedido en ms (por omisión, sin tope propio). */
  timeoutMs?: number;
};

const init = (options: IoOptions): RequestInit & { next?: { revalidate: number } } => ({
  headers: { ...UA, ...options.headers },
  ...(options.noStore ? { cache: "no-store" as const } : { next: { revalidate: options.revalidate ?? 3600 } }),
  ...(options.timeoutMs ? { signal: AbortSignal.timeout(options.timeoutMs) } : {}),
});

async function text(url: string, options: IoOptions = {}) {
  let lastError: unknown;
  const attempts = options.attempts ?? 3;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, init(options));
      if (res.ok) return repairMojibake(await res.text());
      lastError = new Error(`${res.status} al pedir ${url}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await new Promise((r) => setTimeout(r, 800 * attempt));
  }
  throw lastError;
}

async function bytes(url: string, options: IoOptions = {}) {
  const res = await fetch(url, init(options));
  if (!res.ok) throw new Error(`${res.status} al pedir ${url}`);
  return res.arrayBuffer();
}

export const nextIo = {
  text,
  bytes,
  json: async (url: string, options?: IoOptions) => JSON.parse(await text(url, options)),
  wiki: (key: string) => text(wikiRawUrl(key), { revalidate: 3600 }),
  sleep: (ms: number) => new Promise((r) => setTimeout(r, ms)),
};
