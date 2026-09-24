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
import { getMenu } from "@/lib/menu";
import { getAllNotes } from "@/lib/notas";
import { loadRawSeason } from "@/lib/season-data";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import "./globals.css";

// Una sola familia: Archivo variable, con eje de ancho para titulares condensados.
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"], display: "swap" });

const description = "Horarios en hora argentina, dónde ver y resultados de F1, F2, Turismo Carretera, TC Pista, TN y más. Todos los pilotos argentinos, fecha por fecha.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  authors: [{ name: "Leo Bastianelli", url: "https://leobastianelli.dev" }],
  creator: "Leo Bastianelli",
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s — ${SITE_NAME}` },
  description,
  openGraph: { siteName: SITE_NAME, locale: "es_AR", type: "website", description },
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Si hay sesiones de F1 sin resultados (o sin video), se completan en este mismo proceso después de responder. El candado de la base evita
  // que varias instancias lo hagan a la vez. En `next build` no: `after()` correría en la compilación.
  if (process.env.NEXT_PHASE !== "phase-production-build" && hotPending((await loadRawSeason()).events)) {
    after(() => runHotRefresh());
  }
  return (
    <html lang="es-AR" className={archivo.variable}>
      <body>
        <Masthead menu={getMenu(await getAllNotes())} />
        <main>{children}</main>
        <Footer />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              { "@type": "WebSite", name: SITE_NAME, url: SITE_URL, inLanguage: "es-AR", description },
              { "@type": "Organization", name: SITE_NAME, url: SITE_URL, founder: { "@type": "Person", name: "Leo Bastianelli", url: "https://leobastianelli.dev" } },
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
