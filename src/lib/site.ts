// Dirección pública del sitio: el dominio de producción en Vercel, o local en desarrollo.
// Cuando se conecte el dominio propio, Vercel lo informa en VERCEL_PROJECT_PRODUCTION_URL y todo se actualiza solo.
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000";
export const SITE_NAME = "Fierros";
export const SITE_TAGLINE = "Automovilismo argentino, al minuto";
