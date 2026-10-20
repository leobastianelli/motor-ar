"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * Compartir o bajar las placas de un carrusel. En el celular, «Compartir» abre el menú del teléfono con todas las imágenes juntas (WhatsApp,
 * Instagram, estados); en la computadora, o si el navegador no comparte archivos, se bajan una por una.
 */
export function CompartirPlaca({ urls, nombre, formato }: { urls: string[]; nombre: string; formato: string }) {
  const [aviso, setAviso] = useState("");
  const archivo = (i: number) => `${nombre}${urls.length > 1 ? `-${i + 1}` : ""}.png`;

  function bajar() {
    urls.forEach((url, i) => {
      const a = document.createElement("a");
      a.href = url;
      a.download = archivo(i);
      a.click();
    });
  }

  async function compartir() {
    trackEvent("placa_compartir", { formato, placas: urls.length });
    setAviso("");
    try {
      const files = await Promise.all(
        urls.map(async (url, i) => {
          const r = await fetch(url);
          if (!r.ok) throw new Error(String(r.status));
          return new File([await r.blob()], archivo(i), { type: "image/png" });
        }),
      );
      if (typeof navigator.canShare === "function" && navigator.canShare({ files })) {
        await navigator.share({ files });
        return;
      }
      bajar();
      setAviso(urls.length > 1 ? "Se bajaron las placas." : "Se bajó la placa.");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // Cerró el menú de compartir.
      setAviso("No se pudo compartir: usá «Bajar».");
    }
  }

  return (
    <div className="placa-acciones">
      <button type="button" onClick={compartir}>
        Compartir
      </button>
      <button
        type="button"
        className="sec"
        onClick={() => {
          trackEvent("placa_bajar", { formato, placas: urls.length });
          bajar();
        }}
      >
        {urls.length > 1 ? `Bajar las ${urls.length}` : "Bajar"}
      </button>
      <span role="status">{aviso}</span>
    </div>
  );
}
