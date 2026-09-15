// Analytics de producto (PostHog): tráfico, comportamiento y grabaciones de sesión.
// Corre antes de la hidratación (ver instrumentation-client de Next.js). Si no hay clave configurada
// (por ejemplo en desarrollo local sin .env), no se inicializa: el sitio funciona igual sin analytics.
import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key) {
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
    defaults: "2026-05-30",
  });
}

// El App Router navega sin recargar la página: cada cambio de ruta se registra como pageview.
export function onRouterTransitionStart(url: string) {
  if (key) posthog.capture("$pageview", { $current_url: url });
}
