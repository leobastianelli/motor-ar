import { TZ, dayKey, dayStart, relativeDayInfo, sessionStatus as sessionStatusOf } from "./session-status.mjs";
import type { ResultRow, Session } from "./types";

export { TZ, dayKey };

const f = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-AR", { timeZone: TZ, ...options });
const timeFmt = f({ hour: "2-digit", minute: "2-digit", hour12: false });
const weekdayFmt = f({ weekday: "long" });
const dayNumFmt = f({ day: "numeric" });
const monthLongFmt = f({ month: "long" });
const monthShortFmt = f({ month: "short" });
const dayShortFmt = f({ weekday: "short", day: "numeric" });
const dayLongFmt = f({ weekday: "long", day: "numeric", month: "long" });
const monthYearFmt = f({ month: "long", year: "numeric" });

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

/** "11–13 de septiembre" o "13 de septiembre". */
export function fmtRange(fromIso: string, toIso: string) {
  const a = fmtDayNum(fromIso);
  const b = fmtDayNum(toIso);
  const month = fmtMonthLong(toIso);
  return a === b ? `${b} de ${month}` : `${a}–${b} de ${month}`;
}

/**
 * Distancia a `iso` en palabras, en días calendario de Argentina (hoy/mañana/pasado mañana/en N días), salvo que
 * falten o hayan pasado menos de 3 h, donde se usa el minuto u hora exacta. Ver `relativeDayInfo` en session-status.mjs.
 */
export function relative(iso: string, nowIso: string): string {
  const info = relativeDayInfo(iso, nowIso);
  switch (info.kind) {
    case "minutes":
      return info.future ? `en ${info.amount} min` : `hace ${info.amount} min`;
    case "hours":
      return info.future ? `en ${info.amount} h` : `hace ${info.amount} h`;
    case "today":
      return `hoy a las ${fmtTime(iso)}`;
    case "tomorrow":
      return "mañana";
    case "day-after-tomorrow":
      return "pasado mañana";
    case "yesterday":
      return "ayer";
    case "days":
      return info.future ? `en ${info.amount} días` : `hace ${info.amount} días`;
    default:
      return "";
  }
}

export type SessionStatus = "live" | "upcoming" | "done";

/** Una sola fuente para el estado de una sesión: ver src/lib/session-status.mjs. */
export const sessionStatus = (session: Session, nowIso: string): SessionStatus => sessionStatusOf(session, nowIso);

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

/**
 * El primer puesto, sólo si de verdad está en los resultados: algunas fuentes (el portal público de la ACTC, sobre
 * todo en categorías chicas) sólo publican parte de la clasificación, y esa parte puede no incluir al 1.º. No hay
 * que anunciar "ganador" ni armar un podio con eso.
 */
export const raceWinner = (results?: ResultRow[]) => results?.find((r) => r.pos === 1);

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
