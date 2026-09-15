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
  });
  return initPromise;
}

/** Pageview manual para navegaciones del App Router (no recargan la página). */
export function trackPageview(url: string) {
  posthogInstance?.capture("$pageview", { $current_url: url });
}
