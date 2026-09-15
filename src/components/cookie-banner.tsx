"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getConsent, initAnalytics, setConsent } from "@/lib/analytics";

/** Banner de cookies: sólo se ve hasta que alguien elige. PostHog no arranca hasta "Aceptar". */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getConsent() === null);
  }, []);

  if (!visible) return null;

  const choose = (value: "accepted" | "declined") => {
    setConsent(value);
    setVisible(false);
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
