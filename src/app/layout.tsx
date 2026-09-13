import type { Metadata } from "next";
import { Barlow_Condensed, Geist } from "next/font/google";
import { MobileNav, SiteHeader } from "@/components/nav";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const barlow = Barlow_Condensed({ variable: "--font-barlow", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "Parrilla · Automovilismo al toque", template: "%s · Parrilla" },
  description: "Horarios, resultados y dónde ver automovilismo argentino e internacional.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${geist.variable} ${barlow.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-bg font-sans text-ink">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-28 sm:px-6 md:pb-16">{children}</main>
        <MobileNav />
      </body>
    </html>
  );
}
