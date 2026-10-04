// Sonda temporal (no se mergea): ¿los servidores de Vercel pueden leer las fuentes que bloquean a GitHub Actions?
export const dynamic = "force-dynamic";
const URLS = [
  "https://api.rallyargentino.com/api/v2/cabecera-dashboard",
  "https://www.rallyargentino.com/calendario.php?anio=2026",
  "https://nuevocarshow.com.ar/calendario/",
];
export async function GET() {
  const out = [];
  for (const url of URLS) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "fierros-motor-ar/0.1 (leonelbastianelli@gmail.com)", Accept: "text/html,application/json", "Accept-Language": "es-AR" }, cache: "no-store" });
      out.push({ url, status: res.status });
    } catch (error) {
      out.push({ url, error: String(error) });
    }
  }
  return Response.json(out);
}
