"use client";

import { useState, useSyncExternalStore } from "react";

const ANCHOR = "#tiempos-en-vivo";
const subscribe = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
};

/**
 * Cronometraje en vivo (Speedhive) incrustado en la página. Speedhive es un tercero que instala sus propias cookies y medición, así que
 * la página sólo se carga cuando la persona lo pide: al tocar el botón o al llegar desde un botón "Tiempos en vivo" (dirección con
 * #tiempos-en-vivo). Hasta entonces hay un botón y un enlace para abrirla en otra pestaña.
 */
export function LiveTimingEmbed({ url }: { url: string }) {
  const [clicked, setClicked] = useState(false);
  const asked = useSyncExternalStore(subscribe, () => window.location.hash === ANCHOR, () => false);
  return (
    <div className="timing-embed">
      {clicked || asked ? (
        <iframe src={url} title="Tiempos en vivo (Speedhive)" loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      ) : (
        <div className="timing-embed-gate">
          <p>Los tiempos los publica Speedhive (MYLAPS). Al mostrarlos acá, Speedhive puede usar sus propias cookies.</p>
          <button type="button" onClick={() => setClicked(true)}>
            Ver los tiempos acá
          </button>
        </div>
      )}
      <a href={url} target="_blank" rel="noreferrer">
        Abrir en Speedhive <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
