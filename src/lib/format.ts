import type { Session } from "./types";

export const TZ = "America/Argentina/Buenos_Aires";

const timeFmt = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const dayShortFmt = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, weekday: "short", day: "numeric" });
const dayLongFmt = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const dateFmt = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, day: "numeric", month: "short" });
const monthFmt = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, month: "long", year: "numeric" });
const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

export const fmtTime = (iso: string) => timeFmt.format(new Date(iso));
export const fmtDayShort = (iso: string) => dayShortFmt.format(new Date(iso)).replace(".", "");
export const fmtDayLong = (iso: string) => dayLongFmt.format(new Date(iso));
export const fmtDate = (iso: string) => dateFmt.format(new Date(iso)).replace(".", "");
export const fmtMonth = (iso: string) => monthFmt.format(new Date(iso));
/** YYYY-MM-DD en hora argentina, útil para agrupar por día. */
export const dayKey = (iso: string) => keyFmt.format(new Date(iso));

export function relative(iso: string, nowIso: string): string {
  const diffMin = Math.round((new Date(iso).getTime() - new Date(nowIso).getTime()) / 60000);
  const abs = Math.abs(diffMin);
  const future = diffMin > 0;
  let amount: string;
  if (abs < 60) amount = `${abs} min`;
  else if (abs < 60 * 24) amount = `${Math.round(abs / 60)} h`;
  else {
    const days = Math.round(abs / (60 * 24));
    amount = days === 1 ? "1 día" : `${days} días`;
  }
  return future ? `en ${amount}` : `hace ${amount}`;
}

export type SessionStatus = "live" | "upcoming" | "done";

export function sessionStatus(session: Session, nowIso: string): SessionStatus {
  const now = new Date(nowIso).getTime();
  const start = new Date(session.start).getTime();
  const end = start + session.durationMin * 60000;
  if (now < start) return "upcoming";
  if (now < end) return "live";
  return "done";
}

export const KIND_LABEL: Record<Session["kind"], string> = {
  practica: "Práctica",
  clasificacion: "Clasificación",
  sprint: "Sprint",
  serie: "Serie",
  final: "Final",
  carrera: "Carrera",
};
