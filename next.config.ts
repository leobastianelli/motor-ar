import type { NextConfig } from "next";
import driverIndex from "./src/data/drivers-2026.json";

// Direcciones viejas de fichas de pilotos (p. ej. las que armó un nombre con acentos rotos, "/pilotos/donzino-ma-ximo"): los buscadores ya
// las indexaron, así que redirigen con 301 a la dirección de hoy. El índice las conserva en `formerSlugs` y se commitea con cada sincronización.
const driverRedirects = (driverIndex as { drivers: { slug: string; formerSlugs?: string[] }[] }).drivers.flatMap((d) =>
  (d.formerSlugs ?? []).flatMap((old) => [
    { source: `/pilotos/${old}`, destination: `/pilotos/${d.slug}`, statusCode: 301 as const },
    { source: `/pilotos/${old}/:rest+`, destination: `/pilotos/${d.slug}/:rest+`, statusCode: 301 as const },
  ]),
);

const nextConfig: NextConfig = {
  async redirects() {
    return driverRedirects;
  },
};

export default nextConfig;
