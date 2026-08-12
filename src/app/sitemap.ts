import type { MetadataRoute } from "next";

// Normaliza: sin `/` final para no generar `//` en las URLs del sitemap.
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

/**
 * sitemap.xml (Fase 7.1).
 *
 * Solo páginas de marketing indexables. Las invitaciones públicas son contenido
 * de usuario (cada una con su propio OG/metadata) y no se listan aquí; si más
 * adelante se quiere indexarlas, se agregan consultando las publicadas + activas.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/pricing`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/privacidad`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terminos`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
