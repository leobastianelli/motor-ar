"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

const TICK_MS = 10_000;

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, TICK_MS);
  return () => clearInterval(id);
}

/**
 * "Ahora" del navegador, actualizado cada 10 s. La página llega renderizada con la hora del servidor (`serverNow`), que puede tener
 * hasta unos segundos de antigüedad: apenas hidrata, pasa a la hora real. Con `simulated` (FIERROS_NOW) se queda con la del servidor.
 */
export function useNow(serverNow: string, simulated = false) {
  const tick = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / TICK_MS),
    () => 0,
  );
  return simulated || tick === 0 ? serverNow : new Date(tick * TICK_MS).toISOString();
}

/** Minutos que faltan para `endsAt`, siempre al día (no espera a que se recargue la página). */
export function MinutesLeft({ endsAt, serverNow, simulated }: { endsAt: string; serverNow: string; simulated?: boolean }) {
  const now = useNow(serverNow, simulated);
  return <>{Math.max(0, Math.round((new Date(endsAt).getTime() - new Date(now).getTime()) / 60000))}</>;
}

/**
 * Vuelve a pedir la página cada `everyMs` mientras se está mirando, y al volver a la pestaña: lo que depende del servidor
 * (qué está en vivo, el orden de la home, resultados nuevos) se actualiza solo, sin que nadie recargue.
 */
export function AutoRefresh({ everyMs = 30_000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(refresh, everyMs);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, everyMs]);
  return null;
}
