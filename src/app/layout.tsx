import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { Footer } from "@/components/footer";
import { Masthead } from "@/components/masthead";
import "./globals.css";

// Una sola familia: Archivo variable, con eje de ancho para titulares condensados.
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Fierros — Automovilismo argentino, al minuto", template: "%s — Fierros" },
  description: "Horarios, resultados y seguimiento de pilotos argentinos, siempre en hora argentina.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={archivo.variable}>
      <body>
        <Masthead />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
