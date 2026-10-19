// Analytics de producto (PostHog), con consentimiento: no arranca hasta que alguien acepta el banner de cookies.
// Compartido entre instrumentation-client.ts (arranque temprano) y el banner (botón "Aceptar").
export const CONSENT_KEY = "fierros-cookies";
export type Consent = "accepted" | "declined";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

export function getConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null; // Sin acceso a localStorage (privado, bloqueado): se pregunta de nuevo, no rompe nada.
  }
}

export function setConsent(value: Consent) {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // No persiste, pero el resto sigue andando.
  }
}

let posthogInstance: typeof import("posthog-js").default | null = null;
let initPromise: Promise<void> | null = null;

/** Carga e inicializa PostHog una sola vez. No hace nada si falta la clave o ya está iniciado. */
export function initAnalytics(): Promise<void> {
  if (initPromise) return initPromise;
  if (!POSTHOG_KEY) return Promise.resolve();
  initPromise = import("posthog-js").then(({ default: posthog }) => {
    posthog.init(POSTHOG_KEY, { api_host: POSTHOG_HOST, defaults: "2026-05-30" });
    posthogInstance = posthog;
    document.addEventListener("click", onClick, { capture: true });
  });
  return initPromise;
}

/** Pageview manual para navegaciones del App Router (no recargan la página). */
export function trackPageview(url: string) {
  posthogInstance?.capture("$pageview", { $current_url: url });
}

/**
 * Un solo oyente de clics para todo el sitio (se instala con PostHog, o sea sólo con consentimiento):
 * - un elemento con `data-evento="nombre"` manda ese evento, con sus `data-ev-*` como propiedades
 *   (`data-ev-nombre="ESPN"` → `{ nombre: "ESPN" }`);
 * - cualquier otro enlace a otro sitio manda `link_externo` con el dominio.
 * Siempre va la página desde donde se tocó. Así los componentes de servidor también se miden con un atributo.
 */
function onClick(e: MouseEvent) {
  const target = e.target instanceof Element ? e.target : null;
  if (!target) return;
  const pagina = window.location.pathname;
  const marcado = target.closest<HTMLElement>("[data-evento]");
  if (marcado?.dataset.evento) {
    const props: Record<string, string> = { pagina };
    for (const [k, v] of Object.entries(marcado.dataset)) {
      if (k.startsWith("ev") && k.length > 2 && v) props[k[2].toLowerCase() + k.slice(3)] = v;
    }
    trackEvent(marcado.dataset.evento, props);
    return;
  }
  const a = target.closest<HTMLAnchorElement>("a[href]");
  if (!a) return;
  try {
    const url = new URL(a.href, window.location.href);
    if ((url.protocol === "http:" || url.protocol === "https:") && url.hostname !== window.location.hostname) {
      trackEvent("link_externo", { host: url.hostname.replace(/^www./, ""), pagina });
    }
  } catch {
    // href raro: no se mide.
  }
}

/** Evento de producto con nombre propio (juego_inicio, juego_fin, juego_compartir…). Sin consentimiento no hay PostHog y no hace nada. */
export function trackEvent(name: string, properties?: Record<string, string | number | boolean>) {
  posthogInstance?.capture(name, properties);
}
