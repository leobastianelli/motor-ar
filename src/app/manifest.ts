import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fierros — Automovilismo argentino, al minuto",
    short_name: "Fierros",
    description: "Horarios, resultados y seguimiento de pilotos argentinos, siempre en hora argentina.",
    lang: "es-AR",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f2f0",
    theme_color: "#101213",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
