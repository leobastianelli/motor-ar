"use client";

import { useState } from "react";

/**
 * Cronometraje en vivo (Speedhive) incrustado en la página. Speedhive es un tercero que instala sus propias cookies y medición, así que
 * la página sólo se carga cuando la persona lo pide; hasta entonces hay un botón y un enlace para abrirla en otra pestaña.
 */
export function LiveTimingEmbed({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="timing-embed">
      {open ? (
        <iframe src={url} title="Tiempos en vivo (Speedhive)" loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      ) : (
        <div className="timing-embed-gate">
          <p>Los tiempos los publica Speedhive (MYLAPS). Al mostrarlos acá, Speedhive puede usar sus propias cookies.</p>
          <button type="button" onClick={() => setOpen(true)}>
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
