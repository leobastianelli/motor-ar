import type { ResultRow, Session } from "./types";

export const TZ = "America/Argentina/Buenos_Aires";

const f = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-AR", { timeZone: TZ, ...options });
const timeFmt = f({ hour: "2-digit", minute: "2-digit", hour12: false });
const weekdayFmt = f({ weekday: "long" });
const dayNumFmt = f({ day: "numeric" });
const monthLongFmt = f({ month: "long" });
const monthShortFmt = f({ month: "short" });
const dayShortFmt = f({ weekday: "short", day: "numeric" });
const dayLongFmt = f({ weekday: "long", day: "numeric", month: "long" });
const monthYearFmt = f({ month: "long", year: "numeric" });
const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const fmtTime = (iso: string) => timeFmt.format(new Date(iso));
export const fmtWeekday = (iso: string) => capitalize(weekdayFmt.format(new Date(iso)));
export const fmtDayNum = (iso: string) => dayNumFmt.format(new Date(iso));
export const fmtMonthLong = (iso: string) => monthLongFmt.format(new Date(iso));
/** "SEP", "OCT"… para tiras de fechas. */
export const fmtMonthShort = (iso: string) => monthShortFmt.format(new Date(iso)).replace(".", "").slice(0, 3).toUpperCase();
export const fmtDayShort = (iso: string) => capitalize(dayShortFmt.format(new Date(iso)).replace(".", ""));
export const fmtDayLong = (iso: string) => dayLongFmt.format(new Date(iso));
export const fmtMonth = (iso: string) => monthYearFmt.format(new Date(iso));
/** YYYY-MM-DD en hora argentina, útil para agrupar por día. */
export const dayKey = (iso: string) => keyFmt.format(new Date(iso));

/** "11–13 de septiembre" o "13 de septiembre". */
export function fmtRange(fromIso: string, toIso: string) {
  const a = fmtDayNum(fromIso);
  const b = fmtDayNum(toIso);
  const month = fmtMonthLong(toIso);
  return a === b ? `${b} de ${month}` : `${a}–${b} de ${month}`;
}

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

const dayStart = (iso: string) => new Date(`${dayKey(iso)}T00:00:00-03:00`).getTime();

export function sessionStatus(session: Session, nowIso: string): SessionStatus {
  const now = new Date(nowIso).getTime();
  if (session.timeKnown === false) {
    // Sin horario: nunca "en vivo". Se da por terminada con resultados o al terminar el día.
    const start = dayStart(session.start);
    if (now < start) return "upcoming";
    return session.results?.length || now >= start + 86400000 ? "done" : "upcoming";
  }
  const start = new Date(session.start).getTime();
  const end = start + session.durationMin * 60000;
  if (now < start) return "upcoming";
  if (now < end) return "live";
  return "done";
}

/** Los cuatro estados del sistema visual: en vivo, próxima, finalizada y sin datos. */
export type StateKind = "live" | "upcoming" | "finished" | "no-data";

export function sessionState(session: Session, nowIso: string): { kind: StateKind; label: string } {
  const status = sessionStatus(session, nowIso);
  if (status === "live") return { kind: "live", label: "En vivo" };
  if (status === "upcoming") {
    if (session.timeKnown === false) {
      const days = Math.round((dayStart(session.start) - dayStart(nowIso)) / 86400000);
      return { kind: "upcoming", label: days <= 0 ? "Hoy" : days === 1 ? "Mañana" : days <= 6 ? `En ${days} días` : "Próxima" };
    }
    const minutes = (new Date(session.start).getTime() - new Date(nowIso).getTime()) / 60000;
    return { kind: "upcoming", label: minutes <= 180 ? capitalize(relative(session.start, nowIso)) : "Próxima" };
  }
  return session.results?.length ? { kind: "finished", label: "Terminó" } : { kind: "no-data", label: "Sin datos" };
}

/** Hora para mostrar; "—" cuando la fuente no publica el horario. */
export const sessionTime = (session: Session) => (session.timeKnown === false ? "—" : fmtTime(session.start));

export const minutesLeft = (session: Session, nowIso: string) =>
  Math.max(0, Math.round((new Date(session.start).getTime() + session.durationMin * 60000 - new Date(nowIso).getTime()) / 60000));

/** Código de tres letras del piloto (oficial si existe, si no, derivado del apellido). */
export function driverCode(row: Pick<ResultRow, "driver" | "code">) {
  if (row.code) return row.code;
  const parts = row.driver.split(" ").filter((p) => !/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(p));
  const surname = parts.at(-1) ?? row.driver;
  return surname.normalize("NFD").replace(/[̀-ͯ]/g, "").slice(0, 3).toUpperCase();
}

export const surname = (name: string) => name.split(" ").at(-1) ?? name;

export const KIND_LABEL: Record<Session["kind"], string> = {
  practica: "Práctica",
  clasificacion: "Clasificación",
  sprint: "Sprint",
  serie: "Serie",
  final: "Final",
  carrera: "Carrera",
};
