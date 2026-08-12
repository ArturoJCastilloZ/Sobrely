import type { MetadataRoute } from "next";

/**
 * Web App Manifest (Fase 7.1). Mejora la experiencia mobile-first (añadir a
 * pantalla de inicio). Íconos de marca: monograma "S" oro/champán en PNG
 * 192/512 (public/) + el favicon.ico e icon.svg que el App Router auto-detecta.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sobrely — Invitaciones digitales",
    short_name: "Sobrely",
    description:
      "Crea invitaciones digitales dinámicas y personalizables para bodas, XV años, cumpleaños y más.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf6ec",
    theme_color: "#d4af37",
    lang: "es-MX",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
