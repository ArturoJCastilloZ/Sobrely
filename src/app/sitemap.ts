import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
  ];
}
