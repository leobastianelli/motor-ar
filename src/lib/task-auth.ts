import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Auth mínima para /sistema/tareas: un solo usuario, sin cuentas. La contraseña vive en TASKS_PASSWORD
// (variable de entorno, nunca en el código ni en el cliente) y la sesión es una cookie firmada con HMAC
// (TASKS_SESSION_SECRET), no un id que haya que buscar en ningún lado: no hay tabla de sesiones que atacar.
export const COOKIE_NAME = "fierros_tareas";
const SESSION_DAYS = 30;

const secret = () => {
  const s = process.env.TASKS_SESSION_SECRET;
  if (!s) throw new Error("Falta TASKS_SESSION_SECRET");
  return s;
};

const hmac = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");

/** Compara dos strings sin filtrar por tiempo cuánto coinciden (nunca `===` para secretos). */
const safeEqual = (a: string, b: string) => {
  const bufA = Buffer.from(hmac(a)); // se compara el HMAC de cada string: mismo largo siempre, sin atajos por longitud.
  const bufB = Buffer.from(hmac(b));
  return timingSafeEqual(bufA, bufB);
};

export function checkPassword(candidate: string): boolean {
  const expected = process.env.TASKS_PASSWORD;
  if (!expected || !candidate) return false;
  return safeEqual(candidate, expected);
}

/** Token de sesión: fecha de vencimiento + su firma. No hace falta guardarlo en ningún lado para poder revocarlo. */
export function createSessionToken(): { value: string; maxAge: number } {
  const expires = Date.now() + SESSION_DAYS * 86400_000;
  const value = `${expires}.${hmac(String(expires))}`;
  return { value, maxAge: SESSION_DAYS * 86400 };
}

/** Para usar en Route Handlers: true si la cookie de la request actual es una sesión válida. */
export async function hasTaskSession(): Promise<boolean> {
  const jar = await cookies();
  return isValidSession(jar.get(COOKIE_NAME)?.value);
}

export function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  const [expiresText, sig] = token.split(".");
  const expires = Number(expiresText);
  if (!expiresText || !sig || !Number.isFinite(expires) || Date.now() > expires) return false;
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(hmac(expiresText)));
  } catch {
    return false; // largos distintos (token adulterado): timingSafeEqual tira, no es una sesión válida.
  }
}
