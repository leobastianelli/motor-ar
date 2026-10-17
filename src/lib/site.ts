// Dirección pública del sitio: el dominio de producción en Vercel, o local en desarrollo.
// Cuando se conecte el dominio propio, Vercel lo informa en VERCEL_PROJECT_PRODUCTION_URL y todo se actualiza solo.
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000";
export const SITE_NAME = "Fierros";
export const SITE_TAGLINE = "Automovilismo argentino, al minuto";
// Casilla de contacto pública (la misma que ya figura en /acerca, /fuentes, /privacidad y /terminos).
export const CONTACT_EMAIL = "contacto@somosfierros.ar";

// Next.js mezcla el `openGraph` de cada página con el del layout de forma superficial (shallow merge): un objeto
// `openGraph` definido en una página pisa por completo el del layout, no lo completa. Por eso `siteName` y `locale`
// (definidos sólo en layout.tsx) se pierden en cualquier página que declare su propio `openGraph`. Cada
// `generateMetadata` que arme el suyo tiene que repetirlos con este objeto.
export const OG_DEFAULTS = { siteName: SITE_NAME, locale: "es_AR" } as const;
