"use client";

import { useEffect, useId, useRef, useState } from "react";

// Mismo dominio fijo que usa el generador del lado del servidor (src/lib/calendar-feed.ts): no se importa ese
// módulo desde un componente de cliente para no arrastrar sus dependencias del servidor (Neon, `data.ts`) al bundle.
const CALENDAR_BASE_URL = "https://www.somosfierros.ar";

/**
 * Botón "Agregar a mi calendario": un menú chico con Google Calendar, iPhone/Mac (webcal://) y copiar el enlace
 * (para Outlook u otros). El calendario en sí lo arma la ruta `/calendario/<kind>/<id>.ics` (ver
 * src/app/calendario/categoria/[id]/route.ts y src/app/calendario/piloto/[slug]/route.ts).
 */
export function AgregarCalendario({ kind, id }: { kind: "categoria" | "piloto"; id: string }) {
  const [open, setOpen] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const httpsUrl = `${CALENDAR_BASE_URL}/calendario/${kind}/${id}.ics`;
  const webcalUrl = httpsUrl.replace(/^https:/, "webcal:");
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        ref.current?.querySelector<HTMLButtonElement>(".add-calendar-toggle")?.focus();
      }
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Sin volver a mostrar "Copiado" para siempre si alguien vuelve a abrir el menú más tarde.
  useEffect(() => {
    if (!copiado) return;
    const id = setTimeout(() => setCopiado(false), 3000);
    return () => clearTimeout(id);
  }, [copiado]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(httpsUrl);
      setCopiado(true);
    } catch {
      // Sin permiso de portapapeles (o sin HTTPS): el enlace queda en el menú para copiarlo a mano.
    }
  };

  return (
    <div className="add-calendar" ref={ref}>
      <button type="button" className="add-calendar-toggle" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <path d="M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Agregar a mi calendario
      </button>
      {open && (
        <div id={menuId} role="menu" className="add-calendar-menu" aria-label="Agregar a mi calendario">
          <a role="menuitem" href={googleUrl} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
            Google Calendar
          </a>
          <a role="menuitem" href={webcalUrl} onClick={() => setOpen(false)}>
            iPhone / Mac
          </a>
          <button type="button" role="menuitem" onClick={copiar}>
            {copiado ? "Enlace copiado" : "Copiar enlace"}
          </button>
        </div>
      )}
    </div>
  );
}
