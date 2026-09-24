"use client";

import { useSyncExternalStore } from "react";
import { TZ } from "@/lib/format";

const TICK_MS = 30_000;
const subscribe = (onChange: () => void) => {
  const id = setInterval(onChange, TICK_MS);
  return () => clearInterval(id);
};

const absolute = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

function ago(min: number) {
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  if (min < 48 * 60) return `hace ${Math.floor(min / 60)} h`;
  return `hace ${Math.floor(min / 1440)} días`;
}

/**
 * "Datos actualizados hace X min". El tiempo relativo se calcula en el navegador a partir de `createdAt`: el HTML cacheado no puede
 * congelarlo. Hasta hidratar (y sin JavaScript) muestra la fecha y hora argentinas, que no envejecen.
 */
export function DataAge({ createdAt }: { createdAt: string }) {
  const tick = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / TICK_MS),
    () => 0,
  );
  const min = Math.max(0, Math.round((tick * TICK_MS - new Date(createdAt).getTime()) / 60000));
  return (
    <span className="data-age" title={`Versión publicada el ${absolute(createdAt)} (hora argentina)`}>
      Datos actualizados {tick === 0 ? `el ${absolute(createdAt)}` : ago(min)}
    </span>
  );
}
