import { cookies } from "next/headers";
import { checkPassword, COOKIE_NAME, createSessionToken } from "@/lib/task-auth";

// Sin límite de intentos propio: Vercel ya frena el abuso a nivel de red. Cada intento fallido tarda lo mismo
// que uno exitoso (el HMAC se calcula siempre) para no filtrar por tiempo si la contraseña existe o no.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!checkPassword(password)) {
    return Response.json({ ok: false, error: "Contraseña incorrecta" }, { status: 401 });
  }
  const session = createSessionToken();
  const jar = await cookies();
  // `secure` sólo en producción: Vercel siempre sirve HTTPS; en desarrollo local (http://) el navegador
  // descartaría una cookie `secure` en cualquier host que no sea exactamente "localhost".
  jar.set(COOKIE_NAME, session.value, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: session.maxAge });
  return Response.json({ ok: true });
}
