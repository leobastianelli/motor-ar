import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Archivo } from "next/font/google";
import { after } from "next/server";
import { CookieBanner } from "@/components/cookie-banner";
import { Footer } from "@/components/footer";
import { InstallPrompt } from "@/components/install-prompt";
import { JsonLd } from "@/components/json-ld";
import { Masthead } from "@/components/masthead";
import { hotPending, runHotRefresh } from "@/lib/hot-refresh";
import { fmtDayShort, fmtTime } from "@/lib/format";
import { getSeason } from "@/lib/data";
import { getMenu } from "@/lib/menu";
import { getAllNotes } from "@/lib/notas";
import { loadRawSeason } from "@/lib/season-data";
import { dataMetaContent, isFallback } from "@/lib/salud-core.mjs";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import "./globals.css";

// Una sola familia: Archivo variable, con eje de ancho para titulares condensados.
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"], display: "swap" });

const description = "Horarios en hora argentina, dónde ver y resultados de F1, F2, Turismo Carretera, TC Pista, TN y más. Todos los pilotos argentinos, fecha por fecha.";

const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  authors: [{ name: "Leo Bastianelli", url: "https://leobastianelli.dev" }],
  creator: "Leo Bastianelli",
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s — ${SITE_NAME}` },
  description,
  openGraph: { siteName: SITE_NAME, locale: "es_AR", type: "website", description },
  twitter: { card: "summary_large_image", site: "@SomosFierros" },
};

// La versión de los datos que sirve esta página, para depurar y para la prueba de humo. No se muestra. El layout y las páginas comparten la
// temporada de este pedido (getSeason usa cache() de React), así que esto coincide con lo que dibuja la página.
export async function generateMetadata(): Promise<Metadata> {
  const { source } = await getSeason();
  return { ...baseMetadata, other: { "fierros-datos": dataMetaContent(source!) } };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { source } = await getSeason();
  const stale = isFallback(source);
  const since = source!.createdAt ?? source!.generatedAt;
  // Si hay sesiones de F1 sin resultados (o sin video), se completan en este mismo proceso después de responder. El candado de la base evita
  // que varias instancias lo hagan a la vez. En `next build` no: `after()` correría en la compilación.
  if (process.env.NEXT_PHASE !== "phase-production-build" && hotPending((await loadRawSeason()).events)) {
    after(() => runHotRefresh());
  }
  return (
    <html lang="es-AR" className={archivo.variable}>
      <body>
        {stale && (
          <p className="stale-notice" role="status">
            Los datos pueden estar desactualizados (última actualización: {fmtDayShort(since)}, {fmtTime(since)}).
          </p>
        )}
        <Masthead menu={getMenu(await getAllNotes())} />
        <main>{children}</main>
        <Footer updatedAt={source!.createdAt} />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              { "@type": "WebSite", name: SITE_NAME, url: SITE_URL, inLanguage: "es-AR", description },
              { "@type": "Organization", name: SITE_NAME, url: SITE_URL, sameAs: ["https://x.com/SomosFierros", "https://www.instagram.com/somosfierros.ar/"], founder: { "@type": "Person", name: "Leo Bastianelli", url: "https://leobastianelli.dev" } },
            ],
          }}
        />
        <Analytics />
        <CookieBanner />
        <InstallPrompt />
      </body>
    </html>
  );
}
