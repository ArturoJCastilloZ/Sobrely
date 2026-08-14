import type { MetadataRoute } from "next";
import { EVENT_LANDING_LIST } from "@/lib/seo/event-landings";
import { BLOG_POSTS } from "@/lib/blog/posts";

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
    // Landing pages por tipo de evento (keywords).
    ...EVENT_LANDING_LIST.map((e) => ({
      url: `${SITE_URL}/${e.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    // Blog: índice + cada artículo.
    {
      url: `${SITE_URL}/blog`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    ...BLOG_POSTS.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: p.date,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
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
