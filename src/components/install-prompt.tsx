"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getConsent } from "@/lib/analytics";

// Chrome/Android disparan este evento cuando la página cumple los requisitos para poder instalarse; sin
// guardarlo y usarlo después, el navegador no deja volver a pedirlo por código.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "fierros-install-prompt";
const REAPPEAR_DAYS = 14;

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Se re-chequea recién al mostrar (no sólo al montar): si ya se instaló o se cerró hace poco, no insiste. */
const canShow = () => {
  if (isStandalone()) return false;
  const dismissedAt = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
  return !dismissedAt || Date.now() - dismissedAt >= REAPPEAR_DAYS * 86400_000;
};

/**
 * Invita a agregar Fierros a la pantalla de inicio. Android/Chrome tienen un prompt nativo (`beforeinstallprompt`)
 * que se puede disparar por código; iOS no tiene ninguna API para esto, así que ahí sólo se puede mostrar el
 * paso a paso manual (Compartir → Agregar a inicio). Si alguien lo cierra, vuelve a aparecer a los 14 días —
 * nunca insiste en la misma visita ni antes de que se resuelva el banner de cookies, para no amontonar avisos.
 */
export function InstallPrompt() {
  const [platform, setPlatform] = useState<"android" | "ios" | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!canShow()) return;

    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);
    if (!isIOS && !isAndroid) return;

    // Con el banner de cookies todavía sin responder no se agrega un segundo aviso encima: se espera a que
    // alguien elija (o a que ya lo haya elegido en una visita anterior) antes de mostrar éste.
    let cancelled = false;
    const whenConsentReady = (show: () => void) => {
      const showIfStillValid = () => {
        if (canShow()) show();
      };
      if (getConsent() !== null) return showIfStillValid();
      const id = setInterval(() => {
        if (cancelled) return clearInterval(id);
        if (getConsent() !== null) {
          clearInterval(id);
          showIfStillValid();
        }
      }, 500);
      return () => clearInterval(id);
    };

    if (isIOS) {
      const stop = whenConsentReady(() => setPlatform("ios"));
      return () => {
        cancelled = true;
        stop?.();
      };
    }

    // Android/Chrome: el navegador ofrece el evento sólo si la página cumple los requisitos de instalación.
    const onPrompt = (e: Event) => {
      e.preventDefault();
      whenConsentReady(() => {
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setPlatform("android");
      });
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  if (!platform) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setPlatform(null);
  };

  const install = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    }
    dismiss();
  };

  return (
    <div className="install-prompt" role="dialog" aria-label="Agregar Fierros a la pantalla de inicio">
      <div className="install-prompt-body">
        <Image src="/icons/icon-192.png" alt="" width={44} height={44} />
        <div>
          <strong>Agregá Fierros a tu pantalla de inicio</strong>
          <p>
            {platform === "android"
              ? "Entrá más rápido, como una app."
              : "Tocá el ícono Compartir y elegí «Agregar a inicio»."}
          </p>
        </div>
      </div>
      <div className="install-prompt-actions">
        <button type="button" onClick={dismiss}>
          Ahora no
        </button>
        {platform === "android" && (
          <button type="button" className="accept" onClick={install}>
            Agregar
          </button>
        )}
      </div>
    </div>
  );
}
