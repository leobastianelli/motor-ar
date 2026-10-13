// Los formatos de hora y día que comparten `format.ts` y la lógica del tiempo (`tiempo.mjs`): JavaScript puro, sin Next ni alias `@/`,
// para que `npm test` lo cubra y el navegador lo pueda cargar. `format.ts` los reexporta; no se duplican en ningún otro archivo.
import { TZ } from "./session-status.mjs";

const f = (/** @type {Intl.DateTimeFormatOptions} */ options) => new Intl.DateTimeFormat("es-AR", { timeZone: TZ, ...options });
const timeFmt = f({ hour: "2-digit", minute: "2-digit", hour12: false });
const dayShortFmt = f({ weekday: "short", day: "numeric" });

export const capitalize = (/** @type {string} */ s) => s.charAt(0).toUpperCase() + s.slice(1);
/** "14:30", en hora argentina. */
export const fmtTime = (/** @type {string} */ iso) => timeFmt.format(new Date(iso));
/** "Sáb 3", en hora argentina. */
export const fmtDayShort = (/** @type {string} */ iso) => capitalize(dayShortFmt.format(new Date(iso)).replace(".", ""));
