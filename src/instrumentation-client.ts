// Analytics de producto (PostHog): tráfico, comportamiento y grabaciones de sesión.
// Corre antes de la hidratación (ver instrumentation-client de Next.js). Sólo arranca si ya se aceptó
// el banner de cookies (components/cookie-banner.tsx); si no hay consentimiento o clave, no hace nada.
import { getConsent, initAnalytics, trackPageview } from "./lib/analytics";

if (getConsent() === "accepted") void initAnalytics();

// El App Router navega sin recargar la página: cada cambio de ruta se registra como pageview.
export function onRouterTransitionStart(url: string) {
  if (getConsent() === "accepted") trackPageview(url);
}
