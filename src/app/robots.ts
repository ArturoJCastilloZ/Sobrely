import type { MetadataRoute } from "next";

// Normaliza: sin `/` final para no generar `//` al concatenar rutas.
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

/**
 * robots.txt (Fase 7.1).
 *
 * Permite el crawl de las páginas de marketing y de invitaciones públicas, y
 * bloquea todo lo privado/transaccional (paneles, editor, auth, API, checkout):
 * no aporta a SEO y no debe indexarse.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/admin",
        "/editor",
        "/billing",
        "/api",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/auth",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
