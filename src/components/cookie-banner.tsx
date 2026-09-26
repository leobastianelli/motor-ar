"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { getConsent, initAnalytics, setConsent } from "@/lib/analytics";

// El consentimiento vive en localStorage, así que el servidor no puede saberlo: se lee con useSyncExternalStore
// (mismo patrón que el reloj de `masthead.tsx`) en vez de leerlo en un efecto y volcarlo a estado, que redibuja
// de más y dispara la regla de lint que prohíbe llamar a setState dentro de un efecto.
const listeners = new Set<() => void>();
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}
function notifyConsentChange() {
  for (const listener of listeners) listener();
}
function useConsent() {
  return useSyncExternalStore(subscribe, getConsent, () => null);
}

/** Banner de cookies: sólo se ve hasta que alguien elige. PostHog no arranca hasta "Aceptar". */
export function CookieBanner() {
  const consent = useConsent();

  if (consent !== null) return null;

  const choose = (value: "accepted" | "declined") => {
    setConsent(value);
    notifyConsentChange();
    if (value === "accepted") void initAnalytics();
  };

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookies">
      <p>
        Usamos cookies para entender cómo se usa el sitio (visitas, clics y alguna grabación de sesión, sin ver lo que escribís). Más en{" "}
        <Link href="/privacidad">Privacidad</Link>.
      </p>
      <div className="cookie-banner-actions">
        <button type="button" onClick={() => choose("declined")}>
          Rechazar
        </button>
        <button type="button" className="accept" onClick={() => choose("accepted")}>
          Aceptar
        </button>
      </div>
    </div>
  );
}
