import type { MetadataRoute } from "next";

/**
 * Web App Manifest (Fase 7.1). Mejora la experiencia mobile-first (añadir a
 * pantalla de inicio). Íconos: se referencia el favicon existente; cuando haya
 * arte de marca en PNG (192/512) se agregan aquí.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "InvitaFlow — Invitaciones digitales",
    short_name: "InvitaFlow",
    description:
      "Crea invitaciones digitales dinámicas y personalizables para bodas, XV años, cumpleaños y más.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7c3aed",
    lang: "es-MX",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
